# sentiment_rules.py

import re


NEGATIVE_KEYWORDS = [
    "angry",
    "frustrated",
    "frustration",
    "upset",
    "worried",
    "worry",
    "helpless",
    "unhappy",
    "disappointed",
    "annoyed",
    "harassment",
    "suffering",
    "suffer",
    "problem",
    "problems",
    "issue",
    "issues",
    "danger",
    "dangerous",
    "emergency",
    "urgent",
    "serious",
    "critical",
    "bad",
    "worst",
    "failed",
    "failure",
    "blocked",
    "broken",
    "damaged",
    "not working",
    "no water",
    "no electricity",
    "no medicines",
    "not available",
]


POSITIVE_KEYWORDS = [
    "thank",
    "thanks",
    "thank you",
    "appreciate",
    "appreciated",
    "good",
    "great",
    "satisfied",
    "resolved",
    "working properly",
]


def normalize_text(text):
    """
    Basic text normalization.
    """

    text = str(text).lower().strip()
    text = re.sub(r"\s+", " ", text)

    return text


def calculate_sentiment(text):
    """
    Calculate basic sentiment using keyword matching.

    Returns:
        sentiment
        matched_keywords
    """

    text = normalize_text(text)

    negative_matches = [
        keyword
        for keyword in NEGATIVE_KEYWORDS
        if keyword in text
    ]

    positive_matches = [
        keyword
        for keyword in POSITIVE_KEYWORDS
        if keyword in text
    ]

    # Negative takes priority when a complaint
    # contains both positive and negative terms.
    if negative_matches:
        return "NEGATIVE", negative_matches

    if positive_matches:
        return "POSITIVE", positive_matches

    return "NEUTRAL", []