import json
from .base_agent import BaseAgent


class Chatbot(BaseAgent):

    def __init__(self,api_key: str,base_url: str = "https://api.openai.com/v1",model: str = "gpt-5-nano",system_prompt: str = "You are a helpful assistant.",tools_obj=None,save_msg=None):

        """
            Conversational agent that handles user messages and tool calling.

            This agent manages the conversation history, sends messages to the LLM,
            and handles the tool-calling loop (LLM requests a tool → we execute it →
            send the result back → repeat until LLM gives a final answer).

            Params:
                api_key        : Your API key
                base_url       : The base URL of the API provider
                model          : The model to use (e.g. "gpt-5-nano")
                system_prompt  : The system prompt defining the agent's behavior
                tools_obj      : An object that has:
                                 - tool_handler(tool_name, args) → executes a tool
                                 - functions_formatter() → returns tool definitions for the API
        """

        super().__init__(api_key=api_key, base_url=base_url, model=model)
        self.tools_obj = tools_obj
        self.conversation_history = [
            {"role": "system", "content": system_prompt}
        ]
        self.save_msg=save_msg

    def send_message(self, message: str,user_id:str=None) -> str:
        """
        Send a user message and get the assistant's response.

        This handles the full tool-calling loop:
        1. Send user message to the LLM
        2. If LLM wants to call tools → execute them and send results back
        3. Repeat step 2 until LLM gives a final text response
        4. Return the final response

        Params:
            message : The user's message text

        Returns:
            The assistant's final response text
        """
        # Add the user's message to history
        self.conversation_history.append({
            "role": "user",
            "content": message,
        })
        if self.save_msg:
            self.save_msg(role=self.conversation_history[-1]['role'],content=self.conversation_history[-1]['content'],user_id=user_id)

        # Get response from LLM
        tools = self.tools_obj.functions_formatter()
        response = self.api_call(
            model=self.model,
            messages=self.conversation_history,
            tools=tools,
        )

        # Tool-calling loop: keep going until the LLM stops requesting tools
        while response.finish_reason == "tool_calls":
            self._handle_tool_calls(response.message,user_id)
            response = self.api_call(
                model=self.model,
                messages=self.conversation_history,
                tools=tools,
            )

        # Add the final assistant response to history and return it
        assistant_message = response.message.content
        self.conversation_history.append({
            "role": "assistant",
            "content": assistant_message,
        })
        if self.save_msg:
            self.save_msg(role="assistant", content=assistant_message, user_id=user_id)
        return assistant_message

    def _handle_tool_calls(self, message,user_id):
        """
        Execute all tool calls requested by the LLM and add results to history.

        Params:
            message : The assistant message containing tool_calls
        """
        # Add the assistant's tool-call message to history
        self.conversation_history.append(message)

        # Execute each tool and collect results
        tool_results = []
        for tool_call in message.tool_calls:
            tool_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)
            result = self.tools_obj.tool_handler(user_id,tool_name=tool_name, args=args)

            tool_results.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })
            if self.save_msg:
                self.save_msg(role="tool",content=result, user_id=user_id)


        # Add all tool results to history
        self.conversation_history.extend(tool_results)

    def clear_history(self):
        """Reset conversation history, keeping only the system prompt."""
        self.conversation_history = [self.conversation_history[0]]

    def stream_message(self, message: str, user_id: str = None):
        """
            Generator that yields text chunks as the assistant responds.
            Tool call rounds are handled silently (fully consumed, not streamed).
            Only the final text response is yielded chunk by chunk.
        """
        self.conversation_history.append({"role": "user", "content": message})
        if self.save_msg:
            self.save_msg(role="user", content=message, user_id=user_id)

        tools = self.tools_obj.functions_formatter()

        while True:
            stream       = self.api_call(model=self.model, messages=self.conversation_history, tools=tools, stream=True)
            finish_reason   = None
            content_chunks  = []
            tool_calls_raw  = {}

            for chunk in stream:
                choice        = chunk.choices[0]
                finish_reason = choice.finish_reason or finish_reason
                delta         = choice.delta

                # Stream text chunks to the client
                if delta.content:
                    content_chunks.append(delta.content)
                    yield delta.content

                # Assemble tool call chunks (they arrive fragmented)
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_raw:
                            tool_calls_raw[idx] = {
                                "id":       tc.id or "",
                                "type":     "function",
                                "function": {"name": tc.function.name or "", "arguments": ""}
                            }
                        if tc.id:
                            tool_calls_raw[idx]["id"] = tc.id
                        if tc.function.name:
                            tool_calls_raw[idx]["function"]["name"] = tc.function.name
                        if tc.function.arguments:
                            tool_calls_raw[idx]["function"]["arguments"] += tc.function.arguments

            if finish_reason == "tool_calls":
                # Build the assistant message containing tool_calls
                assembled = [tool_calls_raw[i] for i in sorted(tool_calls_raw)]
                self.conversation_history.append({
                    "role":       "assistant",
                    "content":    None,
                    "tool_calls": assembled
                })

                # Execute every tool and collect results
                tool_results = []
                for tc in assembled:
                    tool_name = tc["function"]["name"]
                    args      = json.loads(tc["function"]["arguments"])
                    result    = self.tools_obj.tool_handler(user_id, tool_name=tool_name, args=args)
                    tool_results.append({
                        "role":        "tool",
                        "tool_call_id": tc["id"],
                        "content":     result
                    })
                    if self.save_msg:
                        self.save_msg(role="tool", content=result, user_id=user_id)

                self.conversation_history.extend(tool_results)
                # loop back — get the next response (may be another tool call or final text)

            else:
                # Final text response — save and stop
                full_content = "".join(content_chunks)
                self.conversation_history.append({"role": "assistant", "content": full_content})
                if self.save_msg:
                    self.save_msg(role="assistant", content=full_content, user_id=user_id)
                break