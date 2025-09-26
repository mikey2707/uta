# Unified Tools Application

A powerful web application that combines multiple tools:
- Background Removal
- Image Conversion
- YouTube Video Download

## Features

- **Background Removal**: Remove backgrounds from images using AI
- **Image Converter**: Convert images between formats (PNG, JPEG, WebP, GIF) and resize them
- **Video Downloader**: Download videos from YouTube in different formats

## Setup

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the FastAPI backend:
```bash
cd backend
uvicorn main:app --reload
```

The backend will be available at http://localhost:8000

### Frontend Setup

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:5173

## Usage

1. Open your browser and navigate to http://localhost:5173
2. Choose the tool you want to use from the tabs
3. Follow the interface instructions for each tool:
   - Background Removal: Drop an image and click "Remove Background"
   - Image Converter: Drop an image, select format and size, then convert
   - Video Downloader: Paste a YouTube URL and select format to download

## Directory Structure

```
unified-tools-app/
├── backend/
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BackgroundRemover.tsx
│   │   │   ├── ImageConverter.tsx
│   │   │   └── VideoDownloader.tsx
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── requirements.txt
```

## Technologies Used

- Backend:
  - FastAPI
  - Python Pillow
  - yt-dlp
  - withoutbg

- Frontend:
  - React
  - TypeScript
  - Chakra UI
  - Vite
  - Axios
