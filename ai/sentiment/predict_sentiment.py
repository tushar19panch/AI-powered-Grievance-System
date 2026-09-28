# predict_sentiment.py

from sentiment_rules import calculate_sentiment


def predict_sentiment(complaint_text):
    """
    Predict sentiment of a complaint.

    Returns:
        sentiment
        matched_keywords
    """

    sentiment, matched_keywords = calculate_sentiment(
        complaint_text
    )

    return {
        "sentiment": sentiment,
        "matched_keywords": matched_keywords
    }


if __name__ == "__main__":

    test_complaints = [

        "I am very angry because nobody has solved my complaint",

        "There has been no water supply for five days",

        "The road is damaged and the situation is very serious",

        "Thank you for resolving my complaint",

        "The park needs maintenance",

        "Please repair the street light",

        "I appreciate the quick response from the department"
    ]

    for complaint in test_complaints:

        result = predict_sentiment(complaint)

        print("\nComplaint:")
        print(complaint)

        print("Sentiment:")
        print(result["sentiment"])

        print("Matched keywords:")
        print(result["matched_keywords"])