from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
import os
from pathlib import Path
from typing import Optional, List
import shutil
from PIL import Image
import yt_dlp
import sys
import logging
import traceback
from threading import Lock
import requests
from urllib.parse import urljoin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from rembg import remove

app = FastAPI(title="Unified Tools API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3010",
        "http://10.0.0.201:3010",
        "https://tools.mikey.host",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging

@app.post("/api/pdf/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    try:
        # Save uploaded files
        saved_files = []
        for file in files:
            file_path = UPLOAD_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(("fileInput", open(file_path, "rb")))

        # Call Stirling-PDF merge endpoint
        response = requests.post(
            urljoin(STIRLING_PDF_URL, "/merge-pdfs"),
            headers=get_stirling_headers(),
            files=saved_files
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to merge PDFs")

        # Save the merged PDF
        output_filename = "merged.pdf"
        output_path = OUTPUT_DIR / output_filename
        with open(output_path, "wb") as f:
            f.write(response.content)

        # Clean up saved files
        for _, file in saved_files:
            file.close()
        for file in saved_files:
            (UPLOAD_DIR / Path(file[1].name).name).unlink()

        return {
            "filename": output_filename,
            "url": f"/api/download/{output_filename}"
        }

    except Exception as e:
        logger.error(f"Error in merge_pdfs: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf/split")
async def split_pdf(
    file: UploadFile = File(...),
    split_type: str = Form(...),  # 'ranges', 'pages', or 'interval'
    split_value: str = Form(...)  # e.g., "1-3,4-6" or "2" (every 2 pages)
):
    try:
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Call Stirling-PDF split endpoint
        files = {"fileInput": open(file_path, "rb")}
        data = {
            "splitType": split_type,
            "splitValue": split_value
        }

        response = requests.post(
            urljoin(STIRLING_PDF_URL, "/split-pdf"),
            headers=get_stirling_headers(),
            files=files,
            data=data
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to split PDF")

        # Handle multiple output files (Stirling returns a zip file)
        output_filename = f"split_{Path(file.filename).stem}.zip"
        output_path = OUTPUT_DIR / output_filename
        with open(output_path, "wb") as f:
            f.write(response.content)

        # Clean up
        files["fileInput"].close()
        file_path.unlink()

        return {
            "filename": output_filename,
            "url": f"/api/download/{output_filename}"
        }

    except Exception as e:
        logger.error(f"Error in split_pdf: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pdf/add-watermark")
async def add_watermark(
    file: UploadFile = File(...),
    watermark_type: str = Form(...),  # 'text' or 'image'
    watermark_text: str = Form(None),
    font_size: int = Form(30),
    rotation: int = Form(0),
    opacity: float = Form(0.5),
    width_spacer: int = Form(50),
    height_spacer: int = Form(50),
    watermark_image: UploadFile = File(None)
):
    try:
        # Save uploaded PDF
        pdf_path = UPLOAD_DIR / file.filename
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        files = {"fileInput": open(pdf_path, "rb")}
        data = {
            "watermarkType": watermark_type,
            "fontSize": str(font_size),
            "rotation": str(rotation),
            "opacity": str(opacity),
            "widthSpacer": str(width_spacer),
            "heightSpacer": str(height_spacer)
        }

        if watermark_type == "text":
            if not watermark_text:
                raise HTTPException(status_code=400, detail="Watermark text is required")
            data["watermarkText"] = watermark_text
        elif watermark_type == "image":
            if not watermark_image:
                raise HTTPException(status_code=400, detail="Watermark image is required")
            # Save watermark image
            watermark_path = UPLOAD_DIR / watermark_image.filename
            with open(watermark_path, "wb") as buffer:
                shutil.copyfileobj(watermark_image.file, buffer)
            files["watermarkImage"] = open(watermark_path, "rb")

        response = requests.post(
            urljoin(STIRLING_PDF_URL, "/add-watermark"),
            headers=get_stirling_headers(),
            files=files,
            data=data
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to add watermark")

        # Save the watermarked PDF
        output_filename = f"watermarked_{Path(file.filename).stem}.pdf"
        output_path = OUTPUT_DIR / output_filename
        with open(output_path, "wb") as f:
            f.write(response.content)

        # Clean up
        files["fileInput"].close()
        pdf_path.unlink()
        if watermark_type == "image":
            files["watermarkImage"].close()
            watermark_path.unlink()

        return {
            "filename": output_filename,
            "url": f"/api/download/{output_filename}"
        }

    except Exception as e:
        logger.error(f"Error in add_watermark: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# Create necessary directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
DOWNLOAD_DIR = Path("downloads")

for directory in [UPLOAD_DIR, OUTPUT_DIR, DOWNLOAD_DIR]:
    directory.mkdir(exist_ok=True)

# Global download progress tracking
download_progress = {
    'status': 'idle',
    'downloaded_bytes': 0,
    'total_bytes': 0,
    'speed': 0,
    'eta': 0,
    'filename': ''
}
progress_lock = Lock()

@app.post("/api/remove-background")
async def remove_background_handler(files: List[UploadFile] = File(...)):
    try:
        output_files = []
        for file in files:
            # Save uploaded file
            file_path = UPLOAD_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Process image using the local withoutbg package
            input_image = Image.open(file_path)
            logger.info(f"Input image format: {input_image.format}, mode: {input_image.mode}")
            
            # Remove background
            result = remove(input_image)
            logger.info(f"Result mode: {result.mode}")
            
            # Always save as PNG to preserve transparency
            output_filename = f"nobg_{Path(file.filename).stem}.png"
            output_path = OUTPUT_DIR / output_filename
            result.save(str(output_path), 'PNG', optimize=True)
            
            output_files.append({
                "filename": output_filename,
                "url": f"/api/download/{output_filename}"
            })
        
        return {"message": "Background removal processed", "files": output_files}
    except Exception as e:
        logger.error(f"Error in remove_background: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert-image")
async def convert_image(
    files: List[UploadFile] = File(...),
    format: str = Form(...),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None)
):
    try:
        logger.info(f"Converting images. Format: {format}, Width: {width}, Height: {height}")
        output_files = []
        
        for file in files:
            # Save uploaded file
            file_path = UPLOAD_DIR / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"File saved to {file_path}")
            
            # Open and process image
            img = Image.open(file_path)
            logger.info(f"Original image size: {img.size}")
            
            # Resize if dimensions provided
            if width and height:
                img = img.resize((width, height), Image.Resampling.LANCZOS)
                logger.info(f"Resized to: {img.size}")
            
            # Convert and save
            output_filename = f"converted_{Path(file.filename).stem}.{format.lower()}"
            output_path = OUTPUT_DIR / output_filename
            
            # Ensure format is uppercase and handle special cases
            format_upper = format.upper()
            save_kwargs = {}
            
            # Handle JPEG format
            if format_upper == 'JPG':
                format_upper = 'JPEG'
            
            # Handle transparency for PNG
            if format_upper == 'PNG':
                save_kwargs['optimize'] = True
            elif format_upper == 'JPEG':
                # Convert to RGB if saving as JPEG
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                save_kwargs['quality'] = 95
                save_kwargs['optimize'] = True
            elif format_upper == 'WEBP':
                save_kwargs['quality'] = 95
                save_kwargs['method'] = 6
            
            logger.info(f"Saving as {format_upper} to {output_path}")
            img.save(str(output_path), format=format_upper, **save_kwargs)
            logger.info("Save completed")
            
            output_files.append({
                "filename": output_filename,
                "url": f"/api/download/{output_filename}"
            })
        
        return {"message": "Image conversion processed", "files": output_files}
    except Exception as e:
        logger.error(f"Error in convert_image: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

class ProgressHandler:
    def __init__(self):
        self.downloaded_bytes = 0
        self.total_bytes = 0
        self.speed = 0
        self.eta = 0
        self.status = 'starting'
        self.filename = ''

    def progress_hook(self, d):
        global download_progress
        with progress_lock:
            if d['status'] == 'downloading':
                self.downloaded_bytes = d.get('downloaded_bytes', 0)
                self.total_bytes = d.get('total_bytes', 0) or d.get('total_bytes_estimate', 0)
                self.speed = d.get('speed', 0)
                self.eta = d.get('eta', 0)
                self.status = 'downloading'
                self.filename = d.get('filename', '')
            elif d['status'] == 'finished':
                self.status = 'finished'
            elif d['status'] == 'error':
                self.status = 'error'

            download_progress.update({
                'status': self.status,
                'downloaded_bytes': self.downloaded_bytes,
                'total_bytes': self.total_bytes,
                'speed': self.speed,
                'eta': self.eta,
                'filename': self.filename
            })

@app.get("/api/download-progress")
async def get_download_progress():
    global download_progress
    with progress_lock:
        return download_progress

@app.post("/api/get-video-info")
async def get_video_info(url: str = Form(...)):
    try:
        # Configure yt-dlp options for format extraction
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            # Don't download, just extract info
            'format': None,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info
            logger.info(f"Fetching video info for: {url}")
            info = ydl.extract_info(url, download=False)
            
            # Get available formats
            formats = []
            seen_resolutions = set()  # Track unique resolution+fps combinations
            
            # First get all formats
            all_formats = []
            for f in info.get('formats', []):
                # Skip audio-only formats and formats without video
                if f.get('vcodec', '') == 'none' or not f.get('height'):
                    continue
                
                # Get resolution
                height = f.get('height', 0)
                fps = f.get('fps', 0)
                filesize = f.get('filesize', 0) or f.get('filesize_approx', 0)
                
                resolution = f"{height}p"
                if fps > 30:
                    resolution += f" {fps}fps"
                
                resolution_key = f"{height}_{fps}"
                
                # Only add if we haven't seen this resolution+fps combo
                if resolution_key not in seen_resolutions:
                    seen_resolutions.add(resolution_key)
                    all_formats.append({
                        'format_id': f['format_id'],
                        'resolution': resolution,
                        'filesize_approx': filesize,
                        'vcodec': f.get('vcodec', ''),
                        'fps': fps,
                        'height': height,  # Used for sorting
                    })
            
            # Sort by height (resolution) and fps, then remove the height field
            all_formats.sort(key=lambda x: (-x['height'], -x['fps']))
            for f in all_formats:
                del f['height']
                formats.append(f)
            
            # Sort formats by resolution (height) and fps
            formats.sort(key=lambda x: (
                int(x['resolution'].split('p')[0]),
                x.get('fps', 0)
            ), reverse=True)
            
            # Get duration in seconds
            duration = info.get('duration', 0)
            
            return {
                'title': info.get('title', ''),
                'thumbnail': info.get('thumbnail', ''),
                'formats': formats,
                'duration': duration
            }
            
    except Exception as e:
        logger.error(f"Error in get_video_info: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/download-video")
async def download_video(
    url: str = Form(...),
    format_id: str = Form(None),
    audio_only: bool = Form(False),
    format: str = Form("mp4")
):
    try:
        # Clean up any existing downloads
        for file in DOWNLOAD_DIR.glob("*"):
            try:
                file.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete {file}: {e}")

        # Reset progress tracking
        global download_progress
        with progress_lock:
            download_progress.update({
                'status': 'starting',
                'downloaded_bytes': 0,
                'total_bytes': 0,
                'speed': 0,
                'eta': 0,
                'filename': ''
            })

        # Ensure download directory exists
        DOWNLOAD_DIR.mkdir(exist_ok=True)
        
        # Create progress handler
        progress = ProgressHandler()
        
        # Base options for faster downloads
        base_opts = {
            'outtmpl': str(DOWNLOAD_DIR / '%(title)s_%(resolution)s.%(ext)s'),
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'concurrent_fragments': 3,  # Download fragments in parallel
            'progress_hooks': [progress.progress_hook],
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'cookiesfrombrowser': ('chrome',),  # Use Chrome cookies
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            },
            'extractor_retries': 3,
            'file_access_retries': 3,
            'fragment_retries': 3,
            'retries': 3,
        }
        
        # Configure yt-dlp options based on whether audio_only is selected
        if audio_only:
            ydl_opts = {
                **base_opts,
                'format': 'bestaudio',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',  # Always use mp3 for audio
                    'preferredquality': '320',  # Use high quality
                }],
                'postprocessor_args': [
                    '-threads', '3',
                    '-b:a', '320k',  # Set bitrate
                    '-ar', '44100',  # Set sample rate
                    '-ac', '2',      # Set channels (stereo)
                ],
                # Skip unnecessary steps
                'updatetime': False,
                'writeinfojson': False,
                'writedescription': False,
                'writethumbnail': False,
                'writesubtitles': False,
            }
        else:
            # For video, always include audio and use specific format
            if format_id:
                format_spec = f'{format_id}+bestaudio/best'
            else:
                format_spec = f'bestvideo[ext={format}]+bestaudio[ext=m4a]/best[ext={format}]'
            
            ydl_opts = {
                **base_opts,
                'format': format_spec,
                'merge_output_format': 'mp4',  # Always use mp4 for videos
                'postprocessor_args': [
                    '-threads', '3',
                    '-preset', 'medium',  # Better quality/size ratio
                    '-movflags', '+faststart',  # Enable streaming
                    '-c:a', 'aac',        # Use AAC audio codec
                    '-b:a', '192k',       # Audio bitrate
                    '-c:v', 'libx264',    # Video codec
                ],
            }
            logger.info(f"Using format specification: {format_spec}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info first
            logger.info("Starting download process...")
            info = ydl.extract_info(url, download=True)
            
            # Get the actual filename that was saved
            filename = ydl.prepare_filename(info)
            
            # For audio-only downloads, we need to modify the extension
            if audio_only:
                filename = str(Path(filename).with_suffix(f'.{format}'))
            
            final_filename = Path(filename).name
            logger.info(f"File downloaded as: {final_filename}")
            
            return {
                "title": info.get("title"),
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "download_path": final_filename
            }
    except Exception as e:
        logger.error(f"Error in download_video: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    try:
        # Try both output and download directories
        output_path = OUTPUT_DIR / filename
        download_path = DOWNLOAD_DIR / filename
        
        # Check outputs directory first (for image processing results)
        if output_path.exists():
            logger.info(f"Found file in outputs directory: {output_path}")
            return FileResponse(
                path=output_path,
                filename=filename,
                media_type='application/octet-stream'
            )
        
        # Then check downloads directory (for video downloads)
        if download_path.exists():
            logger.info(f"Found file in downloads directory: {download_path}")
            return FileResponse(
                path=download_path,
                filename=filename,
                media_type='application/octet-stream'
            )
        
        # If file not found in either directory
        logger.error(f"File not found in either directory: {filename}")
        logger.error(f"Checked paths:\n- {output_path}\n- {download_path}")
        raise HTTPException(status_code=404, detail="File not found")
        
    except Exception as e:
        logger.error(f"Error in download_file: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)