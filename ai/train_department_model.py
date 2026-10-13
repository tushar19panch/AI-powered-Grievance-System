"""
train_department_model.py
Trains the Multilingual Department Classification Model for Madhya Pradesh Government.
Uses Word + Char_wb TF-IDF FeatureUnion and LogisticRegression with balanced class weights.
Evaluates per-class Macro F1, per-language performance, and tests against the held-out Golden Benchmark.
"""

import os
import sys
import json
import joblib
import pandas as pd
import numpy as np

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, f1_score, confusion_matrix

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "department_dataset.csv")
GOLDEN_PATH = os.path.join(BASE_DIR, "dataset", "golden_benchmark.json")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

from pipeline.text_normalizer import normalize_complaint

def preprocess_series(texts):
    return [normalize_complaint(t)["clean_text"] for t in texts]

def train_and_evaluate():
    print("=" * 70)
    print("TRAINING MULTILINGUAL DEPARTMENT CLASSIFIER (MADHYA PRADESH)")
    print("=" * 70)

    # 1. Load Dataset
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} records from {DATASET_PATH}")
    print("Pre-processing text with Unicode NFC & Roman normalization...")
    df["clean_text"] = preprocess_series(df["text"].astype(str))

    X = df["clean_text"]
    y = df["department"].astype(str)
    languages = df["language"].astype(str)

    # 2. Stratified Train / Test Split (80 / 20)
    X_train, X_test, y_train, y_test, lang_train, lang_test = train_test_split(
        X, y, languages, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train split: {len(X_train)} samples | Test split: {len(X_test)} samples")

    # 3. Build Word + Char_wb FeatureUnion TF-IDF Vectorizer
    print("Fitting Word (1,2) + Char_wb (2,5) TF-IDF Vectorizer...")
    word_vec = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95,
        sublinear_tf=True
    )
    char_vec = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 5),
        min_df=3,
        max_df=0.95,
        sublinear_tf=True
    )
    vectorizer = FeatureUnion([
        ("word", word_vec),
        ("char", char_vec)
    ])

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    print(f"Feature matrix shape: {X_train_vec.shape}")

    # 4. Train Model
    print("Training LogisticRegression (class_weight='balanced', C=2.5)...")
    model = LogisticRegression(
        C=2.5,
        max_iter=1000,
        class_weight="balanced",
        random_state=42
    )
    model.fit(X_train_vec, y_train)

    # 5. Evaluate on Test Split
    y_pred = model.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(y_test, y_pred, average="macro")
    weighted_f1 = f1_score(y_test, y_pred, average="weighted")

    print("\n" + "=" * 70)
    print("GLOBAL TEST SET EVALUATION")
    print("=" * 70)
    print(f"Overall Accuracy : {acc:.4f} ({acc*100:.2f}%)")
    print(f"Macro F1 Score   : {macro_f1:.4f}")
    print(f"Weighted F1 Score: {weighted_f1:.4f}")
    print("\nPer-Department Classification Report:")
    report_dict = classification_report(y_test, y_pred, output_dict=True)
    print(classification_report(y_test, y_pred, digits=3))

    # 6. Per-Language Breakdown
    print("=" * 70)
    print("EVALUATION BREAKDOWN BY LANGUAGE")
    print("=" * 70)
    test_results_df = pd.DataFrame({
        "actual": y_test.values,
        "predicted": y_pred,
        "language": lang_test.values
    })
    lang_metrics = {}
    for lang, grp in test_results_df.groupby("language"):
        l_acc = accuracy_score(grp["actual"], grp["predicted"])
        l_f1 = f1_score(grp["actual"], grp["predicted"], average="macro")
        lang_metrics[lang] = {"accuracy": float(l_acc), "macro_f1": float(l_f1), "samples": len(grp)}
        print(f"Language: {lang.upper():8s} | Count: {len(grp):4d} | Accuracy: {l_acc:.4f} | Macro F1: {l_f1:.4f}")

    # 7. Evaluate on Held-Out Golden Benchmark (Unseen during training)
    print("\n" + "=" * 70)
    print("HELD-OUT GOLDEN BENCHMARK EVALUATION (7 CANONICAL COMPLAINTS)")
    print("=" * 70)
    golden_results = []
    if os.path.exists(GOLDEN_PATH):
        with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
            golden_list = json.load(f)

        golden_correct = 0
        golden_total = 0
        for item in golden_list:
            expected_dept = item["department"]
            for lang_key, text_val in [("en", item["text_en"]), ("hi", item["text_hi"]), ("hinglish", item["text_hinglish"])]:
                clean = normalize_complaint(text_val)["clean_text"]
                vec = vectorizer.transform([clean])
                probs = model.predict_proba(vec)[0]
                pred_idx = np.argmax(probs)
                pred_dept = model.classes_[pred_idx]
                conf = float(probs[pred_idx])

                is_correct = (pred_dept == expected_dept)
                golden_total += 1
                if is_correct:
                    golden_correct += 1

                golden_results.append({
                    "language": lang_key,
                    "text": text_val,
                    "expected": expected_dept,
                    "predicted": pred_dept,
                    "confidence": conf,
                    "correct": is_correct
                })
                status = "PASS" if is_correct else "FAIL"
                print(f"[{status}] [{lang_key:8s}] Conf: {conf:.2f} | Exp: {expected_dept[:25]:25s} | Pred: {pred_dept[:25]:25s} | Text: {text_val[:45]}")

        print(f"\nGolden Benchmark Accuracy: {golden_correct}/{golden_total} ({golden_correct/golden_total*100:.1f}%)")

    # 8. Save Models and Metrics
    vec_path = os.path.join(MODELS_DIR, "department_vectorizer.joblib")
    model_path = os.path.join(MODELS_DIR, "department_model.joblib")
    metrics_path = os.path.join(MODELS_DIR, "department_metrics.json")

    joblib.dump(vectorizer, vec_path)
    joblib.dump(model, model_path)

    metrics = {
        "accuracy": float(acc),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
        "by_language": lang_metrics,
        "classification_report": report_dict,
        "golden_benchmark": golden_results
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print("SAVED TRAINED DEPARTMENT ARTIFACTS")
    print("=" * 70)
    print(f"- Vectorizer : {vec_path}")
    print(f"- Model      : {model_path}")
    print(f"- Metrics    : {metrics_path}")

if __name__ == "__main__":
    train_and_evaluate()
