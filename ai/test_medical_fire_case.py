import io
import base64
import numpy as np
from PIL import Image, ImageDraw
from app import app

def create_fire_test_image():
    """Generates an image with intense flame / orange-red fire glow"""
    img = Image.new("RGB", (300, 300), color=(20, 5, 5)) # Dark smoke background
    draw = ImageDraw.Draw(img)
    # Bright fiery orange / yellow flame core
    draw.polygon([(150, 40), (80, 260), (220, 260)], fill=(255, 120, 0))
    draw.polygon([(150, 90), (110, 260), (190, 260)], fill=(255, 220, 30)) # Yellow core
    draw.ellipse([120, 180, 180, 270], fill=(255, 250, 180)) # White-hot center
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

if __name__ == "__main__":
    client = app.test_client()
    print("\n=== Testing User Case: Medical Complaint + Fire Image ===")

    fire_img = create_fire_test_image()

    res = client.post("/api/analyze", json={
        "complaint": "Medical service not provided in hospital",
        "image": fire_img
    })
    
    data = res.get_json()
    print("\n[AI Analysis Result]")
    print(" - Category:", data.get("category"))
    print(" - Priority:", data.get("priority"))
    print(" - Sentiment:", data.get("sentiment"))
    print(" - Classification:", data.get("classification"))
    print(" - Reason:", data.get("classification_reason"))

    # Assertions
    assert data.get("category") == "Healthcare", f"Expected Healthcare, got {data.get('category')}"
    assert data.get("priority") in ["HIGH", "CRITICAL"], f"Expected HIGH or CRITICAL priority, got {data.get('priority')}"
    assert "MISMATCH" in data.get("classification") or "SUSPICIOUS" in data.get("classification"), f"Expected mismatch classification, got {data.get('classification')}"
    
    print("\n -> SUCCESS: Medical grievance accurately received HIGH priority & Fire photo correctly flagged as MISMATCH_SUSPICIOUS!")
