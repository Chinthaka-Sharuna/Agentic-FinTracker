import gradio as gr

class ChatBotUI:
    def __init__(self, chat_function):
        self.chat_UI = self.init_chat_UI(chat_function)

    def init_chat_UI(self, chat_function):
        pdf_file=gr.File(
            label="Upload PDF (optional)",
            file_types=[".pdf"],
            file_count="single",
            type="filepath"
        )

        chat_UI = gr.ChatInterface(
            fn=chat_function,
            textbox=gr.Textbox(placeholder="Type a message...", label="You"),
            chatbot=gr.Chatbot(label="ChatBot", height=500),
            title="My Chatbot",
            examples=[
                ["Hello!", None],
                ["Tell me a joke", None],
                ["What can you do?", None],
            ],
            additional_inputs=[pdf_file],
            additional_outputs=[pdf_file],
            additional_inputs_accordion=gr.Accordion(label="📎 Attach PDF", open=False),
        )
        return chat_UI

    def lanuch_chat_UI(self):
        self.chat_UI.launch()