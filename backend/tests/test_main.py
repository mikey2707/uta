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
    assert len(data["formats"]) >= 5, f"Expected multiple qualities, got {len(data['formats'])}"
    assert data["duration"] > 0
    assert "thumbnail" in data
    resolutions = [f["resolution"] for f in data["formats"]]
    print(f"\nExtracted Title: {data['title']}")
    print(f"Available Qualities: {resolutions}")
    # Verify both HD and SD qualities exist
    assert any("720p" in r or "1080p" in r for r in resolutions)
    assert any("360p" in r or "480p" in r for r in resolutions)

def test_random_youtube_video_qualities_and_download():
    """Unit test with a second random YouTube video: checks all qualities, downloads a video format, and tests auto-cleanup."""
    RANDOM_VIDEO_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
    
    # 1. Extract video metadata
    info_resp = client.post("/api/get-video-info", data={"url": RANDOM_VIDEO_URL})
    assert info_resp.status_code == 200
    info_data = info_resp.json()
    assert len(info_data["formats"]) >= 5
    resolutions = [f["resolution"] for f in info_data["formats"]]
    print(f"\nRandom Video: {info_data['title']}")
    print(f"Random Video Qualities: {resolutions}")

    # Pick a lightweight resolution for fast test download (e.g. 144p or lowest)
    lowest_fmt = info_data["formats"][-1]
    task_id = "test-rand-video-1"

    # 2. Start download
    dl_resp = client.post("/api/download-video", data={
        "url": RANDOM_VIDEO_URL,
        "format_id": lowest_fmt["format_id"],
        "audio_only": "false",
        "format": "mp4",
        "task_id": task_id,
        "target_resolution": lowest_fmt["resolution"]
    })
    assert dl_resp.status_code == 200
    dl_data = dl_resp.json()
    assert "download_path" in dl_data
    download_filename = dl_data["download_path"]
    assert download_filename.endswith(".mp4")

    # 3. Check progress endpoint
    prog_resp = client.get(f"/api/download-progress/{task_id}")
    assert prog_resp.status_code == 200
    prog_data = prog_resp.json()
    assert prog_data["progress"] == 100
    assert prog_data["status"] == "finished"
    assert "phase" in prog_data

    # 4. Fetch the file via /api/download and verify auto-cleanup
    fetch_resp = client.get(f"/api/download/{download_filename}?task_id={task_id}")
    assert fetch_resp.status_code == 200
    assert len(fetch_resp.content) > 0

    # Wait for the background deletion thread (2.5s grace period)
    import time
    time.sleep(3.5)
    
    # Verify the file was removed from server storage
    after_resp = client.get(f"/api/download/{download_filename}?task_id={task_id}")
    assert after_resp.status_code == 404, "Expected file to be deleted from server after download"

def test_video_download_audio_only():
    """Unit test for Video Downloader: Download Audio MP3 with user video link and verify cleanup."""
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
    dl_resp = client.get(f"/api/download/{data['download_path']}?task_id={task_id}")
    assert dl_resp.status_code == 200
    assert len(dl_resp.content) > 0

    # Wait for background cleanup
    import time
    time.sleep(3.5)
    clean_check = client.get(f"/api/download/{data['download_path']}?task_id={task_id}")
    assert clean_check.status_code == 404

def test_audio_converter_tool():
    """Unit test for Audio Converter Tool (WAV to MP3 conversion and auto-cleanup)."""
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

    # Wait for background cleanup
    import time
    time.sleep(3.5)
    clean_resp = client.get(f"/api/download/{res_json['filename']}")
    assert clean_resp.status_code == 404

def test_audio_converter_tool_multi_format():
    """Unit test for Audio Converter Tool: converting to AAC and FLAC."""
    import wave
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        wav_file.writeframes(b'\x00\x00' * 11025) # 0.25s
    buf.seek(0)

    for fmt in ['aac', 'flac']:
        files = [('file', (f'sample.{fmt}', buf.getvalue(), 'audio/wav'))]
        data = {'output_format': fmt, 'bitrate': '256k'}
        resp = client.post("/api/convert-audio", files=files, data=data)
        assert resp.status_code == 200
        out_name = resp.json()["filename"]
        assert out_name.endswith(f".{fmt}")
        
        # Download and verify
        dl_resp = client.get(f"/api/download/{out_name}")
        assert dl_resp.status_code == 200
        assert len(dl_resp.content) > 0
