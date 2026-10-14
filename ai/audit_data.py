import sys
import os
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

dataset_path = "ai/dataset/grievance_dataset.csv"
df = pd.read_csv(dataset_path)

print("=" * 60)
print(f"AUDIT OF {dataset_path}")
print("=" * 60)
print(f"Total Rows: {len(df)}")
print(f"Null values:\n{df.isnull().sum()}")

# Duplicates
exact_dupes = df.duplicated().sum()
text_dupes = df.duplicated(subset=['text']).sum()
print(f"\nExact row duplicates: {exact_dupes}")
print(f"Text duplicates (ignoring category): {text_dupes}")

# Conflicting labels
dupe_texts = df[df.duplicated(subset=['text'], keep=False)]
conflicts = dupe_texts.groupby('text')['category'].nunique()
conflicting_texts = conflicts[conflicts > 1]
print(f"Texts with conflicting categories: {len(conflicting_texts)}")
if len(conflicting_texts) > 0:
    for t in conflicting_texts.index[:5]:
        cats = df[df['text'] == t]['category'].unique()
        print(f"  - '{t[:60]}...' -> {cats}")

print("\nCategory Distribution:")
vc = df['category'].value_counts()
for cat, count in vc.items():
    print(f"  {cat:30s}: {count:5d} ({count/len(df)*100:.1f}%)")

# Check balanced dataset as well
balanced_path = "ai/dataset/citizen-grievances_with_complaints_balanced.csv"
if os.path.exists(balanced_path):
    print("\n" + "=" * 60)
    print(f"AUDIT OF {balanced_path}")
    print("=" * 60)
    df_b = pd.read_csv(balanced_path)
    print(f"Total Rows: {len(df_b)}")
    print(f"Columns: {df_b.columns.tolist()}")
    if 'Urgency_Level' in df_b.columns:
        print("\nUrgency_Level counts:")
        print(df_b['Urgency_Level'].value_counts(dropna=False))
