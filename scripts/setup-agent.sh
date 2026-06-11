#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"
PYTHON="${PYTHON:-python3}"

if [[ ! -d "$AGENT_DIR/.venv" ]]; then
  "$PYTHON" -m venv "$AGENT_DIR/.venv"
fi

"$AGENT_DIR/.venv/bin/python" -m pip install --upgrade pip
"$AGENT_DIR/.venv/bin/python" -m pip install -r "$AGENT_DIR/requirements.txt"
"$AGENT_DIR/.venv/bin/python" -m playwright install chromium

if [[ ! -f "$AGENT_DIR/.env" ]]; then
  cp "$AGENT_DIR/.env.example" "$AGENT_DIR/.env"
fi

echo "Agent setup complete. Add MISTRAL_API_KEY to agent/.env."
