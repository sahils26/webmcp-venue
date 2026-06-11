import sys
from pathlib import Path
import os

sys.path.append(str(Path(__file__).parent))

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from browser.webmcp_client import WebMCPClient
from agent.graph import build_agent

load_dotenv()

app = FastAPI()

# CORS for React/Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5173",
        "https://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = None
agent_executor = None


class ChatRequest(BaseModel):
    message: str


def get_agent():
    global client, agent_executor

    if agent_executor is None:
        api_key = os.getenv("MISTRAL_API_KEY")

        if not api_key:
            raise ValueError("MISTRAL_API_KEY not found in .env")

        print("Starting WebMCP client...")

        client = WebMCPClient(headless=True)
        client.start()

        print("Building agent...")

        agent_executor = build_agent(client, api_key)

        print("Agent initialized successfully")

    return agent_executor


@app.get("/")
def root():
    return {"status": "ok"}


@app.post("/chat")
def chat(request: ChatRequest):
    agent = get_agent()

    messages = {
        "messages": [
            HumanMessage(content=request.message)
        ]
    }

    config = {
        "configurable": {
            "thread_id": "api_thread"
        },
        "recursion_limit": 15
    }

    final_response = ""

    for chunk in agent.stream(messages, config=config):
        for node, state in chunk.items():
            if node == "agent":
                msg = state["messages"][-1]

                if getattr(msg, "content", None):
                    final_response = msg.content

    return {
        "response": final_response
    }