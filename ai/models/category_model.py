# category_model.py

import os
import re
import joblib

# --------------------------------------------------
# Model paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "models", "category_model.joblib")
VECTORIZER_PATH = os.path.join(BASE_DIR, "models", "category_vectorizer.joblib")

vectorizer = None
model = None

try:
    if os.path.exists(VECTORIZER_PATH) and os.path.exists(MODEL_PATH):
        vectorizer = joblib.load(VECTORIZER_PATH)
        model = joblib.load(MODEL_PATH)
except Exception as e:
    print(f"[CATEGORY MODEL] Note: Joblib loading warning: {e}")

# --------------------------------------------------
# Domain-Specific Multilingual Rules (Hindi, Hinglish, English)
# --------------------------------------------------

CATEGORY_KEYWORDS = {
    "Fire & Emergency Services": [
        "fire", "fire outbreak", "fire hazard", "short circuit fire", "blaze", "flames", "smoke", "burning",
        "fire brigade", "cylinder burst", "explosion", "building on fire", "fire in building", "fire started", "fire caught",
        "आग", "आग लग गई", "अग्निकांड", "धुआं", "सिलेंडर ब्लास्ट", "शॉर्ट सर्किट से आग", "जल रहा", "आग लगी",
        "aag", "aag lag gayi", "fire", "jal raha", "smoke", "blaze"
    ],
    "Water Supply": [
        "water", "wateer", "watr", "watter", "drinking water", "pipeline", "pipe", "tap", "handpump", "borewell",
        "tanker", "leakage", "water supply", "wateer suply", "water suply", "suply", "motor", "water pressure",
        "पानी", "जल", "नल", "हैंडपंप", "हैंड पम्प", "पाइप", "पाइपलाइन", "टंकी", "बोरवेल", "पानी की सप्लाई", "पेयजल", "रिस रहा", "फूट गया", "पानी नहीं आ रहा", "गंदा पानी नल",
        "paani", "pani", "handpump", "tap", "jal", "tanki", "pipeline", "wateer", "suply", "supply", "peyal", "jal purti"
    ],
    "Electricity": [
        "electricity", "power", "light", "street light", "wire", "pole", "transformer", "current", "shock", "voltage", "blackout", "bulb",
        "बिजली", "करंट", "तार", "खंभा", "पोल", "ट्रांसफार्मर", "स्ट्रीट लाइट", "बल्ब", "अंधेरा", "लाइट", "शॉर्ट सर्किट", "वोल्टेज", "बिजली गुल",
        "bijli", "current", "taar", "tar", "khamba", "pole", "light", "transformer", "short circuit", "voltage", "andhera"
    ],
    "Roads & Transportation": [
        "road", "roads", "roadd", "street", "pothole", "potholes", "asphalt", "highway", "traffic", "speed breaker", "culvert", "path", "bridge",
        "सड़क", "मार्ग", "रास्ता", "गड्ढा", "गड्ढे", "डामर", "खड़ंजा", "पुलिया", "स्पीड ब्रेकर", "सड़क टूटी", "टूटी सड़क",
        "sadak", "sarak", "gaddha", "gadda", "gadde", "road", "rasta", "pothole", "potholes", "puliya", "khadanza"
    ],
    "Drainage": [
        "drain", "drainage", "sewage", "gutter", "clogged drain", "overflowing drain", "choked", "sewer",
        "नाली", "गंदा पानी", "जल निकासी", "गटर", "नाली जाम", "नाली चोक", "सीवर", "नाबदान", "नाली टूटी",
        "naali", "nali", "gutter", "drain", "sewer", "ganda paani", "choke", "jam"
    ],
    "Waste Management": [
        "garbage", "waste", "trash", "dustbin", "dump", "litter", "rubbish", "cleaning", "sweep", "dumping",
        "कचरा", "कूड़ा", "कचरा पेटी", "गंदगी", "सफाई", "कूड़ेदान", "ढेर", "झाड़ू", "कूड़ा कचरा", "कचरे का ढेर",
        "kachra", "kuda", "safai", "gandagi", "dustbin", "garbage", "kachra peti", "safayi"
    ],
    "Sanitation": [
        "toilet", "latrine", "urinal", "public toilet", "sanitation", "open defecation", "hygiene",
        "शौचालय", "टॉयलेट", "सार्वजनिक शौचालय", "स्वच्छता", "इज्जत घर", "मूत्रालय", "शौच",
        "shauchalaya", "toilet", "swachhata", "latrine"
    ],
    "Healthcare": [
        "health", "hospital", "dispensary", "clinic", "doctor", "medicine", "nurse", "ambulance", "phc", "vaccine", "treatment",
        "अस्पताल", "दवा", "दवाई", "डॉक्टर", "नर्स", "प्राथमिक स्वास्थ्य केंद्र", "एम्बुलेंस", "बीमारी", "उपचार", "टीका", "स्वास्थ्य",
        "hospital", "doctor", "dawa", "dawai", "nurse", "ilaj", "aspatal", "swasthya"
    ],
    "Education": [
        "school", "teacher", "student", "classroom", "books", "mid day meal", "midday meal", "education", "college", "anganwadi",
        "स्कूल", "विद्यालय", "शिक्षक", "अध्यापक", "मास्टर", "छात्र", "किताबें", "मिड डे मील", "मध्याह्न भोजन", "आंगनवाड़ी", "शिक्षा",
        "school", "teacher", "shiksha", "vidyalaya", "anganwadi", "mid day meal", "adhyapak"
    ],
    "Animal & Veterinary": [
        "animal", "stray dog", "dog bite", "cattle", "cow", "buffalo", "dead animal", "veterinary", "rabies", "monkey",
        "पशु", "आवारा कुत्ता", "कुत्ता", "गाय", "भैंस", "मवेशी", "मृत जानवर", "पशु चिकित्सा", "बंदर", "रेबीज",
        "pashu", "kutta", "stray dog", "cattle", "janwar", "gaay", "kutte"
    ],
    "Environment": [
        "pollution", "smoke", "tree cut", "deforestation", "burning waste", "air quality", "river pollution",
        "प्रदूषण", "पेड़ काटना", "धुआं", "जंगल", "पर्यावरण", "प्लास्टिक", "नदी प्रदूषण",
        "pradushan", "environment", "ped", "tree"
    ],
    "Parks & Public Spaces": [
        "park", "playground", "garden", "benches", "community hall", "ground",
        "पार्क", "बगीचा", "खेल का मैदान", "सामुदायिक भवन", "मैदान", "बेंच",
        "park", "bagicha", "maidan", "ground"
    ],
    "Property & Revenue": [
        "property", "land", "encroachment", "patwari", "khasra", "revenue", "tax", "land dispute", "registry",
        "जमीन", "अतिक्रमण", "पटवारी", "खसरा", "खतौनी", "राजस्व", "संपत्ति", "जमीन विवाद", "कब्जा",
        "zameen", "patwari", "kabza", "property", "khasra"
    ],
    "Welfare Services": [
        "ration", "pension", "ration card", "scheme", "bpl", "widow pension", "old age pension", "welfare", "subsidy",
        "राशन", "राशन कार्ड", "पेंशन", "वृद्धावस्था पेंशन", "विधवा पेंशन", "राशन दुकान", "कोटा", "सरकारी योजना",
        "ration", "pension", "yojana", "bpl", "quota"
    ],
    "Markets & Commercial": [
        "market", "shop", "vendor", "illegal shop", "hawker", "mandi", "haat",
        "बाजार", "दुकान", "मंडी", "हाट", "ठेला", "अवैध दुकान",
        "bazaar", "bazar", "mandi", "dukan", "shop"
    ],
    "Town Planning & Development": [
        "illegal construction", "building permit", "encroachment on street", "layout", "planning",
        "अवैध निर्माण", "भवन निर्माण", "नक्शा", "गलियारा", "नगर नियोजन",
        "nirman", "construction"
    ],
    "Digital/IT Services": [
        "csc", "portal", "digital seva", "internet", "online certificate", "kiosk", "computer centre",
        "डिजिटल सेवा", "सीएससी", "इंटरनेट", "ऑनलाइन", "पोर्टल", "प्रमाण पत्र", "कंप्यूटर",
        "csc", "digital", "internet", "online"
    ]
}


def normalize_text_for_matching(text: str) -> str:
    if not text:
        return ""
    # Lowercase & collapse duplicate characters (e.g. wateeeer -> water)
    s = str(text).lower()
    s = re.sub(r'(.)\1{2,}', r'\1\1', s)
    return s


def predict_category(complaint_text):
    """
    Predict grievance category using domain keywords (Hindi/Hinglish/English)
    with typo normalization and ML model fallback.
    """
    if not complaint_text or not str(complaint_text).strip():
        return "Other"

    text = normalize_text_for_matching(complaint_text)

    # 1. Exact & Substring Domain Match
    best_category = None
    max_score = 0

    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for kw in keywords:
            kw_clean = kw.lower()
            if kw_clean in text:
                # Give higher weight to longer specific keyword matches
                score += len(kw_clean.split()) * 3 + 2
        if score > max_score:
            max_score = score
            best_category = cat

    if best_category and max_score >= 2:
        return best_category

    # 2. ML Model Fallback (for English unstructured sentences)
    if model and vectorizer:
        try:
            text_vector = vectorizer.transform([complaint_text])
            ml_pred = model.predict(text_vector)[0]
            if ml_pred and ml_pred.strip():
                return ml_pred
        except Exception:
            pass

    return "Other"