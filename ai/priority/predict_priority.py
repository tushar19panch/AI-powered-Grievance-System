"""
predict_priority.py
Multilingual Priority Prediction (LOW, MEDIUM, HIGH, CRITICAL).
Combines the Critical Life-Safety Rule Layer with the trained statistical Priority Classifier.
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
from priority.safety_rules import evaluate_safety_rules
from priority.urgency_rules import calculate_urgency

MODEL_PATH = os.path.join(BASE_DIR, "models", "priority_model.joblib")
VECTORIZER_PATH = os.path.join(BASE_DIR, "models", "priority_vectorizer.joblib")

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
            print(f"[PRIORITY PREDICTION] Warning loading model: {e}")
    return _vectorizer, _model

def predict_priority(complaint_text: str) -> dict:
    """
    Predicts priority of complaint across 4 levels:
    - CRITICAL : Immediate threats to life, safety, fire, electrocution, building collapse
    - HIGH     : Severe disruptions, multi-day water/power outage, emergency medical issues
    - MEDIUM   : Routine functional damages, potholes, clogged drains, administrative delays
    - LOW      : Minor cosmetic repairs, whitewash, park bench, suggestions

    Returns:
    {
        "priority": str,
        "confidence": float,
        "source": str,
        "matched_keywords": list[str]
    }
    """
    if not complaint_text or not str(complaint_text).strip():
        return {
            "priority": "MEDIUM",
            "confidence": 0.5,
            "source": "DEFAULT_FALLBACK",
            "matched_keywords": []
        }

    # Step 1: Evaluate Critical Life-Safety Rules (Zero-Hazard Leakage Layer)
    safety = evaluate_safety_rules(complaint_text)
    if safety["is_critical_hazard"]:
        matched = [safety["hazard_type"]]
        if safety["matched_pattern"]:
            matched.append(safety["matched_pattern"])
        return {
            "priority": "CRITICAL",
            "confidence": 1.0,
            "source": f"SAFETY_RULE ({safety['hazard_type']})",
            "matched_keywords": matched
        }

    # Step 2: Statistical ML Model
    norm = normalize_complaint(complaint_text)
    clean_text = norm["clean_text"]

    vec, mdl = _get_model()
    if mdl is not None and vec is not None:
        try:
            features = vec.transform([clean_text])
            probabilities = mdl.predict_proba(features)[0]
            best_idx = np.argmax(probabilities)
            prio = mdl.classes_[best_idx]
            conf = float(probabilities[best_idx])

            # Also get keyword indicators for UI display
            _, rule_keywords = calculate_urgency(complaint_text)

            return {
                "priority": prio,
                "confidence": round(conf, 4),
                "source": "ML_MODEL",
                "matched_keywords": rule_keywords
            }
        except Exception as e:
            print(f"[PRIORITY PREDICTION ERROR] {e}")

    # Fallback to urgency rule keyword engine
    rule_prio, rule_keywords = calculate_urgency(complaint_text)
    return {
        "priority": rule_prio,
        "confidence": 0.75,
        "source": "RULE_ENGINE_FALLBACK",
        "matched_keywords": rule_keywords
    }

if __name__ == "__main__":
    test_complaints = [
        "There has been no water supply for five days",
        "The main road has many potholes",
        "A live electric wire has fallen on the road",
        "There is a serious fire near the market",
        "The government hospital has no medicines",
        "Garbage has not been collected for a week",
        "The park needs maintenance",
        "पाँच दिनों से पानी की सप्लाई नहीं आ रही है।",
        "5 din se paani nahi aa raha hai",
        "सड़क पर बिजली का चालू तार गिर गया है, जानलेवा खतरा है",
        "बाजार के पास भीषण आग लग गई है, तुरंत दमकल भेजें"
    ]
    for c in test_complaints:
        res = predict_priority(c)
        print(f"[{res['priority']:8s}] Conf: {res['confidence']:.2f} | Source: {res['source'][:25]:25s} | Text: {c[:40]}")