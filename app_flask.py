import calendar
import uuid
from datetime import date, datetime, timedelta
from flask import Flask, request, jsonify, render_template, g
from werkzeug.security import generate_password_hash, check_password_hash

from app import Config, DatabaseManager, DBTools, Chatbot, PDFExtractor,GoalRiskScorer,Tools

goal_risk_scorer=GoalRiskScorer(api_key=Config.API_KEY)
db_manager = DatabaseManager(Config.DATABASE_PATH)
db_manager.execute_script(Config.TABLES_SCRIPT)

db_tools = DBTools(db_manager,goal_risk_scorer)
tools=Tools(db_tools_obj=db_tools)

chatbot = Chatbot(
    api_key=Config.API_KEY,
    base_url=Config.CHAT_BOT_BASE_URL,
    model=Config.CHAT_BOT_MODEL,
    system_prompt=Config.CHAT_BOT_SYSTEM_PROMPT,
    tools_obj=tools,
    save_msg=db_manager.save_chat_message
)

pdf_extractor = PDFExtractor(
    api_key=Config.API_KEY,
    base_url=Config.PDF_EXTRACTOR_BASE_URL,
    model=Config.PDF_EXTRACTOR_MODEL,
    system_prompt=Config.PDF_EXTRACTOR_SYSTEM_PROMPT
)

goal_risk_scorer=GoalRiskScorer(
    api_key=Config.API_KEY
)

app = Flask(__name__, static_folder=Config.APP_STATIC, template_folder=Config.APP_TEMPLATES)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024   # 10 MB
SESSION_DURATION_DAYS = 7

ALLOWED_EXTENSIONS = {"pdf"}

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# -------------------------------------
#  Auth helper functions
# -------------------------------------
def _create_session(user_id: int) -> str:
    """Create a new session row and return the session token."""
    token = str(uuid.uuid4())
    expires_at = (datetime.utcnow() + timedelta(days=SESSION_DURATION_DAYS)).isoformat()
    db_manager.create_session(session_id=token, user_id=user_id, expires_at=expires_at)
    return token

def _get_current_user():
    """
    Read the Bearer token from the Authorization header and return the
    session row (which includes user_id, username, email) or None.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[len("Bearer "):]
    return db_manager.get_session(token)

def require_auth(f):
    """Decorator — injects `g.user` or returns 401."""
    from functools import wraps

    @wraps(f)
    def wrapper(*args, **kwargs):
        session = _get_current_user()
        if not session:
            return jsonify({"error": "Unauthorized"}), 401
        g.user = session          # g.user["user_id"], g.user["username"] …
        g.user_id = session["user_id"]
        return f(*args, **kwargs)

    return wrapper

# -------------------------------------
# Page Routers for Flask
# -------------------------------------
@app.route("/auth")
def load_auth():
    return render_template("auth.html")

@app.route("/")
def load_index():
    return render_template("dashboard.html")

@app.route("/dashboard")
def load_dashboard():
    return render_template("dashboard.html")

@app.route("/budgets")
def load_budgets():
    return render_template("budgets.html")

@app.route("/transactions")
def load_transactions():
    return render_template("transactions.html")

@app.route("/goals")
def load_goals():
    return render_template("goals.html")



# -------------------------------------
# API endpoints
# -------------------------------------

# -------------------------------------
# auth related api endpoints
# -------------------------------------
@app.route("/api/auth/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    Body: { "username": "alice", "email": "alice@example.com", "password": "secret" }
    """
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "username, email, and password are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    password_hash = generate_password_hash(password)
    success = db_manager.create_user(username=username, email=email, password_hash=password_hash)

    if not success:
        return jsonify({"error": "Email or username already exists"}), 409

    user = db_manager.get_user_by_email(email)
    token = _create_session(user["id"])

    return jsonify({
        "message": "Account created",
        "token": token,
        "user": {"id": user["id"], "username": user["username"], "email": user["email"]}
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { "email": "alice@example.com", "password": "secret" }
    """
    data = request.get_json() or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = db_manager.get_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _create_session(user["id"])

    return jsonify({
        "message": "Logged in",
        "token": token,
        "user": {"id": user["id"], "username": user["username"], "email": user["email"]}
    }), 200

@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    """
    POST /api/auth/logout
    Header: Authorization: Bearer <token>
    """
    auth  = request.headers.get("Authorization", "")
    token = auth[len("Bearer "):]
    db_manager.delete_session(token)
    return jsonify({"message": "Logged out"}), 200

@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    """Return basic info about the current user."""
    user = db_manager.get_user_by_id(g.user_id)
    return jsonify(user), 200



# -------------------------------------
# Chat related api endpoints
# -------------------------------------
@app.route("/api/chat", methods=["POST"])
@require_auth
def chat():
    """
    POST /api/chat  (multipart/form-data)
    Fields: message (text), file (optional PDF)
    Header: Authorization: Bearer <token>
    """
    try:
        message = request.form.get("message", "").strip()
        file    = request.files.get("file")

        if not message and not file:
            return jsonify({"error": "Message or file required"}), 400

        if file and allowed_file(file.filename):
            raw_pdf = file.read()
            extracted = pdf_extractor.extract(raw_pdf)
            message = (
                f"I have uploaded a PDF bank statement. Extracted content:\n{extracted}"
                + (f"\n\nMy message: {message}" if message else "")
            )

        reply = chatbot.send_message(user_id=g.user_id, message=message)
        return jsonify({"reply": reply}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/chat/history", methods=["GET"])
@require_auth
def chat_history():
    """Return the last 50 messages for the current user."""
    history = db_manager.get_chat_history(user_id=g.user_id)
    return jsonify({"history": history}), 200

@app.route("/api/chat/clear", methods=["DELETE"])
@require_auth
def clear_chat():
    """Delete all chat history for the current user."""
    chatbot.clear_history()
    return jsonify({"message": "Chat history cleared"}), 200

# -------------------------------------
# api endpoint for dashboard page
# -------------------------------------
@app.route("/api/dashboard", methods=["POST"])
@require_auth
def update_dashboard():
    """Get live dashboard data for the current user."""
    try:
        year, month, start_day, end_day, today = db_tools.get_current_month_date_range()

        year_int = int(year)
        month_int = int(month)

        start_date = f"{year}-{month}-01"
        end_date = f"{year}-{month}-{today}"

        salary_data = db_tools.get_total_income(g.user_id)
        total_income = salary_data["total_income"]
        spent = db_tools.get_spent(g.user_id)
        categorized_data = db_tools.get_categorized_summary(g.user_id, start_date, end_date)
        transactions = db_tools.get_transactions(g.user_id, start_date, end_date)
        total_balance = db_tools.get_total_balance(user_id=g.user_id)

        # last month — handle January correctly
        if month_int > 1:
            last_year, last_month = year_int, month_int - 1
        else:
            last_year, last_month = year_int - 1, 12

        last_month_last_day = calendar.monthrange(last_year, last_month)[1]
        last_month_start = f"{last_year}-{last_month:02d}-01"
        last_month_end = f"{last_year}-{last_month:02d}-{last_month_last_day}"

        last_month_balance = db_tools.get_total_balance(
            user_id=g.user_id,
            start_date=last_month_start,
            end_date=last_month_end
        )
        current_month_balance = total_income - spent

        if last_month_balance != 0:
            total_balance_percentage_change = round(
                ((current_month_balance - last_month_balance) / last_month_balance) * 100, 2
            )
        else:
            total_balance_percentage_change = 0.0

        return jsonify({
            "currency_unit": "USD",
            "month": f"{year}-{month}",
            "last_logged_income_date": salary_data["last_updated"],
            "summary": {
                "total_income":      total_income,
                "spent_amount":      spent,
                "remaining_budget":  current_month_balance,
                "total_balance": total_balance,
                "total_balance_percentage_change":total_balance_percentage_change
            },
            "category":             categorized_data,
            "transaction_history":  transactions,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------------
# api end point for transactions page
# -------------------------------------
@app.route("/api/transactions", methods=["POST"])
@require_auth
def get_transactions():
    """
    GET /api/transactions?month=January&year=2025
    month=all returns every transaction for the user.
    """
    try:
        month_param = request.args.get("month", "all")

        if month_param == "all":
            transactions = db_manager.get_all_transactions(g.user_id)
        else:
            try:
                month_num = list(calendar.month_name).index(month_param)
                year      = int(request.args.get("year", date.today().year))
                last_day  = calendar.monthrange(year, month_num)[1]
                start_date = f"{year}-{month_num:02d}-01"
                end_date   = f"{year}-{month_num:02d}-{last_day}"
                transactions = db_manager.get_all_transactions(g.user_id, start_date, end_date)
            except (ValueError, IndexError):
                transactions = []
        return jsonify({"transactions": transactions, "count": len(transactions)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ------------------------------------------------------------------ #
#  Budgets endpoint
# ------------------------------------------------------------------ #

@app.route("/api/budgets", methods=["POST"])
@require_auth
def get_budgets():
    """Get categorized spending vs income for the current month."""
    try:
        year, month, start_day, end_day, _ = db_tools.get_current_month_date_range()
        default_start = f"{year}-{month}-{int(start_day):02d}"
        default_end = f"{year}-{month}-{int(end_day):02d}"

        start_date = request.args.get("start_date", default_start)
        end_date = request.args.get("end_date", default_end)

        categorized_data_by_date = db_tools.get_spends_percentage_by_date(
            user_id=g.user_id,
            start_date=start_date,
            end_date=end_date
        )
        categorized_data_by_category = db_tools.get_categorized_summary(g.user_id, start_date, end_date)

        return jsonify({
            "currency_unit": "USD",
            "categorized_data_by_date":categorized_data_by_date,
            "categorized_data_by_category":categorized_data_by_category
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/goals", methods=["POST"])
@require_auth
def get_goals():
    goals_data = db_tools.get_goals(user_id=g.user_id)
    return jsonify({"goals": goals_data}), 200

@app.route("/api/goals/create", methods=["POST"])
@require_auth
def create_goal():
    data = request.get_json() or {}

    goal_name = data.get("goal_name", "").strip()
    target_amount = data.get("target_amount", 0)
    saved_amount = data.get("saved_amount", 0)
    deadline = data.get("deadline", "")
    category = data.get("category", "")
    goal_notes = data.get("goal_notes", "")
    force_creation = data.get("force_creation", False)

    result=db_tools.create_new_goal(
        user_id=g.user_id,
        goal_name=goal_name, target_amount=target_amount,
        saved_amount=saved_amount, deadline=deadline,
        category=category, goal_notes=goal_notes,
        force_creation=force_creation
    )
    if result["status"]=="success":
        return jsonify({"status": "success", "message": "Goal updated successfully"}), 200
    elif result["status"]=="warning":
        return jsonify({"status": "warning", "message": result["message"]}), 200
    else:
        return jsonify({"status": "failed", "message": result["message"]}), 400




@app.route("/api/goals/update", methods=["POST"])
@require_auth
def update_goal():
    data = request.get_json() or {}
    reference_id = data.get("reference_id", "")
    if not reference_id:
        return jsonify({"error": "Reference id required"}), 400

    goal_name  = data.get("goal_name", "").strip()
    target_amount     = data.get("target_amount", 0)
    saved_amount      = data.get("saved_amount", 0)
    deadline   = data.get("deadline", "")
    category   = data.get("category", "")
    goal_notes = data.get("goal_notes", "")
    force_creation=data.get("force_creation", False)

    result=db_tools.edit_goal(
        user_id=g.user_id, reference_id=reference_id,
        goal_name=goal_name, target_amount=target_amount,
        saved_amount=saved_amount, deadline=deadline,
        category=category, goal_notes=goal_notes,
        force_creation=force_creation
    )
    if result["status"]=="success":
        return jsonify({"status": "success", "message": "Goal updated successfully"}), 200
    elif result["status"]=="warning":
        return jsonify({"status": "warning", "message": result["message"]}), 200
    else:
        return jsonify({"status": "failed", "message": result["message"]}), 400

@app.route("/api/goals/delete", methods=["POST"])
@require_auth
def delete_goal():
    # must implement a way to transfer money which is already in the goal before deleting it
    data = request.get_json() or {}
    reference_id = data.get("reference_id", "")
    if not reference_id:
        return jsonify({"error": "Reference id required"}), 400

    success, message = db_tools.delete_goal(
        user_id=g.user_id, reference_id=reference_id
    )
    if success:
        return jsonify({"status": "success", "message": message}), 200
    return jsonify({"status": "failed", "message": message}), 404



if __name__ == "__main__":
    app.run(debug=True, port=5000)
