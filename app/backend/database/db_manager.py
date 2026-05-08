import sqlite3 as sqli
import threading

from traits.trait_types import false


class DatabaseManager:
    """
    Thread-safe SQLite database manager.
    All queries are scoped to a user_id for multi-user isolation.
    """

    def __init__(self, db_path: str):
        self.conn = sqli.connect(db_path, check_same_thread=False)
        self.conn.execute("PRAGMA foreign_keys = ON")
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    def _write(self, query: str, params: dict | tuple) -> bool:
        """Execute INSERT / UPDATE / DELETE. Returns True on success."""
        with self._lock:
            cur = self.conn.cursor()
            try:
                cur.execute(query, params)
                self.conn.commit()
                return True
            except sqli.IntegrityError as e:
                self.conn.rollback()
                print(f"[DB] Integrity error: {e}")
                return False
            except Exception as e:
                self.conn.rollback()
                print(f"[DB] Unexpected error: {e}")
                return False
            finally:
                cur.close()

    def _fetch(self, query: str, params=None, fetch_all: bool = True):
        """
        Execute SELECT. Returns:
          - list of dicts  (fetch_all=True)
          - dict or None   (fetch_all=False)
          - False          on error
        """
        cur = self.conn.cursor()
        try:
            cur.execute(query, params or ())
            if cur.description is None:
                return None
            colnames = [d[0] for d in cur.description]
            if fetch_all:
                rows = cur.fetchall()
                return [dict(zip(colnames, row)) for row in rows]
            else:
                row = cur.fetchone()
                return dict(zip(colnames, row)) if row else None
        except sqli.Error as e:
            print(f"[DB] Fetch error: {e}")
            self.conn.rollback()
            return False
        finally:
            cur.close()

    def execute_script(self, script_path: str) -> bool:
        """Run a .sql file (used for schema setup)."""
        with self._lock:
            cur = self.conn.cursor()
            try:
                with open(script_path, "r") as f:
                    script = f.read()
                cur.executescript(script)
                self.conn.commit()
                return True
            except sqli.Error as e:
                print(f"[DB] Script error: {e}")
                return False
            finally:
                cur.close()

    # ------------------------------------------------------------------ #
    #  Users                                                               #
    # ------------------------------------------------------------------ #

    def create_user(self, username: str, email: str, password_hash: str) -> bool:
        sql = """
            INSERT INTO users (username, email, password_hash)
            VALUES (:username, :email, :password_hash);
        """
        return self._write(sql, {"username": username, "email": email, "password_hash": password_hash})

    def get_user_by_email(self, email: str) -> dict | None:
        sql = "SELECT * FROM users WHERE email = :email;"
        return self._fetch(sql, {"email": email}, fetch_all=False)

    def get_user_by_id(self, user_id: int) -> dict | None:
        sql = "SELECT id, username, email, created_at FROM users WHERE id = :user_id;"
        return self._fetch(sql, {"user_id": user_id}, fetch_all=False)

    # ------------------------------------------------------------------ #
    #  Sessions                                                            #
    # ------------------------------------------------------------------ #

    def create_session(self, session_id: str, user_id: int, expires_at: str) -> bool:
        sql = """
            INSERT INTO sessions (id, user_id, expires_at)
            VALUES (:session_id, :user_id, :expires_at);
        """
        return self._write(sql, {"session_id": session_id, "user_id": user_id, "expires_at": expires_at})

    def get_session(self, session_id: str) -> dict | None:
        sql = """
            SELECT s.*, u.username, u.email
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = :session_id AND s.expires_at > CURRENT_TIMESTAMP;
        """
        return self._fetch(sql, {"session_id": session_id}, fetch_all=False)

    def delete_session(self, session_id: str) -> bool:
        return self._write("DELETE FROM sessions WHERE id = :session_id;", {"session_id": session_id})

    def delete_expired_sessions(self) -> bool:
        return self._write("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP;", ())

    # ------------------------------------------------------------------ #
    #  Chat history                                                        #
    # ------------------------------------------------------------------ #

    def save_chat_message(self, user_id: int, role: str, content: str) -> bool:
        sql = """
            INSERT INTO chat_history (user_id, role, content)
            VALUES (:user_id, :role, :content);
        """
        return self._write(sql, {"user_id": user_id, "role": role, "content": content})

    def get_chat_history(self, user_id: int, limit: int = 50) -> list:
        """Return the last `limit` user/assistant messages, oldest-first."""
        sql = """
            SELECT role, content FROM chat_history
            WHERE user_id = :user_id AND role IN ('user', 'assistant')
            ORDER BY created_at DESC
            LIMIT :limit;
        """
        rows = self._fetch(sql, {"user_id": user_id, "limit": limit})
        if not rows:
            return []
        return list(reversed(rows))   # oldest first

    def clear_chat_history(self, user_id: int) -> bool:
        return self._write("DELETE FROM chat_history WHERE user_id = :user_id;", {"user_id": user_id})

    # ------------------------------------------------------------------ #
    #  Income                                                              #
    # ------------------------------------------------------------------ #

    def add_income(self, user_id: int, amount: float, date: str, description: str = "") -> bool:
        sql = """
            INSERT INTO income (user_id, amount, description, date)
            VALUES (:user_id, :amount, :description, :date);
        """
        return self._write(sql, {
            "user_id": user_id, "amount": amount,
            "description": description, "date": date
        })

    def get_total_income_in_month(self, user_id: int, start_date: str, end_date: str) -> dict | None:
        """
        year  — 4-digit string e.g. '2026'
        month — zero-padded 2-digit string e.g. '07'
        """
        sql = """
            SELECT SUM(amount) AS total_income, MAX(created_at) AS last_updated
            FROM income
            WHERE user_id = :user_id AND (date BETWEEN :start_date AND :end_date);
        """
        return self._fetch(sql, {"user_id": user_id, "start_date": start_date, "end_date": end_date}, fetch_all=False)

    def get_all_income(self, user_id: int, start_date: str = None, end_date: str = None) -> list:
        if start_date and end_date:
            sql = """
                SELECT id, amount, description, date
                FROM income
                WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
                ORDER BY date DESC;
            """
            return self._fetch(sql, {"user_id": user_id, "start_date": start_date, "end_date": end_date}) or []
        else:
            sql = """
                SELECT id, amount, description, date
                FROM income WHERE user_id = :user_id ORDER BY date DESC;
            """
            return self._fetch(sql, {"user_id": user_id}) or []

    # ------------------------------------------------------------------ #
    #  Expenses                                                            #
    # ------------------------------------------------------------------ #

    def add_expense(self, user_id: int, amount: float, category: str, description: str, date: str) -> bool:
        sql = """
            INSERT INTO expenses (user_id, amount, category, description, date)
            VALUES (:user_id, :amount, :category, :description, :date);
        """
        return self._write(sql, {
            "user_id": user_id, "amount": amount,
            "category": category, "description": description, "date": date
        })

    def get_total_expenses_by_category(self, user_id: int, start_date: str, end_date: str):
        sql = """
            SELECT category, SUM(amount) AS total_cost
            FROM expenses
            WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
            GROUP BY category
            ORDER BY SUM(amount) DESC;
        """
        return self._fetch(sql, {"user_id": user_id, "start_date": start_date, "end_date": end_date})

    def get_transactions(self, user_id: int, start_date: str, end_date: str, limit: int = 10) -> list:
        sql = """
            SELECT id, amount, category, description, date
            FROM expenses
            WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
            ORDER BY date DESC
            LIMIT :limit;
        """
        return self._fetch(sql, {"user_id": user_id, "start_date": start_date,"end_date": end_date, "limit": limit}) or []

    def get_all_transactions(self, user_id: int, start_date: str = None, end_date: str = None) -> list:
        if start_date and end_date:
            sql = """
                select amount,description,'income' as category,date
                from income
                WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
                union all
                select (-1)*amount,description,category,date
                from expenses
                WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
                
                ORDER BY date DESC;
            """
            return self._fetch(sql, {"user_id": user_id, "start_date": start_date, "end_date": end_date}) or []
        else:
            sql = """
                select amount,description,'income' as category,date
                from income
                WHERE user_id = :user_id
                union all
                select (-1)*amount,description,category,date
                from expenses
                WHERE user_id = :user_id
                
                ORDER BY date DESC;
            """
            return self._fetch(sql, {"user_id": user_id}) or []

    def get_all_records(self, user_id: int, start_date: str = None, end_date: str = None) -> list:
        """
        Merge income and expenses into one timeline, ordered by date DESC.
        type column = 'income' or 'expense'
        """
        params = {"user_id": user_id}
        date_filter = ""
        if start_date and end_date:
            date_filter = "AND date BETWEEN :start_date AND :end_date"
            params["start_date"] = start_date
            params["end_date"]   = end_date

        sql = f"""
            SELECT 'income'  AS type, id, amount, description, NULL AS category, date, created_at
            FROM income
            WHERE user_id = :user_id {date_filter}

            UNION ALL

            SELECT 'expense' AS type, id, amount, description, category, date, created_at
            FROM expenses
            WHERE user_id = :user_id {date_filter}

            ORDER BY date DESC;
        """
        return self._fetch(sql, params) or []

    def delete_expense(self, user_id: int, expense_id: int) -> bool:
        """Delete an expense only if it belongs to the user."""
        return self._write(
            "DELETE FROM expenses WHERE id = :id AND user_id = :user_id;",
            {"id": expense_id, "user_id": user_id}
        )

    def delete_income(self, user_id: int, income_id: int) -> bool:
        """Delete an income record only if it belongs to the user."""
        return self._write(
            "DELETE FROM income WHERE id = :id AND user_id = :user_id;",
            {"id": income_id, "user_id": user_id}
        )

    def get_sum_of_total_income_and_spends(self, user_id: int, start_date: str = None,end_date: str = None, getAll: bool = False) -> list:
        if getAll:
            sql = """
                  SELECT COALESCE(SUM(amount), 0) AS total_income
                  FROM income
                  WHERE user_id = :user_id
                  UNION ALL
                  SELECT COALESCE(SUM(-1 * amount), 0) AS total_income
                  FROM expenses
                  WHERE user_id = :user_id
                  """
            result = self._fetch(sql, {"user_id": user_id})
        else:
            sql = """
                  SELECT COALESCE(SUM(amount), 0) AS total_income
                  FROM income
                  WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
                  UNION ALL
                  SELECT COALESCE(SUM(-1 * amount), 0) AS total_income
                  FROM expenses
                  WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
                  """
            result = self._fetch(sql, {
                "user_id": user_id,
                "start_date": start_date,
                "end_date": end_date
            })
        return result if result else []


    def get_total_spends_by_date(self, user_id: int, start_date: str, end_date: str) -> list:
        sql = """
            SELECT date, SUM(amount) AS total_spends
            FROM expenses
            WHERE user_id = :user_id AND date BETWEEN :start_date AND :end_date
            GROUP BY date
            ORDER BY date ASC;
        """
        return self._fetch(sql, {"user_id": user_id, "start_date": start_date, "end_date": end_date}) or []