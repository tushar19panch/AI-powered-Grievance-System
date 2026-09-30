# urgency_rules.py

import re

# --------------------------------------------------
# Critical urgency indicators (Life & Safety Threats)
# --------------------------------------------------

CRITICAL_KEYWORDS = [
    # English
    "life threatening", "life-threatening", "danger to life", "risk to life",
    "electrocution", "electric shock", "live wire", "live electric wire", "sparking wire", "hanging wire",
    "wire fallen", "wire broken", "high voltage", "fire", "major fire", "short circuit fire", "gas leak",
    "building collapse", "collapsed building", "wall collapse", "people trapped", "person trapped",
    "critical emergency", "severe accident", "deep open manhole", "deep ditch danger", "open well danger",
    "snake bite", "poisonous water", "toxic gas",

    # Hindi
    "करंट", "बिजली का तार", "तार टूटा", "तार गिर गया", "आग", "शॉर्ट सर्किट", "सिलेंडर ब्लास्ट",
    "जान का खतरा", "जानलेवा", "मकान गिर गया", "दीवार ढह गई", "दीवार गिर गई", "लोग फंसे हैं", "गंभीर दुर्घटना",
    "खुला मेनहोल", "गहरा गड्ढा जानलेवा", "जहरीला पानी", "सांप", "करंट लग रहा है", "खंभा गिर गया",

    # Hinglish
    "current lag sakta hai", "current lag raha hai", "taar toot gaya", "taar gir gaya", "bijli ka taar",
    "aag lag gayi", "jaan ka khatra", "danger", "critical", "blast", "live wire", "open wire",
    "pole gir gaya", "khamba toot gaya"
]

# --------------------------------------------------
# High urgency indicators (Severe Disruptions / Hazards)
# --------------------------------------------------

HIGH_KEYWORDS = [
    # English
    "emergency", "urgent", "immediate action", "immediately", "serious danger",
    "dangerous", "hazard", "accident", "injured", "injury", "flooding", "severe flooding",
    "overflowing sewage", "sewage entering house", "contaminated drinking water", "no medicines",
    "doctor unavailable", "water supply completely stopped", "days without water", "no water for 5 days",
    "no water for five days", "for five days", "for 5 days", "five days", "5 days",
    "transformer burnt", "blackout for days", "road washed away", "drain blocked overflow",
    "epidemic", "dengue outbreak", "sewage overflow",

    # Hindi
    "आपातकालीन", "अत्यावश्यक", "तुरंत कार्रवाई", "तुरंत समाधान", "खतरा", "दुर्घटना",
    "गंदा पानी आ रहा है", "पीने का पानी दूषित", "५ दिन से पानी नहीं", "5 दिन से पानी नहीं",
    "कई दिनों से पानी बंद", "हफ्ते भर से पानी", "अस्पताल में डॉक्टर नहीं", "दवाई नहीं है",
    "नाली का पानी घरों में", "बाढ़", "सड़क धंस गई", "ट्रांसफार्मर फुंक गया", "गंभीर समस्या",
    "सड़न और बीमारी", "बीमारी फैल रही है",

    # Hinglish
    "urgent", "emergency", "paani bilkul nahi aa raha", "5 din se pani nahi", "ganda paani",
    "doctor nahi hai", "dawa nahi hai", "bimar", "bimaari", "naali ka paani ghar me",
    "transformer kharab", "heavy water logging", "many days without water"
]

# --------------------------------------------------
# Medium urgency indicators (Functional Issues / Repairs)
# --------------------------------------------------

MEDIUM_KEYWORDS = [
    # English
    "not working", "not available", "blocked", "overflowing", "damaged", "broken",
    "leaking", "pending", "frequently", "repeatedly", "several days", "many days",
    "pothole", "street light off", "garbage pile", "handpump broken", "slow water",
    "low voltage", "pipeline burst", "pipe broken", "drain clogged", "sewage leak",
    "dustbin overflowing", "dirty water",

    # Hindi
    "काम नहीं कर रहा", "खराब है", "टूटा हुआ है", "बंद है", "जाम है", "गड्ढा है", "गड्ढे",
    "स्ट्रीट लाइट नहीं जल रही", "कचरा फैला है", "हैंडपंप खराब", "पानी का रिसाव",
    "सफाई नहीं हुई", "धीमा", "समस्या है", "लाइट बंद", "नाली बंद", "पाइप टूटा",

    # Hinglish
    "kharab hai", "nahi chal raha", "toota hai", "band hai", "kachra pada hai",
    "street light band", "handpump kharab", "paani nahi", "gaddha hai", "naali jaam",
    "pipe foot gaya"
]

# --------------------------------------------------
# Low urgency indicators (Minor / Routine / Cosmetic / Suggestions)
# --------------------------------------------------

LOW_KEYWORDS = [
    # English
    "minor", "low priority", "not urgent", "request", "suggestion", "beautification",
    "tree trimming", "tree branch", "cosmetic", "routine", "inquiry", "painting",
    "park bench", "name board", "signboard", "information required", "cleaning request",
    "garden maintenance", "white wash", "speed breaker request", "dustbin installation",
    "general feedback", "bench installation", "tree cutting", "needs maintenance",

    # Hindi
    "कम प्राथमिकता", "छोटा", "हल्का", "सुझाव", "निवेदन", "अनुरोध", "सफाई का अनुरोध",
    "रंगाई", "पुताई", "पेड़ की छंटाई", "डाल काटना", "पार्क", "बगीचा", "सौंदर्यीकरण",
    "सूचना चाहिए", "बोर्ड", "साइनबोर्ड", "कचरा पेटी लगाने", "सामान्य", "प्रार्थना",
    "बेंच लगाने", "रंग-रोगन",

    # Hinglish
    "low priority", "urgent nahi hai", "aaram se", "chhota issue", "minor problem",
    "suggestion", "request", "safai ki request", "ped ki katai", "color karwana",
    "safai karwaye", "board lagwana", "bench lagwana", "dustbin lagwana"
]

def normalize_text(text):
    """
    Basic normalization for rule matching.
    """
    text = str(text).lower().strip()
    text = re.sub(r"\s+", " ", text)
    return text

def calculate_urgency(text):
    """
    Determine urgency using transparent keyword rules across 4 priority levels:
    - CRITICAL : Immediate threats to life, safety, fire, electrocution
    - HIGH     : Severe disruptions, days without water, healthcare/doctor absence
    - MEDIUM   : Functional damages, broken infrastructure, clogged drains
    - LOW      : Minor repairs, suggestions, cosmetic maintenance, requests

    Returns:
        priority (str): CRITICAL | HIGH | MEDIUM | LOW
        matched_keywords (list[str])
    """
    text = normalize_text(text)

    critical_matches = [
        kw for kw in CRITICAL_KEYWORDS
        if kw in text
    ]
    if critical_matches:
        return "CRITICAL", critical_matches

    high_matches = [
        kw for kw in HIGH_KEYWORDS
        if kw in text
    ]
    if high_matches:
        return "HIGH", high_matches

    medium_matches = [
        kw for kw in MEDIUM_KEYWORDS
        if kw in text
    ]
    if medium_matches:
        return "MEDIUM", medium_matches

    low_matches = [
        kw for kw in LOW_KEYWORDS
        if kw in text
    ]
    if low_matches:
        return "LOW", low_matches

    # Default village grievances without explicit urgency markers are MEDIUM
    return "MEDIUM", []