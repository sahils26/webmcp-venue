# WebMCP Venue Agent

> AI agent that autonomously books event venues through browser-native WebMCP tools

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![LangGraph](https://img.shields.io/badge/langgraph-0.0.40+-green.svg)](https://github.com/langchain-ai/langgraph)
[![WebMCP](https://img.shields.io/badge/WebMCP-W3C%20Incubation-orange.svg)](https://webmachinelearning.github.io/webmcp/)

---

##  What This Is

A working prototype demonstrating how AI agents can interact with websites through **WebMCP** (Web Model Context Protocol) — a proposed W3C standard that lets websites expose structured tools directly to AI agents in the browser.

Instead of fragile HTML scraping or complex browser automation, the venue website provides a clean, API-like interface that agents can discover and call natively.

**Use Case:** An AI agent helps users find and book event venues by querying availability, retrieving room details, and submitting quote requests — all through standardized browser tools.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Venue Website** | React + TypeScript + Vite |
| **WebMCP Integration** | `navigator.modelContext` (Chrome 146+ Beta) |
| **AI Agent** | Python + LangGraph + LangChain |
| **LLM** | Anthropic Claude Sonnet 4 |
| **Browser Automation** | Playwright |
| **Package Management** | `uv` (Python), `pnpm` (Node) |

---

##  Quick Start

### Prerequisites
- **Chrome Beta 146+** with WebMCP flags enabled ([setup guide](docs/setup-guide.md))
- **Python 3.11+** with `uv` installed
- **Node.js 18+** with `pnpm`
- **API key**

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/webmcp-venue-agent.git
cd webmcp-venue-agent

# Install venue website dependencies
cd venue-website
pnpm install

# Install agent dependencies
cd ../agent
uv pip install -r requirements.txt
```

### 2. Configure
```bash
# Add your API key
cd agent
cp .env
```

### 3. Run
```bash
# Terminal 1: Start venue website
cd venue-website
pnpm dev
# → http://localhost:5173

# Terminal 2: Run agent
cd agent
python src/main.py
```

---

## 📋 WebMCP Tools Exposed

The venue website registers these tools via `navigator.modelContext`:

| Tool | Purpose | Example |
|------|---------|---------|
| `check_availability` | Query open dates for capacity | `{date: "2026-06-15", capacity: 50}` |
| `get_room_details` | Retrieve room specs & photos | `{room_id: "grand-hall"}` |
| `get_pricing` | Fetch pricing tiers | `{room_id: "grand-hall", date: "2026-06-15"}` |
| `request_quote` | Submit booking inquiry | `{room_id, date, attendees, contact}` |

---

## Project Structure

```text
webmcp-venue-agent/
├── docs/                 # Research reports 
├── venue-website/        # React + WebMCP frontend
│   └── src/
│       ├── webmcp/       # Tool registration & schemas
│       └── data/         # Mock venue data (JSON)
├── agent/                # Python LangGraph agent
│   └── src/
│       ├── agent/        # LangGraph workflow
│       └── browser/      # Playwright WebMCP client
└── scripts/              # Dev automation scripts


---

## Research Context

This project was developed as part of the **GATE Program** (April 2026) in collaboration with **spaces360** — a Jena-based platform digitizing event venue discovery across Europe.


---

## Contributing

This is a research prototype. Issues and PRs welcome for:
- Additional WebMCP tool examples
- Agent workflow improvements
- Security/auth patterns
- Cross-browser testing (once supported)

---


## Team RealAIsers

**Product Owners:** Ana Graciela Vassallo Fedotkin, Sahil Sajwan  
**Scrum Master:** Rosenmeet Kaur  
**Developers:** Vansh Gulati, Sam Miraki, Brijesh Dholakiya

**Industry Partner:** spaces360 by Joyful UG (Germany)

---

## 🔗 Resources

- [WebMCP Specification (W3C)](https://webmachinelearning.github.io/webmcp/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Playwright Python](https://playwright.dev/python/)
- [Chrome Setup Guide](docs/setup-guide.md)

---




