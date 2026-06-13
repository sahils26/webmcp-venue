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
                # Filter out None values so we don't pass null for optional arguments
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
    system_prompt = """You are a venue planning assistant for spaces360. Help users find event spaces, check availability, and get quotes.

RULES:
1. Call a tool ONCE. Do not call the same tool twice.
2. After receiving a tool result, immediately answer the user. Do NOT say "technical difficulties".
3. The tool result is a JSON string. Read the "venues" array and list each venue's name, capacity, and price.
4. If the JSON contains "success": true, the data is valid — present it directly.
5. Never call more than 2 tools per user message.
6. ONLY use venue names that appear in the tool result JSON. Never invent or guess venue names."""
    
    agent = create_react_agent(llm, tools, prompt=system_prompt)
    return agent
