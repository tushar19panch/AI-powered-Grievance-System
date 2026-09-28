import joblib


# =========================
# Load trained model
# =========================

vectorizer = joblib.load(
    "models/category_vectorizer.joblib"
)

model = joblib.load(
    "models/category_model.joblib"
)


# =========================
# Test complaints
# =========================

complaints = [
    "There has been no water supply for 5 days",
    "The main road has many potholes",
    "Garbage has not been collected for a week",
    "The street lights are not working",
    "The drain is overflowing near my house",
    "The electricity supply is interrupted frequently",
    "The government hospital has no medicines",
    "The school building is damaged",
    "A stray dog is creating problems in our area",
    "Our village park is not maintained",
    "I cannot pay my property tax online",
    "I want to apply for a welfare scheme",
    "The market area is illegally occupied",
    "The construction project has been stopped",
    "The government website is not working",
    "There is a serious environmental problem in our area"
]


# =========================
# Prediction
# =========================

print("\n========================================")
print("CATEGORY PREDICTIONS")
print("========================================\n")

for complaint in complaints:

    text_tfidf = vectorizer.transform([complaint])

    prediction = model.predict(text_tfidf)[0]

    probabilities = model.predict_proba(text_tfidf)[0]

    confidence = probabilities.max()

    print(f"Complaint : {complaint}")
    print(f"Category  : {prediction}")
    print(f"Confidence: {confidence:.2%}")
    print("----------------------------------------")