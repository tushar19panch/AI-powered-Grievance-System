"""
dataset_generator.py
Prepares authentic, balanced, multilingual datasets for Madhya Pradesh Grievance Management.

Generates 3 datasets:
1. department_dataset.csv (text, department, language)
2. priority_dataset.csv   (text, priority, language)
3. multilingual_dataset.csv (text, language, department, priority)
Also preserves held-out golden test complaints (unseen during training).
"""

import os
import re
import json
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

# ==============================================================================
# 1. 15 MADHYA PRADESH DEPARTMENTS
# ==============================================================================
DEPARTMENTS = [
    "Public Health Engineering / Water Supply",
    "Public Works / Roads",
    "Panchayat & Rural Development",
    "Urban Development & Municipal Services",
    "Drainage & Sewerage",
    "Electricity / Energy",
    "Public Health & Family Welfare",
    "School Education",
    "Revenue & Land Administration",
    "Police / Home",
    "Women & Child Development",
    "Social Justice & Welfare",
    "Agriculture & Farmers' Welfare",
    "Animal Husbandry & Veterinary",
    "IT & Digital Government Services"
]

FALLBACK_DEPARTMENT = "General Administration / Manual Review"

# Category-to-Department mapping for existing 17 categories
CATEGORY_TO_DEPT_MAP = {
    "Water Supply": "Public Health Engineering / Water Supply",
    "Roads & Transportation": "Public Works / Roads",
    "Drainage": "Drainage & Sewerage",
    "Electricity": "Electricity / Energy",
    "Healthcare": "Public Health & Family Welfare",
    "Education": "School Education",
    "Property & Revenue": "Revenue & Land Administration",
    "Animal & Veterinary": "Animal Husbandry & Veterinary",
    "Digital/IT Services": "IT & Digital Government Services",
    "Welfare Services": "Social Justice & Welfare",
    "Waste Management": "Urban Development & Municipal Services",
    "Sanitation": "Urban Development & Municipal Services",
    "Parks & Public Spaces": "Urban Development & Municipal Services",
    "Town Planning & Development": "Urban Development & Municipal Services",
    "Markets & Commercial": "Urban Development & Municipal Services",
    "Environment": "Urban Development & Municipal Services"
}

# The 7 canonical real project complaints (Must be strictly held out as unseen test set)
GOLDEN_COMPLAINTS = [
    {
        "text_en": "There has been no water supply for five days",
        "text_hi": "पाँच दिनों से पानी की सप्लाई नहीं आ रही है।",
        "text_hinglish": "5 din se paani nahi aa raha hai",
        "department": "Public Health Engineering / Water Supply",
        "priority": "HIGH"
    },
    {
        "text_en": "The main road has many potholes",
        "text_hi": "मुख्य सड़क पर बहुत सारे गड्ढे हैं",
        "text_hinglish": "Main road par bahut saare gaddhe hain",
        "department": "Public Works / Roads",
        "priority": "MEDIUM"
    },
    {
        "text_en": "A live electric wire has fallen on the road",
        "text_hi": "सड़क पर बिजली का चालू तार गिर गया है, जानलेवा करंट का खतरा है",
        "text_hinglish": "Sadak par bijli ka live taar gir gaya hai current lag sakta hai",
        "department": "Electricity / Energy",
        "priority": "CRITICAL"
    },
    {
        "text_en": "There is a serious fire near the market",
        "text_hi": "बाजार के पास भीषण आग लग गई है, तुरंत दमकल भेजें",
        "text_hinglish": "Market ke paas aag lag gayi hai emergency hai",
        "department": "Urban Development & Municipal Services",
        "priority": "CRITICAL"
    },
    {
        "text_en": "The government hospital has no medicines",
        "text_hi": "सरकारी अस्पताल में जरूरी दवाइयां उपलब्ध नहीं हैं",
        "text_hinglish": "Sarkari hospital me dawai aur medicines nahi mil rahi hain",
        "department": "Public Health & Family Welfare",
        "priority": "HIGH"
    },
    {
        "text_en": "Garbage has not been collected for a week",
        "text_hi": "एक हफ्ते से इलाके का कचरा नहीं उठाया गया है",
        "text_hinglish": "Ek hafte se kachra nahi uthaya gaya hai",
        "department": "Urban Development & Municipal Services",
        "priority": "MEDIUM"
    },
    {
        "text_en": "The park needs maintenance",
        "text_hi": "पार्क में घास की कटाई और बेंच की मरम्मत की जरूरत है",
        "text_hinglish": "Park me maintenance aur bench repair ki zarurat hai",
        "department": "Urban Development & Municipal Services",
        "priority": "LOW"
    }
]

# Save Golden Held-out complaints
def save_golden_benchmark():
    path = os.path.join(DATASET_DIR, "golden_benchmark.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(GOLDEN_COMPLAINTS, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(GOLDEN_COMPLAINTS)} golden complaints to {path}")

def is_golden_complaint(text):
    text_clean = str(text).lower().strip()
    for g in GOLDEN_COMPLAINTS:
        if text_clean == g["text_en"].lower().strip():
            return True
        if text_clean == g["text_hi"].lower().strip():
            return True
        if text_clean == g["text_hinglish"].lower().strip():
            return True
    return False

if __name__ == "__main__":
    save_golden_benchmark()
