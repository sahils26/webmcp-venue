#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_PYTHON="$ROOT_DIR/agent/.venv/bin/python"
frontend_pid=""
agent_pid=""

if [[ ! -x "$AGENT_PYTHON" ]]; then
  echo "Agent environment is missing. Run ./scripts/setup-agent.sh first."
  exit 1
fi

if [[ ! -f "$ROOT_DIR/agent/.env" ]]; then
  cp "$ROOT_DIR/agent/.env.example" "$ROOT_DIR/agent/.env"
  echo "Created agent/.env. Add MISTRAL_API_KEY before sending chat messages."
fi

cleanup() {
  [[ -n "$frontend_pid" ]] && kill "$frontend_pid" 2>/dev/null || true
  [[ -n "$agent_pid" ]] && kill "$agent_pid" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR/venue-website"
  npm run dev -- --host 127.0.0.1
) &
frontend_pid=$!

(
  cd "$ROOT_DIR/agent"
  "$AGENT_PYTHON" -m uvicorn src.server:app --host 127.0.0.1 --port 8001
) &
agent_pid=$!

echo "Frontend: https://127.0.0.1:5173"
echo "Agent health: http://127.0.0.1:8001/health"
echo "Press Ctrl+C to stop both services."

wait
