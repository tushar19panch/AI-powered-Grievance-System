import os
import sys
import numpy as np
from PIL import Image, ImageDraw

# Add base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from pipeline.image_matcher import (
    compute_image_fingerprint,
    compare_two_fingerprints,
    match_image_against_database
)

def create_sample_pothole_image():
    """Generates a synthetic textured image representing a road pothole"""
    img = Image.new("RGB", (300, 300), color=(90, 85, 80))
    draw = ImageDraw.Draw(img)
    # Draw road texture and irregular pothole
    draw.ellipse([70, 70, 230, 230], fill=(40, 35, 30), outline=(20, 20, 20), width=4)
    draw.ellipse([100, 100, 200, 200], fill=(25, 25, 25))
    for i in range(20, 280, 20):
        draw.line([i, 0, i+10, 300], fill=(120, 115, 110), width=1)
    return img

def create_blank_fake_image():
    """Generates a solid blank white image (fake/spam)"""
    return Image.new("RGB", (300, 300), color=(255, 255, 255))

def run_tests():
    print("==================================================")
    print("RUNNING IMAGE DUPLICATE & FAKE DETECTION TESTS")
    print("==================================================")
    
    # Test 1: Original Road Pothole
    img1 = create_sample_pothole_image()
    fp1 = compute_image_fingerprint(img1)
    print("\n[Test 1] Original Pothole Fingerprint:")
    print(f" - pHash: {fp1['phash']}")
    print(f" - dHash: {fp1['dhash']}")
    print(f" - Entropy: {fp1['entropy']}")
    print(f" - Is Blank/Fake: {fp1['is_blank_or_invalid']}")
    
    # Store in mock database
    database = [
        {"complaint_id": "GRV-1001", "fingerprint": fp1, "category": "Roads & Transportation"}
    ]
    
    # Test 2: Uploading the exact same image (or slightly cropped/compressed)
    img2_compressed = img1.resize((200, 200)).crop((5, 5, 195, 195))
    fp2 = compute_image_fingerprint(img2_compressed)
    
    match_result = match_image_against_database(fp2, database)
    print("\n[Test 2] Duplicate Image Upload Check:")
    print(f" - Result Classification: {match_result['classification']}")
    print(f" - Duplicate of ID: {match_result['duplicate_of_id']}")
    print(f" - Similarity Score: {match_result['similarity_score']}")
    print(f" - Reason: {match_result['reason']}")
    assert match_result['classification'] == 'DUPLICATE', "Test 2 Failed: Should be DUPLICATE!"

    # Test 3: Blank/Solid fake photo
    blank_img = create_blank_fake_image()
    fp3 = compute_image_fingerprint(blank_img)
    fake_result = match_image_against_database(fp3, database)
    print("\n[Test 3] Blank/Solid Fake Photo Check:")
    print(f" - Result Classification: {fake_result['classification']}")
    print(f" - Reason: {fake_result['reason']}")
    assert fake_result['classification'] == 'FAKE', "Test 3 Failed: Should be FAKE!"

    # Test 4: Completely distinct new image (e.g. green nature/crops)
    distinct_img = Image.new("RGB", (300, 300), color=(30, 140, 50))
    d_draw = ImageDraw.Draw(distinct_img)
    for i in range(10, 290, 15):
        d_draw.rectangle([i, 50, i+8, 250], fill=(20, 100, 35))
    fp4 = compute_image_fingerprint(distinct_img)
    distinct_result = match_image_against_database(fp4, database)
    print("\n[Test 4] Genuine New Complaint Photo Check:")
    print(f" - Result Classification: {distinct_result['classification']}")
    print(f" - Reason: {distinct_result['reason']}")
    assert distinct_result['classification'] == 'GENUINE', "Test 4 Failed: Should be GENUINE!"

    print("\n==================================================")
    print("ALL 4 TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
