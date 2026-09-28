# analyze_complaint.py

import sys
import os

# Add AI root directory to Python path
AI_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

sys.path.append(AI_DIR)


# Category
from models.category_model import predict_category

# Department
from routing.department_mapping import get_department

# Priority
from priority.urgency_rules import calculate_urgency

# Sentiment
from sentiment.sentiment_rules import calculate_sentiment


def analyze_complaint(complaint_text):
    """
    Run the complete AI analysis pipeline.

    Input:
        complaint_text (str)

    Output:
        dictionary containing:
        - category
        - department
        - priority
        - sentiment
    """

    if not complaint_text or not complaint_text.strip():
        return {
            "category": None,
            "department": None,
            "priority": None,
            "sentiment": None
        }

    complaint_text = complaint_text.strip()

    # -----------------------------------------
    # 1. Category Classification
    # -----------------------------------------

    category = predict_category(complaint_text)

    # -----------------------------------------
    # 2. Department Routing
    # -----------------------------------------

    department = get_department(category)

    # -----------------------------------------
    # 3. Priority / Urgency
    # -----------------------------------------

    priority, priority_keywords = calculate_urgency(
        complaint_text
    )

    # -----------------------------------------
    # 4. Sentiment Analysis
    # -----------------------------------------

    sentiment, sentiment_keywords = calculate_sentiment(
        complaint_text
    )

    # -----------------------------------------
    # Final result
    # -----------------------------------------

    return {
        "category": category,
        "department": department,
        "priority": priority,
        "priority_indicators": priority_keywords,
        "sentiment": sentiment,
        "sentiment_indicators": sentiment_keywords
    }


# ==================================================
# TEST
# ==================================================

if __name__ == "__main__":

    test_complaints = [

        "There has been no water supply for five days",

        "A live electric wire has fallen on the road",

        "I am very angry because nobody has solved my complaint",

        "The government hospital has no medicines",

        "Thank you for resolving my complaint"

    ]

    for complaint in test_complaints:

        print("\n========================================")
        print("Complaint:")
        print(complaint)

        result = analyze_complaint(complaint)

        print("\nCategory:")
        print(result["category"])

        print("Department:")
        print(result["department"])

        print("Priority:")
        print(result["priority"])

        print("Priority indicators:")
        print(result["priority_indicators"])

        print("Sentiment:")
        print(result["sentiment"])

        print("Sentiment indicators:")
        print(result["sentiment_indicators"])