import calendar
import json
from datetime import date, datetime
from dateutil.relativedelta import relativedelta

# Allowed kwarg keys for edit_goal — status is NOT included (system-managed only)
_EDIT_GOAL_ALLOWED_FIELDS = frozenset({"goal_name", "category", "target_amount","saved_amount", "deadline", "goal_notes"})


class DBTools:
    """
    All tool methods are user-scoped.
    Pass user_id to every public method.
    The LLM tool-calling loop uses tool_handler(user_id, tool_name, args).
    """

    def __init__(self, database_obj, goal_risk_scorer):
        self.db_obj           = database_obj
        self.goal_risk_scorer = goal_risk_scorer

    # ------------------------------------------------------------------ #
    #  Goal status — replace this method when ready                       #
    # ------------------------------------------------------------------ #

    def _compute_goal_status(self, **kwargs) -> str:
        """
        Determines the status of a goal.
        TODO: implement proper risk-based / progress-based logic here.
        """
        return "on-track"

    # ------------------------------------------------------------------ #
    #  LLM-facing tools                                                    #
    # ------------------------------------------------------------------ #

    def log_income(self, user_id: str, amount: float, date: str, description: str = "") -> str:
        success = self.db_obj.add_income(
            user_id=user_id, amount=amount, date=date, description=description
        )
        if success:
            return f"Income of ${amount} ({description or 'income'}) on {date} saved."
        return "Failed to log income. Please try again."

    def log_expense(self, user_id: str, amount: float, category: str, description: str, date: str) -> str:
        success = self.db_obj.add_expense(
            user_id=user_id,
            amount=amount,
            category=category.lower(),
            description=description,
            date=date
        )
        if success:
            balance = self.get_balance_data(user_id)
            return (f"Logged ${amount} for {category}. "
                    f"Spent: ${balance['spent']:.2f} | Remaining: ${balance['remaining']:.2f}")
        return "Failed to log expense. Please try again."

    def get_balance(self, user_id: str) -> str:
        b = self.get_balance_data(user_id)
        return (f"This month:\n"
                f"\tIncome:    ${b['total']:.2f}\n"
                f"\tSpent:     ${b['spent']:.2f}\n"
                f"\tRemaining: ${b['remaining']:.2f}")

    def get_expense_summary(self, user_id: str, start_date: str, end_date: str) -> str:
        result = self.db_obj.get_total_expenses_by_category(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        if result is False:
            return "Failed to get expense summary. Please try again."
        if not result:
            return "No expenses recorded for this period."
        return f"Expense summary:\n{result}"

    def create_new_goal(self, user_id: str, goal_name: str, target_amount: float,deadline: str, category: str,goal_notes: str, force_creation: bool = False) -> dict:
        saved_amount = 0
        # --- validation ---
        if not goal_name:
            return {"status": "failed", "message": "Goal name required"}
        if not target_amount or target_amount <= 0:
            return {"status": "failed", "message": "Valid target amount required"}
        if not deadline:
            return {"status": "failed", "message": "Deadline required"}
        try:
            deadline_date = date.fromisoformat(deadline)
            if deadline_date <= date.today():
                return {"status": "failed", "message": "Deadline must be a future date"}
        except ValueError:
            return {"status": "failed", "message": "Invalid deadline format. Use YYYY-MM-DD"}

        # --- risk scorer used for warning only, not for status ---
        if not force_creation:
            averages = self.get_avg_income_expenses(user_id)
            days_remaining = (date.fromisoformat(deadline) - date.today()).days
            _, _, risk_message, possibility = self.goal_risk_scorer.score_goal_risk(
                avg_income=averages["avg_income"],
                avg_expenses=averages["avg_expenses"],
                months_remaining=days_remaining / 30 if days_remaining > 0 else 0,
                target=target_amount
            )
            if not possibility:
                return {
                    "status": "warning",
                    "message": (
                        f"Are you sure you want to create '{goal_name}'? "
                        f"Based on your current financial state, reaching ${target_amount:,.2f} "
                        f"by {deadline} may be difficult. "
                        f"{risk_message} Want to proceed anyway?"
                    )
                }

        status = self._compute_goal_status()

        success, message = self.create_goal(
            user_id=user_id,
            goal_name=goal_name,
            category=category,
            target_amount=target_amount,
            saved_amount=saved_amount,
            deadline=deadline,
            goal_notes=goal_notes,
            status=status
        )
        if success:
            return {"status": "success", "message": message}
        return {"status": "failed", "message": message}

    def edit_goal(self, user_id: str, reference_id: str,
                  force_creation: bool = False, **kwargs) -> dict:
        # --- validation ---
        if not kwargs:
            return {"status": "failed", "message": "No fields to update"}

        invalid_keys = kwargs.keys() - _EDIT_GOAL_ALLOWED_FIELDS
        if invalid_keys:
            return {"status": "failed", "message": f"Invalid fields: {invalid_keys}"}

        # --- fetch existing goal upfront (needed for deadline fallback and warning message) ---
        existing = self.get_goal(user_id, reference_id)
        if not existing:
            return {"status": "failed", "message": "Goal not found"}
        existing_goal = existing[0]

        goal_name     = kwargs.get("goal_name")
        target_amount = kwargs.get("target_amount")
        deadline      = kwargs.get("deadline")

        if "goal_name" in kwargs and len(goal_name) == 0:
            return {"status": "failed", "message": "Goal name required"}
        if "target_amount" in kwargs and (not target_amount or target_amount <= 0):
            return {"status": "failed", "message": "Valid target amount required"}

        # --- deadline validation and fallback ---
        if "deadline" in kwargs:
            if not deadline:
                return {"status": "failed", "message": "Deadline required"}
            try:
                deadline_date = date.fromisoformat(deadline)
                if deadline_date <= date.today():
                    return {"status": "failed", "message": "Deadline must be a future date"}
            except ValueError:
                return {"status": "failed", "message": "Invalid deadline format. Use YYYY-MM-DD"}
        else:
            # use existing deadline so risk scorer has a valid date
            deadline = existing_goal["deadline"]

        # --- risk scorer used for warning only, not for status ---
        if not force_creation and ("target_amount" in kwargs or "deadline" in kwargs):
            effective_target = float(
                target_amount if "target_amount" in kwargs else existing_goal["target_amount"]
            )
            averages = self.get_avg_income_expenses(user_id)
            days_remaining = (date.fromisoformat(deadline) - date.today()).days
            _, _, risk_message, possibility = self.goal_risk_scorer.score_goal_risk(
                avg_income=averages["avg_income"],
                avg_expenses=averages["avg_expenses"],
                months_remaining=days_remaining / 30 if days_remaining > 0 else 0,
                target=effective_target
            )
            if not possibility:
                display_name = goal_name or existing_goal["goal_name"]
                return {
                    "status": "warning",
                    "message": (
                        f"Are you sure you want to update '{display_name}'? "
                        f"Based on your current financial state, reaching "
                        f"${effective_target:,.2f} by {deadline} may be difficult. "
                        f"{risk_message} Want to proceed anyway?"
                    )
                }

        kwargs["status"] = self._compute_goal_status()

        success, message = self.update_goal(
            user_id=user_id,
            reference_id=reference_id,
            **kwargs
        )
        if success:
            return {"status": "success", "message": message}
        return {"status": "failed", "message": message}

    # ------------------------------------------------------------------ #
    #  Public helpers (called directly by Flask routes)                   #
    # ------------------------------------------------------------------ #

    def get_current_month_date_range(self):
        """Return (year, month, start_day, end_day, today) all as strings."""
        year, month, day = str(date.today()).split('-')
        last_day = calendar.monthrange(int(year), int(month))[1]
        return year, month, '01', str(last_day), day

    def get_total_income(self, user_id: str) -> dict:
        year, month, start_day, end_day, _ = self.get_current_month_date_range()
        start_date = f"{year}-{month}-{start_day}"
        end_date   = f"{year}-{month}-{end_day}"
        row = self.db_obj.get_total_income_in_month(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        return {
            "total_income": float(row["total_income"]) if row and row["total_income"] else 0.0,
            "last_updated": row["last_updated"] if row and row["last_updated"] else "Not recorded yet"
        }

    def get_spent(self, user_id: str) -> float:
        year, month, start_day, end_day, _ = self.get_current_month_date_range()
        start_date = f"{year}-{month}-{start_day}"
        end_date   = f"{year}-{month}-{end_day}"
        total, _   = self._calculate_total_expenses(user_id, start_date, end_date)
        return total

    def get_balance_data(self, user_id: str) -> dict:
        total = self.get_total_income(user_id)["total_income"]
        spent = self.get_spent(user_id)
        return {"total": total, "spent": spent, "remaining": total - spent}

    def _calculate_total_expenses(self, user_id: str, start_date: str, end_date: str):
        result = self.db_obj.get_total_expenses_by_category(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        if result is False:
            return 0.0, "Something went wrong while calculating expenses."
        total = sum(r["total_cost"] for r in result) if result else 0.0
        return total, None

    def get_categorized_summary(self, user_id: str, start_date: str, end_date: str):
        result = self.db_obj.get_total_expenses_by_category(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        if not result:
            return []
        total_spent, _ = self._calculate_total_expenses(user_id, start_date, end_date)
        if total_spent == 0:
            return result

        pct_sum = 0.0
        for item in result:
            item["percentage"] = round((item["total_cost"] / total_spent) * 100, 2)
            pct_sum += item["percentage"]
            item["category"] = item["category"].lower()

        diff = round(100 - pct_sum, 2)
        result[-1]["percentage"] = round(result[-1]["percentage"] + diff, 2)
        return result

    def get_transactions(self, user_id: str, start_date: str, end_date: str, limit: int = 10):
        result = self.db_obj.get_transactions(
            user_id=user_id, start_date=start_date, end_date=end_date, limit=limit
        )
        for item in result:
            item["category"] = item["category"].lower()
        return result

    def get_total_balance(self, user_id: str, start_date: str = None, end_date: str = None) -> float:
        if start_date and end_date:
            result = self.db_obj.get_sum_of_total_income_and_spends(
                user_id=user_id, start_date=start_date, end_date=end_date, getAll=False
            )
        else:
            result = self.db_obj.get_sum_of_total_income_and_spends(user_id=user_id, getAll=True)

        if not result or len(result) < 2:
            return 0.0

        total_income = result[0]["total_income"] or 0.0
        total_spent  = result[1]["total_income"] or 0.0
        return total_income + total_spent

    def get_categorized_total_spends_by_date(self, user_id: str, start_date: str, end_date: str):
        result = self.db_obj.get_total_spends_by_date(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        if not result:
            return []
        total_spent, _ = self._calculate_total_expenses(user_id, start_date, end_date)
        if total_spent == 0:
            return result

        pct_sum = 0.0
        for item in result:
            item["percentage"] = round((item["total_spends"] / total_spent) * 100, 2)
            pct_sum += item["percentage"]

        diff = round(100 - pct_sum, 2)
        result[-1]["percentage"] = round(result[-1]["percentage"] + diff, 2)
        return result

    def get_spends_percentage_by_date(self, user_id: str, start_date: str, end_date: str):
        result = self.db_obj.get_total_spends_by_date(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        if not result:
            return []

        total_spends = sum(float(r["total_spends"]) for r in result)
        if total_spends == 0:
            return result

        pct_sum = 0.0
        for r in result:
            r["percentage"] = round((float(r["total_spends"]) / total_spends) * 100, 2)
            pct_sum += r["percentage"]

        max_index = max(range(len(result)), key=lambda i: result[i]["percentage"])
        diff = round(100 - pct_sum, 2)
        result[max_index]["percentage"] = round(result[max_index]["percentage"] + diff, 2)
        return result

    def get_goal(self, user_id: str, reference_id: str) -> list:
        return self.db_obj.get_goals(user_id=user_id, reference_id=reference_id)

    def get_goals(self, user_id: str) -> list:
        return self.db_obj.get_goals(user_id=user_id)

    def get_goals_by_status(self, user_id: str, status: str) -> list:
        return self.db_obj.get_goals_by_status(user_id=user_id, status=status)

    def delete_goal(self, user_id: str, reference_id: str) -> tuple[bool, str]:
        success = self.db_obj.delete_goal(user_id=user_id, reference_id=reference_id)
        return success, "Deleted goal" if success else "Unable to delete goal"

    def create_goal(self, user_id: str, goal_name: str, target_amount: float,deadline: str, category: str, saved_amount: float,goal_notes: str, status: str = "on-track") -> tuple[bool, str]:
        if status not in ['on-track', 'at-risk', 'achieved', 'not-feasible']:
            return False, "Unable to create goal: invalid status"
        success = self.db_obj.create_goal(
            user_id=user_id, goal_name=goal_name, category=category,
            target_amount=target_amount, saved_amount=saved_amount,
            deadline=deadline, goal_notes=goal_notes, status=status
        )
        if success:
            return True, "Goal created successfully"
        return False, "Unable to create goal"

    def update_goal(self, user_id: str, reference_id: str, **kwargs) -> tuple[bool, str]:
        if "goal_name" in kwargs:
            kwargs["title"] = kwargs.pop("goal_name")
        if "goal_notes" in kwargs:
            kwargs["notes"] = kwargs.pop("goal_notes")

        success = self.db_obj.update_goal(
            user_id=user_id, reference_id=reference_id, **kwargs
        )
        if success:
            return True, "Goal updated successfully"
        return False, "Unable to update goal"

    def add_money_to_goal(self, user_id: str, reference_id: str, amount: float) -> tuple[bool, str]:
        # TODO: record contribution in goal_progress table
        # goal_progress links goal_id → expense_id for full audit trail
        # requires add_expense to return lastrowid and a new add_goal_progress method in db_manager
        goal = self.get_goal(user_id, reference_id)
        if not goal:
            return False, "Goal not found"
        current_saved = float(goal[0]["saved_amount"])
        target_amount = float(goal[0]["target_amount"])
        new_saved = current_saved + amount
        if new_saved > target_amount:
            return False, "Cannot add money: amount exceeds target"
        success, message = self.update_goal(
            user_id=user_id, reference_id=reference_id, saved_amount=new_saved
        )
        if not success:
            return False, f"Unable to add money to goal. {message}"
        self.log_expense(
            user_id=user_id,
            amount=amount,
            category="savings",
            description=f"Added to goal '{goal[0]['goal_name']}'",
            date=str(date.today())
        )
        return True, (
            f"Added ${amount:.2f} to goal. "
            f"Saved: ${new_saved:.2f} / ${target_amount:.2f} "
            f"({new_saved / target_amount * 100:.2f}%)"
        )

    def get_avg_income_expenses(self, user_id: str, months: int = 3) -> dict:
        end_date   = datetime.today()
        start_date = (end_date - relativedelta(months=months)).strftime('%Y-%m-%d')
        year, month = start_date.split("-")[:2]
        start_date = f"{year}-{month}-01"
        end_date   = datetime.today().strftime('%Y-%m-%d')
        results = self.db_obj.get_avg_income_expenses(user_id, start_date, end_date)
        avg_income   = results[0]["avg_amount"] if results and len(results) > 0 and results[0]["avg_amount"] else 0.0
        avg_expenses = results[1]["avg_amount"] if results and len(results) > 1 and results[1]["avg_amount"] else 0.0
        return {"avg_income": avg_income, "avg_expenses": avg_expenses}

    # ------------------------------------------------------------------ #
    #  LLM tool router                                                     #
    # ------------------------------------------------------------------ #

    def tool_handler(self, user_id: str, tool_name: str, args: dict) -> str | None:
        if tool_name == "log_income":
            return self.log_income(
                user_id,
                args["amount"],
                args["date"],
                args.get("description", "")
            )

        elif tool_name == "log_expense":
            return self.log_expense(
                user_id,
                args["amount"],
                args["category"],
                args["description"],
                args["date"]
            )

        elif tool_name == "get_balance":
            return self.get_balance(user_id)

        elif tool_name == "get_expense_summary":
            return self.get_expense_summary(user_id, args["start_date"], args["end_date"])

        elif tool_name == "get_goals":
            return json.dumps(self.get_goals(user_id))

        elif tool_name == "create_goal":
            result = self.create_new_goal(
                user_id=user_id,
                goal_name=args["goal_name"],
                target_amount=args["target_amount"],
                deadline=args["deadline"],
                category=args["category"],
                goal_notes=args["goal_notes"],
                force_creation=args.get("force_creation", False)
            )
            return result["message"]

        elif tool_name == "update_goal":
            reference_id = args.pop("reference_id")
            result = self.edit_goal(
                user_id=user_id,
                reference_id=reference_id,
                force_creation=args.pop("force_creation", False),
                **args
            )
            return result["message"]

        elif tool_name == "add_money_to_goal":
            _, message = self.add_money_to_goal(
                user_id=user_id,
                reference_id=args["reference_id"],
                amount=args["amount"]
            )
            return message

        return None

    # ------------------------------------------------------------------ #
    #  Tool schemas for LLM                                                #
    # ------------------------------------------------------------------ #

    def functions_formatter(self) -> list:
        tools = [
            {
                "name": "log_income",
                "description": "Log an income entry (salary, freelance, bonus, etc.) for a specific date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount":      {"type": "number", "description": "Income amount rounded to 2 decimal places."},
                        "date":        {"type": "string", "format": "date", "description": "Date in YYYY-MM-DD format."},
                        "description": {"type": "string", "description": "Source of income (e.g. Salary, Freelance, Bonus)."}
                    },
                    "required": ["amount", "date"],
                    "additionalProperties": False
                }
            },
            {
                "name": "log_expense",
                "description": "Log an expense with amount, category, description, and date.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount":      {"type": "number", "description": "Expense amount."},
                        "category":    {"type": "string", "description": "Category (e.g. Food, Transport)."},
                        "description": {"type": "string", "description": "Brief description."},
                        "date":        {"type": "string", "format": "date", "description": "Date in YYYY-MM-DD format."}
                    },
                    "required": ["amount", "category", "description", "date"],
                    "additionalProperties": False
                }
            },
            {
                "name": "get_balance",
                "description": "Get current month income, total spent, and remaining balance.",
                "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}
            },
            {
                "name": "get_expense_summary",
                "description": "Get expenses grouped by category with totals for a date range.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_date": {"type": "string", "format": "date", "description": "Start date YYYY-MM-DD."},
                        "end_date":   {"type": "string", "format": "date", "description": "End date YYYY-MM-DD."}
                    },
                    "required": ["start_date", "end_date"],
                    "additionalProperties": False
                }
            },
            {
                "name": "get_goals",
                "description": "Get all financial goals for the user.",
                "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}
            },
            {
                "name": "create_goal",
                "description": "Create a financial goal. Returns a warning if the goal may not be feasible based on current finances.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "goal_name":      {"type": "string", "description": "Name of the goal."},
                        "target_amount":  {"type": "number", "description": "Target amount to save."},
                        "deadline":       {"type": "string", "format": "date", "description": "Deadline in YYYY-MM-DD."},
                        "category":       {"type": "string", "description": "Goal category (e.g. Vacation, Emergency Fund)."},
                        "goal_notes":     {"type": "string", "description": "Additional notes."},
                        "force_creation": {"type": "boolean", "description": "Set true to create despite a risk warning."}
                    },
                    "required": ["goal_name", "target_amount", "deadline", "category", "goal_notes"],
                    "additionalProperties": False
                }
            },
            {
                "name": "update_goal",
                "description": "Update an existing goal. Only include fields that need to change.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reference_id":   {"type": "string", "description": "ID of the goal to update."},
                        "goal_name":      {"type": "string", "description": "New name."},
                        "target_amount":  {"type": "number", "description": "New target amount."},
                        "deadline":       {"type": "string", "format": "date", "description": "New deadline in YYYY-MM-DD."},
                        "category":       {"type": "string", "description": "New category."},
                        "goal_notes":     {"type": "string", "description": "New notes."},
                        "force_creation": {"type": "boolean", "description": "Set true to update despite a risk warning."}
                    },
                    "required": ["reference_id"],
                    "additionalProperties": False
                }
            },
            {
                "name": "add_money_to_goal",
                "description": "Add a contribution amount to a goal's saved amount.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reference_id": {"type": "string", "description": "ID of the goal."},
                        "amount":       {"type": "number", "description": "Amount to add."}
                    },
                    "required": ["reference_id", "amount"],
                    "additionalProperties": False
                }
            }
        ]
        return [{"type": "function", "function": t} for t in tools]