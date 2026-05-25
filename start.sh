#!/bin/bash
echo "=== MailFlow - Email Management Portal ==="
echo ""

# Start backend
cd "$(dirname "$0")"
source venv/bin/activate
export PYTHONPATH="$PWD"
echo "[1/2] Starting backend on http://localhost:8000 ..."
python run.py &
BACKEND_PID=$!

# Start frontend
echo "[2/2] Starting frontend on http://localhost:5173 ..."
cd frontend
npx vite --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
