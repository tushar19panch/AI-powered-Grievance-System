import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report


# =========================
# 1. Load dataset
# =========================

DATA_PATH = "dataset/grievance_dataset.csv"

df = pd.read_csv(DATA_PATH)

X = df["text"].astype(str)
y = df["category"].astype(str)


# =========================
# 2. Train/Test Split
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# =========================
# 3. TF-IDF
# =========================

vectorizer = TfidfVectorizer(
    lowercase=True,
    ngram_range=(1, 2),
    min_df=2,
    max_df=0.95,
    sublinear_tf=True
)

X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)


# =========================
# 4. Train Model
# =========================

model = LogisticRegression(
    max_iter=1000,
    class_weight="balanced",
    random_state=42
)

model.fit(X_train_tfidf, y_train)


# =========================
# 5. Evaluate
# =========================

y_pred = model.predict(X_test_tfidf)

accuracy = accuracy_score(y_test, y_pred)

print("\n==============================")
print("CATEGORY CLASSIFIER RESULTS")
print("==============================")

print(f"\nAccuracy: {accuracy:.4f}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred))


# =========================
# 6. Save Model
# =========================

joblib.dump(
    vectorizer,
    "models/category_vectorizer.joblib"
)

joblib.dump(
    model,
    "models/category_model.joblib"
)

print("\n==============================")
print("MODEL SAVED")
print("==============================")
print("ai/models/category_vectorizer.joblib")
print("ai/models/category_model.joblib")