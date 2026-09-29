import io
import base64
import numpy as np
from PIL import Image, ImageDraw
from app import app

def create_building_test_image():
    """Generates an image with vertical building architecture / windows grid"""
    img = Image.new("RGB", (300, 300), color=(220, 200, 180)) # Beige wall
    draw = ImageDraw.Draw(img)
    # Draw building windows / vertical columns
    for x in range(30, 270, 40):
        for y in range(30, 220, 50):
            draw.rectangle([x, y, x + 25, y + 35], fill=(30, 60, 100)) # Blue window panes
            draw.line([x + 12, y, x + 12, y + 35], fill=(255, 255, 255), width=2)
            draw.line([x, y + 17, x + 25, y + 17], fill=(255, 255, 255), width=2)
    # Pillars
    for px in [10, 280]:
        draw.rectangle([px, 0, px + 10, 300], fill=(160, 140, 120))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

def create_road_test_image():
    """Generates an image with dark asphalt pavement / road ground plane"""
    img = Image.new("RGB", (300, 300), color=(180, 210, 240)) # Sky top
    draw = ImageDraw.Draw(img)
    # Asphalt bottom 60%
    draw.polygon([(0, 120), (300, 120), (300, 300), (0, 300)], fill=(50, 50, 55)) # Dark gray asphalt
    # Road damage / pothole
    draw.ellipse([100, 180, 190, 240], fill=(25, 25, 25))
    # Road white lane marker
    draw.polygon([(145, 120), (155, 120), (165, 300), (135, 300)], fill=(230, 230, 230))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

if __name__ == "__main__":
    client = app.test_client()
    print("\n=== Testing Category vs Image Semantic Consistency ===")

    building_img = create_building_test_image()
    road_img = create_road_test_image()

    # Case 1: Road complaint with Building image (User's case)
    res_mismatch = client.post("/api/analyze", json={
        "complaint": "सड़क पर बड़ा गड्ढा है और रास्ता टूटा हुआ है।", # Road complaint
        "image": building_img
    })
    data_mismatch = res_mismatch.get_json()
    print("\n[Case 1: Road Complaint + Building Image]")
    print(" - Detected Category:", data_mismatch["category"])
    print(" - Classification:", data_mismatch["classification"])
    print(" - Reason:", data_mismatch["classification_reason"])

    assert "MISMATCH" in data_mismatch["classification"] or "SUSPICIOUS" in data_mismatch["classification"]
    print(" -> SUCCESS: Building image correctly flagged as MISMATCH / SUSPICIOUS for Road complaint!")

    # Case 2: Road complaint with Road image
    res_match = client.post("/api/analyze", json={
        "complaint": "सड़क पर बड़ा गड्ढा है और रास्ता टूटा हुआ है।", # Road complaint
        "image": road_img
    })
    data_match = res_match.get_json()
    print("\n[Case 2: Road Complaint + Genuine Road Image]")
    print(" - Detected Category:", data_match["category"])
    print(" - Classification:", data_match["classification"])
    print(" - Reason:", data_match["classification_reason"])

    assert data_match["classification"] == "GENUINE"
    print(" -> SUCCESS: Authentic Road image verified as GENUINE!")

    print("\n=== ALL SCENARIO VERIFICATION TESTS PASSED! ===")
