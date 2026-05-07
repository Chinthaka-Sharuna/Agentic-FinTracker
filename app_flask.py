import calendar
import uuid
from datetime import date, datetime, timedelta

from flask import Flask, request, jsonify, render_template, g
from werkzeug.security import generate_password_hash, check_password_hash

from app import Config, DatabaseManager, DBTools, Chatbot, PDFExtractor


db_manager = DatabaseManager(Config.DATABASE_PATH)
db_manager.execute_script(Config.TABLES_SCRIPT)

db_tools = DBTools(db_manager)

chatbot = Chatbot(
    api_key=Config.API_KEY,
    base_url=Config.CHAT_BOT_BASE_URL,
    model=Config.CHAT_BOT_MODEL,
    system_prompt=Config.CHAT_BOT_SYSTEM_PROMPT,
    tools_obj=db_tools,
)

pdf_extractor = PDFExtractor(
    api_key=Config.API_KEY,
    base_url=Config.PDF_EXTRACTOR_BASE_URL,
    model=Config.PDF_EXTRACTOR_MODEL,
    system_prompt=Config.PDF_EXTRACTOR_SYSTEM_PROMPT
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
@app.route("/api/dashboard", methods=["GET"])
@require_auth
def update_dashboard():
    """Get live dashboard data for the current user."""
    try:
        year, month, start_day, end_day, today = db_tools.get_current_month_date_range()
        start_date = f"{year}-{month}-01"
        end_date   = f"{year}-{month}-{today}"
        print("\n start date: ", start_date)
        print("end date: ", end_date)
        print(g.user_id)
        salary_data      = db_tools.get_total_income(g.user_id)
        total_income     = salary_data["total_income"]
        spent            = db_tools.get_spent(g.user_id)
        categorized_data = db_tools.get_categorized_summary(g.user_id, start_date, end_date)
        transactions     = db_tools.get_transactions(g.user_id, start_date, end_date)

        return jsonify({
            "currency_unit": "USD",
            "month": f"{year}-{month}",
            "last_logged_income_date": salary_data["last_updated"],
            "summary": {
                "total_income":      total_income,
                "spent_amount":      spent,
                "remaining_budget":  total_income - spent,
            },
            "category":             categorized_data,
            "transaction_history":  transactions,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------------
# api end point for transactions page
# -------------------------------------
@app.route("/api/transactions", methods=["GET"])
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


# -------------------------------------
# api endpoints for mannual operation
# -------------------------------------

@app.route("/api/add-expense", methods=["POST"])
@require_auth
def add_expense():
    try:
        data        = request.get_json() or {}
        amount      = float(data.get("amount", 0))
        category    = data.get("category", "").strip()
        description = data.get("description", "").strip()
        expense_date = data.get("date", str(date.today()))

        if not amount or not category:
            return jsonify({"error": "Amount and category required"}), 400

        success = db_manager.add_expense(
            user_id=g.user_id, amount=amount,
            category=category, description=description, date=expense_date
        )

        if success:
            return jsonify({"message": "Expense added successfully"}), 201
        return jsonify({"error": "Failed to add expense"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/set-salary", methods=["POST"])
@require_auth
def set_salary():
    try:
        data        = request.get_json() or {}
        amount      = float(data.get("amount", 0))
        month       = data.get("month", "").strip()
        year        = int(data.get("year", date.today().year))
        description = data.get("description", "").strip()

        if not amount or not month:
            return jsonify({"error": "Amount and month required"}), 400

        success = db_manager.add_income(
            user_id=g.user_id, amount=amount,
            month=month, year=year, description=description
        )

        if success:
            return jsonify({"message": "Income logged successfully"}), 201
        return jsonify({"error": "Failed to log income"}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/delete-expense/<int:expense_id>", methods=["DELETE"])
@require_auth
def delete_expense(expense_id: int):
    """Delete an expense that belongs to the current user."""
    success = db_manager.delete_expense(user_id=g.user_id, expense_id=expense_id)
    if success:
        return jsonify({"message": "Expense deleted"}), 200
    return jsonify({"error": "Failed to delete expense"}), 500



@app.route("/api/admin/cleanup-sessions", methods=["POST"])
def cleanup_sessions():
    """Remove expired sessions. Call this periodically (e.g. cron job)."""
    db_manager.delete_expired_sessions()
    return jsonify({"message": "Expired sessions removed"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)



# ------------------------------------------------------------------ #
#  Budgets endpoint                                                    #
# ------------------------------------------------------------------ #

@app.route("/api/budgets", methods=["GET"])
@require_auth
def get_budgets():
    """Get categorized spending vs income for the current month."""
    try:
        year, month, start_day, end_day, _ = db_tools.get_current_month_date_range()
        start_date = f"{year}-{month}-{start_day}"
        end_date   = f"{year}-{month}-{end_day}"

        spending_by_category = db_manager.get_total_expenses_by_category(
            g.user_id, start_date, end_date
        )
        total_income = db_tools.get_total_income(g.user_id)["total_income"]
        total_spent  = sum(c["total_cost"] for c in (spending_by_category or []))

        return jsonify({
            "income":      total_income,
            "total_spent": total_spent,
            "remaining":   total_income - total_spent,
            "categories":  spending_by_category or [],
            "period": {
                "month":      calendar.month_name[int(month)],
                "year":       int(year),
                "start_date": start_date,
                "end_date":   end_date,
            },
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500