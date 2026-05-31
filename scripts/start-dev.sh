#!/bin/bash

# Get the project root (one level up from this script)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== spaces360 webMCP Venue Agent ==="
echo ""

# Start the frontend in the background
echo "[1/2] Starting venue website at http://localhost:5173 ..."
cd "$PROJECT_ROOT/venue-website"
npm run dev &
FRONTEND_PID=$!

# Give Vite time to compile and serve
sleep 5

# Start the Python agent in the foreground (user types questions here)
echo "[2/2] Starting Python agent..."
cd "$PROJECT_ROOT/agent"
python src/main.py

# When the agent exits (user types quit), shut down the frontend too
echo ""
echo "Shutting down venue website..."
kill $FRONTEND_PID 2>/dev/null
wait $FRONTEND_PID 2>/dev/null

echo "Done."
