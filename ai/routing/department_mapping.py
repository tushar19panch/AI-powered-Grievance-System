# department_mapping.py

CATEGORY_TO_DEPARTMENT = {

    "Water Supply":
        "Water Supply Department",

    "Roads & Transportation":
        "Roads & Transportation Department",

    "Drainage":
        "Drainage Department",

    "Waste Management":
        "Waste Management Department",

    "Sanitation":
        "Sanitation Department",

    "Electricity":
        "Electricity Department",

    "Healthcare":
        "Health Department",

    "Education":
        "Education Department",

    "Animal & Veterinary":
        "Animal & Veterinary Department",

    "Environment":
        "Environment Department",

    "Parks & Public Spaces":
        "Parks & Public Spaces Department",

    "Property & Revenue":
        "Property & Revenue Department",

    "Welfare Services":
        "Welfare Services Department",

    "Markets & Commercial":
        "Markets & Commercial Department",

    "Town Planning & Development":
        "Town Planning & Development Department",

    "Digital/IT Services":
        "Digital/IT Services Department",

    "Other":
        "General Grievance / Administration"
}


def get_department(category):
    """
    Convert predicted complaint category
    into the responsible department.
    """

    return CATEGORY_TO_DEPARTMENT.get(
        category,
        "General Grievance / Administration"
    )