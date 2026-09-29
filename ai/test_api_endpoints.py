import json
import base64
from io import BytesIO
from PIL import Image, ImageDraw
from app import app

def test_flask_endpoints():
    client = app.test_client()

    print("==================================================")
    print("TESTING MULTI-MODAL FLASK AI ENDPOINTS")
    print("==================================================")

    # 1. Health Check
    res = client.get("/health")
    assert res.status_code == 200
    print("\n[Endpoint 1: /health] ->", res.get_json())

    # Create a base64 test image
    img = Image.new("RGB", (200, 200), color=(70, 70, 70))
    draw = ImageDraw.Draw(img)
    draw.ellipse([40, 40, 160, 160], fill=(20, 20, 20))
    buffer = BytesIO()
    img.save(buffer, format="JPEG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

    # 2. Test /api/fingerprint
    res_fp = client.post("/api/fingerprint", json={"image": b64_str})
    assert res_fp.status_code == 200
    fp_data = res_fp.get_json()["fingerprint"]
    print("\n[Endpoint 2: /api/fingerprint] -> pHash:", fp_data["phash"])

    # 3. Test /api/analyze (First time upload -> GENUINE)
    res_an1 = client.post("/api/analyze", json={
        "complaint": "सड़क पर बड़ा गड्ढा है और पानी भरा हुआ है।",
        "image": b64_str,
        "existing_images": []
    })
    assert res_an1.status_code == 200
    an1_data = res_an1.get_json()
    print("\n[Endpoint 3: /api/analyze (First Complaint)] ->")
    print(" - Category:", an1_data["category"])
    print(" - Priority:", an1_data["priority"])
    print(" - Classification:", an1_data["classification"])
    print(" - Image Hash:", an1_data["image_hash"])
    assert an1_data["classification"] == "GENUINE"

    # 4. Test /api/analyze (Second Complaint with different text, SAME image -> DUPLICATE)
    res_an2 = client.post("/api/analyze", json={
        "complaint": "रास्ते में गहरा गड्ढा होने से दुर्घटना हो सकती है।",
        "image": b64_str,
        "existing_images": [
            {"complaint_id": "GRV-101", "image_hash": an1_data["image_hash"]}
        ]
    })
    assert res_an2.status_code == 200
    an2_data = res_an2.get_json()
    print("\n[Endpoint 4: /api/analyze (Second Complaint - Same Image)] ->")
    print(" - Category:", an2_data["category"])
    print(" - Priority:", an2_data["priority"])
    print(" - Classification:", an2_data["classification"])
    print(" - Duplicate Of:", an2_data["duplicate_of_id"])
    print(" - Reason:", an2_data["classification_reason"])
    assert an2_data["classification"] == "DUPLICATE"
    assert an2_data["duplicate_of_id"] == "GRV-101"

    # 5. Test /api/transcribe & /api/transcribe-and-analyze with audio
    import scipy.io.wavfile as wavfile
    import numpy as np
    
    samplerate = 16000
    duration = 0.5
    t = np.linspace(0., duration, int(samplerate * duration))
    amplitude = np.iinfo(np.int16).max * 0.3
    data = (amplitude * np.sin(2. * np.pi * 440. * t)).astype(np.int16)
    audio_buf = BytesIO()
    wavfile.write(audio_buf, samplerate, data)
    audio_b64 = base64.b64encode(audio_buf.getvalue()).decode("utf-8")

    res_transcribe = client.post("/api/transcribe", json={"audio": audio_b64, "language": "hi"})
    assert res_transcribe.status_code == 200
    print("\n[Endpoint 5: /api/transcribe] ->", res_transcribe.get_json())

    res_trans_an = client.post("/api/transcribe-and-analyze", json={"audio": audio_b64, "language": "hi"})
    assert res_trans_an.status_code == 200
    print("\n[Endpoint 6: /api/transcribe-and-analyze] ->", res_trans_an.get_json())

    print("\n==================================================")
    print("ALL API ENDPOINT TESTS (TEXT + IMAGE + AUDIO) PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_flask_endpoints()

