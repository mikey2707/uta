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

# Build without TypeScript checks first
RUN npm run build

# Stage 2: Final image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /app/backend/uploads /app/backend/outputs /app/backend/downloads /app/backend/cookies

# Create cookies file
RUN echo "# Netscape HTTP Cookie File\n\
.youtube.com\tTRUE\t/\tFALSE\t2597573600\tCONSENT\tYES+cb\n\
.youtube.com\tTRUE\t/\tFALSE\t2597573600\tVISITOR_INFO1_LIVE\tyes" > /app/backend/cookies/cookies.txt

# Copy backend files
COPY backend/ backend/

# Install Python dependencies
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist frontend/dist

# Expose ports
EXPOSE 8000 3000

# Copy and set up start script
COPY start.sh .
RUN chmod +x start.sh

# Start the services
CMD ["./start.sh"]