from .db_tools import DBTools


class Tools:
    def __init__(self, db_tools_obj):
        self.db_tools_obj = db_tools_obj
        self._tool_map = self._build_tool_map(self.db_tools_obj)

    def _build_tool_map(self, *handlers) -> dict:
        """Build a {tool_name: handler} dict from all registered handlers."""
        tool_map = {}
        for handler in handlers:
            for schema in handler.functions_formatter():
                tool_name = schema["function"]["name"]
                tool_map[tool_name] = handler
        return tool_map

    def tool_handler(self, user_id: str, tool_name: str, args: dict) -> str:
        handler = self._tool_map.get(tool_name)
        if not handler:
            return "Unknown tool requested."
        return handler.tool_handler(user_id, tool_name, args)

    def functions_formatter(self) -> list:
        """Return merged schemas from all handlers."""
        seen = set()
        schemas = []
        for handler in self._tool_map.values():
            for schema in handler.functions_formatter():
                name = schema["function"]["name"]
                if name not in seen:
                    schemas.append(schema)
                    seen.add(name)
        return schemas