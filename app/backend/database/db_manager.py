import sqlite3 as sqli
import threading


class DatabaseManager:
    def __init__(self,db_path):
        self.conn = sqli.connect(db_path,check_same_thread=False)
        self.cursor = self.conn.cursor()
        self._lock = threading.Lock()

    # params => query, params
    # this function handles INSERT / UPDATE / DELETE returns True on success, False on failure
    # returns True on success, False on failure
    def _input_error_handler(self,query,params):
        with self._lock:
            try:
                self.cursor.execute(query,params)
                self.conn.commit()
                print("Success: Database operation completed.")
                return True
            except sqli.IntegrityError as e:
                self.conn.rollback()
                print(f"Integrity error: {e}")
                return False
            except Exception as e:
                self.conn.rollback()
                print(f"Unexpected error: {e}")
                return False
            finally:
                self.cursor.close()
                self.cursor = self.conn.cursor()

    # params => query, params, fetch_all
    # this function handles all retrieve  queries(SELECT) returns dict or list of dicts, None on failure
    # returns dict or list of dicts, None on failure
    def _fetch_data_handler(self,query,params=None,fetch_all=True):
        try:
            self.cursor.execute(query,params or ())
            if self.cursor.description is None:
                return None
            colnames = [desc[0] for desc in self.cursor.description]
            if fetch_all:
                rows = self.cursor.fetchall()
                return [dict(zip(colnames, row)) for row in rows]
            else:
                row = self.cursor.fetchone()
                return dict(zip(colnames, row)) if row else None
        except sqli.Error as e:
            print(f"Error fetching data: {e}")
            if hasattr(self,'conn') and self.conn:
                self.conn.rollback()
            return False

    # params => script_path
    # this function executes a sql script from a file
    # return true if it success or false if it failed
    def excute_script(self,script_path):
        try:
            with open(script_path, "r") as f:
                script = f.read()
            self.cursor.executescript(script)
            self.conn.commit()
            return True
        except sqli.Error as e:
            print(f"Database error: {e}")
            return None

    # params => amount,month,year
    # this function add new salary into salary table
    # return true if it success or false if it failed
    def add_salary(self,amount,month,year):
        sql = """ 
              insert into salary(amount, month, year)
              values (:amount, :month, :year);
            """
        success_state = self._input_error_handler(sql, {"amount": amount, "month": month, "year": year})
        return success_state


    #params => amount, category, description, date
    # this function add new expense into expenses table
    # return true if it success or false if it failed
    def add_expense(self,amount, category, description, date):
        sql = """ 
              insert into expenses(amount, category, description, date)
              values (:amount, :category, :description, :date);
            """
        success_state = self._input_error_handler(sql, {"amount":amount,"category":category,"description":description,"date": date})
        return success_state

    def get_expenses_by_dates(self,start_date, end_date):
        sql = """ 
          select *
          from expenses
          where date between :start_date and :end_date;
        """
        data = self._fetch_data_handler(sql, {"start_date": start_date, "end_date": end_date}, True)
        return data


    def get_total_expenses_by_category(self,start_date, end_date):
        sql="""
            select category,sum(amount) as total_cost
            from expenses
            where date between (:start_date) and (:end_date)
            group by category
            ORDER BY sum(amount) DESC;
        """
        data = self._fetch_data_handler(sql,params={"start_date": start_date, "end_date": end_date})
        return data

    def get_total_salaries_in_range(self,start_year,end_year,lower_month,end_month):
        sql = """
            select sum(amount)
            from salary
            where (year between (:start_year) and (:end_year)) and (month  between :lower_month and :end_month);
        """
        data=self._fetch_data_handler(sql,params={":start_year":start_year,":end_year":end_year,":lower_month":lower_month,":end_month":end_month})
        return data

    def get_total_salary_in_month(self,year,month):
        sql = """
              select sum(amount) as total_salary
              from salary
              where year=:year and month=:month;
              """
        data = self._fetch_data_handler(sql, params={"year": year, "month": month}, fetch_all=False)
        return data
