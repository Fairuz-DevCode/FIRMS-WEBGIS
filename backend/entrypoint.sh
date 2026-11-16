#!/bin/bash
set -e

echo "[STARTUP] Starting FastAPI server with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
