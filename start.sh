#!/bin/bash

# Start the backend (which now also serves the frontend)
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000