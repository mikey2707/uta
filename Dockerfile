# Stage 1: Build frontend
FROM node:20-slim as frontend-builder

WORKDIR /app/frontend

# Copy only package files first
COPY frontend/package.json frontend/package-lock.json ./

# Clean install dependencies
RUN npm ci

# Now copy the rest of the frontend files
COPY frontend/ ./

# Set environment for build
ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:8010

# Build without TypeScript checks first
RUN npm run build

# Stage 2: Final image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    gnupg \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g serve \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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