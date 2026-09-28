# urgency_rules.py

import re

# --------------------------------------------------
# Critical urgency indicators (Life & Safety Threats)
# --------------------------------------------------

CRITICAL_KEYWORDS = [
    # English
    "life threatening", "life-threatening", "danger to life", "risk to life",
    "electrocution", "electric shock", "live wire", "live electric wire", "sparking wire", "hanging wire",
    "fire", "major fire", "short circuit fire", "gas leak", "building collapse",
    "collapsed building", "people trapped", "person trapped", "critical emergency",
    "severe accident", "deep open manhole", "deep ditch danger",

    # Hindi
    "करंट", "बिजली का तार", "तार टूटा", "तार गिर गया", "आग", "शॉर्ट सर्किट", "सिलेंडर ब्लास्ट",
    "जान का खतरा", "जानलेवा", "मकान गिर गया", "दीवार ढह गई", "लोग फंसे हैं", "गंभीर दुर्घटना",
    "खुला मेनहोल", "गहरा गड्ढा जानलेवा", "जहरीला पानी", "सांप",

    # Hinglish
    "current lag sakta hai", "taar toot gaya", "taar gir gaya", "bijli ka taar", "aag lag gayi",
    "jaan ka khatra", "danger", "critical", "blast", "live wire"
]

# --------------------------------------------------
# High urgency indicators (Severe Disruptions / Hazards)
# --------------------------------------------------

HIGH_KEYWORDS = [
    # English
    "emergency", "urgent", "immediate action", "immediately", "serious danger",
    "dangerous", "hazard", "accident", "injured", "injury", "flooding", "severe flooding",
    "overflowing sewage", "sewage entering house", "contaminated drinking water", "no medicines",
    "doctor unavailable", "water supply completely stopped", "days without water", "transformer burnt",
    "blackout for days", "road washed away", "drain blocked overflow",

    # Hindi
    "आपातकालीन", "अत्यावश्यक", "तुरंत कार्रवाई", "तुरंत समाधान", "खतरा", "दुर्घटना",
    "गंदा पानी आ रहा है", "पीने का पानी दूषित", "५ दिन से पानी नहीं", "कई दिनों से पानी बंद",
    "अस्पताल में डॉक्टर नहीं", "दवाई नहीं है", "नाली का पानी घरों में", "बाढ़",
    "सड़क धंस गई", "ट्रांसफार्मर फुंक गया", "गंभीर समस्या", "सड़न और बीमारी",

    # Hinglish
    "urgent", "emergency", "paani bilkul nahi aa raha", "ganda paani", "doctor nahi hai",
    "bimar", "bimaari", "naali ka paani ghar me", "transformer kharab", "heavy water logging"
]

# --------------------------------------------------
# Medium urgency indicators (Functional Issues / Repairs)
# --------------------------------------------------

MEDIUM_KEYWORDS = [
    # English
    "not working", "not available", "blocked", "overflowing", "damaged", "broken",
    "leaking", "pending", "frequently", "repeatedly", "several days", "many days",
    "pothole", "street light off", "garbage pile", "handpump broken", "slow water",
    "low voltage",

    # Hindi
    "काम नहीं कर रहा", "खराब है", "टूटा हुआ है", "बंद है", "जाम है", "गड्ढा है",
    "स्ट्रीट लाइट नहीं जल रही", "कचरा फैला है", "हैंडपंप खराब", "पानी का रिसाव",
    "सफाई नहीं हुई", "धीमा", "समस्या है", "लाइट बंद", "नाली बंद",

    # Hinglish
    "kharab hai", "nahi chal raha", "toota hai", "band hai", "kachra pada hai",
    "street light band", "handpump kharab", "paani nahi", "gaddha hai", "naali jaam"
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
    Determine urgency using transparent keyword rules.
    Returns:
        priority
        matched_keywords
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

    # Default village grievances are considered MEDIUM priority
    return "MEDIUM", []