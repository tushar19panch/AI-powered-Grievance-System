"""
Extensive 150+ Multi-Category Vision Model Benchmark & Validation Suite
Covers all 16 Village Domains across extreme edge cases:
  1. FAKE / INVALID (Solid canvases, flat gradients, barcodes, checkerboards, zero-entropy, corrupt data)
  2. NEEDS_VERIFICATION (Optical defocus, motion blur, night/low-light, glare/overexposure, hazy fog, thumb obstruction)
  3. MISMATCH_SUSPICIOUS (Selfies/portraits for civic issues, fire for health/edu, clean rooms for waste, documents)
  4. DUPLICATE (Exact copies, perceptual hash clones, cropped variants, mirror-flipped clones, compression shifts)
  5. GENUINE (Authentic potholes, sewer drains, handpumps, electric poles, schools, PHC, CSC kiosks, haat bazars, goshalas)
"""

import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from pipeline.image_matcher import (
    compute_image_fingerprint,
    match_image_against_database,
    compare_two_fingerprints,
    classify_visual_scene
)

# ==============================================================================
# SYNTHETIC GENERATORS FOR BENCHMARKING
# ==============================================================================

def create_solid_color_image(color=(255, 255, 255), size=(200, 200)):
    return Image.new("RGB", size, color=color)

def create_checkerboard_pattern():
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    for y in range(200):
        for x in range(200):
            if ((x // 20) + (y // 20)) % 2 == 0:
                arr[y, x] = [255, 255, 255]
            else:
                arr[y, x] = [0, 0, 0]
    return Image.fromarray(arr)

def create_blurry_road_image(radius=7):
    img = create_road_pothole_image()
    for _ in range(4):
        img = img.filter(ImageFilter.GaussianBlur(radius=radius))
    return img

def create_motion_blur_drainage_image():
    img = create_drainage_image()
    for _ in range(5):
        img = img.filter(ImageFilter.BoxBlur(radius=6))
    return img

def create_night_underexposed_image(brightness=10):
    arr = np.random.randint(max(0, brightness - 5), brightness + 5, (200, 200, 3), dtype=np.uint8)
    return Image.fromarray(arr)

def create_overexposed_glare_image(brightness=248):
    arr = np.random.randint(brightness - 4, 255, (200, 200, 3), dtype=np.uint8)
    return Image.fromarray(arr)

def create_foggy_smudged_image():
    arr = np.random.randint(118, 126, (200, 200, 3), dtype=np.uint8)
    return Image.fromarray(arr)

def create_thumb_obstructed_lens_image():
    # Finger covering the majority of the camera lens (skin tone with low edge energy)
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    arr[:, :] = [215, 160, 130] # Uniform skin tone
    noise = np.random.randint(-5, 5, (200, 200, 3), dtype=np.int16)
    arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def create_human_portrait_image(skin_tone=(220, 170, 135)):
    img = Image.new("RGB", (200, 200), color=(110, 120, 130))
    arr = np.array(img)
    for y in range(35, 165):
        for x in range(45, 155):
            if ((x - 100)**2)/2500 + ((y - 100)**2)/3800 <= 1.0:
                noise = np.random.randint(-10, 10)
                arr[y, x] = [
                    np.clip(skin_tone[0] + noise, 0, 255),
                    np.clip(skin_tone[1] + noise, 0, 255),
                    np.clip(skin_tone[2] + noise, 0, 255)
                ]
    return Image.fromarray(arr)

def create_screenshot_document_image():
    img = Image.new("RGB", (200, 200), color=(250, 250, 250))
    draw = ImageDraw.Draw(img)
    for y in range(20, 180, 14):
        draw.line([20, y, 180, y], fill=(25, 25, 25), width=2)
    return img

def create_fire_image():
    arr = np.random.randint(210, 255, (200, 200, 3), dtype=np.uint8)
    arr[:, :, 1] = np.random.randint(50, 150, (200, 200), dtype=np.uint8)
    arr[:, :, 2] = np.random.randint(0, 25, (200, 200), dtype=np.uint8)
    return Image.fromarray(arr)

def create_clean_indoor_image():
    img = Image.new("RGB", (200, 200), color=(240, 235, 230))
    draw = ImageDraw.Draw(img)
    draw.line([0, 135, 200, 135], fill=(175, 165, 155), width=3)
    draw.rectangle([45, 45, 105, 105], fill=(215, 205, 195), outline=(150, 140, 130), width=2)
    return img

def create_road_pothole_image():
    img = Image.new("RGB", (200, 200), color=(85, 80, 78))
    noise = np.random.randint(-15, 15, (200, 200, 3), dtype=np.int16)
    arr = np.clip(np.array(img, dtype=np.int16) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)
    draw.ellipse([60, 60, 140, 140], fill=(35, 30, 28), outline=(20, 20, 20), width=3)
    draw.ellipse([80, 80, 120, 120], fill=(18, 16, 15))
    return img

def create_drainage_image():
    img = Image.new("RGB", (200, 200), color=(70, 75, 70))
    draw = ImageDraw.Draw(img)
    draw.rectangle([60, 0, 140, 200], fill=(40, 75, 95), outline=(30, 30, 30), width=2)
    draw.rectangle([70, 10, 130, 190], fill=(30, 65, 80))
    return img

def create_waste_garbage_image():
    arr = np.random.randint(60, 230, (200, 200, 3), dtype=np.uint8)
    for _ in range(25):
        x, y = np.random.randint(10, 175, 2)
        arr[y:y+20, x:x+20] = [np.random.randint(0, 255), np.random.randint(0, 255), np.random.randint(0, 255)]
    return Image.fromarray(arr)

def create_electric_pole_image():
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    arr[:120, :] = [135, 190, 235]
    arr[120:, :] = [90, 95, 85]
    img = Image.fromarray(arr)
    draw = ImageDraw.Draw(img)
    draw.line([95, 30, 95, 180], fill=(40, 40, 40), width=5)
    draw.line([70, 50, 120, 50], fill=(30, 30, 30), width=3)
    draw.line([0, 50, 200, 60], fill=(20, 20, 20), width=2)
    return img

def create_greenery_park_image():
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    arr[:, :] = [45, 135, 50]
    noise = np.random.randint(-20, 20, (200, 200, 3), dtype=np.int16)
    arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def create_building_facility_image():
    img = Image.new("RGB", (200, 200), color=(180, 175, 165))
    draw = ImageDraw.Draw(img)
    draw.rectangle([30, 40, 170, 190], fill=(150, 140, 130), outline=(50, 50, 50), width=4)
    draw.rectangle([80, 110, 120, 190], fill=(70, 60, 50)) # Door
    draw.rectangle([45, 60, 75, 90], fill=(90, 140, 180)) # Window
    draw.rectangle([125, 60, 155, 90], fill=(90, 140, 180)) # Window
    return img

# ==============================================================================
# 150+ COMPREHENSIVE TEST MATRIX
# ==============================================================================

def run_large_scale_benchmark():
    print("=" * 85)
    print("AI VISION COMPREHENSIVE MULTI-CATEGORY VALIDATION SUITE (150+ TESTS)")
    print("=" * 85)

    # Base Database
    road_sample = create_road_pothole_image()
    drain_sample = create_drainage_image()
    waste_sample = create_waste_garbage_image()
    electric_sample = create_electric_pole_image()

    fp_road = compute_image_fingerprint(road_sample)
    fp_drain = compute_image_fingerprint(drain_sample)
    fp_waste = compute_image_fingerprint(waste_sample)
    fp_electric = compute_image_fingerprint(electric_sample)

    mock_db = [
        {"complaint_id": "GRV-101", "fingerprint": fp_road, "category": "Roads & Transportation"},
        {"complaint_id": "GRV-102", "fingerprint": fp_drain, "category": "Drainage"},
        {"complaint_id": "GRV-103", "fingerprint": fp_waste, "category": "Waste Management"},
        {"complaint_id": "GRV-104", "fingerprint": fp_electric, "category": "Electricity"}
    ]

    test_cases = []

    # 1. FAKE / INVALID (30 Tests)
    solid_colors = [
        ("Solid Pure White Canvas", (255, 255, 255), "Roads & Transportation"),
        ("Solid Pure Black Canvas", (0, 0, 0), "Drainage"),
        ("Solid Medium Grey Canvas", (128, 128, 128), "Water Supply"),
        ("Solid Bright Red Canvas", (255, 0, 0), "Healthcare"),
        ("Solid Bright Green Canvas", (0, 255, 0), "Environment"),
        ("Solid Bright Blue Canvas", (0, 0, 255), "Electricity"),
        ("Solid Yellow Canvas", (255, 255, 0), "Sanitation"),
        ("Solid Cyan Canvas", (0, 255, 255), "Digital/IT Services"),
        ("Solid Magenta Canvas", (255, 0, 255), "Welfare Services"),
        ("Solid Dark Navy Canvas", (10, 15, 30), "Town Planning & Development"),
        ("Solid Light Pastel Pink", (255, 200, 200), "Markets & Commercial"),
        ("Solid Light Lime Green", (200, 255, 200), "Parks & Public Space"),
        ("Solid Warm Beige Canvas", (245, 235, 220), "Property & Revenue"),
        ("Solid Lavender Canvas", (220, 210, 255), "Education"),
        ("Solid Khaki Brown Canvas", (160, 140, 100), "Animal & Veterinary"),
        ("Solid Off-White 248 Canvas", (248, 248, 248), "Roads & Transportation"),
        ("Solid Olive Green Canvas", (100, 120, 40), "Environment"),
        ("Solid Teal Canvas", (0, 128, 128), "Water Supply"),
        ("Solid Indigo Canvas", (75, 0, 130), "Electricity"),
        ("Solid Crimson Canvas", (220, 20, 60), "Healthcare"),
        ("Solid Coral Orange Canvas", (255, 127, 80), "Sanitation"),
        ("Solid Sky Blue Canvas", (135, 206, 235), "Digital/IT Services"),
        ("Solid Dark Slate Canvas", (47, 79, 79), "Property & Revenue"),
        ("Solid Mint Cream Canvas", (245, 255, 250), "Education"),
        ("Solid Deep Purple Canvas", (80, 0, 80), "Town Planning & Development"),
        ("Solid Goldenrod Canvas", (218, 165, 32), "Markets & Commercial"),
        ("Solid Salmon Canvas", (250, 128, 114), "Welfare Services"),
        ("Solid Chocolate Canvas", (210, 105, 30), "Animal & Veterinary"),
        ("Solid Steel Blue Canvas", (70, 130, 180), "Drainage"),
        ("Solid Light Cyan Canvas", (224, 255, 255), "Water Supply")
    ]
    for name, col, cat in solid_colors:
        test_cases.append({"name": name, "img": create_solid_color_image(col), "cat": cat, "expected": "FAKE", "db": mock_db})

    # 2. QUALITY DEGRADATION / NEEDS_VERIFICATION (36 Tests)
    blur_cases = [
        ("Defocus Blur Radius 5 (Roads)", create_blurry_road_image(5), "Roads & Transportation"),
        ("Defocus Blur Radius 7 (Roads)", create_blurry_road_image(7), "Roads & Transportation"),
        ("Defocus Blur Radius 9 (Roads)", create_blurry_road_image(9), "Roads & Transportation"),
        ("Defocus Blur Radius 12 (Roads)", create_blurry_road_image(12), "Roads & Transportation"),
        ("Motion Blur on Drainage Gutter (Box 5)", create_motion_blur_drainage_image(), "Drainage"),
        ("Motion Blur on Drainage Gutter (Box 8)", create_motion_blur_drainage_image(), "Drainage"),
        ("Extreme Low-Light Night 4 Lux (Electricity)", create_night_underexposed_image(4), "Electricity"),
        ("Extreme Low-Light Night 7 Lux (Roads)", create_night_underexposed_image(7), "Roads & Transportation"),
        ("Extreme Low-Light Night 10 Lux (Water)", create_night_underexposed_image(10), "Water Supply"),
        ("Extreme Low-Light Night 14 Lux (Drainage)", create_night_underexposed_image(14), "Drainage"),
        ("Extreme Low-Light Night 17 Lux (Sanitation)", create_night_underexposed_image(17), "Sanitation"),
        ("Extreme Low-Light Night 19 Lux (Waste)", create_night_underexposed_image(19), "Waste Management"),
        ("Blinding Sun Glare 248 Brightness (Water)", create_overexposed_glare_image(248), "Water Supply"),
        ("Blinding Sun Glare 250 Brightness (Roads)", create_overexposed_glare_image(250), "Roads & Transportation"),
        ("Blinding Sun Glare 252 Brightness (Electricity)", create_overexposed_glare_image(252), "Electricity"),
        ("Blinding Sun Glare 254 Brightness (Drainage)", create_overexposed_glare_image(254), "Drainage"),
        ("Extreme Camera Flash Washout (Sanitation)", create_overexposed_glare_image(251), "Sanitation"),
        ("Overexposed Bleached Frame (Waste)", create_overexposed_glare_image(253), "Waste Management"),
        ("Overexposed Bleached Frame (Education)", create_overexposed_glare_image(249), "Education"),
        ("Defocus Optical Blur (Waste)", create_waste_garbage_image().filter(ImageFilter.GaussianBlur(10)), "Waste Management"),
        ("Defocus Optical Blur (Electricity)", create_electric_pole_image().filter(ImageFilter.GaussianBlur(12)), "Electricity"),
        ("Extreme Low-Light Night 8 Lux (Environment)", create_night_underexposed_image(8), "Environment"),
        ("Extreme Low-Light Night 12 Lux (Property)", create_night_underexposed_image(12), "Property & Revenue"),
        ("Extreme Sun Glare 255 Bleached (Environment)", create_overexposed_glare_image(255), "Environment"),
        ("Dense Morning Mist / Fog Washout (Roads)", create_foggy_smudged_image(), "Roads & Transportation"),
        ("Smudged Camera Lens Low Contrast (Water)", create_foggy_smudged_image(), "Water Supply"),
        ("Dense Fog Low Contrast (Drainage)", create_foggy_smudged_image(), "Drainage"),
        ("Camera Lens Obstructed by Thumb (Roads)", create_thumb_obstructed_lens_image(), "Roads & Transportation"),
        ("Camera Lens Obstructed by Finger (Drainage)", create_thumb_obstructed_lens_image(), "Drainage"),
        ("Camera Lens Obstructed by Finger (Waste)", create_thumb_obstructed_lens_image(), "Waste Management"),
        ("Extreme Low-Light Night 6 Lux (Healthcare)", create_night_underexposed_image(6), "Healthcare"),
        ("Extreme Low-Light Night 8 Lux (Education)", create_night_underexposed_image(8), "Education"),
        ("Extreme Low-Light Night 10 Lux (Animal)", create_night_underexposed_image(10), "Animal & Veterinary"),
        ("Sun Glare Overexposure 250 (Markets)", create_overexposed_glare_image(250), "Markets & Commercial"),
        ("Sun Glare Overexposure 252 (Town Planning)", create_overexposed_glare_image(252), "Town Planning & Development"),
        ("Defocus Optical Blur (Drainage 10px)", create_drainage_image().filter(ImageFilter.GaussianBlur(10)), "Drainage")
    ]
    for name, img, cat in blur_cases:
        test_cases.append({"name": name, "img": img, "cat": cat, "expected": "NEEDS_VERIFICATION", "db": mock_db})

    # 3. MISMATCH / SUSPICIOUS (40 Tests)
    mismatches = [
        ("Human Selfie for Roads Grievance", create_human_portrait_image((225, 175, 140)), "Roads & Transportation"),
        ("Human Selfie for Drainage Gutter", create_human_portrait_image((210, 160, 130)), "Drainage"),
        ("Human Selfie for Water Supply Leak", create_human_portrait_image((190, 140, 110)), "Water Supply"),
        ("Human Selfie for Waste Management", create_human_portrait_image((230, 180, 150)), "Waste Management"),
        ("Human Selfie for Electricity Pole", create_human_portrait_image((220, 170, 135)), "Electricity"),
        ("Human Selfie for Sanitation & Toilets", create_human_portrait_image((200, 150, 120)), "Sanitation"),
        ("Human Selfie for Parks & Public Space", create_human_portrait_image((215, 165, 130)), "Parks & Public Space"),
        ("Human Selfie for Town Planning", create_human_portrait_image((225, 175, 140)), "Town Planning & Development"),
        ("Human Selfie for Environment", create_human_portrait_image((210, 160, 125)), "Environment"),
        ("Human Selfie for Property & Revenue", create_human_portrait_image((220, 170, 130)), "Property & Revenue"),
        ("Human Selfie for Animal & Veterinary", create_human_portrait_image((215, 165, 135)), "Animal & Veterinary"),
        ("Human Selfie for Digital/IT Services", create_human_portrait_image((205, 155, 125)), "Digital/IT Services"),
        ("WhatsApp Chat Screenshot for Road", create_screenshot_document_image(), "Roads & Transportation"),
        ("WhatsApp Chat Screenshot for Drainage", create_screenshot_document_image(), "Drainage"),
        ("Digital Text Document for Waste Management", create_screenshot_document_image(), "Waste Management"),
        ("Digital Text Document for Water Supply", create_screenshot_document_image(), "Water Supply"),
        ("Digital Text Document for Electricity", create_screenshot_document_image(), "Electricity"),
        ("Digital Text Document for Sanitation", create_screenshot_document_image(), "Sanitation"),
        ("Digital Text Document for Environment", create_screenshot_document_image(), "Environment"),
        ("Digital Text Document for Parks", create_screenshot_document_image(), "Parks & Public Space"),
        ("Fire / Thermal Blaze uploaded for Healthcare", create_fire_image(), "Healthcare"),
        ("Fire / Thermal Blaze uploaded for Education", create_fire_image(), "Education"),
        ("Fire / Thermal Blaze uploaded for Water Supply", create_fire_image(), "Water Supply"),
        ("Fire / Thermal Blaze uploaded for Welfare Services", create_fire_image(), "Welfare Services"),
        ("Fire / Thermal Blaze uploaded for Property Revenue", create_fire_image(), "Property & Revenue"),
        ("Fire / Thermal Blaze uploaded for Digital/IT Services", create_fire_image(), "Digital/IT Services"),
        ("Fire / Thermal Blaze uploaded for Animal & Veterinary", create_fire_image(), "Animal & Veterinary"),
        ("Fire / Thermal Blaze uploaded for Markets", create_fire_image(), "Markets & Commercial"),
        ("Fire / Thermal Blaze uploaded for Sanitation", create_fire_image(), "Sanitation"),
        ("Clean Living Room for Waste Management", create_clean_indoor_image(), "Waste Management"),
        ("Clean Living Room for Roads & Transport", create_clean_indoor_image(), "Roads & Transportation"),
        ("Clean Living Room for Drainage", create_clean_indoor_image(), "Drainage"),
        ("Clean Living Room for Water Supply", create_clean_indoor_image(), "Water Supply"),
        ("Clean Living Room for Sanitation", create_clean_indoor_image(), "Sanitation"),
        ("Clean Living Room for Town Planning", create_clean_indoor_image(), "Town Planning & Development"),
        ("Clean Living Room for Environment", create_clean_indoor_image(), "Environment"),
        ("Clean Living Room for Parks & Public Space", create_clean_indoor_image(), "Parks & Public Space"),
        ("Highway Asphalt Road uploaded for Healthcare", create_road_pothole_image(), "Healthcare", []),
        ("Overhead Sky Powerlines for Drainage Channel", create_electric_pole_image(), "Drainage", []),
        ("Standing Drain Water for Electricity Infrastructure", create_drainage_image(), "Electricity", [])
    ]
    for item in mismatches:
        name = item[0]
        img = item[1]
        cat = item[2]
        custom_db = item[3] if len(item) > 3 else mock_db
        test_cases.append({"name": name, "img": img, "cat": cat, "expected": "MISMATCH_SUSPICIOUS", "db": custom_db})

    # 4. DUPLICATES (20 Tests)
    duplicates = [
        ("Exact Duplicate Pothole Photo #101", road_sample, "Roads & Transportation"),
        ("5% Cropped Pothole Photo #101", road_sample.crop((10, 10, 190, 190)), "Roads & Transportation"),
        ("10% Cropped Pothole Photo #101", road_sample.crop((20, 20, 180, 180)), "Roads & Transportation"),
        ("15% Cropped Pothole Photo #101", road_sample.crop((30, 30, 170, 170)), "Roads & Transportation"),
        ("Resized Pothole Photo #101 (160x160)", road_sample.resize((160, 160)), "Roads & Transportation"),
        ("Resized Pothole Photo #101 (120x120)", road_sample.resize((120, 120)), "Roads & Transportation"),
        ("Mirror Flipped Pothole Photo #101", ImageOps.mirror(road_sample), "Roads & Transportation"),
        ("Exact Duplicate Drainage Photo #102", drain_sample, "Drainage"),
        ("5% Cropped Drainage Photo #102", drain_sample.crop((10, 10, 190, 190)), "Drainage"),
        ("Cropped Drainage Photo #102 (15px)", drain_sample.crop((15, 15, 185, 185)), "Drainage"),
        ("Resized Drainage Photo #102 (140x140)", drain_sample.resize((140, 140)), "Drainage"),
        ("Mirror Flipped Drainage Photo #102", ImageOps.mirror(drain_sample), "Drainage"),
        ("Exact Duplicate Waste Dump #103", waste_sample, "Waste Management"),
        ("Cropped Waste Dump #103 (10px)", waste_sample.crop((10, 10, 190, 190)), "Waste Management"),
        ("Resized Waste Dump #103 (150x150)", waste_sample.resize((150, 150)), "Waste Management"),
        ("Mirror Flipped Waste Dump #103", ImageOps.mirror(waste_sample), "Waste Management"),
        ("Exact Duplicate Electric Pole #104", electric_sample, "Electricity"),
        ("Cropped Electric Pole #104 (10px)", electric_sample.crop((10, 10, 190, 190)), "Electricity"),
        ("Resized Electric Pole #104 (150x150)", electric_sample.resize((150, 150)), "Electricity"),
        ("Mirror Flipped Electric Pole #104", ImageOps.mirror(electric_sample), "Electricity")
    ]
    for name, img, cat in duplicates:
        test_cases.append({"name": name, "img": img, "cat": cat, "expected": "DUPLICATE", "db": mock_db})

    # 5. GENUINE VILLAGE SCENES ACROSS ALL 16 DOMAINS (24 Tests)
    genuines = [
        ("Authentic Road Pothole (Unique)", create_road_pothole_image(), "Roads & Transportation", []),
        ("Authentic Drainage Channel (Unique)", create_drainage_image(), "Drainage", []),
        ("Authentic Waste Garbage Heap (Unique)", create_waste_garbage_image(), "Waste Management", []),
        ("Authentic Electric Overhead Pole (Unique)", create_electric_pole_image(), "Electricity", []),
        ("Authentic Village Greenery / Farmland", create_greenery_park_image(), "Environment", []),
        ("Authentic Park Greenery", create_greenery_park_image(), "Parks & Public Space", []),
        ("Authentic Primary School Building", create_building_facility_image(), "Education", []),
        ("Authentic Primary Health Centre (PHC)", create_building_facility_image(), "Healthcare", []),
        ("Authentic Gram Panchayat Bhavan Office", create_building_facility_image(), "Property & Revenue", []),
        ("Authentic Anganwadi Centre Building", create_building_facility_image(), "Welfare Services", []),
        ("Authentic Community Kiosk Building", create_building_facility_image(), "Digital/IT Services", []),
        ("Authentic Village Goshala Facility", create_building_facility_image(), "Animal & Veterinary", []),
        ("Authentic Village Haat Bazaar", create_building_facility_image(), "Markets & Commercial", []),
        ("Authentic Community Toilet Building", create_building_facility_image(), "Sanitation", []),
        ("Authentic Panchayat Development Centre", create_building_facility_image(), "Town Planning & Development", []),
        ("Authentic Village Farmland Field", create_greenery_park_image(), "Environment", []),
        ("Authentic Road Asphalt Surface", create_road_pothole_image(), "Roads & Transportation", []),
        ("Authentic Sewer Drain Trench", create_drainage_image(), "Drainage", []),
        ("Authentic Garbage Pile", create_waste_garbage_image(), "Waste Management", []),
        ("Authentic Power Line Transformer Pole", create_electric_pole_image(), "Electricity", []),
        ("Authentic Village Public Garden", create_greenery_park_image(), "Parks & Public Space", []),
        ("Authentic Rural Veterinary Hospital", create_building_facility_image(), "Animal & Veterinary", []),
        ("Authentic Community Haat Bazaar Shed", create_building_facility_image(), "Markets & Commercial", []),
        ("Authentic CSC Digital Seva Centre", create_building_facility_image(), "Digital/IT Services", [])
    ]
    for name, img, cat, custom_db in genuines:
        test_cases.append({"name": name, "img": img, "cat": cat, "expected": "GENUINE", "db": custom_db})

    # -------------------------------------------------------------
    # EXECUTION
    # -------------------------------------------------------------
    passed = 0
    total = len(test_cases)
    failures = []

    for i, tc in enumerate(test_cases, 1):
        fp = compute_image_fingerprint(tc["img"])
        res = match_image_against_database(fp, tc["db"], expected_category=tc["cat"])
        actual = res["classification"]
        is_ok = (actual == tc["expected"])

        if is_ok:
            passed += 1
            status_tag = "PASS"
        else:
            status_tag = f"FAIL (Expected {tc['expected']}, Got {actual})"
            failures.append((i, tc['name'], tc['cat'], tc['expected'], actual, res.get("reason")))

        print(f"[{i:03d}/{total:03d}] [{status_tag:<4}] | {tc['name']} -> {actual}")

    print("\n" + "=" * 85)
    print(f"BENCHMARK SUMMARY: {passed}/{total} Passed ({int(passed/total * 100)}% Accuracy)")
    print("=" * 85)

    if failures:
        print("\nFAILURES DETECTED:")
        for fid, fname, fcat, fexp, fact, freas in failures:
            print(f"  #{fid:03d}: {fname} [{fcat}]")
            print(f"        Expected: {fexp} | Got: {fact}")
            print(f"        Reason: {freas}")
    else:
        print(f"\nALL {total} MULTI-CATEGORY VISION TESTS PASSED PERFECTLY WITH 100% ACCURACY!")

if __name__ == "__main__":
    run_large_scale_benchmark()
