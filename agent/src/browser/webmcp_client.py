import json
import logging
import os
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

class WebMCPClient:
    def __init__(self, headless=True, url=None):
        self.headless = headless
        self.url = url or os.getenv("VENUE_WEBSITE_URL", "https://127.0.0.1:5173")
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.tool_calls = []

    def start(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=self.headless)
        self.context = self.browser.new_context(ignore_https_errors=True)
        self.page = self.context.new_page()

        # Inject WebMCP mock
        self.page.add_init_script("""
            window._webmcpTools = {};
            document.modelContext = {
                registerTool: (tool) => {
                    window._webmcpTools[tool.name] = {
                        description: tool.description,
                        inputSchema: tool.inputSchema,
                        execute: tool.execute
                    };
                }
            };
        """)

        logger.info(f"Navigating to {self.url} ...")
        self.page.goto(self.url, wait_until="networkidle")

    def get_tools(self):
        """Returns the list of registered tool schemas."""
        return self.page.evaluate("""
            () => {
                const tools = [];
                for (const [name, tool] of Object.entries(window._webmcpTools)) {
                    tools.push({
                        name: name,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
                return tools;
            }
        """)

    def call_tool(self, name, args):
        """Executes a tool on the webpage."""
        logger.info(f"--> [Browser] Executing WebMCP tool: {name} with args: {args}")
        try:
            result = self.page.evaluate(f"""
                async () => {{
                    const tool = window._webmcpTools['{name}'];
                    if (!tool) throw new Error("Tool '{name}' not found");
                    return await tool.execute({json.dumps(args)});
                }}
            """)
            self.tool_calls.append({"name": name, "arguments": args})

            # Format output as extremely simple text so Mistral doesn't get confused
            if isinstance(result, dict):
                output = []
                for k, v in result.items():
                    if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                        output.append(f"{k}:")
                        for item in v:
                            output.append(f"  - {item.get('name', 'Item')}: {str(item)}")
                    else:
                        output.append(f"{k}: {v}")
                return "\n".join(output)
            return str(result)
        except Exception as e:
            return f"Error executing tool {name}: {str(e)}"

    def reset_tool_calls(self):
        self.tool_calls = []

    def consume_tool_calls(self):
        tool_calls = self.tool_calls
        self.tool_calls = []
        return tool_calls

    def stop(self):
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
