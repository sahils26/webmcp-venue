import asyncio
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Literal

sys.path.append(str(Path(__file__).parent))

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from agent.graph import build_agent
from browser.webmcp_client import WebMCPClient

AGENT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(AGENT_DIR / ".env")

logger = logging.getLogger(__name__)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://localhost:5173",
        "https://localhost:5174",
        "https://127.0.0.1:5173",
        "https://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Playwright's sync API must be initialized and used from one consistent thread.
agent_worker = ThreadPoolExecutor(max_workers=1, thread_name_prefix="webmcp-agent")
webmcp_client = None
graph_agent = None


class AgentConfigurationError(RuntimeError):
    pass


class ChatMessage(BaseModel):
    role: Literal["system", "assistant", "user"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1)


def get_agent():
    global webmcp_client, graph_agent

    if graph_agent is None:
        api_key = os.getenv("MISTRAL_API_KEY")

        if not api_key:
            raise AgentConfigurationError("MISTRAL_API_KEY is missing. Add it to agent/.env.")

        logger.info("Starting WebMCP client...")
        webmcp_client = WebMCPClient(headless=True)
        webmcp_client.start()

        logger.info("Building Mistral agent...")
        graph_agent = build_agent(webmcp_client, api_key)
        logger.info("Agent initialized successfully")

    return graph_agent


def run_chat(request: ChatRequest):
    agent = get_agent()
    webmcp_client.reset_tool_calls()

    message_types = {
        "system": SystemMessage,
        "assistant": AIMessage,
        "user": HumanMessage,
    }
    messages = {
        "messages": [
            message_types[message.role](content=message.content)
            for message in request.messages
        ]
    }
    config = {
        "configurable": {"thread_id": "api_thread"},
        "recursion_limit": 15,
    }
    final_response = ""

    for chunk in agent.stream(messages, config=config):
        for node, state in chunk.items():
            if node != "agent":
                continue

            message = state["messages"][-1]
            if getattr(message, "content", None):
                final_response = message.content

    return {
        "response": final_response,
        "tool_calls": webmcp_client.consume_tool_calls(),
    }


@app.get("/")
@app.get("/health")
def health():
    return {
        "status": "ok",
        "mistral_configured": bool(os.getenv("MISTRAL_API_KEY")),
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    loop = asyncio.get_running_loop()

    try:
        return await loop.run_in_executor(agent_worker, run_chat, request)
    except AgentConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        error_str = str(error)
        if "429" in error_str or "rate_limited" in error_str.lower() or "Rate limit" in error_str:
            raise HTTPException(status_code=429, detail="Rate limit reached on the free Mistral tier. Please wait 30 seconds and try again.") from error
        logger.exception("Agent request failed")
        raise HTTPException(status_code=500, detail="Agent request failed.") from error


@app.on_event("shutdown")
def shutdown_agent():
    if webmcp_client is not None:
        agent_worker.submit(webmcp_client.stop).result(timeout=10)
    agent_worker.shutdown(wait=True)
