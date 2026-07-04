from datetime import datetime
from openai import OpenAI
import json

LOG_FILE = "agent_logs.jsonl"

class BaseAgent:

    def __init__(self,api_key: str,base_url: str = "https://api.openai.com/v1",model: str = "gpt-5-nano"):
        """
            Base class for all agents. Handles OpenAI API client setup and API calls.

            This class can work with any OpenAI-compatible API provider (OpenAI, Ollama, etc.)
            by changing the base_url parameter.

            If you are using Ollama as the server, use api_key="Ollama".

            Params:
                api_key   : Your API key
                base_url  : The base URL of the API provider (must be OpenAI-compatible)
                model     : The model to use for this agent
        """
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def _save_log(self,user_message,ai_response,prompt_tokens,completion_tokens,total_tokens,history):

        log_data = {
            "timestamp": str(datetime.now()),
            "model": self.model,
            "history": history,
            "user_message": user_message,
            "ai_response": ai_response,
            "tokens": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            }
        }

        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(log_data, ensure_ascii=False) + "\n")

        except Exception as e:
            print(f"Log save error: {e}")

    def api_call(self, model: str, messages: list, tools: list = None, stream: bool = False):
        """
        Make a call to the OpenAI-compatible API.

        Params:
            model    : The model to use for this call
            messages : The conversation messages list
            tools    : (Optional) List of tool definitions for function calling
            stream   : (Optional) Whether to stream the response

        Returns:
            The first choice from the API response
        """
        kwargs = {
            "model": model,
            "messages": messages,
        }

        # Only include tools if provided (pdf_extractor doesn't need tools)
        if tools:
            kwargs["tools"] = tools

        if stream:
            kwargs["stream"] = True
            return self.client.chat.completions.create(**kwargs)

        user_message=messages[-1]['content'] if messages else ""

        response = self.client.chat.completions.create(**kwargs)
        history=messages[0:-1] if len(messages)>1 else []
        ai_response=response.choices[0].message.content
        prompt_tokens=response.usage.prompt_tokens
        completion_tokens=response.usage.completion_tokens
        total_tokens=response.usage.total_tokens

        self._save_log(user_message,ai_response,prompt_tokens,completion_tokens,total_tokens,history)

        return response.choices[0]



