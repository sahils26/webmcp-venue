from pydantic import create_model, Field
from typing import Any
from langchain_core.tools import StructuredTool
from langchain_core.rate_limiters import InMemoryRateLimiter
from langgraph.prebuilt import create_react_agent
from langchain_mistralai import ChatMistralAI

def json_schema_to_pydantic(name: str, schema: dict):
    properties = schema.get("properties", {})
    required = schema.get("required", [])
    
    fields = {}
    for prop_name, prop_info in properties.items():
        prop_type = Any
        t = prop_info.get("type")
        if t == "string":
            prop_type = str
        elif t == "number" or t == "integer":
            prop_type = float
        elif t == "boolean":
            prop_type = bool
        elif t == "array":
            prop_type = list
        
        default_val = ... if prop_name in required else None
        fields[prop_name] = (prop_type, Field(default=default_val, description=prop_info.get("description", "")))
        
    return create_model(f"{name}Schema", **fields)

def map_webmcp_to_lc_tools(webmcp_client):
    raw_tools = webmcp_client.get_tools()
    tools = []
    for t in raw_tools:
        name = t['name']
        description = t['description']
        schema = t.get('inputSchema', {})
        
        args_schema = json_schema_to_pydantic(name, schema)
        
        # We need a factory to capture the name for each iteration correctly
        def create_tool_func(tool_name):
            def tool_func(**kwargs):
                clean_kwargs = {k: v for k, v in kwargs.items() if v is not None}
                return webmcp_client.call_tool(tool_name, clean_kwargs)
            return tool_func
            
        tool = StructuredTool.from_function(
            func=create_tool_func(name),
            name=name,
            description=description,
            args_schema=args_schema
        )
        tools.append(tool)
    return tools

from datetime import date as _date


def build_agent(webmcp_client, api_key):
    # mistral-small is struggling with tool reasoning and getting stuck in loops.
    # upgrading to mistral-large-latest for much better tool performance
    rate_limiter = InMemoryRateLimiter(
        requests_per_second=0.15,  # 1 request every ~7s — conservative for free tier
        check_every_n_seconds=0.1,
        max_bucket_size=1,
    )
    llm = ChatMistralAI(model="mistral-large-latest", mistral_api_key=api_key, rate_limiter=rate_limiter)
    tools = map_webmcp_to_lc_tools(webmcp_client)
    today = _date.today().isoformat()
    system_prompt = f"""Today's date is {today}. When a user mentions a date without a year, assume it is in {today[:4]} unless it has already passed, in which case assume the next year.

You are a venue planning assistant for spaces360.

CRITICAL: You have ZERO built-in knowledge of any venues, rooms, prices, or availability. Every answer about venues MUST come from a tool call. If you answer without calling a tool first, you will invent fake venues and wrong data.

RULES:
1. ALWAYS call a tool before answering any question about venues, availability, pricing, or rooms. No exceptions.
2. Call a tool ONCE per question. Do not call the same tool twice.
3. After receiving a tool result, immediately answer the user using ONLY the data in the result.
4. ONLY use venue names, prices, and capacities that appear in the tool result JSON. Never invent or guess.
5. If the JSON contains "success": true, the data is valid — present it directly.
6. Never call more than 2 tools per user message.
7. Do NOT say "technical difficulties". If a tool returns data, use it."""
    
    agent = create_react_agent(llm, tools, prompt=system_prompt)
    return agent
