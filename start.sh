#!/bin/bash
set -e

# Start the frontend in the background
serve -s /app/frontend/dist -l 3000 &

# Wait a moment to ensure frontend starts
sleep 2

# Start the backend API
cd /app/backend && uvicorn main:app --host 0.0.0.0 --port 8000