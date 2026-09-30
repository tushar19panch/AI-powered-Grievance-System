import base64
import io
import os
import math
import numpy as np
from PIL import Image, ImageFilter, ImageStat, ImageOps
import imagehash

# ==============================================================================
# 16 RECOGNIZED VILLAGE DOMAINS & VISUAL CHARACTERISTICS
# ==============================================================================
VILLAGE_CATEGORIES = [
    "Roads & Transportation",
    "Property & Revenue",
    "Environment",
    "Healthcare",
    "Markets & Commercial",
    "Town Planning & Development",
    "Waste Management",
    "Electricity",
    "Drainage",
    "Water Supply",
    "Animal & Veterinary",
    "Digital/IT Services",
    "Parks & Public Space",
    "Sanitation",
    "Welfare Services",
    "Education"
]

def load_image_from_input(image_input):
    """
    Accepts:
      - File path (str)
      - Base64 string (str with or without 'data:image/...;base64,' header)
      - PIL.Image.Image object
      - Raw bytes
    Returns:
      - PIL.Image.Image (RGB)
    """
    if isinstance(image_input, Image.Image):
        return image_input.convert("RGB")
    
    if isinstance(image_input, bytes):
        return Image.open(io.BytesIO(image_input)).convert("RGB")
    
    if isinstance(image_input, str):
        if "base64," in image_input:
            image_input = image_input.split("base64,")[1]
        
        try:
            raw_bytes = base64.b64decode(image_input.strip())
            return Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        except Exception:
            if os.path.isfile(image_input):
                return Image.open(image_input).convert("RGB")
            raise ValueError("Invalid image input: Neither a valid base64 string nor an existing file path.")
            
    raise TypeError(f"Unsupported image input type: {type(image_input)}")


def classify_visual_scene(img):
    """
    Comprehensive Visual Scene Classifier for Village Civic Issues:
    Analyzes spatial texture, color spectrum, edge frequency, vertical/horizontal balance,
    skin tones, water reflectivity, vegetation, and structural geometry across 16 village domains.
    """
    img_rgb = img.convert("RGB")
    w, h = img_rgb.size
    
    # 1. Standardized low-res array for fast numerical analysis
    img_small = img_rgb.resize((150, 150))
    arr = np.array(img_small, dtype=np.float32) / 255.0
    
    # HSV Color conversion
    img_hsv = img_rgb.resize((150, 150)).convert("HSV")
    hsv_arr = np.array(img_hsv, dtype=np.float32) / 255.0
    hue = hsv_arr[:, :, 0]
    sat = hsv_arr[:, :, 1]
    val = hsv_arr[:, :, 2]
    
    # 2. Spatial Slices (Top-third Sky/Roof, Mid-third Horizon/Walls, Bottom-third Ground/Floor)
    top_sat = float(sat[:50, :].mean())
    mid_sat = float(sat[50:100, :].mean())
    bot_sat = float(sat[100:, :].mean())
    
    top_val = float(val[:50, :].mean())
    bot_val = float(val[100:, :].mean())
    
    # 3. Structural Gradient / Edge Analysis
    gray = img_rgb.convert("L").resize((150, 150))
    gray_arr = np.array(gray, dtype=np.float32)
    
    grad_y = np.abs(np.diff(gray_arr, axis=0)) # Horizontal edges
    grad_x = np.abs(np.diff(gray_arr, axis=1)) # Vertical edges
    
    vertical_energy = float(grad_x.mean())
    horizontal_energy = float(grad_y.mean())
    vert_to_horiz_ratio = (vertical_energy / max(0.1, horizontal_energy))
    
    # Laplacian Variance for Blur Detection
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    edge_energy = float(edge_stat.mean[0]) if edge_stat.mean else 0.0
    
    entropy_stat = ImageStat.Stat(gray)
    texture_entropy = float(entropy_stat.stddev[0]) if entropy_stat.stddev else 0.0
    
    # 4. Color Spectrum Ratios
    # Greenery / Fields (Hue: 0.20 - 0.46, sat >= 0.20)
    green_mask = (hue >= 0.20) & (hue <= 0.46) & (sat >= 0.20)
    green_ratio = float(green_mask.mean())
    
    # Sky / High Overhead Blue-Cyan (Top half: Hue 0.50 - 0.68, Val >= 0.45)
    sky_mask = (hue[:60, :] >= 0.50) & (hue[:60, :] <= 0.68) & (val[:60, :] >= 0.45)
    sky_ratio = float(sky_mask.mean())
    
    # Water / Wet surface / Puddle (Bottom half: Hue 0.48 - 0.70, moderate sat 0.18 - 0.65, low/mid val)
    water_mask = (hue[90:, :] >= 0.46) & (hue[90:, :] <= 0.72) & (sat[90:, :] >= 0.18) & (val[90:, :] >= 0.15)
    water_ratio = float(water_mask.mean())
    
    # Asphalt / Concrete Ground (Bottom half: Sat <= 0.25, Val 0.12 - 0.75)
    asphalt_mask = (sat[60:, :] <= 0.25) & (val[60:, :] >= 0.12) & (val[60:, :] <= 0.75)
    asphalt_ground_ratio = float(asphalt_mask.mean())
    
    # Mud / Earth / Dirt Road (Hue 0.05 - 0.15, Sat 0.20 - 0.55, Val 0.20 - 0.60 in bottom half)
    mud_mask = (hue[60:, :] >= 0.05) & (hue[60:, :] <= 0.16) & (sat[60:, :] >= 0.20) & (val[60:, :] <= 0.60)
    mud_ground_ratio = float(mud_mask.mean())
    
    # Wall / Building Facade / Indoor Vertical lines
    wall_edge_density = float(grad_x[:100, :].mean())
    
    # Skin / Portrait / Human Face / Selfie Detection
    # Concentrated in Hue 0.02 - 0.14, moderate Sat 0.15 - 0.75, Val 0.25 - 0.95
    skin_mask = (hue >= 0.02) & (hue <= 0.14) & (sat >= 0.15) & (sat <= 0.75) & (val >= 0.25) & (val <= 0.95)
    skin_ratio = float(skin_mask.mean())
    center_skin_ratio = float(skin_mask[25:125, 25:125].mean())
    is_portrait_or_person = (center_skin_ratio >= 0.20) or (skin_ratio >= 0.25)
    
    # Fire / Thermal Blaze (Hue <= 0.12 or >= 0.92, very high saturation >= 0.60, high val >= 0.70)
    fire_mask = ((hue <= 0.12) | (hue >= 0.92)) & (sat >= 0.60) & (val >= 0.70)
    fire_ratio = float(fire_mask.mean())
    is_fire = (fire_ratio >= 0.10) and not is_portrait_or_person

    # Digital Screenshot / Graphic / Text Document
    # Sharp dark text lines on light background or UI box gradients (exclude greenery and water)
    is_screenshot_or_doc = False
    if not is_portrait_or_person and green_ratio < 0.25 and water_ratio < 0.20:
        has_text_lines = ((val < 0.30).mean() > 0.03) and ((val > 0.75).mean() > 0.35) and (edge_energy > 5.0) and (val.mean() < 0.93)
        if has_text_lines:
            is_screenshot_or_doc = True
        elif texture_entropy < 10.0 and edge_energy > 9.0 and val.mean() < 0.93 and green_ratio < 0.15:
            is_screenshot_or_doc = True

    # 5. Scene Categorization Flags
    scene_tags = []
    
    is_building = False
    is_road = False
    is_electrical = False
    is_greenery = False
    is_waste = False
    is_water_drain = False
    is_animal_shed = False
    is_clean_indoor = False
    
    # A. Human Portrait
    if is_portrait_or_person:
        scene_tags.append("Human Face / Person / Portrait")

    # B. Fire / Thermal Hazard
    if is_fire:
        scene_tags.append("Fire / Flame / Thermal Hazard")

    # C. Screenshot / Document
    if is_screenshot_or_doc:
        scene_tags.append("Digital Document / Screenshot / Text Graphic")

    # D. Greenery / Nature / Farmland
    if green_ratio > 0.28:
        is_greenery = True
        scene_tags.append("Greenery / Agricultural Fields / Park")
        
    # E. Road / Highway / Pothole / Dirt Track
    if (asphalt_ground_ratio > 0.45 or mud_ground_ratio > 0.40) and bot_val < 0.80 and vert_to_horiz_ratio < 1.15 and not is_portrait_or_person:
        is_road = True
        scene_tags.append("Road / Pavement Surface / Street Track")
        
    # I. Waste / Garbage / Debris
    if texture_entropy > 34.0 and not is_road and not is_portrait_or_person and not is_screenshot_or_doc and not is_fire:
        is_waste = True
        scene_tags.append("Scattered Waste / High Texture Debris")

    # G. Electricity / Overhead Line / Pole
    if sky_ratio > 0.18 and top_val > 0.50 and (vertical_energy > 3.0 or vert_to_horiz_ratio > 0.90) and not is_portrait_or_person:
        is_electrical = True
        scene_tags.append("Overhead Sky / Electric Pole / Wires")

    # H. Drainage / Sewer / Standing Water / Puddle
    if ((water_ratio > 0.22 and not is_electrical) or (asphalt_ground_ratio > 0.30 and water_ratio > 0.15)) and not is_portrait_or_person:
        is_water_drain = True
        scene_tags.append("Water Accumulation / Drainage / Sewer")

    # F. Building / Architecture / Indoor / Public Structure
    if ((vert_to_horiz_ratio > 1.05 and wall_edge_density > 6.0) or (texture_entropy < 28.0 and asphalt_ground_ratio < 0.28 and not is_greenery and not is_water_drain and not is_electrical)) and not is_portrait_or_person and not is_waste:
        is_building = True
        if top_val > 0.55 and bot_val > 0.45 and not is_road and texture_entropy < 24.0:
            is_clean_indoor = True
            scene_tags.append("Clean Indoor Room / Architecture")
        else:
            scene_tags.append("Building Structure / Wall / Facility")

    # Determine dominant scene
    if is_portrait_or_person:
        dominant_scene = "HUMAN_PORTRAIT_OR_PERSON"
    elif is_fire:
        dominant_scene = "FIRE_OR_EXPLOSION_HAZARD"
    elif is_screenshot_or_doc:
        dominant_scene = "DOCUMENT_OR_SCREENSHOT"
    elif is_water_drain:
        dominant_scene = "WATER_OR_DRAINAGE_ACCUMULATION"
    elif is_waste:
        dominant_scene = "WASTE_OR_DEBRIS"
    elif is_road:
        dominant_scene = "ROAD_OR_GROUND_SURFACE"
    elif is_electrical:
        dominant_scene = "OVERHEAD_ELECTRICAL_OR_SKY"
    elif is_building:
        dominant_scene = "BUILDING_OR_INDOOR"
    elif is_greenery:
        dominant_scene = "PARK_OR_VEGETATION"
    else:
        dominant_scene = "GENERAL_OUTDOOR_SCENE"

    return {
        "dominant_scene": dominant_scene,
        "scene_tags": scene_tags,
        "is_portrait_or_person": is_portrait_or_person,
        "is_fire_or_flame": is_fire,
        "is_screenshot_or_doc": is_screenshot_or_doc,
        "is_road_surface": is_road,
        "is_building_or_indoor": is_building,
        "is_clean_indoor": is_clean_indoor,
        "is_electrical_pole_sky": is_electrical,
        "is_greenery_nature": is_greenery,
        "is_waste_or_garbage": is_waste,
        "is_water_or_drain": is_water_drain,
        "skin_ratio": round(skin_ratio, 2),
        "center_skin_ratio": round(center_skin_ratio, 2),
        "fire_ratio": round(fire_ratio, 2),
        "asphalt_ratio": round(asphalt_ground_ratio, 2),
        "water_ratio": round(water_ratio, 2),
        "vertical_edge_ratio": round(vert_to_horiz_ratio, 2),
        "edge_energy": round(edge_energy, 2),
        "texture_entropy": round(texture_entropy, 2)
    }


def compute_image_fingerprint(image_input):
    """
    Extracts a multi-modal visual fingerprint:
    1. Perceptual Hashes (pHash, dHash, colorHash, aHash, wHash)
    2. 48-dim Color Spatial Moment Vector
    3. Natural Scene Entropy & Edge Complexity
    4. Visual Scene Classification across 16 village domains
    """
    img = load_image_from_input(image_input)
    
    # 1. Multi-Hash Extraction
    phash_val = str(imagehash.phash(img))
    mirror_img = ImageOps.mirror(img)
    phash_mirror_val = str(imagehash.phash(mirror_img))
    dhash_val = str(imagehash.dhash(img))
    ahash_val = str(imagehash.average_hash(img))
    try:
        colorhash_val = str(imagehash.colorhash(img))
    except Exception:
        colorhash_val = ""
    try:
        whash_val = str(imagehash.whash(img))
    except Exception:
        whash_val = ""

    # 2. Structural & Statistical Metrics
    gray = img.convert("L")
    stat = ImageStat.Stat(gray)
    std_dev = stat.stddev[0] if stat.stddev else 0
    mean_val = stat.mean[0] if stat.mean else 0
    
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edges)
    edge_energy = edge_stat.mean[0] if edge_stat.mean else 0

    # Image Entropy
    histogram = gray.histogram()
    total_pixels = sum(histogram)
    entropy = 0
    if total_pixels > 0:
        for count in histogram:
            if count > 0:
                p = count / total_pixels
                entropy -= p * math.log2(p)

    # 3. 48-dim Color Spatial Histogram
    img_resized = img.resize((96, 96))
    rgb_array = np.array(img_resized, dtype=np.float32) / 255.0
    
    patches = []
    h, w, _ = rgb_array.shape
    for r in range(3):
        for c in range(3):
            patch = rgb_array[r*(h//3):(r+1)*(h//3), c*(w//3):(c+1)*(w//3), :]
            mean_rgb = patch.mean(axis=(0, 1))
            std_rgb = patch.std(axis=(0, 1))
            patches.extend(mean_rgb)
            patches.extend(std_rgb)
            
    color_vec = np.array(patches, dtype=np.float32)
    norm = np.linalg.norm(color_vec)
    if norm > 0:
        color_vec = color_vec / norm

    # Blank / Corrupted / Pitch Dark / Single Solid Color (Zero variance, zero edges, or no light)
    is_pitch_dark = (mean_val < 25.0) or (mean_val < 40.0 and std_dev < 12.0 and edge_energy < 3.0)
    is_blank = is_pitch_dark or (std_dev < 2.5 and edge_energy < 1.2) or (entropy < 0.45)

    # 4. Scene Classifier
    scene_info = classify_visual_scene(img)

    return {
        "phash": phash_val,
        "phash_mirror": phash_mirror_val,
        "dhash": dhash_val,
        "ahash": ahash_val,
        "colorhash": colorhash_val,
        "whash": whash_val,
        "std_dev": round(std_dev, 2),
        "mean_brightness": round(mean_val, 2),
        "edge_energy": round(edge_energy, 2),
        "entropy": round(entropy, 2),
        "is_blank_or_invalid": bool(is_blank),
        "color_vector": color_vec.tolist(),
        "width": img.width,
        "height": img.height,
        "scene": scene_info
    }


def compare_two_fingerprints(fp1, fp2):
    """
    Compares two image fingerprints and returns a composite similarity score [0.0 - 1.0].
    """
    if not fp1 or not fp2:
        return 0.0

    ph1 = fp1.get("phash") if isinstance(fp1, dict) else str(fp1)
    ph2 = fp2.get("phash") if isinstance(fp2, dict) else str(fp2)
    if not ph1 or not ph2:
        return 0.0

    # 1. Multi-Hash Hamming Distances
    h1 = imagehash.hex_to_hash(ph1)
    h2 = imagehash.hex_to_hash(ph2)
    phash_diff = h1 - h2
    
    # Check mirror / flipped image duplicate
    ph1_m = fp1.get("phash_mirror") if isinstance(fp1, dict) else None
    if ph1_m:
        try:
            phash_mirror_diff = imagehash.hex_to_hash(ph1_m) - h2
            phash_diff = min(phash_diff, phash_mirror_diff)
        except Exception:
            pass
    
    dhash_diff = 32
    dh1 = fp1.get("dhash") if isinstance(fp1, dict) else None
    dh2 = fp2.get("dhash") if isinstance(fp2, dict) else None
    if dh1 and dh2 and len(dh1) == 16 and len(dh2) == 16:
        try:
            dhash_diff = imagehash.hex_to_hash(dh1) - imagehash.hex_to_hash(dh2)
        except Exception:
            pass

    ahash_diff = 32
    ah1 = fp1.get("ahash") if isinstance(fp1, dict) else None
    ah2 = fp2.get("ahash") if isinstance(fp2, dict) else None
    if ah1 and ah2 and len(ah1) == 16 and len(ah2) == 16:
        try:
            ahash_diff = imagehash.hex_to_hash(ah1) - imagehash.hex_to_hash(ah2)
        except Exception:
            pass

    min_hash_diff = min(phash_diff, dhash_diff, ahash_diff)
    
    # 2. Color Vector Cosine Similarity
    v1 = np.array(fp1.get("color_vector", []), dtype=np.float32) if isinstance(fp1, dict) else np.array([])
    v2 = np.array(fp2.get("color_vector", []), dtype=np.float32) if isinstance(fp2, dict) else np.array([])
    if len(v1) == len(v2) and len(v1) > 0:
        color_sim = float(np.dot(v1, v2))
        color_sim = max(0.0, min(1.0, color_sim))
    else:
        color_sim = 0.5

    # 3. High-Confidence Duplicate Matches
    # Exact or near-identical duplicate
    if min_hash_diff <= 3:
        return round(float(1.0 - (min_hash_diff * 0.02)), 4)
    # Cropped or resized clone (Requires both structural hash agreement and color layout similarity)
    if min_hash_diff <= 6 and color_sim >= 0.55:
        return round(float(0.90 - (min_hash_diff * 0.02)), 4)
    if min_hash_diff <= 8 and color_sim >= 0.65:
        return round(float(0.85 - (min_hash_diff * 0.015)), 4)
    if min_hash_diff <= 10 and (color_sim >= 0.70 or ahash_diff <= 8):
        return round(float(0.80 - (min_hash_diff * 0.008)), 4)

    phash_sim = max(0.0, 1.0 - (phash_diff / 32.0))
    dhash_sim = max(0.0, 1.0 - (dhash_diff / 32.0))
    ahash_sim = max(0.0, 1.0 - (ahash_diff / 32.0))
    composite_score = (phash_sim * 0.35) + (dhash_sim * 0.25) + (ahash_sim * 0.15) + (color_sim * 0.25)
    return round(float(composite_score), 4)


def match_image_against_database(new_fingerprint, existing_records, expected_category=None, threshold=0.72):
    """
    Comprehensive Multi-Category Cross-Modal Grievance Image Validation Engine:
    
    Validates against:
    1. FAKE: Blank canvas, pure solid color, corrupted/empty stream
    2. DUPLICATE: Exact / Perceptual Hash match with previous complaints in village
    3. MISMATCH_SUSPICIOUS: 
       - Human portraits / Selfies uploaded for civic issues (Road, Water, Drain, Electricity, Waste)
       - Fire hazards uploaded for non-fire departments (Healthcare, Water, Education)
       - Irrelevant indoor rooms / digital screenshots
       - Cross-modal violations across all 16 village categories
    4. NEEDS_VERIFICATION: High blur, very low resolution, ambiguous lighting
    5. GENUINE: Unique authentic photograph matching domain context
    """
    # 1. Blank or Invalid Canvas Check -> FAKE
    if new_fingerprint.get("is_blank_or_invalid"):
        return {
            "classification": "FAKE",
            "reason": "Image is completely blank, solid color, or corrupted file data.",
            "confidence": 0.99,
            "duplicate_of_id": None,
            "similarity_score": 0.0,
            "is_valid": False,
            "detected_scene": "BLANK_OR_CORRUPT"
        }

    scene = new_fingerprint.get("scene") or {}
    dominant_scene = scene.get("dominant_scene", "GENERAL_OUTDOOR_SCENE")

    # 2. Extreme Darkness / Obstructed Lens Check -> FAKE (Instant Rejection)
    entropy_val = new_fingerprint.get("entropy", 5.0)
    edge_val = new_fingerprint.get("edge_energy", 10.0)
    mean_bright = new_fingerprint.get("mean_brightness", 128.0)
    std_dev_val = new_fingerprint.get("std_dev", 30.0)

    is_pitch_dark = (mean_bright <= 25.0) or (mean_bright <= 38.0 and std_dev_val < 15.0 and edge_val < 4.0)
    is_obstructed = (scene.get("skin_ratio", 0) > 0.35 and std_dev_val < 6.0) # Lens blocked by thumb/finger

    if is_pitch_dark or is_obstructed:
        reason_msg = "कैमरा लेंस हाथ या उंगली से ढका हुआ है (Obstructed Lens)" if is_obstructed else "फोटो में अत्यधिक अंधेरा (Black/Dark image) है और समस्या स्थल दिखाई नहीं दे रहा है"
        return {
            "classification": "FAKE",
            "reason": f"अमान्य फोटो: {reason_msg}। कृपया पर्याप्त रोशनी में वास्तविक समस्या की स्पष्ट फोटो लगाएं।",
            "confidence": 0.98,
            "duplicate_of_id": None,
            "similarity_score": 0.0,
            "is_valid": False,
            "detected_scene": "DARK_OR_BLANK"
        }

    # 2B. Quality & Blur Verification -> NEEDS_VERIFICATION (Run before Duplicate)
    is_overexposed = (mean_bright >= 246.0) or (mean_bright >= 238.0 and std_dev_val < 10.0) # Blinding glare / flash washout
    is_blurry = (edge_val < 4.2 and not scene.get("is_screenshot_or_doc") and not scene.get("is_clean_indoor"))
    is_foggy_or_smudged = (std_dev_val < 5.0 and entropy_val < 3.8 and mean_bright > 40.0 and mean_bright < 220.0 and not scene.get("is_screenshot_or_doc") and not scene.get("is_clean_indoor"))

    if is_blurry or is_overexposed or is_foggy_or_smudged:
        reason_msg = (
            "Heavy fog, smudged lens, or low contrast scene" if is_foggy_or_smudged else (
                "Image is blurry or motion-distorted" if is_blurry else
                "Extreme sun glare / overexposure with washed out scene details"
            )
        )
        return {
            "classification": "NEEDS_VERIFICATION",
            "reason": f"{reason_msg}. Physical inspection by Gram Sachiv/Sarpanch recommended.",
            "confidence": 0.75,
            "duplicate_of_id": None,
            "similarity_score": 0.0,
            "is_valid": True,
            "detected_scene": dominant_scene
        }

    # 3. Duplicate Match Check (Against Village Complaint History)
    best_match_id = None
    highest_sim = 0.0

    for rec in existing_records:
        rec_fp = rec.get("fingerprint") or rec.get("image_hash") or rec.get("hash")
        if rec_fp:
            if isinstance(rec_fp, str):
                rec_fp = {"phash": rec_fp}
            sim = compare_two_fingerprints(new_fingerprint, rec_fp)
            if sim > highest_sim:
                highest_sim = sim
                best_match_id = rec.get("complaint_id") or rec.get("id") or rec.get("complaintId")

    if highest_sim >= threshold and best_match_id:
        return {
            "classification": "DUPLICATE",
            "reason": f"Image matches previous complaint #{best_match_id} with {int(highest_sim*100)}% visual similarity",
            "confidence": round(highest_sim, 2),
            "duplicate_of_id": str(best_match_id),
            "similarity_score": round(highest_sim, 2),
            "is_valid": False,
            "detected_scene": new_fingerprint.get("scene", {}).get("dominant_scene", "DUPLICATE_SCENE")
        }

    # 4. Cross-Modal Category & Scene Consistency Verification (Across All 16 Categories)
    if expected_category:
        norm_cat = expected_category.strip().lower()

        # Rule 1: Human Portrait / Selfie uploaded for civic/infrastructure issues
        if scene.get("is_portrait_or_person"):
            civic_domains = [
                "road", "transport", "pothole", "drain", "water", "waste", "garbage",
                "electric", "sanitation", "toilet", "park", "environment", "town planning",
                "property", "revenue", "animal", "veterinary", "digital"
            ]
            if any(d in norm_cat for d in civic_domains):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": f"Image contains a human portrait/selfie instead of the reported village infrastructure problem ('{expected_category}'). Flagged as irrelevant photo.",
                    "confidence": 0.95,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 2: Fire / Thermal Hazard uploaded for non-fire civic issues
        if scene.get("is_fire_or_flame"):
            non_fire_domains = ["health", "water", "education", "property", "sanitation", "digital", "welfare", "animal", "market"]
            if any(d in norm_cat for d in non_fire_domains):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": f"Image displays fire / thermal blaze which does not correlate with '{expected_category}'. Flagged for supervisor review.",
                    "confidence": 0.95,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 3: Digital Screenshot / Document / Meme uploaded for physical issues
        if scene.get("is_screenshot_or_doc"):
            physical_domains = ["road", "drain", "water", "waste", "electricity", "sanitation", "park", "environment"]
            if any(d in norm_cat for d in physical_domains):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": f"Image appears to be a digital document, text graphic, or screenshot instead of an on-site photo for '{expected_category}'.",
                    "confidence": 0.92,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 4: Clean Indoor Room uploaded for outdoor infrastructure domains
        if scene.get("is_clean_indoor"):
            indoor_incompatible = ["road", "transport", "pothole", "waste", "garbage", "drain", "sewer", "water", "sanitation", "town", "environment", "park"]
            if any(d in norm_cat for d in indoor_incompatible):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": f"Image shows indoor residential architecture instead of village physical infrastructure for '{expected_category}'.",
                    "confidence": 0.90,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 5: Healthcare with pure Pothole Road / High Debris
        if ("health" in norm_cat or "hospital" in norm_cat or "medical" in norm_cat) and scene.get("is_road_surface") and not scene.get("is_building_or_indoor"):
            return {
                "classification": "MISMATCH_SUSPICIOUS",
                "reason": "फोटो और शिकायत में असंगति: शिकायत स्वास्थ्य/अस्पताल की है, लेकिन फोटो सड़क/गड्ढे (Road Surface) की है। (Image of road does not match Healthcare grievance)",
                "confidence": 0.92,
                "duplicate_of_id": None,
                "similarity_score": 0.0,
                "is_valid": False,
                "detected_scene": dominant_scene
            }

        # Rule 6: Water Supply with Dry Road / Pothole / Electrical / Solid Waste (CRITICAL CROSS-CHECK)
        if ("water" in norm_cat or "pani" in norm_cat or "jal" in norm_cat or "nal" in norm_cat or "supply" in norm_cat) and not ("drain" in norm_cat or "road" in norm_cat):
            # A. Dry Road / Pothole surface with no water puddle/leakage
            if scene.get("is_road_surface") and not scene.get("is_water_or_drain") and scene.get("water_ratio", 0) < 0.12:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति पाई गई: शिकायत पेयजल/पानी सप्लाई (Water Supply) की है, लेकिन फोटो में सूखी सड़क/गड्ढा (Road Surface) दिखाई दे रहा है जिसमें पानी का कोई स्रोत या लीकेज नहीं है। (Image of dry road does not match Water Supply grievance)",
                    "confidence": 0.95,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }
            # B. Overhead Electrical Wires / Sky with no water source
            if scene.get("is_electrical_pole_sky") and not scene.get("is_water_or_drain") and scene.get("water_ratio", 0) < 0.10:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत पानी सप्लाई की है, लेकिन फोटो बिजली के खंभे/तार (Overhead Electricity) की है। (Image of power lines does not match Water Supply grievance)",
                    "confidence": 0.94,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }
            # C. Scattered Solid Waste with no water accumulation
            if scene.get("is_waste_or_garbage") and not scene.get("is_water_or_drain") and scene.get("water_ratio", 0) < 0.10:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत पानी सप्लाई की है, लेकिन फोटो कचरे/कूड़े के ढेर (Waste) की है। (Image of waste does not match Water Supply grievance)",
                    "confidence": 0.93,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 7: Roads & Transportation with pure Overhead Sky/Power Lines or Deep Water Pond
        if ("road" in norm_cat or "transport" in norm_cat or "pothole" in norm_cat or "street" in norm_cat or "sadak" in norm_cat):
            if scene.get("is_electrical_pole_sky") and not scene.get("is_road_surface") and scene.get("asphalt_ratio", 0) < 0.15:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत सड़क की है, लेकिन फोटो में केवल ऊपर के बिजली के तार/आसमान दिख रहे हैं। (Image of overhead wires does not match Road grievance)",
                    "confidence": 0.90,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }
            if scene.get("is_building_or_indoor") and not scene.get("is_road_surface") and scene.get("asphalt_ratio", 0) < 0.15:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत सड़क/मार्ग की है, लेकिन फोटो भवन/कमरे (Building/Indoor) की है। (Image of indoor/building does not match Road grievance)",
                    "confidence": 0.91,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 8: Drainage / Sewer with pure Overhead Sky / Roof or Dry Road
        if ("drain" in norm_cat or "sewage" in norm_cat or "gutter" in norm_cat):
            if scene.get("is_electrical_pole_sky") and not scene.get("is_water_or_drain"):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत नाली/सीवर की है, लेकिन फोटो बिजली के तारों/आसमान की है। (Image of power lines does not match Drainage grievance)",
                    "confidence": 0.90,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }
            if scene.get("is_road_surface") and not scene.get("is_water_or_drain") and scene.get("water_ratio", 0) < 0.08:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत नाली/जल निकासी की है, लेकिन फोटो सूखी सड़क की है जिसमें कोई जलभराव या नाली नहीं है। (Image of dry road does not match Drainage grievance)",
                    "confidence": 0.88,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 9: Electricity & Lighting with standing water / deep mud only or pure dry road
        if ("electric" in norm_cat or "light" in norm_cat or "pole" in norm_cat or "wire" in norm_cat or "bijli" in norm_cat):
            if scene.get("is_road_surface") and not scene.get("is_electrical_pole_sky") and scene.get("vertical_edge_ratio", 1.0) < 0.8:
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत बिजली/स्ट्रीट लाइट की है, लेकिन फोटो केवल सड़क/जमीन की है जिसमें कोई खंभा या तार नहीं दिख रहा। (Image of road does not match Electricity grievance)",
                    "confidence": 0.89,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }
            if scene.get("water_ratio", 0) > 0.35 and not scene.get("is_electrical_pole_sky"):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत बिजली की है, लेकिन फोटो में जलभराव/नाली दिखाई दे रही है। (Image of water does not match Electricity grievance)",
                    "confidence": 0.85,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 10: Waste Management with clean indoor room or pure sky
        if ("waste" in norm_cat or "garbage" in norm_cat or "sanitation" in norm_cat or "kachra" in norm_cat):
            if scene.get("is_clean_indoor"):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत कचरा/गंदगी की है, लेकिन फोटो साफ कमरे की है। (Image shows clean indoor room instead of waste)",
                    "confidence": 0.90,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }
            if scene.get("is_electrical_pole_sky") and not scene.get("is_waste_or_garbage"):
                return {
                    "classification": "MISMATCH_SUSPICIOUS",
                    "reason": "फोटो और शिकायत में असंगति: शिकायत कचरा प्रबंधन की है, लेकिन फोटो खुले आसमान/बिजली के तारों की है। (Image does not show waste)",
                    "confidence": 0.88,
                    "duplicate_of_id": None,
                    "similarity_score": 0.0,
                    "is_valid": False,
                    "detected_scene": dominant_scene
                }

        # Rule 11: Drainage & Water Supply with clean indoor living room
        if ("drain" in norm_cat or "sewer" in norm_cat or "water" in norm_cat) and scene.get("is_clean_indoor"):
            return {
                "classification": "MISMATCH_SUSPICIOUS",
                "reason": f"फोटो और शिकायत में असंगति: शिकायत '{expected_category}' की है, लेकिन फोटो घर के अंदर के कमरे की है। (Image shows clean indoor room instead of {expected_category})",
                "confidence": 0.90,
                "duplicate_of_id": None,
                "similarity_score": 0.0,
                "is_valid": False,
                "detected_scene": dominant_scene
            }

    # 5. GENUINE: Authentic, verified image matching village domain
    return {
        "classification": "GENUINE",
        "reason": f"सत्यापित प्रामाणिक फोटो (Verified authentic image for {dominant_scene}).",
        "confidence": 0.95,
        "duplicate_of_id": None,
        "similarity_score": round(highest_sim, 2),
        "is_valid": True,
        "detected_scene": dominant_scene
    }
