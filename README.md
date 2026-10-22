# Unified Tools App (UTA)

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-blue?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%205-purple?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%203-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/Deployment-Docker%20Compose-2496ED?logo=docker)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)

An all-in-one web utility suite featuring AI-powered background removal, image conversion, video and audio downloading, and format transcoding. Designed with a sleek, modern **Crimson / Dark** aesthetic powered by **Aceternity UI**, **Componentry**, **Radix UI**, and **Framer Motion**.

---

## Features

### 1. AI Background Remover
- Instant AI-driven background removal powered by ONNX `rembg`.
- Interactive **Before / After Comparison Slider** with smooth drag handles.
- Transparency preview with checkerboard background.
- Direct single-click PNG download.

### 2. Multi-Format Image Converter
- Convert between **PNG, JPEG, WebP, GIF, BMP, and TIFF**.
- Adjustable quality slider (1% – 100%).
- Dimension resizing with aspect ratio preservation.
- Live file size and conversion output preview.

### 3. Video Downloader
- YouTube and web video downloads powered by modern `yt-dlp`.
- Multi-client fallbacks (`android`, `ios`, `web`) with Node.js JavaScript challenge solver.
- Task-isolated download directories (`downloads/{task_id}/`) preventing race conditions.
- Resolution and format selection (best video + audio, up to 1080p/4K).
- Audio-only (MP3) extraction option.
- Real-time download progress tracking with animated progress bars.

### 4. Audio Converter
- Convert audio files between **MP3, WAV, AAC, FLAC, OGG, and M4A**.
- Configurable audio bitrates (128k, 192k, 256k, 320k) powered by FFmpeg.
- Upload preview, file size reporting, and one-click audio download.

### 5. PDF Tools (Stirling-PDF Integration)
- Integrated document operations (merge, split, compress, convert) via optional [Stirling-PDF](https://github.com/Stirling-Tools/Stirling-PDF) backend.

---

## Design System & UI Components

UTA is built with high-performance modern web design primitives:
- **Aceternity UI Background Beams**: Dynamic animated particle canvas in the background.
- **Aceternity UI Tabs**: Smooth Framer Motion tab transitions with active indicator animations.
- **Aceternity UI File Upload**: Drag-and-drop zone with animated upload indicators.
- **Aceternity UI Hover Border Gradient**: Ambient glowing gradients on interactive cards and buttons.
- **Image Comparison Slider**: Side-by-side split comparison for background removal.
- **Lucide Icons**: Crisp modern iconography across every action and status badge.

---

## Docker Deployment (Recommended)

### Using Docker Compose

The application is packaged as a lightweight multi-stage Docker container containing both the React frontend (served via `serve`) and FastAPI backend (served via `uvicorn`).

```yaml
version: '3.8'

services:
  app:
    build:
      context: https://github.com/mikey2707/uta.git#main
      dockerfile: Dockerfile
    ports:
      - "8010:8000"  # Backend API
      - "3010:3000"  # Frontend Web App
    dns:
      - 8.8.8.8
      - 1.1.1.1
    volumes:
      - /var/lib/docker/volumes/unified-tool/_data/uploads:/app/backend/uploads
      - /var/lib/docker/volumes/unified-tool/_data/outputs:/app/backend/outputs
      - /var/lib/docker/volumes/unified-tool/_data/downloads:/app/backend/downloads
    environment:
      - PYTHONUNBUFFERED=1
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
```

> **Note on DNS**: The `dns: [8.8.8.8, 1.1.1.1]` configuration prevents `[Errno -3] Temporary failure in name resolution` when `yt-dlp` fetches remote video manifests from inside container bridge networks.

#### Start the Container
```bash
docker compose up -d --build
```

Access the frontend at `http://<your-server-ip>:3010` and backend at `http://<your-server-ip>:8010`.

### Deploying via Portainer
1. In Portainer, navigate to **Stacks** > **Add stack**.
2. **Git Repository Method**:
   - Repository URL: `https://github.com/mikey2707/uta.git`
   - Repository reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`
   - Click **Deploy the stack**.
3. **Web Editor Method**:
   - Paste the `docker-compose.yml` above into the web editor.
   - Click **Deploy the stack**.

---

## Local Development Setup

### Prerequisites
- **Node.js** (v18+ or v20+)
- **Python** (v3.10+ or v3.11+)
- **FFmpeg** installed and on system PATH

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be running at `http://localhost:8000` (interactive Swagger docs at `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend will be running at `http://localhost:3000` (or `http://localhost:5173`).

---

## Running Tests

Run the backend unit test suite:
```bash
cd backend
pytest tests/test_main.py -v
```
All 10 tests verify:
- Image conversion and WebP output
- AI background removal transparency masks
- YouTube video information querying and format parsing
- YouTube audio extraction
- Audio conversion transcoding
- Clean directory and task isolation

---

## Project Structure

```
unified-tools-app/
├── backend/
│   ├── main.py                  # FastAPI application & API endpoints
│   ├── requirements.txt         # Python dependencies
│   ├── cookies.txt              # YouTube visitor cookies for yt-dlp
│   └── tests/
│       ├── test_main.py         # Comprehensive pytest unit tests
│       └── bateman_test.png     # Test image asset
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BackgroundRemover.tsx   # AI background remover tool
│   │   │   ├── ImageConverter.tsx      # Image format/dimensions tool
│   │   │   ├── VideoDownloader.tsx     # YouTube video & audio downloader
│   │   │   ├── AudioConverter.tsx      # Multi-format audio converter
│   │   │   ├── PDFTools.tsx            # Stirling-PDF document tool
│   │   │   ├── ColorModeToggle.tsx     # Theme switcher
│   │   │   └── ui/                     # Aceternity & Radix UI components
│   │   ├── App.tsx                     # Main layout & tab router
│   │   ├── index.css                   # Tailwind design tokens & themes
│   │   └── lib/utils.ts                # Tailwind cn() utility
│   ├── package.json
│   ├── tailwind.config.js              # Crimson color palette & animations
│   └── vite.config.ts
├── Dockerfile                   # Multi-stage production container build
├── docker-compose.yml           # Production stack configuration
├── start.sh                     # Container runtime entrypoint
└── README.md
```

---

## License

MIT License. Feel free to use and modify for personal or commercial projects.
