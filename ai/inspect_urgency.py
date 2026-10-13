import sys
import os
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

balanced_path = "ai/dataset/citizen-grievances_with_complaints_balanced.csv"
df = pd.read_csv(balanced_path)

print("URGENCY EXAMPLES IN BALANCED DATASET:")
for urg in ['Critical', 'High', 'Medium', 'Low']:
    print(f"\n=== URGENCY: {urg} ===")
    samples = df[df['Urgency_Level'] == urg].head(4)
    for idx, r in samples.iterrows():
        cat = r['Category']
        subcat = r.get('Sub Category', '')
        text = str(r['Complaint_Text']).replace('\n', ' ')
        print(f"[{cat} | {subcat}] -> {text[:120]}")

print("\nCHECKING CORRELATION BETWEEN CATEGORY AND URGENCY:")
ct = pd.crosstab(df['Category'], df['Urgency_Level'])
print(ct.head(10))
