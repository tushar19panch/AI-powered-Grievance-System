"""
department_mapping.py
Department taxonomy and category mapping for Madhya Pradesh Government Grievance System.
"""

MADHYA_PRADESH_DEPARTMENTS = [
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

CATEGORY_TO_DEPARTMENT = {
    "Water Supply": "Public Health Engineering / Water Supply",
    "Drinking Water": "Public Health Engineering / Water Supply",
    "Roads & Transportation": "Public Works / Roads",
    "Roads": "Public Works / Roads",
    "Panchayat & Rural Development": "Panchayat & Rural Development",
    "Rural Development": "Panchayat & Rural Development",
    "Drainage": "Drainage & Sewerage",
    "Drainage & Sewerage": "Drainage & Sewerage",
    "Electricity": "Electricity / Energy",
    "Power & Energy": "Electricity / Energy",
    "Healthcare": "Public Health & Family Welfare",
    "Public Health": "Public Health & Family Welfare",
    "Education": "School Education",
    "School Education": "School Education",
    "Property & Revenue": "Revenue & Land Administration",
    "Land Records": "Revenue & Land Administration",
    "Police": "Police / Home",
    "Law & Order": "Police / Home",
    "Women & Child Development": "Women & Child Development",
    "Social Welfare": "Social Justice & Welfare",
    "Welfare Services": "Social Justice & Welfare",
    "Agriculture": "Agriculture & Farmers' Welfare",
    "Farmers Welfare": "Agriculture & Farmers' Welfare",
    "Animal & Veterinary": "Animal Husbandry & Veterinary",
    "Digital/IT Services": "IT & Digital Government Services",
    "IT Services": "IT & Digital Government Services",
    "Waste Management": "Urban Development & Municipal Services",
    "Sanitation": "Urban Development & Municipal Services",
    "Parks & Public Spaces": "Urban Development & Municipal Services",
    "Town Planning & Development": "Urban Development & Municipal Services",
    "Markets & Commercial": "Urban Development & Municipal Services",
    "Fire & Emergency Services": "Urban Development & Municipal Services",
    "Environment": "Urban Development & Municipal Services",
    "Other": FALLBACK_DEPARTMENT
}

def get_department(category: str, text: str = "") -> str:
    """
    Returns responsible MP Government department for a category or text.
    """
    if category in CATEGORY_TO_DEPARTMENT:
        return CATEGORY_TO_DEPARTMENT[category]
    if category in MADHYA_PRADESH_DEPARTMENTS:
        return category
    return FALLBACK_DEPARTMENT