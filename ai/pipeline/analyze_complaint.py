"""
analyze_complaint.py
Unified AI Grievance Analysis Pipeline for Madhya Pradesh Government.
Integrates Multilingual Department Routing, Priority Prediction (with Life-Safety Layer),
and Citizen Sentiment Analysis.
"""

import sys
import os

AI_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if AI_DIR not in sys.path:
    sys.path.append(AI_DIR)

from routing.route_complaint import route_complaint
from priority.predict_priority import predict_priority
from sentiment.sentiment_rules import calculate_sentiment

DEPT_TO_CATEGORY_MAP = {
    "Public Health Engineering / Water Supply": "Water Supply",
    "Public Works / Roads": "Roads & Transportation",
    "Drainage & Sewerage": "Drainage",
    "Electricity / Energy": "Electricity",
    "Public Health & Family Welfare": "Healthcare",
    "School Education": "Education",
    "Revenue & Land Administration": "Property & Revenue",
    "Animal Husbandry & Veterinary": "Animal & Veterinary",
    "IT & Digital Government Services": "Digital/IT Services",
    "Social Justice & Welfare": "Welfare Services",
    "Women & Child Development": "Women & Child Development",
    "Police / Home": "Public Safety / Police",
    "Agriculture & Farmers' Welfare": "Agriculture & Farming",
    "Panchayat & Rural Development": "Panchayat & Rural Development",
    "Urban Development & Municipal Services": "Urban Civic Services",
    "General Administration / Manual Review": "Other"
}

def analyze_complaint(complaint_text: str) -> dict:
    """
    Run complete AI analysis on citizen complaint:
    1. Language Detection & Normalization
    2. Department Routing (15 MP Departments + Safe Manual Review Fallback)
    3. Priority Classification (CRITICAL, HIGH, MEDIUM, LOW + Safety Layer)
    4. Sentiment Analysis (POSITIVE, NEUTRAL, NEGATIVE)

    Input:
        complaint_text (str): Complaint in Hindi, Hinglish, or English

    Output:
        dict containing:
        - category (str)
        - department (str)
        - department_confidence (float)
        - is_safe_fallback (bool)
        - priority (str)
        - priority_confidence (float)
        - priority_source (str)
        - language (str)
        - sentiment (str)
        - priority_indicators (list[str])
        - sentiment_indicators (list[str])
    """
    if not complaint_text or not str(complaint_text).strip():
        return {
            "category": "Other",
            "department": "General Administration / Manual Review",
            "department_confidence": 0.0,
            "is_safe_fallback": True,
            "priority": "MEDIUM",
            "priority_confidence": 0.5,
            "priority_source": "DEFAULT",
            "language": "en",
            "sentiment": "NEUTRAL",
            "priority_indicators": [],
            "sentiment_indicators": []
        }

    text = str(complaint_text).strip()

    # 1. Department Routing
    route_res = route_complaint(text)
    department = route_res.get("department", "General Administration / Manual Review")
    dept_conf = route_res.get("confidence", 0.0)
    is_fallback = route_res.get("is_fallback", False)
    language = route_res.get("language", "en")
    category = DEPT_TO_CATEGORY_MAP.get(department, "Other")

    # 2. Priority Prediction
    prio_res = predict_priority(text)
    priority = prio_res.get("priority", "MEDIUM")
    prio_conf = prio_res.get("confidence", 0.75)
    prio_source = prio_res.get("source", "ML_MODEL")
    priority_indicators = prio_res.get("matched_keywords", [])

    # 3. Sentiment Analysis
    sentiment, sentiment_indicators = calculate_sentiment(text)

    return {
        "category": category,
        "department": department,
        "department_confidence": dept_conf,
        "is_safe_fallback": is_fallback,
        "priority": priority,
        "priority_confidence": prio_conf,
        "priority_source": prio_source,
        "language": language,
        "sentiment": sentiment,
        "priority_indicators": priority_indicators,
        "sentiment_indicators": sentiment_indicators
    }

if __name__ == "__main__":
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    test_samples = [
        "There has been no water supply for five days",
        "पाँच दिनों से पानी की सप्लाई नहीं आ रही है।",
        "5 din se paani nahi aa raha hai",
        "A live electric wire has fallen on the road",
        "सड़क पर बिजली का चालू तार गिर गया है, करंट लग सकता है",
        "The main road has many potholes",
        "The government hospital has no medicines",
        "Patwari namantaran ke liye paise maang raha hai",
        "Anganwadi kendra band hai bachho ko poshan aahar nahi mil raha",
        "Garbage has not been collected for a week",
        "The park needs maintenance"
    ]

    for sample in test_samples:
        r = analyze_complaint(sample)
        print("\n" + "=" * 60)
        print(f"Complaint: {sample}")
        print(f"Language: {r['language']} | Dept: {r['department']} (Conf: {r['department_confidence']:.2f}, Fallback: {r['is_safe_fallback']})")
        print(f"Priority: {r['priority']} (Conf: {r['priority_confidence']:.2f}, Source: {r['priority_source']})")
        print(f"Category: {r['category']} | Sentiment: {r['sentiment']}")