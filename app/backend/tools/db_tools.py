import calendar
from datetime import date



class DBTools:
    def __init__(self,database_obj):
        self.db_obj = database_obj
        self.total=self._get_total_salry_current_month()
        self.spent = float(self._calculate_current_expenses())

    def set_salary(self,amount, month, year):

        """

            this function add new salary into salary table and update the total salary for the month

            Args:
                amount(float): The salary amount to be added
                month(string): The month name for which is belongs to
                year(string): The year of which salary belong to
            Returns:
                str: A response message indicating whether the save was successful or failed.

            """

        print("set salary function")
        response = "Failed to set salary. Please try again."
        success_state = self.db_obj.add_salary(
            amount=amount,
            month=month,
            year=year
        )
        if success_state:
            response = f"Salary of ${amount} for {month} {year} saved."
        return response

    def log_expense(self,amount, category, description, date):

        """

            this function add the new expenses to the database and update the total spent for the month

            Args:
                amount(float): The expense amount to be added
                category(string): The category of the expense (e.g., Food, Transport, etc.)
                description(string): A brief description of the expense.
                date(string): The date of the expense in YYYY-MM-DD format.

            Returns:
                str: A response message indicating whether the save was successful or failed, along with the updated spent and remaining balance.

            """

        print("log expense function")
        response = "Failed to log expense. Please try again."
        success_state = self.db_obj.add_expense(
            amount=amount,
            category=category,
            description=description,
            date=date
        )
        if success_state:
            response = f"Logged ${amount} for {category}. Spent: ${self.spent} | Remaining: ${self.total-self.spent}"
        return response

    def get_balance(self):

        """
            this function calculate the current balance and remaining balance for the month and return a formatted string with the result

            Returns:
                str: A response message indicating the current month's salary, current balance and remaining balance as a formatted string.(e.g., 'This month Salary: $3000 | Current Balance: $1500 | Remaining Balance: $1500')
            """

        print("get balance function")
        response = "Failed to get balance. Please try again."
        balance=None
        success_state = False
        try:
            balance = self.total-self.spent
            success_state = True
        except Exception as e:
            print(e)
        if success_state:
            response = f"Your \n\t This month Salary :- {self.total} \n\t Spend:- ${self.spent} \n\t Remaining Balance is:- ${balance}"
        return response
    
    

    """
    this function retry the current month all expenses
    Returns:
    
    """
    def get_expense_summary(self,start_date,end_date):
        print("get expense summary function")
        response = "Failed to get expense summary. Please try again."
        success_state = self.db_obj.get_total_expenses_by_category(
            start_date=start_date,
            end_date=end_date
        )
        print(success_state)
        if success_state != False:
            if success_state==None:
                response = "There are no records in db."
            else:
                response = f"Here is the summary \n {success_state}"
        return response

    def _get_current_month_date_range(self):

        """
        This function return the current month's data range with today

        :Return:
        year(string): the current year
        month(string): the current month
        start_day(string): the first day of the month
        end_day(string): the last day of the month
        day(string): day of the today

        """

        year, month, day = str(date.today()).split('-')
        last_day = calendar.monthrange(int(year), int(month))[1]
        return year,month,'1',last_day,day

    def _calulate_total_expenses(self,start_date,end_date):
        total_expenses=0
        error=None
        success_state = self.db_obj.get_total_expenses_by_category(
            start_date=start_date,
            end_date=end_date
        )
        # print(success_state)
        if success_state != False:
            if success_state:
                for record in success_state:
                    total_expenses += record['total_cost']
        else:
            error="Something went wrong while calculating total expenses,Stop immediately contact service desk."
        return total_expenses,error

    def _get_total_salry_current_month(self):
        year,month,_,_,_=self._get_current_month_date_range()
        month_name=calendar.month_name[int(month)]
        current_month_salary=self.db_obj.get_total_salary_in_month(year=year,month=month_name)['total_salary']
        if current_month_salary == None:
            current_month_salary=0
        return current_month_salary




    def _calculate_current_expenses(self):
        print("calculate balance function")
        year,month,start_day,end_day,_=self._get_current_month_date_range()
        start_date=f"{year}-{month}-{start_day}"
        end_date=f"{year}-{month}-{end_day}"
        balance,error=self._calulate_total_expenses(start_date=start_date,end_date=end_date)
        if error != None:
            balance=error
        return balance








    def tool_handler(self, tool_name, args):

        """
            This function is the main tools handle according to input parameters its redirects to corresponding function

            Args:
                tool_name(string): The name of the tool to be executed (e.g., "set_salary", "log_expense", "get_balance", "get_expense_summary").
                args(dict): all the input parameter as a dictionary which dictionary must contain the corresponding function
                parameters as dictionary keys and corresponding parameters values as values.
                    eg:-{
                        "amount": 3000,
                        "month": "September",
                        "year": 2026
                    }
            Returns:
                str: A response message indicating the result of the executed tool or failed.
            """

        if tool_name == "set_salary":
            response = self.set_salary(
                amount=args['amount'],
                month=args['month'],
                year=args['year']
            )
        elif tool_name == "log_expense":
            response = self.log_expense(
                amount=args['amount'],
                category=args['category'],
                description=args['description'],
                date=args['date']
            )
        elif tool_name == "get_balance":
            response = self.get_balance()
        elif tool_name == "get_expense_summary":
            response = self.get_expense_summary(
                start_date=args['start_date'],
                end_date=args['end_date']
            )
        else:
            response = "Something went wrong :( connect developer team immediately"
        return response

    def functions_formatter(self):
        set_salary ={
            "name": "set_salary",
            "description": "Set your monthly salary for a specific month and year.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "The amount of salary to set,rounded to 2 decimal places (e.g., 12.99)."
                    },
                    "month": {
                        "type": "string",
                        "description": "The month name for which the salary is being set."
                    },
                    "year": {
                        "type": "number",
                        "description": "The year of which salary belong to."
                    }
                },
                "required": ["amount", "month", "year"],
                "additionalProperties": False
                }
        }

        log_expense = {
            "name": "log_expense",
            "description": "Log an expense with details such as amount, category, description, and date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "The amount of the expense,rounded to 2 decimal places (e.g., 12.99)."
                    },
                    "category": {
                        "type": "string",
                        "description": "The category of the expense (e.g., Food, Transport, etc.)."
                    },
                    "description": {
                        "type": "string",
                        "description": "A brief description of the expense."
                    },
                    "date": {
                        "type": "string",
                        "format": "date",
                        "description": "The date of the expense in YYYY-MM-DD format."
                    }
                },
                "required": ["amount", "category", "description", "date"],
                "additionalProperties": False
            }
        }

        get_expense_summary = {
            "name": "get_expense_summary",
            "description": "Groups all expenses for the current month by category, calculates totals of each category.Returns A formatted string showing each category, amount, and percentage of salary",
            "parameters": {
                "type": "object",
                "properties": {
                        "start_date": {
                            "type": "string",
                            "format": "date",
                            "description": "The start date of the month in YYYY-MM-DD format."
                        },
                        "end_date": {
                            "type": "string",
                            "format": "date",
                            "description": "The end date of the month in YYYY-MM-DD format."
                        }
                },
                "required": [
                    "start_date",
                    "end_date"
                ],
                "additionalProperties": False
            }
        }

        get_balance = {
            "name": "get_balance",
            "description": "Get the current month's salary, current balance and remaining balance as a formatted string.(e.g., 'This month Salary: $3000 | Current Balance: $1500 | Remaining Balance: $1500')",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            }
        }

        tools_map = {
            "set_salary": set_salary,
            "log_expense": log_expense,
            "get_balance": get_balance,
            "get_expense_summary": get_expense_summary
        }

        tools=[]
        for tool_name in ["set_salary","log_expense","get_balance","get_expense_summary"]:
            tools.append({"type": "function","function": tools_map[tool_name]})

        return tools

