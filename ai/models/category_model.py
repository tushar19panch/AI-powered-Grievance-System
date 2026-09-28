# category_model.py

import os
import joblib


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
# Load trained model and vectorizer
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

    text_vector = vectorizer.transform(
        [complaint_text]
    )

    category = model.predict(
        text_vector
    )[0]

    return category