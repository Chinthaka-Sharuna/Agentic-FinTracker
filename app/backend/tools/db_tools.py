import calendar
from datetime import date


class DBTools:
    """
    All tool methods are user-scoped.
    Pass user_id to every public method.
    The LLM tool-calling loop uses tool_handler(user_id, tool_name, args).
    """

    def __init__(self, database_obj):
        self.db_obj = database_obj

    # ------------------------------------------------------------------ #
    #  LLM Tools                                                           #
    # ------------------------------------------------------------------ #

    def log_income(self, user_id: str, amount: float, date: str, description: str = "") -> str:
        success = self.db_obj.add_income(
            user_id=user_id, amount=amount,
            date=date, description=description
        )
        if success:
            return f"Income of ${amount} ({description or 'income'}) on {date} saved."
        return "Failed to log income. Please try again."

    def log_expense(self, user_id: str, amount: float, category: str, description: str, date: str) -> str:
        success = self.db_obj.add_expense(
            user_id=user_id, amount=amount,
            category=category, description=description, date=date
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

    # ------------------------------------------------------------------ #
    #  Public helpers (called directly by Flask routes)                   #
    # ------------------------------------------------------------------ #

    def get_current_month_date_range(self):
        """Return (year, month, start_day, end_day, today) all as strings."""
        year, month, day = str(date.today()).split('-')
        last_day = calendar.monthrange(int(year), int(month))[1]
        return year, month, '1', str(last_day), day

    def get_total_income(self, user_id: int) -> dict:
        year, month, _, _, _ = self.get_current_month_date_range()
        # month is already zero-padded from date.today() e.g. '07'
        row = self.db_obj.get_total_income_in_month(user_id=user_id, year=year, month=month)
        return {
            "total_income": float(row["total_income"]) if row and row["total_income"] else 0.0,
            "last_updated": row["last_updated"] if row and row["last_updated"] else "Not recorded yet"
        }

    def get_spent(self, user_id: int) -> float:
        year, month, start_day, end_day, _ = self.get_current_month_date_range()
        start_date = f"{year}-{month}-{start_day}"
        end_date   = f"{year}-{month}-{end_day}"
        total, _   = self._calculate_total_expenses(user_id, start_date, end_date)
        return total

    def get_balance_data(self, user_id: int) -> dict:
        total = self.get_total_income(user_id)["total_income"]
        spent = self.get_spent(user_id)
        return {"total": total, "spent": spent, "remaining": total - spent}

    def _calculate_total_expenses(self, user_id: int, start_date: str, end_date: str):
        result = self.db_obj.get_total_expenses_by_category(
            user_id=user_id, start_date=start_date, end_date=end_date
        )
        if result is False:
            return 0.0, "Something went wrong while calculating expenses."
        total = sum(r["total_cost"] for r in result) if result else 0.0
        return total, None

    def get_categorized_summary(self, user_id: int, start_date: str, end_date: str):
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
        if result:
            result[-1]["percentage"] = round(result[-1]["percentage"] + diff, 2)

        return result

    def get_transactions(self, user_id: int, start_date: str, end_date: str, limit: int = 10):
        result = self.db_obj.get_transactions(
            user_id=user_id, start_date=start_date, end_date=end_date, limit=limit
        )
        for item in result:
            item["category"] = item["category"].lower()
        return result

    # ------------------------------------------------------------------ #
    #  LLM tool router                                                     #
    # ------------------------------------------------------------------ #

    def tool_handler(self, user_id: int, tool_name: str, args: dict) -> str:
        if tool_name == "log_income":
            return self.log_income(
                user_id,
                args["amount"],
                args["date"],
                args.get("description", "")
            )
        elif tool_name == "log_expense":
            return self.log_expense(
                user_id, args["amount"], args["category"],
                args["description"], args["date"]
            )
        elif tool_name == "get_balance":
            return self.get_balance(user_id)
        elif tool_name == "get_expense_summary":
            return self.get_expense_summary(user_id, args["start_date"], args["end_date"])
        return "Unknown tool requested."

    # ------------------------------------------------------------------ #
    #  Tool schema for LLM                                                 #
    # ------------------------------------------------------------------ #

    def functions_formatter(self) -> list:
        tools_map = {
            "log_income": {
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
            "log_expense": {
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
            "get_balance": {
                "name": "get_balance",
                "description": "Get current month income, total spent, and remaining balance.",
                "parameters": {"type": "object", "properties": {}, "required": [], "additionalProperties": False}
            },
            "get_expense_summary": {
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
            }
        }

        return [{"type": "function", "function": v} for v in tools_map.values()]