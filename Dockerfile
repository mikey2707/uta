# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy package files first to leverage Docker layer caching
COPY frontend/package.json frontend/package-lock.json ./

# Clean install dependencies
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ ./

# Build production bundle
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Final runtime image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# - ffmpeg: audio and video transcoding
# - libgl1 & libglib2.0-0: OpenCV / ONNX image processing dependencies
# - curl & ca-certificates: healthchecks and secure HTTPS requests
# - nodejs: Node.js JavaScript runtime required by yt-dlp challenge solvers
# - serve: lightweight production HTTP server for the React frontend
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g serve \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create persistent storage directories
RUN mkdir -p /app/backend/uploads /app/backend/outputs /app/backend/downloads /app/backend/cookies

# Copy Python requirements first to leverage Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application source
COPY backend/ /app/backend/

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy entrypoint script and ensure execution permissions
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose ports: 8000 (Backend API), 3000 (Frontend Web App)
EXPOSE 8000 3000

# Container healthcheck against backend API
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Start services
CMD ["/app/start.sh"]