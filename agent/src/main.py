import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage

# Add src to python path for easy imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from browser.webmcp_client import WebMCPClient
from agent.graph import build_agent

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        logger.error(
            "Please set MISTRAL_API_KEY in .env file inside the agent/ directory."
        )
        sys.exit(1)

    logger.info("Initializing WebMCP Browser Client (headless mode)...")
    client = WebMCPClient(headless=True)
    try:
        client.start()
        logger.info("Connected to venue webpage! Discovered tools:")
        for t in client.get_tools():
            logger.info(f"- {t['name']}")

        logger.info("Building Mistral Agent...")
        agent_executor = build_agent(client, api_key)

        print("\n=== Agent Ready! (type 'quit' to exit) ===")
        # We add a thread ID to maintain conversation memory
        config = {"configurable": {"thread_id": "cli_thread"}, "recursion_limit": 10}


        while True:
            try:
                user_input = input("\nYou: ")
            except (EOFError, KeyboardInterrupt):
                break

            if user_input.strip().lower() in ["quit", "exit", "q"]:
                break

            messages = {"messages": [HumanMessage(content=user_input)]}

            # Run the agent
            try:
                for chunk in agent_executor.stream(messages, config=config):
                    for node, state in chunk.items():
                        if node == "agent":
                            msg = state["messages"][-1]
                            if msg.content:
                                print(f"\nAssistant: {msg.content}")
                            elif hasattr(msg, "tool_calls") and msg.tool_calls:
                                pass  # We already log this inside webmcp_client
            except Exception as e:
                if "429" in str(e) or "rate_limited" in str(e).lower():
                    print("\nAssistant: Rate limit reached on the free API tier. Please wait 30 seconds and try again.")
                else:
                    print(f"\nAssistant: Something went wrong — {str(e)}")
    finally:
        import time; time.sleep(1)  # let pending async tasks finish before closing browser
        logger.info("Shutting down browser...")
        client.stop()


if __name__ == "__main__":
    main()
