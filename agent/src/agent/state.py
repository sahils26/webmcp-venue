from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    user_query: str
    tool_results: List[Dict[str, Any]]
    final_response: str
