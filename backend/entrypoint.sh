#!/bin/bash
set -e

echo "[STARTUP] Checking database and running seed if needed..."
python -m app.seed || echo "[STARTUP WARNING] Seed script encountered a non-fatal error."

echo "[STARTUP] Starting FastAPI server with Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 5000
