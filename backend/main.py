from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
import os
import uuid
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any
import asyncio
import time
import shutil
import requests
from urllib.parse import urljoin
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

# In-memory storage for isolated download tasks
active_downloads: Dict[str, Dict[str, Any]] = {}
active_downloads_lock = Lock()

def get_cookie_file() -> Optional[str]:
    """Find valid cookie file path if it exists."""
    candidates = [
        Path(__file__).resolve().parent / 'cookies' / 'cookies.txt',
        Path('/app/backend/cookies/cookies.txt'),
        Path('cookies/cookies.txt'),
        Path(__file__).resolve().parent / 'cookies.txt'
    ]
    for c in candidates:
        if c.exists() and c.is_file() and c.stat().st_size > 0:
            return str(c)
    return None

def build_base_ytdlp_opts(progress_hook=None) -> Dict[str, Any]:
    """Common yt-dlp options configured with Node.js and mobile client fallbacks."""
    opts: Dict[str, Any] = {
        'quiet': False,
        'no_warnings': False,
        'extract_flat': False,
        'no_color': True,
        'noprogress': True,
        'noplaylist': True,
        'no_check_certificates': True,
        'retries': 5,
        'fragment_retries': 5,
        'concurrent_fragments': 3,
        'restrictfilenames': True,
        'windowsfilenames': True,
        # Enable Node.js JS runtime for modern YouTube challenge solving
        'js_runtimes': {'node': {}},
        # Extractor fallbacks (android & ios bypass common datacenter IP blocks)
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web'],
                'player_skip': ['configs', 'webpage'],
            }
        }
    }
    cookie_path = get_cookie_file()
    if cookie_path:
        opts['cookiefile'] = cookie_path
    if progress_hook:
        opts['progress_hooks'] = [progress_hook]
    return opts

class TaskProgressHandler:
    def __init__(self, task_id: str):
        self.task_id = task_id

    def progress_hook(self, d: Dict[str, Any]):
        global download_progress
        status = d.get('status', 'downloading')
        downloaded = d.get('downloaded_bytes', 0)
        total = d.get('total_bytes', 0) or d.get('total_bytes_estimate', 0)
        speed = d.get('speed', 0)
        eta = d.get('eta', 0)
        filename = d.get('filename', '')

        progress_pct = 0.0
        if total and total > 0:
            progress_pct = round((downloaded / total) * 100, 1)

        speed_str = format_speed(speed)
        eta_str = format_eta(eta) if eta is not None else "Calculating..."
        title_val = Path(filename).name if filename else ''

        data = {
            'task_id': self.task_id,
            'status': status,
            'downloaded_bytes': downloaded,
            'total_bytes': total,
            'speed': speed_str,
            'eta': eta_str,
            'filename': filename,
            'progress': progress_pct,
            'downloaded': downloaded,
            'total': total,
            'is_downloading': (status == 'downloading'),
            'title': title_val,
            'updated_at': time.time()
        }

        with active_downloads_lock:
            if self.task_id in active_downloads:
                active_downloads[self.task_id].update(data)
            else:
                active_downloads[self.task_id] = data

        with progress_lock:
            download_progress.update(data)

@app.get("/api/download-progress")
async def get_download_progress():
    """Legacy global progress endpoint for backward compatibility."""
    global download_progress
    with progress_lock:
        return download_progress

@app.get("/api/download-progress/{task_id}")
async def get_task_download_progress(task_id: str):
    """Isolated download progress endpoint per task."""
    with active_downloads_lock:
        task_data = active_downloads.get(task_id)
        if task_data:
            return task_data
    # Return placeholder if not yet populated
    return {
        'task_id': task_id,
        'status': 'starting',
        'progress': 0,
        'downloaded': 0,
        'total': 0,
        'speed': '0 B/s',
        'eta': 'Calculating...',
        'is_downloading': True,
        'title': ''
    }

def _extract_video_info_sync(url: str):
    opts = build_base_ytdlp_opts()
    opts.update({
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    })
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            logger.info(f"Extracting info for URL: {url}")
            return ydl.extract_info(url, download=False)
    except Exception as e:
        err_msg = str(e)
        if "name resolution" in err_msg.lower() or "errno -3" in err_msg.lower():
            logger.error(f"DNS Resolution Error during video extraction: {err_msg}")
            raise HTTPException(
                status_code=502,
                detail="Network DNS resolution failed inside container. Ensure Docker DNS is configured with 8.8.8.8 in docker-compose.yml."
            )
        raise

@app.post("/api/get-video-info")
async def get_video_info(url: str = Form(...)):
    try:
        info = await run_in_threadpool(_extract_video_info_sync, url)
        if not info:
            raise HTTPException(status_code=400, detail="Could not retrieve video information")

        raw_formats = []
        for f in info.get('formats', []):
            vcodec = f.get('vcodec', '')
            if vcodec == 'none' or vcodec == '' or not f.get('height'):
                continue
            raw_formats.append(f)

        def get_sort_key(f):
            h = f.get('height', 0) or 0
            fps = f.get('fps', 30) or 30
            size = f.get('filesize') or f.get('filesize_approx') or 0
            return (h, fps, size)

        raw_formats.sort(key=get_sort_key, reverse=True)

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

        return {
            'title': info.get('title', 'Unknown Title'),
            'thumbnail': info.get('thumbnail', ''),
            'uploader': info.get('uploader') or info.get('channel') or '',
            'formats': formats,
            'duration': info.get('duration', 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_video_info: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

def _download_video_sync(url: str, format_id: Optional[str], audio_only: bool, format_ext: str, task_id: str):
    task_dir = DOWNLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)

    progress_handler = TaskProgressHandler(task_id)
    base_opts = build_base_ytdlp_opts(progress_hook=progress_handler.progress_hook)
    base_opts['outtmpl'] = str(task_dir / '%(title)s.%(ext)s')

    if audio_only:
        ydl_opts = {
            **base_opts,
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
            'updatetime': False,
            'writeinfojson': False,
            'writedescription': False,
            'writethumbnail': False,
            'writesubtitles': False,
        }
    else:
        if format_id:
            format_spec = f'{format_id}+bestaudio/best'
        else:
            format_spec = 'bestvideo+bestaudio/best'
        ydl_opts = {
            **base_opts,
            'format': format_spec,
            'merge_output_format': 'mp4',
        }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Task {task_id}: Downloading {url}")
            info = ydl.extract_info(url, download=True)
            if not info:
                raise Exception("Failed to extract or download video")

            if audio_only:
                media_files = list(task_dir.glob('*.mp3'))
            else:
                media_files = list(task_dir.glob('*.mp4')) + list(task_dir.glob('*.webm')) + list(task_dir.glob('*.mkv'))

            if media_files:
                final_file = max(media_files, key=lambda p: p.stat().st_mtime)
                final_filename = final_file.name
            else:
                raw_filename = ydl.prepare_filename(info)
                final_filename = Path(raw_filename).with_suffix('.mp3' if audio_only else '.mp4').name

            # Mark task finished
            with active_downloads_lock:
                if task_id in active_downloads:
                    active_downloads[task_id].update({
                        'status': 'finished',
                        'progress': 100,
                        'is_downloading': False,
                        'filename': final_filename,
                        'download_path': final_filename
                    })

            return {
                "task_id": task_id,
                "title": info.get("title"),
                "duration": info.get("duration"),
                "thumbnail": info.get("thumbnail"),
                "download_path": final_filename
            }
    except Exception as e:
        with active_downloads_lock:
            if task_id in active_downloads:
                active_downloads[task_id].update({
                    'status': 'error',
                    'error': str(e),
                    'is_downloading': False
                })
        err_msg = str(e)
        if "name resolution" in err_msg.lower() or "errno -3" in err_msg.lower():
            raise HTTPException(
                status_code=502,
                detail="DNS Resolution failed inside container. Check network and DNS settings."
            )
        raise

@app.post("/api/download-video")
async def download_video(
    url: str = Form(...),
    format_id: str = Form(None),
    audio_only: bool = Form(False),
    format: str = Form("mp4"),
    task_id: Optional[str] = Form(None)
):
    try:
        tid = task_id or uuid.uuid4().hex[:12]
        with active_downloads_lock:
            active_downloads[tid] = {
                'task_id': tid,
                'status': 'starting',
                'progress': 0,
                'downloaded': 0,
                'total': 0,
                'speed': '0 B/s',
                'eta': 'Calculating...',
                'is_downloading': True,
                'title': '',
                'updated_at': time.time()
            }

        result = await run_in_threadpool(
            _download_video_sync,
            url,
            format_id,
            audio_only,
            format,
            tid
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in download_video: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert-audio")
async def convert_audio(
    file: UploadFile = File(...),
    output_format: str = Form("mp3"),
    bitrate: str = Form("320k")
):
    """Extract or convert audio from uploaded audio/video files using FFmpeg."""
    try:
        safe_fmt = output_format.lower().strip().replace(".", "")
        if safe_fmt not in ["mp3", "wav", "aac", "flac", "ogg", "m4a"]:
            safe_fmt = "mp3"

        file_id = uuid.uuid4().hex[:8]
        src_path = UPLOAD_DIR / f"audio_src_{file_id}_{file.filename}"
        with open(src_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        out_stem = Path(file.filename).stem
        out_filename = f"converted_{out_stem}_{file_id}.{safe_fmt}"
        out_path = OUTPUT_DIR / out_filename

        def _ffmpeg_process():
            cmd = [
                "ffmpeg", "-y", "-i", str(src_path),
                "-vn", "-b:a", bitrate, str(out_path)
            ]
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if res.returncode != 0:
                logger.error(f"FFmpeg failed: {res.stderr.decode('utf-8', errors='ignore')}")
                raise Exception("Audio conversion failed")

        await run_in_threadpool(_ffmpeg_process)

        try:
            if src_path.exists():
                src_path.unlink()
        except Exception as ex:
            logger.warning(f"Failed to remove temp audio source: {ex}")

        return {
            "message": "Audio converted successfully",
            "filename": out_filename,
            "url": f"/api/download/{out_filename}"
        }
    except Exception as e:
        logger.error(f"Error in convert_audio: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{filename:path}")
async def download_file(filename: str):
    try:
        # Sanitize path to prevent directory traversal
        clean_name = Path(filename).name

        # 1. Check in OUTPUT_DIR
        out_direct = OUTPUT_DIR / clean_name
        if out_direct.exists() and out_direct.is_file():
            return FileResponse(path=out_direct, filename=clean_name, media_type='application/octet-stream')

        # 2. Check in root DOWNLOAD_DIR
        dl_direct = DOWNLOAD_DIR / clean_name
        if dl_direct.exists() and dl_direct.is_file():
            return FileResponse(path=dl_direct, filename=clean_name, media_type='application/octet-stream')

        # 3. Check within any task subdirectory in DOWNLOAD_DIR
        matches = list(DOWNLOAD_DIR.glob(f"*/{clean_name}"))
        if matches:
            latest_match = max(matches, key=lambda p: p.stat().st_mtime)
            return FileResponse(path=latest_match, filename=clean_name, media_type='application/octet-stream')

        # 4. Search recursively if exact name match wasn't found immediately
        all_matches = list(DOWNLOAD_DIR.rglob(clean_name)) + list(OUTPUT_DIR.rglob(clean_name))
        if all_matches:
            return FileResponse(path=all_matches[0], filename=clean_name, media_type='application/octet-stream')

        logger.error(f"File not found: {filename}")
        raise HTTPException(status_code=404, detail="File not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in download_file: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

MAX_AGE_SECONDS = 3600 * 24 # 24 hours

async def cleanup_old_files():
    """Background task to delete files and task directories older than 24 hours."""
    while True:
        now = time.time()
        for directory in [UPLOAD_DIR, OUTPUT_DIR, DOWNLOAD_DIR]:
            if not directory.exists():
                continue
            for path in directory.glob("*"):
                if path.name == "cookies.txt":
                    continue
                try:
                    if path.is_file():
                        if now - path.stat().st_mtime > MAX_AGE_SECONDS:
                            path.unlink()
                            logger.info(f"Cleaned up old file: {path}")
                    elif path.is_dir():
                        if now - path.stat().st_mtime > MAX_AGE_SECONDS:
                            shutil.rmtree(path, ignore_errors=True)
                            logger.info(f"Cleaned up old task directory: {path}")
                except Exception as e:
                    logger.error(f"Failed to delete {path}: {e}")

        # Also purge in-memory task metadata older than 2 hours
        with active_downloads_lock:
            expired_tasks = [
                tid for tid, data in active_downloads.items()
                if now - data.get('updated_at', 0) > 7200
            ]
            for tid in expired_tasks:
                active_downloads.pop(tid, None)

        await asyncio.sleep(3600)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting background cleanup task...")
    asyncio.create_task(cleanup_old_files())

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)