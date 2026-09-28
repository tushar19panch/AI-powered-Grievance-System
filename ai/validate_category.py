import pandas as pd
import joblib

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix
)

# =========================
# 1. Load validation data
# =========================

VALIDATION_PATH = "validation/validation_complaints_170.csv"

df = pd.read_csv(VALIDATION_PATH)

X = df["text"].astype(str)
y_true = df["category"].astype(str)


# =========================
# 2. Load trained model
# =========================

vectorizer = joblib.load(
    "models/category_vectorizer.joblib"
)

model = joblib.load(
    "models/category_model.joblib"
)


# =========================
# 3. Transform validation data
# =========================

X_tfidf = vectorizer.transform(X)


# =========================
# 4. Predictions
# =========================

y_pred = model.predict(X_tfidf)

probabilities = model.predict_proba(X_tfidf)

confidence = probabilities.max(axis=1)


# =========================
# 5. Overall performance
# =========================

accuracy = accuracy_score(y_true, y_pred)

print("\n========================================")
print("UNSEEN VALIDATION RESULTS")
print("========================================")

print(f"\nValidation samples: {len(df)}")
print(f"Accuracy: {accuracy:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y_true,
        y_pred,
        digits=4
    )
)


# =========================
# 6. Confusion Matrix
# =========================

labels = model.classes_

cm = confusion_matrix(
    y_true,
    y_pred,
    labels=labels
)

print("\n========================================")
print("CONFUSION MATRIX")
print("========================================")

print("\nLabels:")
print(list(labels))

print("\nMatrix:")
print(cm)


# =========================
# 7. Confidence analysis
# =========================

print("\n========================================")
print("CONFIDENCE ANALYSIS")
print("========================================")

print(f"Average confidence : {confidence.mean():.2%}")
print(f"Minimum confidence : {confidence.min():.2%}")
print(f"Maximum confidence : {confidence.max():.2%}")

for threshold in [0.30, 0.40, 0.50, 0.60, 0.70]:

    low_confidence = (confidence < threshold).sum()

    print(
        f"Below {threshold:.0%}: "
        f"{low_confidence}/{len(df)}"
    )


# =========================
# 8. Incorrect predictions
# =========================

results = pd.DataFrame({
    "text": X,
    "actual": y_true,
    "predicted": y_pred,
    "confidence": confidence
})

incorrect = results[
    results["actual"] != results["predicted"]
].copy()

print("\n========================================")
print("INCORRECT PREDICTIONS")
print("========================================")

print(f"\nIncorrect: {len(incorrect)}/{len(df)}")

if len(incorrect) > 0:

    for _, row in incorrect.iterrows():

        print("\nComplaint :", row["text"])
        print("Actual    :", row["actual"])
        print("Predicted :", row["predicted"])
        print(f"Confidence: {row['confidence']:.2%}")
        print("----------------------------------------")


# =========================
# 9. Low-confidence predictions
# =========================

low_conf = results[
    results["confidence"] < 0.50
].sort_values("confidence")

print("\n========================================")
print("LOW-CONFIDENCE PREDICTIONS (<50%)")
print("========================================")

print(f"\nLow-confidence cases: {len(low_conf)}/{len(df)}")

for _, row in low_conf.iterrows():

    print("\nComplaint :", row["text"])
    print("Actual    :", row["actual"])
    print("Predicted :", row["predicted"])
    print(f"Confidence: {row['confidence']:.2%}")
    print("----------------------------------------")