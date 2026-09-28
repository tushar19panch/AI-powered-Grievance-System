# route_complaint.py

import os
import joblib

from department_mapping import get_department


# --------------------------------------------------
# Model paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "category_model.joblib"
)

VECTORIZER_PATH = os.path.join(
    BASE_DIR,
    "models",
    "category_vectorizer.joblib"
)


# --------------------------------------------------
# Load trained category model
# --------------------------------------------------

vectorizer = joblib.load(VECTORIZER_PATH)
model = joblib.load(MODEL_PATH)


# --------------------------------------------------
# Category prediction
# --------------------------------------------------

def predict_category(complaint_text):

    if not complaint_text or not complaint_text.strip():
        return None

    complaint_text = complaint_text.strip()

    # Convert complaint text into TF-IDF features
    text_vector = vectorizer.transform([complaint_text])

    # Predict category
    category = model.predict(text_vector)[0]

    return category


# --------------------------------------------------
# Complete routing
# --------------------------------------------------

def route_complaint(complaint_text):

    category = predict_category(complaint_text)

    if category is None:
        return {
            "category": None,
            "department": None
        }

    department = get_department(category)

    return {
        "category": category,
        "department": department
    }


# --------------------------------------------------
# Test
# --------------------------------------------------

if __name__ == "__main__":

    complaints = [
        "There has been no water supply for five days",
        "The main road has many potholes",
        "Garbage has not been collected for a week",
        "The government hospital has no medicines",
        "The government website is not working"
    ]

    for complaint in complaints:

        result = route_complaint(complaint)

        print("\nComplaint:")
        print(complaint)

        print("Category:")
        print(result["category"])

        print("Department:")
        print(result["department"])