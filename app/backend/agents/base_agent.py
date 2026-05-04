from openai import OpenAI


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


    def api_call(self, model: str, messages: list, tools: list = None):
        """
        Make a call to the OpenAI-compatible API.

        Params:
            model    : The model to use for this call
            messages : The conversation messages list
            tools    : (Optional) List of tool definitions for function calling

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

        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0]