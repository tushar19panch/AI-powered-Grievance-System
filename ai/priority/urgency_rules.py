# urgency_rules.py

import re


# --------------------------------------------------
# Critical urgency indicators
# --------------------------------------------------

CRITICAL_KEYWORDS = [
    "life threatening",
    "life-threatening",
    "danger to life",
    "risk to life",
    "electrocution",
    "electric shock",
    "live wire",
    "live electric wire",
    "fire",
    "major fire",
    "gas leak",
    "building collapse",
    "collapsed building",
    "people trapped",
    "person trapped",
    "critical emergency",
]


# --------------------------------------------------
# High urgency indicators
# --------------------------------------------------

HIGH_KEYWORDS = [
    "emergency",
    "urgent",
    "immediate action",
    "immediately",
    "serious danger",
    "dangerous",
    "hazard",
    "accident",
    "injured",
    "injury",
    "flooding",
    "severe flooding",
    "overflowing sewage",
    "sewage entering house",
    "contaminated drinking water",
    "no medicines",
    "doctor unavailable",
]


# --------------------------------------------------
# Medium urgency indicators
# --------------------------------------------------

MEDIUM_KEYWORDS = [
    "not working",
    "not available",
    "blocked",
    "overflowing",
    "damaged",
    "broken",
    "leaking",
    "pending",
    "frequently",
    "repeatedly",
    "several days",
    "many days",
    "five days",
    "six days",
    "seven days",
    "for a week",
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
        keyword
        for keyword in CRITICAL_KEYWORDS
        if keyword in text
    ]

    if critical_matches:
        return "CRITICAL", critical_matches

    high_matches = [
        keyword
        for keyword in HIGH_KEYWORDS
        if keyword in text
    ]

    if high_matches:
        return "HIGH", high_matches

    medium_matches = [
        keyword
        for keyword in MEDIUM_KEYWORDS
        if keyword in text
    ]

    if medium_matches:
        return "MEDIUM", medium_matches

    return "LOW", []