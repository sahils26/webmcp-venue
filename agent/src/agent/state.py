from typing import TypedDict, List, Dict, Any


class AgentInput(TypedDict):
    user_query: str


class AgentOutput(TypedDict):
    final_response: str


class AgentState(TypedDict):
    input: AgentInput
    tool_results: List[Dict[str, Any]]
    output: AgentOutput