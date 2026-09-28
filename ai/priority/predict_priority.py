# predict_priority.py

from urgency_rules import calculate_urgency


def predict_priority(complaint_text):
    """
    Predict complaint priority.

    Returns a dictionary containing:
    - priority
    - matched urgency indicators
    """

    priority, matched_keywords = calculate_urgency(
        complaint_text
    )

    return {
        "priority": priority,
        "matched_keywords": matched_keywords
    }


if __name__ == "__main__":

    test_complaints = [

        "There has been no water supply for five days",

        "The main road has many potholes",

        "A live electric wire has fallen on the road",

        "There is a serious fire near the market",

        "The government hospital has no medicines",

        "Garbage has not been collected for a week",

        "The park needs maintenance"
    ]

    for complaint in test_complaints:

        result = predict_priority(complaint)

        print("\nComplaint:")
        print(complaint)

        print("Priority:")
        print(result["priority"])

        print("Matched indicators:")
        print(result["matched_keywords"])