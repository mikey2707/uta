# Stage 1: Build frontend
FROM node:20-slim as frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies with legacy peer deps flag to avoid conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the frontend files
COPY frontend/ ./

# Add build arguments
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build with CI=false to ignore warnings
RUN CI=false npm run build

# Stage 2: Final image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install serve globally for frontend
RUN npm install -g serve

# Copy backend files
COPY backend/ backend/

# Install Python dependencies
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p backend/uploads backend/outputs backend/downloads

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist frontend/dist

# Expose ports
EXPOSE 8000 3000

# Copy and set up start script
COPY start.sh .
RUN chmod +x start.sh

# Start both services
CMD ["./start.sh"]