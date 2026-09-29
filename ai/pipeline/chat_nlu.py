# chat_nlu.py
"""
Conversational Natural Language Understanding (NLU) Engine for Gram Mitra.
Understands citizen inputs in Hindi (Devanagari), Hinglish (Roman Hindi), and English.
Identifies user intent, detects vague/incomplete complaints, extracts entities (ID, Ward, Location),
and determines next required missing information.
"""

import re
from typing import Dict, Any, Optional

INTENTS = [
    "SUBMIT_COMPLAINT",
    "TRACK_COMPLAINT",
    "COMPLAINT_STATUS",
    "HOW_TO_COMPLAIN",
    "UPDATE_COMPLAINT",
    "ESCALATE_COMPLAINT",
    "GENERAL_FAQ",
    "UNKNOWN"
]

GENERIC_SUBMIT_TRIGGERS = [
    "file complaint", "file a complaint", "submit complaint", "report problem",
    "report issue", "register complaint", "nayi shikayat", "shikayat darj",
    "shikayat karni hai", "complaint karni hai", "mujhe shikayat karni hai",
    "i want to file a complaint", "i want to submit a complaint",
    "i want to report a problem", "want to file a complaint",
    "shikayat", "complaint", "शिकायत", "शिकायत दर्ज", "शिकायत दर्ज करें",
    "नई शिकायत", "समस्या दर्ज करें", "रिपोर्ट करें", "शिकायत करनी है"
]

COMPLAINT_ID_PATTERN = re.compile(r'(?:#|grv-?|no\.?|id:?\s*|^)\s*(\d{1,6})\b', re.IGNORECASE)
WARD_PATTERN = re.compile(r'(?:ward|वार्ड)\s*(?:no\.?|संख्या|num)?\s*(\d{1,3})', re.IGNORECASE)

VAGUE_COMPLAINT_PATTERNS = [
    r'^(?:bijli|electricity)\s*(?:ki|ka)?\s*(?:problem|dikkat|issue|samasya)\s*(?:hai)?$',
    r'^(?:pani|water)\s*(?:ki|ka)?\s*(?:problem|dikkat|issue|samasya)\s*(?:hai)?$',
    r'^(?:sadak|road)\s*(?:ki|ka)?\s*(?:problem|dikkat|issue|samasya)\s*(?:hai)?$',
    r'^(?:nali|drain|drainage)\s*(?:ki|ka)?\s*(?:problem|dikkat|issue|samasya)\s*(?:hai)?$',
    r'^(?:safai|kachra|waste)\s*(?:ki|ka)?\s*(?:problem|dikkat|issue|samasya)\s*(?:hai)?$',
    r'^(?:बिजली|पानी|सड़क|नाली|कचरा)\s*(?:की|का)?\s*(?:समस्या|दिक्कत|परेशानी)\s*(?:है)?$',
]


def clean_message(raw_msg: str) -> str:
    """Removes leading emojis and extra whitespace while preserving characters."""
    if not raw_msg:
        return ""
    # Strip common UI emojis
    cleaned = re.sub(r'^[📝🔍⏱️⚡❓✅❌✏️🏛️🚨\s]+', '', raw_msg)
    return cleaned.strip()


def detect_language(text: str) -> str:
    """Detects if text is Devanagari Hindi, Roman Hinglish, or English."""
    for char in text:
        if '\u0900' <= char <= '\u097F':
            return "hi"
    lower = text.lower()
    hinglish_markers = ["hai", "nahi", "kya", "batao", "kripya", "kaise", "mera", "meri", "gaon", "paani", "pani", "sadak", "bijli", "dikkat", "samasya", "shikayat", "bohot", "din", "se"]
    if any(w in lower for w in hinglish_markers):
        return "hinglish"
    return "en"


def is_generic_trigger(cleaned: str) -> bool:
    """Returns True if the message is merely a trigger command to open the complaint flow."""
    lower = cleaned.lower().strip()
    if any(phrase in lower for phrase in [
        "want to file a complaint", "want to submit a complaint",
        "want to report a problem", "want to register a complaint",
        "shikayat karni hai", "complaint karni hai",
        "शिकायत करनी है", "शिकायत दर्ज करनी", "शिकायत दर्ज"
    ]):
        return True
    for trigger in GENERIC_SUBMIT_TRIGGERS:
        if lower == trigger or lower == f"new {trigger}":
            return True
    return False


def is_vague_complaint(text: str) -> bool:
    """Checks if the complaint mentions a category without describing the problem."""
    lower = text.lower().strip()
    for pat in VAGUE_COMPLAINT_PATTERNS:
        if re.search(pat, lower):
            return True
    # If text is extremely short and has no action verbs
    words = lower.split()
    if len(words) <= 3 and any(w in lower for w in ["bijli", "pani", "water", "road", "sadak", "light", "बिजली", "पानी", "सड़क"]):
        if not any(v in lower for v in ["gir", "toot", "band", "leak", "overflow", "cut", "spark", "chori", "kharab", "गिरा", "टूटा", "बंद", "खराब"]):
            return True
    return False


def extract_entities(text: str) -> Dict[str, Any]:
    """Extracts Complaint ID, Ward number, and location hints."""
    complaint_id = None
    m_id = COMPLAINT_ID_PATTERN.search(text)
    if m_id:
        try:
            complaint_id = int(m_id.group(1))
        except ValueError:
            pass

    ward = None
    m_ward = WARD_PATTERN.search(text)
    if m_ward:
        ward = f"Ward {m_ward.group(1)}"

    return {
        "complaint_id": complaint_id,
        "ward": ward
    }


def understand_user_message(raw_msg: str, active_intent: Optional[str] = None) -> Dict[str, Any]:
    """
    Main conversational NLU method.
    Returns:
        - intent: Recognized intent from the 8 core intents
        - language: Detected language ('hi', 'hinglish', 'en')
        - is_generic_trigger: bool
        - is_vague: bool
        - entities: dict (complaint_id, ward)
        - cleaned_text: str
    """
    cleaned = clean_message(raw_msg)
    lower = cleaned.lower()
    lang = detect_language(cleaned)
    entities = extract_entities(cleaned)
    generic = is_generic_trigger(cleaned)
    vague = is_vague_complaint(cleaned)

    # 1. Respect active slot-filling state if applicable
    if active_intent == "SUBMIT_COMPLAINT":
        if any(c in lower for c in ["cancel", "रद्द", "छोड़ो", "exit", "main menu"]):
            return {
                "intent": "UNKNOWN",
                "language": lang,
                "is_generic_trigger": False,
                "is_vague": False,
                "entities": entities,
                "cleaned_text": cleaned
            }
        return {
            "intent": "SUBMIT_COMPLAINT",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": vague,
            "entities": entities,
            "cleaned_text": cleaned
        }

    if active_intent in ["TRACK_COMPLAINT", "ESCALATE_COMPLAINT"]:
        if entities.get("complaint_id") or lower.isdigit():
            return {
                "intent": active_intent,
                "language": lang,
                "is_generic_trigger": False,
                "is_vague": False,
                "entities": entities,
                "cleaned_text": cleaned
            }

    # 2. Check for STATUS EXPLANATION
    status_keywords = [
        "status ka matlab", "what does status mean", "under review ka matlab",
        "action taken ka matlab", "submitted ka matlab", "resolved ka matlab",
        "status meaning", "स्थिति का मतलब", "समीक्षाधीन का मतलब",
        "under review mean", "under review kya", "action taken kya", "resolved kya",
        "submitted kya", "closed kya", "what does under review", "what does action taken",
        "what does resolved", "what does submitted", "what does closed", "explain status",
        "status explain", "status batao kya hai"
    ]
    if any(k in lower for k in status_keywords):
        return {
            "intent": "COMPLAINT_STATUS",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 3. Check for HOW TO COMPLAIN
    if any(k in lower for k in ["how to complain", "complaint kaise kare", "shikayat kaise karein", "how to file", "kaise darj kare", "process kya hai", "शिकायत कैसे करें", "कैसे दर्ज करें"]):
        return {
            "intent": "HOW_TO_COMPLAIN",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 4. Check for ESCALATE COMPLAINT
    if any(k in lower for k in ["escalat", "pending", "bahut din", "bohot din", "10 din", "delayed", "action nahi", "sunwai nahi", "लंबित", "एस्केलेट", "विलंब"]):
        return {
            "intent": "ESCALATE_COMPLAINT",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 5. Check for TRACK COMPLAINT
    if entities.get("complaint_id") is not None and (
        "#" in raw_msg or "track" in lower or "status" in lower or "kya hua" in lower or lower.isdigit() or "स्थिति" in lower
    ):
        return {
            "intent": "TRACK_COMPLAINT",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    if any(k in lower for k in ["track", "status", "kya hua", "check status", "meri complaint", "स्थिति", "ट्रैक"]):
        return {
            "intent": "TRACK_COMPLAINT",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 6. Check for UPDATE COMPLAINT
    if any(k in lower for k in ["update complaint", "change location", "add photo", "photo add", "edit complaint", "बदलाव करें", "फोटो जोड़ें"]):
        return {
            "intent": "UPDATE_COMPLAINT",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 7. Check for GENERAL FAQ
    if any(k in lower for k in ["sla", "timeline", "kitne time", "how much time", "rules", "critical priority", "priority kya hai", "प्राथमिकता", "समय सीमा"]):
        return {
            "intent": "GENERAL_FAQ",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 8. Check for SUBMIT COMPLAINT
    if generic:
        return {
            "intent": "SUBMIT_COMPLAINT",
            "language": lang,
            "is_generic_trigger": True,
            "is_vague": False,
            "entities": entities,
            "cleaned_text": cleaned
        }

    problem_indicators = [
        "pani", "paani", "water", "bijli", "electricity", "wire", "light", "current",
        "sadak", "road", "pothole", "gaddha", "nali", "naali", "drain", "gutter",
        "kachra", "safai", "garbage", "trash", "hospital", "doctor", "school",
        "teacher", "toilet", "shauchalaya", "पानी", "बिजली", "सड़क", "गड्ढा",
        "नाली", "कचरा", "सफाई", "अस्पताल", "स्कूल", "शौचालय"
    ]
    if any(w in lower for w in problem_indicators):
        return {
            "intent": "SUBMIT_COMPLAINT",
            "language": lang,
            "is_generic_trigger": False,
            "is_vague": vague,
            "entities": entities,
            "cleaned_text": cleaned
        }

    # 9. Fallback: UNKNOWN
    return {
        "intent": "UNKNOWN",
        "language": lang,
        "is_generic_trigger": False,
        "is_vague": False,
        "entities": entities,
        "cleaned_text": cleaned
    }
