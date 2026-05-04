from app.backend.models.chatbot import Chatbot
from config.config import Config
from app.frontend.gradio_ui import ChatBotUI
from app.backend.database.db_manager import DatabaseManager
from app.backend.tools.db_tools import DBTools
import gradio as gr


def chat(message, history, pdf_file=None):
    # If a PDF is uploaded, extract its content and prepend it to the message
    if pdf_file is not None:
        extracted = chatbot.pdf_to_text(pdf_file)
        if extracted:
            message = f"I have uploaded a PDF. Here is its extracted content:\n{extracted}\n\nUser message: {message}"
        else:
            message = f"{message}\n\n[Note: A PDF was uploaded but could not be parsed.]"
        return chatbot.send_message(message), gr.update(value=None, visible=False)

    return chatbot.send_message(message),gr.update()


db = DatabaseManager(Config.DATABASE_PATH)
db_tools = DBTools(database_obj=db)
tools = db_tools.functions_formatter()
chatbot = Chatbot(api_key=Config.API_KEY, tools_obj=db_tools, system_prompt=Config.chat_bot_system_prompt, pdf_to_text_system_prompt=Config.pdf_extractor_system_prompt)
chatbot_UI = ChatBotUI(chat_function=chat)
chatbot_UI.lanuch_chat_UI()