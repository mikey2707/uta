# Stage 1: Build frontend
FROM node:20-slim as frontend-builder

WORKDIR /app/frontend

# Copy package files first
COPY frontend/package*.json ./

# Install dependencies with specific flags to handle potential issues
RUN npm install --legacy-peer-deps --force

# Copy TypeScript config
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./

# Copy source files
COPY frontend/src ./src
COPY frontend/index.html ./

# Set environment for build
ENV NODE_ENV=production
ENV VITE_API_URL=http://localhost:8010

# Build the application
RUN npm run build || (echo "Build failed" && exit 1)

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