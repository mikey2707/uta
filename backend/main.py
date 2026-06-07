from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
import os
from pathlib import Path
from typing import Optional, List
import asyncio
import time
import shutil
from PIL import Image, ImageFilter, ImageOps
import yt_dlp
import logging
import traceback
from threading import Lock
from starlette.concurrency import run_in_threadpool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from rembg import remove

STIRLING_PDF_URL = os.getenv("STIRLING_PDF_URL")

def get_stirling_headers():
    return {}

app = FastAPI(title="Unified Tools API")


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3010",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://10.0.0.201:3010",
        "https://tools.mikey.host",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging


@app.get("/")
async def health_check():
    return {"status": "ok", "service": "Unified Tools API"}

@app.post("/api/pdf/merge")
def merge_pdfs(files: List[UploadFile] = File(...)):
    if not STIRLING_PDF_URL:
        raise HTTPException(status_code=501, detail="Stirling-PDF service not configured")
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
def split_pdf(
    file: UploadFile = File(...),
    split_type: str = Form(...),  # 'ranges', 'pages', or 'interval'
    split_value: str = Form(...)  # e.g., "1-3,4-6" or "2" (every 2 pages)
):
    if not STIRLING_PDF_URL:
        raise HTTPException(status_code=501, detail="Stirling-PDF service not configured")
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
def add_watermark(
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
    if not STIRLING_PDF_URL:
        raise HTTPException(status_code=501, detail="Stirling-PDF service not configured")
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

def format_speed(bytes_per_sec):
    if not bytes_per_sec:
        return "0 B/s"
    try:
        bytes_per_sec = float(bytes_per_sec)
    except Exception:
        return "0 B/s"
    for unit in ['B/s', 'KB/s', 'MB/s', 'GB/s']:
        if bytes_per_sec < 1024:
            return f"{bytes_per_sec:.1f} {unit}"
        bytes_per_sec /= 1024
    return f"{bytes_per_sec:.1f} TB/s"

def format_eta(seconds):
    if seconds is None:
        return "Calculating..."
    try:
        seconds = int(seconds)
    except Exception:
        return "Calculating..."
    minutes, secs = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

# Global download progress tracking
download_progress = {
    'status': 'idle',
    'downloaded_bytes': 0,
    'total_bytes': 0,
    'speed': '0 B/s',
    'eta': 'Calculating...',
    'filename': '',
    'progress': 0,
    'downloaded': 0,
    'total': 0,
    'is_downloading': False,
    'title': ''
}
progress_lock = Lock()

@app.post("/api/remove-background")
async def remove_background_handler(files: List[UploadFile] = File(...)):
    try:
        output_files = []
        for file in files:
            file_path = UPLOAD_DIR / file.filename
            try:
                # Save uploaded file
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                # Process image in a separate thread to avoid blocking the FastAPI event loop
                def process_image(fp, out_p):
                    with Image.open(fp) as input_image:
                        logger.info(f"Input image format: {input_image.format}, mode: {input_image.mode}")
                        # Remove background
                        result = remove(input_image)
                        logger.info(f"Result mode: {result.mode}")
                        # Always save as PNG to preserve transparency
                        result.save(str(out_p), 'PNG', optimize=True)

                output_filename = f"nobg_{Path(file.filename).stem}.png"
                output_path = OUTPUT_DIR / output_filename
                
                await run_in_threadpool(process_image, file_path, output_path)
                
                output_files.append({
                    "filename": output_filename,
                    "url": f"/api/download/{output_filename}"
                })
            finally:
                # Always clean up the uploaded temporary source file
                try:
                    if file_path.exists():
                        file_path.unlink()
                except Exception as ex:
                    logger.warning(f"Failed to delete temp upload {file_path}: {ex}")
        
        return {"message": "Background removal processed", "files": output_files}
    except Exception as e:
        logger.error(f"Error in remove_background: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert-image")
async def convert_image(
    files: List[UploadFile] = File(...),
    format: str = Form(...),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    quality: int = Form(90),
    maintain_aspect_ratio: bool = Form(True),
    strip_metadata: bool = Form(True),
    filter_type: str = Form("none"),
    rotation: int = Form(0)
):
    try:
        logger.info(f"Converting images. Format: {format}, Width: {width}, Height: {height}, Quality: {quality}, MaintainRatio: {maintain_aspect_ratio}, Strip: {strip_metadata}, Filter: {filter_type}, Rotation: {rotation}")
        output_files = []
        
        for file in files:
            file_path = UPLOAD_DIR / file.filename
            try:
                # Save uploaded file
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                logger.info(f"File saved to {file_path}")
                
                # Perform image loading, resizing, and saving in a threadpool to prevent blocking the event loop
                def process_conversion(fp, out_p, fmt, w, h, qual, maintain_ratio, strip_meta, filt, rot):
                    with Image.open(fp) as img:
                        logger.info(f"Original image size: {img.size}")
                        
                        # Handle rotation
                        if rot != 0:
                            # Pillow rotates counter-clockwise, so negative rot for clockwise
                            img = img.rotate(-rot, expand=True)
                        
                        # Handle filters
                        if filt == "grayscale":
                            img = ImageOps.grayscale(img)
                        elif filt == "blur":
                            # Convert to RGB before blurring if it has a palette to avoid errors
                            if img.mode == 'P':
                                img = img.convert('RGB')
                            img = img.filter(ImageFilter.GaussianBlur(2))
                        
                        # Strip metadata (by just not passing the info dict when saving, but we can explicitly clear it)
                        if strip_meta:
                            img.info.pop('exif', None)
                        else:
                            # retain exif if possible, though Pillow loses it by default unless explicitly saved
                            pass
                            
                        # Resize
                        if w or h:
                            if maintain_ratio:
                                # Provide the box it should fit into
                                target_w = w if w else img.width
                                target_h = h if h else img.height
                                img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
                                logger.info(f"Resized (thumbnail) to: {img.size}")
                            else:
                                target_w = w if w else img.width
                                target_h = h if h else img.height
                                img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                                logger.info(f"Resized (absolute) to: {img.size}")
                        
                        format_upper = fmt.upper()
                        save_kwargs = {}
                        
                        if format_upper == 'JPG':
                            format_upper = 'JPEG'
                        
                        # Strip EXIF info properly if explicitly requested, else attempt to keep it
                        if not strip_meta and 'exif' in img.info:
                            save_kwargs['exif'] = img.info['exif']
                            
                        if format_upper == 'PNG':
                            save_kwargs['optimize'] = True
                        elif format_upper == 'JPEG':
                            if img.mode in ('RGBA', 'P', 'LA'):
                                img = img.convert('RGB')
                            save_kwargs['quality'] = qual
                            save_kwargs['optimize'] = True
                        elif format_upper == 'WEBP':
                            save_kwargs['quality'] = qual
                            save_kwargs['method'] = 6
                        elif format_upper == 'ICO':
                            # ICO format requires specific icon sizes, but Pillow handles a lot automatically.
                            # ensure it's RGBA or RGB
                            if img.mode not in ('RGBA', 'RGB'):
                                img = img.convert('RGBA')
                        
                        logger.info(f"Saving as {format_upper} to {out_p}")
                        img.save(str(out_p), format=format_upper, **save_kwargs)
                        logger.info("Save completed")

                output_filename = f"converted_{Path(file.filename).stem}.{format.lower()}"
                output_path = OUTPUT_DIR / output_filename
                
                await run_in_threadpool(process_conversion, file_path, output_path, format, width, height, quality, maintain_aspect_ratio, strip_metadata, filter_type, rotation)
                
                output_files.append({
                    "filename": output_filename,
                    "url": f"/api/download/{output_filename}"
                })
            finally:
                # Always clean up the uploaded temporary source file
                try:
                    if file_path.exists():
                        file_path.unlink()
                except Exception as ex:
                    logger.warning(f"Failed to delete temp upload {file_path}: {ex}")
        
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

            # Calculate progress percentage
            progress_pct = 0
            if self.total_bytes and self.total_bytes > 0:
                progress_pct = round((self.downloaded_bytes / self.total_bytes) * 100, 1)

            # Format strings
            speed_str = format_speed(self.speed)
            eta_str = format_eta(self.eta) if self.eta is not None else "Calculating..."
            is_dl = self.status == 'downloading'
            title_val = Path(self.filename).name if self.filename else ''

            download_progress.update({
                'status': self.status,
                'downloaded_bytes': self.downloaded_bytes,
                'total_bytes': self.total_bytes,
                'speed': speed_str,  # Send formatted speed string for fronted rendering
                'eta': eta_str,      # Send formatted eta string for frontend rendering
                'filename': self.filename,
                # Frontend expected keys
                'progress': progress_pct,
                'downloaded': self.downloaded_bytes,
                'total': self.total_bytes,
                'is_downloading': is_dl,
                'title': title_val
            })

@app.get("/api/download-progress")
async def get_download_progress():
    global download_progress
    with progress_lock:
        return download_progress

@app.post("/api/get-video-info")
def get_video_info(url: str = Form(...)):
    try:
        # Configure yt-dlp options for format extraction
        # Don't restrict to Android player to get all available formats
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'no_check_certificates': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info
            logger.info(f"Fetching video info for: {url}")
            info = ydl.extract_info(url, download=False)
            
            # Filter and sort raw formats by quality (resolution, framerate, and filesize)
            raw_formats = []
            for f in info.get('formats', []):
                # Skip audio-only formats and formats without video
                vcodec = f.get('vcodec', '')
                if vcodec == 'none' or vcodec == '' or not f.get('height'):
                    continue
                raw_formats.append(f)

            # Sort raw formats so that best quality comes first (height desc, fps desc, filesize desc)
            def get_sort_key(f):
                h = f.get('height', 0) or 0
                fps = f.get('fps', 30) or 30
                size = f.get('filesize') or f.get('filesize_approx') or 0
                return (h, fps, size)

            raw_formats.sort(key=get_sort_key, reverse=True)

            # Deduplicate by resolution + fps, keeping the highest quality version
            formats = []
            seen_resolutions = set()
            for f in raw_formats:
                height = f.get('height', 0)
                fps = f.get('fps', 30) or 30
                resolution = f"{height}p"
                if fps > 30:
                    resolution += f" {int(fps)}fps"
                
                resolution_key = f"{height}_{int(fps)}"
                if resolution_key not in seen_resolutions:
                    seen_resolutions.add(resolution_key)
                    filesize = f.get('filesize') or f.get('filesize_approx') or 0
                    formats.append({
                        'format_id': f['format_id'],
                        'resolution': resolution,
                        'filesize_approx': filesize,
                        'vcodec': f.get('vcodec', ''),
                        'fps': fps,
                    })
            
            # Get duration in seconds
            duration = info.get('duration', 0)
            
            logger.info(f"Found {len(formats)} video formats for: {info.get('title', '')}")
            
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
def download_video(
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
                'speed': '0 B/s',
                'eta': 'Calculating...',
                'filename': '',
                'progress': 0,
                'downloaded': 0,
                'total': 0,
                'is_downloading': True,
                'title': ''
            })

        # Ensure download directory exists
        DOWNLOAD_DIR.mkdir(exist_ok=True)
        
        # Create progress handler
        progress = ProgressHandler()
        
        # Base options for faster downloads
        base_opts = {
            'outtmpl': str(DOWNLOAD_DIR / '%(title)s.%(ext)s'),
            'quiet': False,
            'no_warnings': False,
            'extract_flat': False,
            'concurrent_fragments': 3,
            'progress_hooks': [progress.progress_hook],
            'retries': 5,
            'fragment_retries': 5,
            'no_color': True,
            'noprogress': True,
            'noplaylist': True,
            'no_check_certificates': True,
            'restrictfilenames': True,  # Sanitize filenames for Windows compatibility
            'windowsfilenames': True,   # Ensure Windows-safe filenames
        }

        # Add cookie file only if it exists
        # Use relative path to support both Docker and local development
        base_dir = Path(__file__).resolve().parent
        cookie_file = base_dir / 'cookies' / 'cookies.txt'
        if cookie_file.exists():
            base_opts['cookiefile'] = str(cookie_file)
        
        # Add cookies file if it exists
        cookies_path = Path('/app/backend/cookies/cookies.txt')
        if cookies_path.exists():
            base_opts['cookiefile'] = str(cookies_path)
        
        # Configure yt-dlp options based on whether audio_only is selected
        if audio_only:
            ydl_opts = {
                **base_opts,
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '320',
                }],
                # Skip unnecessary steps
                'updatetime': False,
                'writeinfojson': False,
                'writedescription': False,
                'writethumbnail': False,
                'writesubtitles': False,
            }
            logger.info("Downloading audio only (MP3)")
        else:
            # For video, always include audio and use specific format
            if format_id:
                format_spec = f'{format_id}+bestaudio/best'
            else:
                format_spec = 'bestvideo+bestaudio/best'
            
            ydl_opts = {
                **base_opts,
                'format': format_spec,
                'merge_output_format': 'mp4',
            }
            logger.info(f"Using format specification: {format_spec}")
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract video info first
            logger.info("Starting download process...")
            info = ydl.extract_info(url, download=True)
            
            if not info:
                raise HTTPException(status_code=400, detail="Failed to extract video information or video unavailable")

                        # Get the actual filename by finding the most recent file in downloads
            if audio_only:
                # For audio-only, find the actual mp3 file
                media_files = list(DOWNLOAD_DIR.glob('*.mp3'))
            else:
                # For video, find mp4 or webm files
                media_files = list(DOWNLOAD_DIR.glob('*.mp4')) + list(DOWNLOAD_DIR.glob('*.webm'))
            
            if media_files:
                # Get the most recently modified file
                final_file = max(media_files, key=lambda p: p.stat().st_mtime)
                final_filename = final_file.name
                logger.info(f"Found downloaded file: {final_filename}")
            else:
                # Fallback: use prepare_filename
                filename = ydl.prepare_filename(info)
                if audio_only:
                    final_filename = Path(filename).with_suffix('.mp3').name
                else:
                    final_filename = Path(filename).with_suffix('.mp4').name
                logger.warning(f"No file found in downloads, using expected name: {final_filename}")
            
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

MAX_AGE_SECONDS = 3600 * 24 # 24 hours

async def cleanup_old_files():
    """Background task to delete files older than 24 hours."""
    while True:
        now = time.time()
        for directory in [UPLOAD_DIR, OUTPUT_DIR, DOWNLOAD_DIR]:
            if not directory.exists():
                continue
            for file_path in directory.glob("*"):
                if file_path.is_file() and file_path.name != "cookies.txt":
                    try:
                        # Check if file is older than MAX_AGE_SECONDS
                        if now - file_path.stat().st_mtime > MAX_AGE_SECONDS:
                            file_path.unlink()
                            logger.info(f"Cleaned up old file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete old file {file_path}: {e}")
        
        # Sleep for an hour before checking again
        await asyncio.sleep(3600)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting background cleanup task...")
    asyncio.create_task(cleanup_old_files())

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)