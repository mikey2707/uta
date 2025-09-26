#!/bin/bash

# Start the frontend in the background
serve -s frontend/dist -l 3000 --no-clipboard --no-port-switching &

# Wait a moment to ensure frontend starts
sleep 2

# Start the backend
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000