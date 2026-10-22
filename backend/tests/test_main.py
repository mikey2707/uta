from fastapi.testclient import TestClient
import sys
import os
import io
from pathlib import Path
from PIL import Image
import pytest

# Add parent directory to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

TEST_VIDEO_URL = "https://www.youtube.com/watch?v=j_FAVWRRLmg"
USER_TEST_IMAGE = Path(__file__).parent / "bateman_test.png"

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Unified Tools API"}

def test_pdf_merge_unconfigured():
    files = [
        ('files', ('test.pdf', b'fake pdf content', 'application/pdf'))
    ]
    response = client.post("/api/pdf/merge", files=files)
    assert response.status_code == 501
    assert response.json()["detail"] == "Stirling-PDF service not configured"

def test_task_download_progress():
    response = client.get("/api/download-progress/sample-task-123")
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] == "sample-task-123"
    assert data["status"] == "starting"

def test_global_download_progress():
    response = client.get("/api/download-progress")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data

def test_download_file_404():
    response = client.get("/api/download/nonexistent_file_xyz.mp4")
    assert response.status_code == 404

def test_user_photo_image_conversion():
    """Unit test for Image Converter tool using user-provided image."""
    assert USER_TEST_IMAGE.exists(), "User test image not found"
    
    with open(USER_TEST_IMAGE, "rb") as f:
        img_bytes = f.read()

    files = [
        ('files', ('bateman.png', img_bytes, 'image/png'))
    ]
    data = {
        'format': 'webp',
        'quality': 85,
        'maintain_aspect_ratio': 'true',
        'strip_metadata': 'true',
        'filter_type': 'none',
        'rotation': 0
    }
    response = client.post("/api/convert-image", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()
    assert "files" in res_json
    assert len(res_json["files"]) == 1
    out_filename = res_json["files"][0]["filename"]
    assert out_filename.endswith(".webp")

    # Verify download works
    dl_resp = client.get(f"/api/download/{out_filename}")
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 0
    
    # Verify the downloaded image can be opened by Pillow
    converted_img = Image.open(io.BytesIO(dl_resp.content))
    assert converted_img.format == "WEBP"

def test_user_photo_background_removal():
    """Unit test for Background Remover tool using user-provided image."""
    assert USER_TEST_IMAGE.exists(), "User test image not found"
    
    with open(USER_TEST_IMAGE, "rb") as f:
        img_bytes = f.read()

    files = [
        ('files', ('bateman_bg.png', img_bytes, 'image/png'))
    ]
    response = client.post("/api/remove-background", files=files)
    assert response.status_code == 200
    res_json = response.json()
    assert "files" in res_json
    assert len(res_json["files"]) == 1
    out_filename = res_json["files"][0]["filename"]

    # Verify download works
    dl_resp = client.get(f"/api/download/{out_filename}")
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 0

    # Verify transparency was introduced (RGBA mode)
    cutout = Image.open(io.BytesIO(dl_resp.content))
    assert cutout.mode == "RGBA"
    # Check that alpha channel has both transparent and opaque pixels
    alpha_extrema = cutout.getextrema()[3]
    assert alpha_extrema[0] == 0, "Expected transparent background pixels"

def test_video_info_extraction():
    """Unit test for Video Downloader: Metadata Extraction with user video link."""
    response = client.post("/api/get-video-info", data={"url": TEST_VIDEO_URL})
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "formats" in data
    assert len(data["formats"]) > 0
    assert data["duration"] > 0
    assert "thumbnail" in data
    print(f"\nExtracted Title: {data['title']} (Duration: {data['duration']}s)")

def test_video_download_audio_only():
    """Unit test for Video Downloader: Download Audio MP3 with user video link."""
    task_id = "test-dl-audio-1"
    response = client.post("/api/download-video", data={
        "url": TEST_VIDEO_URL,
        "audio_only": "true",
        "format": "mp3",
        "task_id": task_id
    })
    assert response.status_code == 200
    data = response.json()
    assert "download_path" in data
    assert data["download_path"].endswith(".mp3")
    print(f"\nDownloaded Audio File: {data['download_path']}")

    # Verify download route works
    dl_resp = client.get(f"/api/download/{data['download_path']}")
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 0

def test_audio_converter_tool():
    """Unit test for Audio Converter Tool."""
    # Create a small valid WAV in-memory using python wave
    import wave
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        # 0.5 second of silence
        wav_file.writeframes(b'\x00\x00' * 22050)
    buf.seek(0)

    files = [
        ('file', ('sample_silence.wav', buf.getvalue(), 'audio/wav'))
    ]
    data = {
        'output_format': 'mp3',
        'bitrate': '320k'
    }
    response = client.post("/api/convert-audio", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()
    assert "filename" in res_json
    assert res_json["filename"].endswith(".mp3")

    # Verify download works
    dl_resp = client.get(f"/api/download/{res_json['filename']}")
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 0
