"""
route_complaint.py
Multilingual Department Routing for Madhya Pradesh Grievance Management.
Uses the retrained Department Classifier model with confidence thresholding and safe fallback.
"""

import os
import sys
import numpy as np

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from pipeline.text_normalizer import normalize_complaint
from routing.department_mapping import MADHYA_PRADESH_DEPARTMENTS, FALLBACK_DEPARTMENT

MODEL_PATH = os.path.join(BASE_DIR, "models", "department_model.joblib")
VECTORIZER_PATH = os.path.join(BASE_DIR, "models", "department_vectorizer.joblib")

_vectorizer = None
_model = None
_load_attempted = False

def _get_model():
    global _vectorizer, _model, _load_attempted
    if not _load_attempted:
        _load_attempted = True
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
                import joblib
                _vectorizer = joblib.load(VECTORIZER_PATH)
                _model = joblib.load(MODEL_PATH)
        except Exception as e:
            print(f"[DEPARTMENT ROUTING] Warning loading model: {e}")
    return _vectorizer, _model

# High-precision domain keywords for resolving low-confidence multilingual edge cases
DOMAIN_KEYWORD_RULES = {
    "Public Health Engineering / Water Supply": [
        "water supply", "drinking water", "hand pump", "handpump", "borewell", "pipeline leakage",
        "पानी की सप्लाई", "पेयजल", "हैंडपंप", "नल जल", "बोरवेल", "पाइपलाइन फूट", "टंकी", "पीने का पानी",
        "paani nahi", "pani nahi", "handpump kharab", "tap water"
    ],
    "Electricity / Energy": [
        "transformer", "electric wire", "power cut", "voltage", "electric pole", "blackout",
        "ट्रांसफार्मर", "बिजली", "करंट", "बिजली का तार", "खंभा", "पावर कट",
        "bijli gol", "bijli nahi", "voltage fluctuation", "pole toot"
    ],
    "Public Works / Roads": [
        "pothole", "potholes", "asphalt", "highway", "culvert", "road repair", "bridge damaged",
        "सड़क", "गड्ढे", "गड्ढा", "पुलिया", "डामर", "मार्ग",
        "sadak kharab", "gaddhe", "puliya toot"
    ],
    "Drainage & Sewerage": [
        "drain", "drainage", "sewage", "gutter", "manhole", "choked drain",
        "नाली", "नाला", "सीवर", "गंदा पानी", "नाली जाम", "गटर",
        "naali jaam", "sewer line", "ganda paani"
    ],
    "Public Health & Family Welfare": [
        "hospital", "doctor", "medicine", "medicines", "dispensary", "ambulance", "health centre",
        "अस्पताल", "दवाइयां", "दवाई", "डॉक्टर", "स्वास्थ्य केंद्र", "एम्बुलेंस",
        "aspatal", "dawai nahi", "doctor absent"
    ],
    "School Education": [
        "school", "teacher", "teachers", "mid day meal", "classroom", "books",
        "स्कूल", "विद्यालय", "शिक्षक", "मध्याह्न भोजन", "कक्षा", "छात्रवृत्ति",
        "school me", "midday meal", "shikshak"
    ],
    "Revenue & Land Administration": [
        "patwari", "khasra", "khatauni", "mutation", "land dispute", "encroachment", "seemankan",
        "पटवारी", "खसरा", "खतौनी", "नामांतरण", "सीमांकन", "जमीन विवाद", "कब्जा",
        "patwari", "namantaran", "khasra nakal", "zameen"
    ],
    "Animal Husbandry & Veterinary": [
        "veterinary", "stray dog", "cattle", "cow", "livestock", "animal bite", "rabid dog",
        "पशु चिकित्सा", "आवारा कुत्ते", "गाय", "भैंस", "पशु", "मवेशी", "मृत पशु",
        "veterinary hospital", "kutto", "pashu"
    ],
    "Women & Child Development": [
        "anganwadi", "poshan aahar", "malnourished", "ladli behna", "child welfare",
        "आंगनवाड़ी", "पोषण आहार", "कुपोषित", "लाड़ली बहना",
        "anganwadi", "poshan", "ladli behna"
    ],
    "Agriculture & Farmers' Welfare": [
        "fertilizer", "urea", "dap", "crop insurance", "fasal bima", "pm kisan", "mandi",
        "यूरिया", "खाद", "डीएपी", "फसल बीमा", "पीएम किसान", "मंडी तौल",
        "khad", "urea", "fasal bima", "pm kisan"
    ]
}

def resolve_domain_keyword_dept(text: str) -> str:
    t = text.lower()
    for dept, kws in DOMAIN_KEYWORD_RULES.items():
        if any(kw in t for kw in kws):
            return dept
    return None
def route_complaint(complaint_text: str, confidence_threshold: float = 0.35) -> dict:
    """
    Routes a complaint to one of 15 Madhya Pradesh Government departments.
    Returns:
    {
        "department": str,
        "confidence": float,
        "language": str,
        "is_fallback": bool
    }
    """
    if not complaint_text or not str(complaint_text).strip():
        return {
            "department": FALLBACK_DEPARTMENT,
            "confidence": 0.0,
            "language": "en",
            "is_fallback": True
        }

    norm = normalize_complaint(complaint_text)
    clean_text = norm["clean_text"]
    lang = norm["language"]

    vec, mdl = _get_model()
    if mdl is None or vec is None:
        return {
            "department": FALLBACK_DEPARTMENT,
            "confidence": 0.0,
            "language": lang,
            "is_fallback": True
        }

    try:
        features = vec.transform([clean_text])
        probabilities = mdl.predict_proba(features)[0]
        best_idx = np.argmax(probabilities)
        confidence = float(probabilities[best_idx])
        pred_dept = mdl.classes_[best_idx]

        # Check high-precision domain keywords if statistical ML model is uncertain
        if confidence < confidence_threshold:
            domain_dept = resolve_domain_keyword_dept(complaint_text)
            if domain_dept:
                return {
                    "department": domain_dept,
                    "confidence": 0.85,
                    "language": lang,
                    "is_fallback": False,
                    "source": "DOMAIN_RESOLVER"
                }
            # Safe fallback: If confidence is lower than threshold and no clear rule, send to manual review
            return {
                "department": FALLBACK_DEPARTMENT,
                "confidence": round(confidence, 4),
                "language": lang,
                "is_fallback": True,
                "candidate_department": pred_dept
            }

        return {
            "department": pred_dept,
            "confidence": round(confidence, 4),
            "language": lang,
            "is_fallback": False
        }

    except Exception as err:
        print(f"[DEPARTMENT ROUTING ERROR] {err}")
        return {
            "department": FALLBACK_DEPARTMENT,
            "confidence": 0.0,
            "language": lang,
            "is_fallback": True
        }

if __name__ == "__main__":
    test_complaints = [
        "There has been no water supply for five days",
        "पाँच दिनों से पानी की सप्लाई नहीं आ रही है।",
        "5 din se paani nahi aa raha hai",
        "The main road has many potholes",
        "A live electric wire has fallen on the road",
        "There is a serious fire near the market",
        "The government hospital has no medicines",
        "Garbage has not been collected for a week",
        "The park needs maintenance",
        "Patwari namantaran ke liye rishwat maang raha hai",
        "Anganwadi center band rehta hai bacho ko poshan aahar nahi milta",
        "Khad aur urea society me nahi mil raha",
        "Awara kutte colony me bacho ko kaat rahe hain"
    ]
    for c in test_complaints:
        res = route_complaint(c)
        print(f"[{res['language']:8s}] Conf: {res['confidence']:.2f} | Fallback: {str(res['is_fallback']):5s} | Dept: {res['department']} | Text: {c[:40]}")