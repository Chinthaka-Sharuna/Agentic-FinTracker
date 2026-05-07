import os
import yaml
from datetime import date
from dotenv import load_dotenv

load_dotenv()


class Config:
    API_KEY = os.getenv("API_KEY")

    with open(os.path.join(".","app","config","config.YAML"), "r") as f:
        _config = yaml.safe_load(f)

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    DATABASE_PATH = _config["paths"]["database"]
    APP_STATIC = _config["paths"]["app_static"]
    APP_TEMPLATES =  _config["paths"]["app_templates"]
    TABLES_SCRIPT = _config["paths"]["tables_scripts"]

    # chatbot configurations from YAML
    CHAT_BOT_MODEL = _config["chatbot"]["model"]
    CHAT_BOT_SYSTEM_PROMPT = _config["chatbot"]["system_prompt"] + f"\nToday's date is {str(date.today())}."
    CHAT_BOT_BASE_URL = _config["chatbot"]["base_url"]

    # pdf extractor configurations from YAML
    PDF_EXTRACTOR_MODEL = _config["pdf_extractor"]["model"]
    PDF_EXTRACTOR_SYSTEM_PROMPT = _config["pdf_extractor"]["system_prompt"]
    PDF_EXTRACTOR_BASE_URL = _config["pdf_extractor"]["base_url"]

    # Tool configurations from YAML
    TOOLS_NAMES = _config["tools"]["names"]

    SET_SALARY_DESC = _config["tools"]["set_salary"]["description"]
    SET_SALARY_PROPS = _config["tools"]["set_salary"]["properties"]

    LOG_EXPENSE_DESC = _config["tools"]["log_expense"]["description"]
    LOG_EXPENSE_PROPS = _config["tools"]["log_expense"]["properties"]

    GET_BALANCE_DESC = _config["tools"]["get_balance"]["description"]

    GET_EXPENSE_SUMMARY_DESC = _config["tools"]["get_expense_summary"]["description"]
    GET_EXPENSE_SUMMARY_PROPS = _config["tools"]["get_expense_summary"]["properties"]