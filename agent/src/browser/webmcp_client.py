import json
import logging
import os
import queue
import threading
from concurrent.futures import Future
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)


class _PlaywrightThread:
    """Routes all Playwright sync API calls through one dedicated OS thread.

    Playwright's sync API binds itself to the greenlet that called start().
    LangGraph switches greenlets internally during agent.stream(), which causes
    'Cannot switch to a different thread' errors if page.evaluate() is called
    from those greenlets. Routing every Playwright call through this thread
    keeps them on the correct greenlet at all times.
    """

    def __init__(self):
        self._queue = queue.SimpleQueue()
        self._thread = threading.Thread(target=self._run, daemon=True, name="playwright")
        self._thread.start()

    def _run(self):
        while True:
            func, fut = self._queue.get()
            try:
                fut.set_result(func())
            except Exception as exc:
                fut.set_exception(exc)

    def submit(self, func, timeout=60):
        fut = Future()
        self._queue.put((func, fut))
        return fut.result(timeout=timeout)


_playwright_thread = _PlaywrightThread()


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
        _playwright_thread.submit(self._start_impl)

    def _start_impl(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=self.headless)
        self.context = self.browser.new_context(ignore_https_errors=True)
        self.page = self.context.new_page()

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
        return _playwright_thread.submit(self._get_tools_impl)

    def _get_tools_impl(self):
        if not self.page or self.page.is_closed():
            return []
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
        return _playwright_thread.submit(lambda: self._call_tool_impl(name, args))

    def _call_tool_impl(self, name, args):
        if not self.page or self.page.is_closed():
            return "Error: browser is not running"
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

            # Strip verbose date arrays — they flood the LLM context and cause loops
            if isinstance(result, dict) and 'venues' in result:
                for venue in result.get('venues', []):
                    venue.pop('availableDates', None)
            return json.dumps(result)
        except Exception as e:
            return f"Error executing tool {name}: {str(e)}"

    def reset_tool_calls(self):
        self.tool_calls = []

    def consume_tool_calls(self):
        tool_calls = self.tool_calls
        self.tool_calls = []
        return tool_calls

    def stop(self):
        _playwright_thread.submit(self._stop_impl)

    def _stop_impl(self):
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
