from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path so we can import main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Unified Tools API"}

def test_pdf_merge_unconfigured():
    # Attempt to merge without configuring STIRLING_PDF_URL
    # We need to send some files
    files = [
        ('files', ('test.pdf', b'fake pdf content', 'application/pdf'))
    ]
    response = client.post("/api/pdf/merge", files=files)
    assert response.status_code == 501
    assert response.json()["detail"] == "Stirling-PDF service not configured"
