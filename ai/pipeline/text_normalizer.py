"""
text_normalizer.py
Robust text normalization and language detection for Hindi, Hinglish, and English complaints.
"""

import re
import sys
import unicodedata

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Devanagari Unicode block: \u0900 - \u097F
DEVANAGARI_REGEX = re.compile(r"[\u0900-\u097F]")

# Common Hinglish marker words
HINGLISH_KEYWORDS = {
    "hai", "hain", "ho", "raha", "rahi", "rahe", "gaya", "gayi", "gaye",
    "paani", "pani", "bijli", "taar", "tar", "sadak", "sarak", "naali", "nali",
    "kachra", "gaon", "gao", "karo", "karein", "kijiye", "nahi", "nahin", "aur",
    "par", "me", "mein", "se", "ke", "ki", "ka", "ko", "ye", "yeh", "woh",
    "kutta", "pashu", "hospital", "aspatal", "dawai", "school", "bache", "bacho",
    "pension", "ration", "khasra", "zameen", "thekedar", "sachiv", "sarpanch",
    "patwari", "mandi", "fasal", "kisan", "andhera", "gaddha", "toot", "kharab",
    "phunk", "khamba", "pole", "pipe", "tap", "light", "current"
}

def detect_language(text: str) -> str:
    """
    Detects language of complaint:
    - 'hi'      : Hindi (contains Devanagari script)
    - 'hinglish': Hinglish (Roman script containing Hindi functional words)
    - 'en'      : English
    """
    if not text or not str(text).strip():
        return "en"
        
    text_str = str(text).strip()
    
    # Check for Devanagari
    if DEVANAGARI_REGEX.search(text_str):
        return "hi"
        
    # Check Roman tokens for Hinglish indicators
    tokens = re.findall(r"\b[a-zA-Z]+\b", text_str.lower())
    if not tokens:
        return "en"
        
    hinglish_count = sum(1 for tok in tokens if tok in HINGLISH_KEYWORDS)
    ratio = hinglish_count / len(tokens)
    
    if hinglish_count >= 2 or ratio >= 0.25:
        return "hinglish"
        
    return "en"

def normalize_devanagari(text: str) -> str:
    """
    Normalizes Devanagari text:
    - Unicode NFC normalization
    - Removes zero-width joiners / non-joiners
    - Normalizes nuktas and punctuation
    """
    text = unicodedata.normalize("NFC", text)
    # Remove zero-width characters
    text = re.sub(r"[\u200B-\u200D\uFEFF]", "", text)
    # Standardize danda (|) to period (.)
    text = text.replace("।", ".")
    # Clean excessive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def normalize_roman(text: str) -> str:
    """
    Normalizes English and Hinglish text:
    - Lowercase
    - Collapses elongated letters (e.g. 'urgentttt' -> 'urgent', 'paaaani' -> 'paani')
    - Cleans irregular symbols while preserving duration markers (e.g. 5 days, 24/7)
    """
    text = str(text).lower()
    # Collapse 3 or more repeated characters to at most 2
    text = re.sub(r"([a-zA-Z])\1{2,}", r"\1\1", text)
    # Clean weird punctuation but keep numbers and alphabets
    text = re.sub(r"[^\w\s\.,\-\/]", " ", text)
    # Normalize spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text

def normalize_complaint(text: str) -> dict:
    """
    Full normalization pipeline for a complaint.
    Returns:
    {
        "clean_text": str,
        "language": "hi" | "hinglish" | "en",
        "original_text": str
    }
    """
    if not text:
        return {"clean_text": "", "language": "en", "original_text": ""}
        
    orig = str(text).strip()
    lang = detect_language(orig)
    
    if lang == "hi":
        clean = normalize_devanagari(orig)
    else:
        clean = normalize_roman(orig)
        
    return {
        "clean_text": clean,
        "language": lang,
        "original_text": orig
    }

if __name__ == "__main__":
    samples = [
        "There has been no water supply for five days",
        "पाँच दिनों से पानी की सप्लाई नहीं आ रही है।",
        "5 din se paani nahi aa raha hai plssss help",
        "A live electric wire has fallen on the road!!!!",
        "सड़क पर बिजली का चालू तार गिर गया है",
        "Sadak par bijli ka live taar gir gaya hai current lag sakta hai"
    ]
    for s in samples:
        res = normalize_complaint(s)
        print(f"[{res['language']}] '{s}' -> '{res['clean_text']}'")
