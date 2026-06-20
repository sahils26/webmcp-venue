#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
BACKEND_PYTHON="$BACKEND_DIR/.venv/bin/python"

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  echo "Backend environment is missing. Run ./scripts/setup-backend.sh first."
  exit 1
fi

cd "$BACKEND_DIR"
exec "$BACKEND_PYTHON" -m pytest
