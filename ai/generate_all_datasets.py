"""
generate_all_datasets.py
Generates the comprehensive, audited, verified datasets for Madhya Pradesh Grievance Management:
1. department_dataset.csv (text, department, language)
2. priority_dataset.csv   (text, priority, language)
3. multilingual_dataset.csv (text, language, department, priority)
Also exports golden_benchmark.json for held-out evaluation.
"""

import os
import re
import json
import random
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

# 15 MP Departments
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

# Mapping from original 17 categories in grievance_dataset.csv
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

# 7 Canonical Project Complaints strictly held out from training
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

def is_golden(text):
    t = str(text).strip().lower()
    for g in GOLDEN_COMPLAINTS:
        if t == g["text_en"].strip().lower() or t == g["text_hi"].strip().lower() or t == g["text_hinglish"].strip().lower():
            return True
    return False

# Priority determination logic for historical English dataset
def infer_priority_from_text(text, dept=""):
    t = str(text).lower()
    
    # Critical indicators (Safety / Life hazard)
    critical_terms = [
        "life threatening", "danger to life", "electrocution", "live wire", "exposed wire",
        "fire", "blast", "explosion", "building collapse", "wall collapse", "poisonous",
        "toxic", "gas leak", "people trapped", "snake bite", "open manhole danger"
    ]
    if any(k in t for k in critical_terms):
        return "CRITICAL"
        
    # High indicators (Significant disruption / Multi-day impact / health hazard)
    high_terms = [
        "several days", "many days", "for 5 days", "five days", "for a week", "weeks",
        "completely stopped", "no water for", "contaminated drinking water", "no medicines",
        "doctor unavailable", "ambulance unavailable", "flooding", "sewage entering",
        "transformer burnt", "total blackout", "blackout", "epidemic", "outbreak",
        "urgent", "emergency", "severe", "critical emergency"
    ]
    if any(k in t for k in high_terms):
        return "HIGH"
        
    # Low indicators (Minor / Cosmetic / Suggestions)
    low_terms = [
        "minor", "request to paint", "whitewash", "park bench", "garden", "suggestion",
        "tree trimming", "signboard", "name board", "routine", "inquiry", "speed breaker request",
        "dustbin installation", "general feedback", "grass cutting", "maintenance request"
    ]
    if any(k in t for k in low_terms):
        return "LOW"
        
    # Default functional issues are MEDIUM
    return "MEDIUM"

print("Compiling curated multilingual domain data for all 15 MP departments...")

# Domain Archetypes for each of the 15 departments across Hindi, Hinglish, and English
# with appropriate realistic priorities
MULTILINGUAL_SEEDS = [
    # 1. Public Health Engineering / Water Supply
    {
        "dept": "Public Health Engineering / Water Supply",
        "examples": [
            ("The main water supply pipe has burst near the market, clean water is flooding the road.", "en", "MEDIUM"),
            ("Water supply has been completely halted for the past four days in entire ward 6.", "en", "HIGH"),
            ("Drinking water supplied through taps is yellowish and smells of sewage, causing illness.", "en", "HIGH"),
            ("Hand pump in our mohalla has a broken handle, please send mechanic for repair.", "en", "MEDIUM"),
            ("Request to install a new public tap or hand pump near the community hall.", "en", "LOW"),
            ("Main drinking water pipeline contaminated with chemical waste, people falling sick.", "en", "CRITICAL"),
            ("Nal Jal scheme tap connection has very low pressure, water barely drips.", "en", "MEDIUM"),
            ("Water tanker did not arrive in our drought-hit village despite prior schedule.", "en", "HIGH"),
            ("ग्राम पंचायत में मुख्य हैंडपंप पिछले चार दिनों से खराब पड़ा है, लोग पानी के लिए तरस रहे हैं।", "hi", "HIGH"),
            ("वार्ड 4 में पीने के पानी की पाइपलाइन फूट गई है और सड़क पर जलभराव हो गया है।", "hi", "MEDIUM"),
            ("नल से बदबूदार और पीला गंदा पानी आ रहा है, जिसे पीने से बच्चे बीमार पड़ रहे हैं।", "hi", "HIGH"),
            ("सामुदायिक केंद्र के पास सार्वजनिक नल की टोंटी टूट गई है, नई टोंटी लगवाई जाए।", "hi", "LOW"),
            ("बोरवेल की मोटर जल गई है और पूरी बस्ती में तीन दिनों से पीने का पानी नहीं है।", "hi", "HIGH"),
            ("पेयजल पाइपलाइन में सीवेज का गंदा पानी मिल रहा है, महामारी फैलने का जानलेवा खतरा है।", "hi", "CRITICAL"),
            ("नल जल योजना का काम अधूरा पड़ा है, पाइप बिछाकर छोड़ दिया गया है।", "hi", "MEDIUM"),
            ("Ward 4 me handpump kharab hai 4 din se paani nahi aa raha log pareshan hain.", "hinglish", "HIGH"),
            ("Main drinking water pipeline toot gayi hai sadak par paani beh raha hai.", "hinglish", "MEDIUM"),
            ("Nal se ganda mitti wala paani aa raha hai bimaari failne ka darr hai.", "hinglish", "HIGH"),
            ("Pani ka pressure bahut slow hai tap me paani nahi chadh raha.", "hinglish", "MEDIUM"),
            ("Public handpump ke paas platform ki safai aur painting karwane ki request hai.", "hinglish", "LOW"),
            ("Peepe ka paani me zehreela chemical mix ho gaya hai emergency hai.", "hinglish", "CRITICAL"),
            ("Gaon me paani ka tanker time par nahi aa raha hai.", "hinglish", "HIGH")
        ]
    },
    # 2. Public Works / Roads
    {
        "dept": "Public Works / Roads",
        "examples": [
            ("Main road connecting to district headquarters has massive potholes causing frequent accidents.", "en", "MEDIUM"),
            ("The road culvert has collapsed after heavy rain, cutting off vehicular movement completely.", "en", "HIGH"),
            ("Freshly constructed asphalt road washed away within two weeks, poor construction quality.", "en", "MEDIUM"),
            ("Road repair work has been abandoned midway by the contractor, gravel spread everywhere.", "en", "MEDIUM"),
            ("Request to put up warning signboards and speed breakers near the blind turn.", "en", "LOW"),
            ("Major bridge cracked severely and swinging dangerously, imminent danger of collapse with traffic.", "en", "CRITICAL"),
            ("Street pavement stones are loose and need re-aligning.", "en", "LOW"),
            ("मुख्य सड़क पर इतने बड़े गड्ढे हैं कि आए दिन दोपहिया वाहन चालक गिरकर घायल हो रहे हैं।", "hi", "MEDIUM"),
            ("भारी बारिश के बाद गांव की मुख्य पुलिया ढह गई है, आवागमन पूरी तरह बंद हो चुका है।", "hi", "HIGH"),
            ("डामरीकरण का काम अधूरा छोड़ दिया गया है, गिट्टी बिखरी होने से वाहन फिसल रहे हैं।", "hi", "MEDIUM"),
            ("अंधे मोड़ पर दुर्घटनाओं को रोकने के लिए गति अवरोधक (स्पीड ब्रेकर) और साइनबोर्ड लगाए जाएं।", "hi", "LOW"),
            ("मुख्य मार्ग का पुल बीच से धंस गया है और कभी भी जानलेवा हादसा हो सकता है, तुरंत बंद करें।", "hi", "CRITICAL"),
            ("सड़क किनारे फुटपाथ के पेवर ब्लॉक उखड़ गए हैं, मरम्मत कराई जाए।", "hi", "LOW"),
            ("Main road par bade bade gaddhe ho gaye hain roz accident ho rahe hain.", "hinglish", "MEDIUM"),
            ("Barish ke baad raste ki puliya toot gayi hai aana jana band ho gaya.", "hinglish", "HIGH"),
            ("Sadak ka thekedar kaam aadha chhod kar bhaag gaya hai dhoop me gitty ud rahi hai.", "hinglish", "MEDIUM"),
            ("School ke samne speed breaker lagwaya jaye taaki accident na ho.", "hinglish", "LOW"),
            ("Bridge me badi darar aa gayi hai girne ka khatra hai gaadiyan band karwayein.", "hinglish", "CRITICAL"),
            ("Road side footpath toot gaya hai repair ki zarurat hai.", "hinglish", "LOW")
        ]
    },
    # 3. Panchayat & Rural Development
    {
        "dept": "Panchayat & Rural Development",
        "examples": [
            ("Panchayat building is kept locked on working days, Secretary is never reachable.", "en", "MEDIUM"),
            ("MGNREGA wage payments pending for over three months for 45 registered job card holders.", "en", "HIGH"),
            ("Gram Panchayat sanitation work not being executed, village inner lanes full of dirt.", "en", "MEDIUM"),
            ("Funds sanctioned for village concrete road but no work started on site.", "en", "MEDIUM"),
            ("Request to organize regular Gram Sabha meetings to discuss village development agenda.", "en", "LOW"),
            ("Panchayat community hall ceiling plaster collapsing on villagers during gathering.", "en", "CRITICAL"),
            ("Old village well fencing needs routine repair and painting.", "en", "LOW"),
            ("ग्राम पंचायत कार्यालय में हमेशा ताला लटका रहता है, पंचायत सचिव कभी नहीं मिलते।", "hi", "MEDIUM"),
            ("मनरेगा मजदूरों का तीन माह से मजदूरी भुगतान अटका हुआ है, मजदूर परेशान हैं।", "hi", "HIGH"),
            ("गांव की गलियों में पंचायत द्वारा सफाई नहीं कराई जा रही, नालियों का गंदा पानी रास्ते पर है।", "hi", "MEDIUM"),
            ("ग्राम पंचायत में सीसी रोड का बजट पास होने के बाद भी धरातल पर काम शुरू नहीं हुआ।", "hi", "MEDIUM"),
            ("ग्राम सभा की बैठक नियमानुसार आयोजित करने का अनुरोध है ताकि विकास कार्य तय हो सकें।", "hi", "LOW"),
            ("पंचायत भवन की छत का प्लास्टर अचानक नीचे गिर गया, लोग बाल-बाल बचे हैं।", "hi", "CRITICAL"),
            ("Panchayat sachiv ji gaon me aate hi nahi hain, zaroori dastawej par sign nahi ho rahe.", "hinglish", "MEDIUM"),
            ("Nrega mazdooron ka 3 mahine se paisa nahi aaya hai khate me.", "hinglish", "HIGH"),
            ("Gram panchayat me safai karamchari nahi aate gaon ki galiyon me gandagi hai.", "hinglish", "MEDIUM"),
            ("Village me cemented sadak ka paisa nikal gaya par kaam nahi hua.", "hinglish", "MEDIUM"),
            ("Panchayat bhavan ke gate par naya name board lagwane ki request hai.", "hinglish", "LOW"),
            ("Panchayat bhawan ki deewar dhasne wali hai jaan ka khatra hai.", "hinglish", "CRITICAL")
        ]
    },
    # 4. Urban Development & Municipal Services
    {
        "dept": "Urban Development & Municipal Services",
        "examples": [
            ("Streetlights in lane 3 not functioning for over two weeks, area pitch dark at night.", "en", "MEDIUM"),
            ("Municipal garbage collection vehicle has not visited our locality for the past five days.", "en", "MEDIUM"),
            ("Open waste dump near residential apartments attracting stray cows and severe foul stench.", "en", "MEDIUM"),
            ("Public park playground equipment and benches broken, hazardous for children.", "en", "LOW"),
            ("Illegal encroachments and kiosks erected on municipal walkway blocking pedestrian access.", "en", "MEDIUM"),
            ("Massive fire at municipal dumping yard spreading toxic suffocating smoke across neighborhood.", "en", "CRITICAL"),
            ("Request to install separate wet and dry waste dustbins in the public garden.", "en", "LOW"),
            ("कॉलोनी की स्ट्रीट लाइट 15 दिनों से बंद पड़ी है, रात के समय महिलाओं की सुरक्षा का खतरा है।", "hi", "MEDIUM"),
            ("नगर पालिका की कचरा गाड़ी पिछले एक सप्ताह से नहीं आई है, चारों तरफ कचरा सड़ रहा है।", "hi", "MEDIUM"),
            ("रिहायशी बस्ती के पास खुले में कचरा फेंका जा रहा है जिससे भयंकर दुर्गंध और मक्खियां फैल रही हैं।", "hi", "MEDIUM"),
            ("सार्वजनिक पार्क में बच्चों के झूले और बेंच टूटे पड़े हैं, नए लगवाए जाएं।", "hi", "LOW"),
            ("नगर निगम के डंपिंग ग्राउंड में भयंकर आग लग गई है, जहरीले धुएं से लोगों का दम घुट रहा है।", "hi", "CRITICAL"),
            ("फुटपाथ पर अवैध रूप से दुकानें लगाकर रास्ता रोक लिया गया है, अतिक्रमण हटाया जाए।", "hi", "MEDIUM"),
            ("Street light kharab hai andhera rehta hai raat ko chori ka darr hai.", "hinglish", "MEDIUM"),
            ("Nagar nigam ki kachra gaadi 5 din se nahi aayi hai ghar ke aage kachra pada hai.", "hinglish", "MEDIUM"),
            ("Colony ke garden me benches tooti hain aur grass badi ho gayi hai safai karwaye.", "hinglish", "LOW"),
            ("Dumping yard me bhishan aag lag gayi hai charo taraf dhuwan fail gaya hai.", "hinglish", "CRITICAL"),
            ("Main road par thele walo ne kabza kar rakha hai traffic jam hota hai.", "hinglish", "MEDIUM"),
            ("Park me dustbin lagwane ki request hai.", "hinglish", "LOW")
        ]
    },
    # 5. Drainage & Sewerage
    {
        "dept": "Drainage & Sewerage",
        "examples": [
            ("Main stormwater drain clogged with silt and plastic, dirty water overflowing on street.", "en", "MEDIUM"),
            ("Underground sewer choked, toxic sewage entering inside residential living rooms.", "en", "HIGH"),
            ("Open drainage pit without concrete cover on main pathway, severe accident trap for pedestrians.", "en", "HIGH"),
            ("Gutter overflow causing unbearable stench and mosquito breeding in the mohalla.", "en", "MEDIUM"),
            ("Deep uncovered sewage manhole in middle of unlit road, child fell into it, emergency rescue needed.", "en", "CRITICAL"),
            ("Request to clean silt from roadside open drains before monsoon starts.", "en", "LOW"),
            ("मुख्य नाला प्लास्टिक और कचरे से चोक हो गया है, गंदा बदबूदार पानी घरों के सामने भर रहा है।", "hi", "MEDIUM"),
            ("सीवर लाइन जाम होने से सीवेज का गंदा पानी घरों के अंदर घुस रहा है, जीना दूभर हो गया है।", "hi", "HIGH"),
            ("नाली का ढक्कन टूटा हुआ है और खुला गड्ढा जानलेवा बना हुआ है, तुरंत ढक्कन लगवाया जाए।", "hi", "HIGH"),
            ("अंधेरी सड़क पर खुला गहरा मैनहोल पड़ा है जिसमें बच्चा गिर गया है, तुरंत रेस्क्यू टीम भेजें।", "hi", "CRITICAL"),
            ("बारिश से पहले नाले की तलछट सफाई कराने का अनुरोध है।", "hi", "LOW"),
            ("Naali jaam hai ganda paani sadak par beh raha hai aur badboo aa rahi hai.", "hinglish", "MEDIUM"),
            ("Sewer block hone se ganda paani gharo ke andar ghus raha hai emergency action chahiye.", "hinglish", "HIGH"),
            ("Open manhole ka cover missing hai kabhi bhi bada haadsa ho sakta hai.", "hinglish", "HIGH"),
            ("Road par khula gehra manhole hai kisi ki jaan ja sakti hai emergency rescue bhejo.", "hinglish", "CRITICAL"),
            ("Barish se pehle drain ki safai karwane ki request hai.", "hinglish", "LOW")
        ]
    },
    # 6. Electricity / Energy
    {
        "dept": "Electricity / Energy",
        "examples": [
            ("Distribution transformer caught fire and burnt out, entire village in complete darkness for 3 days.", "en", "HIGH"),
            ("Live 11kV high-tension wire snapped and lying on school ground sparking continuously.", "en", "CRITICAL"),
            ("Electric pole tilted dangerously over residential rooftop, about to collapse.", "en", "HIGH"),
            ("Severe voltage fluctuation causing burning of household motors, TV and refrigerators.", "en", "MEDIUM"),
            ("Unscheduled power outages lasting 8 to 10 hours daily without prior notice from electricity board.", "en", "MEDIUM"),
            ("Electricity meter display is dim, request for replacement.", "en", "LOW"),
            ("गांव का ट्रांसफार्मर फुंक गया है, पिछले तीन दिनों से पूरे गांव में बिजली ठप पड़ी है।", "hi", "HIGH"),
            ("11000 वोल्ट का चालू बिजली का तार टूटकर सड़क पर गिर गया है और चिंगारियां निकल रही हैं, जान का खतरा है।", "hi", "CRITICAL"),
            ("बिजली का खंभा झुककर मकान पर टिक गया है, कभी भी गिरकर जानलेवा हादसा हो सकता है।", "hi", "HIGH"),
            ("बार-बार वोल्टेज कम-ज्यादा होने से घर के फ्रिज और पंखे जल रहे हैं, स्टेबलाइजर भी काम नहीं कर रहा।", "hi", "MEDIUM"),
            ("प्रतिदिन 8-10 घंटे की अघोषित बिजली कटौती हो रही है जिससे बच्चों की पढ़ाई प्रभावित हो रही है।", "hi", "MEDIUM"),
            ("बिजली मीटर का डिस्प्ले खराब है, मीटर बदलवाने की अर्जी है।", "hi", "LOW"),
            ("Transformer jal gaya hai 3 din se pura gaon andhere me hai jaldi theek karo.", "hinglish", "HIGH"),
            ("Sadak par bijli ka live taar gir gaya hai current lag raha hai turant line kaato.", "hinglish", "CRITICAL"),
            ("Bijli ka pole tutkar ghar par jhuk gaya hai dangerous hai.", "hinglish", "HIGH"),
            ("Voltage fluctuation bahut zyada hai appliances kharab ho rahe hain.", "hinglish", "MEDIUM"),
            ("Din me 8 ghante power cut ho raha hai bina kisi notice ke.", "hinglish", "MEDIUM"),
            ("Meter ka glass crack ho gaya hai check karwaye.", "hinglish", "LOW")
        ]
    },
    # 7. Public Health & Family Welfare
    {
        "dept": "Public Health & Family Welfare",
        "examples": [
            ("Community Health Centre lacks essential life-saving medicines and snake antivenom injection.", "en", "HIGH"),
            ("Duty doctor absent from Primary Health Centre during emergency hours, hospital found locked.", "en", "HIGH"),
            ("Govt hospital 108 ambulance refused to respond to pregnant woman in labor, no alternative.", "en", "HIGH"),
            ("Dengue and malaria cases rising rapidly in locality, health department must conduct fogging immediately.", "en", "MEDIUM"),
            ("Hospital patient ward filthy with blood-stained sheets and overflowing bio-waste bins.", "en", "MEDIUM"),
            ("Toxic gas leakage from hospital oxygen plant, patients suffocating, critical emergency evacuation needed.", "en", "CRITICAL"),
            ("Request to conduct a general health checkup and eye camp in rural panchayat.", "en", "LOW"),
            ("सामुदायिक स्वास्थ्य केंद्र में जरूरी दवाइयां और एंटी-रेबीज इंजेक्शन उपलब्ध नहीं हैं।", "hi", "HIGH"),
            ("प्राथमिक स्वास्थ्य केंद्र पर ड्यूटी डॉक्टर नदारद हैं और अस्पताल पर ताला लगा हुआ है।", "hi", "HIGH"),
            ("प्रसव पीड़ा से पीड़ित महिला के लिए 108 एम्बुलेंस को कॉल किया लेकिन कोई रिस्पॉन्स नहीं मिला।", "hi", "HIGH"),
            ("इलाके में डेंगू और मलेरिया का प्रकोप बढ़ रहा है, स्वास्थ्य विभाग द्वारा तुरंत दवाई का छिड़काव कराया जाए।", "hi", "MEDIUM"),
            ("अस्पताल के आईसीयू वार्ड में ऑक्सीजन पाइपलाइन में आग और गैस रिसाव, मरीजों की जान खतरे में है।", "hi", "CRITICAL"),
            ("स्वास्थ्य केंद्र में नियमित टीकाकरण दिवस के प्रचार-प्रसार की व्यवस्था की जाए।", "hi", "LOW"),
            ("Govt hospital me doctor nahi milte duty time par bahar clinic chalate hain.", "hinglish", "HIGH"),
            ("Sarkari hospital me dawaiyan aur injections available nahi hain.", "hinglish", "HIGH"),
            ("108 ambulance phone karne par nahi aayi marij ki halat serious hai.", "hinglish", "HIGH"),
            ("Area me dengue fail raha hai malaria department ki fogging team bhejiye.", "hinglish", "MEDIUM"),
            ("Hospital ke oxygen cylinder me leak ho gaya hai log behosh ho rahe hain emergency hai.", "hinglish", "CRITICAL"),
            ("Village me blood pressure checkup camp lagwane ki request hai.", "hinglish", "LOW")
        ]
    },
    # 8. School Education
    {
        "dept": "School Education",
        "examples": [
            ("Government Primary School roof collapsed inside classroom, children injured, immediate medical rescue.", "en", "CRITICAL"),
            ("School mid-day meal served with worms and stale lentils, multiple students vomited.", "en", "HIGH"),
            ("Government high school teachers consistently arrive two hours late or stay absent, syllabus pending.", "en", "MEDIUM"),
            ("No functional toilet facility for girl students in middle school, forcing many to drop out.", "en", "HIGH"),
            ("School lacks basic dual desks, small children forced to sit on damp floor in winter.", "en", "MEDIUM"),
            ("Request to paint blackboard and repair broken classroom door hinges.", "en", "LOW"),
            ("शासकीय प्राथमिक शाला के कमरे की छत भरभरा कर गिर गई, बच्चे मलबे में दबे हैं, तुरंत मदद भेजें।", "hi", "CRITICAL"),
            ("मध्याह्न भोजन में कीड़े और सड़ी हुई दाल परोसी गई जिसे खाने से बच्चों की तबीयत बिगड़ गई।", "hi", "HIGH"),
            ("कन्या माध्यमिक विद्यालय में छात्राओं के लिए कोई चालू शौचालय नहीं है, गंदगी का अंबार है।", "hi", "HIGH"),
            ("सरकारी स्कूल में शिक्षक नियमित नहीं आते और पढ़ाई पूरी तरह ठप पड़ी है।", "hi", "MEDIUM"),
            ("कक्षा में बैठने के लिए बेंच और पीने के साफ पानी की कोई सुविधा नहीं है।", "hi", "MEDIUM"),
            ("कक्षा के ब्लैकबोर्ड की पुताई और खिड़की की कुंडी की मरम्मत कराई जाए।", "hi", "LOW"),
            ("School ki chhat gir gayi hai bache ghayal ho gaye hain turant ambulance bhejein.", "hinglish", "CRITICAL"),
            ("Midday meal me kharab aur keede wala khana diya ja raha hai bache bimar pad gaye.", "hinglish", "HIGH"),
            ("Govt school me girls ke liye separate toilet nahi hai bahut pareshani hai.", "hinglish", "HIGH"),
            ("Teachers time par school nahi aate padhai ka loss ho raha hai.", "hinglish", "MEDIUM"),
            ("Classroom me benches tooti hain bache zameen par baithte hain.", "hinglish", "MEDIUM"),
            ("School me sports kit aur board repair ki request hai.", "hinglish", "LOW")
        ]
    },
    # 9. Revenue & Land Administration
    {
        "dept": "Revenue & Land Administration",
        "examples": [
            ("Patwari demanding illegal bribe of Rs 10000 for land mutation and threatening to cancel file.", "en", "MEDIUM"),
            ("Certified copy of Khasra and Khatauni land records not provided despite applying 4 months ago.", "en", "MEDIUM"),
            ("Illegal land grabbing on government cremation ground by local land mafia.", "en", "HIGH"),
            ("Land demarcation (Seemankan) application pending for 6 months without any inspection.", "en", "MEDIUM"),
            ("Violent armed clash over disputed agricultural land boundary demarcation, police and revenue team needed.", "en", "CRITICAL"),
            ("Minor spelling mistake in father's name on revenue record needs correction.", "en", "LOW"),
            ("हल्का पटवारी जमीन के नामांतरण के लिए 10000 रुपये रिश्वत की मांग कर रहे हैं और काम अटका रखा है।", "hi", "MEDIUM"),
            ("खसरा खतौनी की नकल निकालने के लिए चार महीने पहले आवेदन दिया था लेकिन अब तक नहीं मिली।", "hi", "MEDIUM"),
            ("गांव की सरकारी चरनोई और श्मशान भूमि पर भू-माफियाओं द्वारा अवैध कब्जा किया जा रहा है।", "hi", "HIGH"),
            ("जमीन के सीमांकन हेतु आवेदन किए 6 माह बीत गए लेकिन राजस्व टीम मौके पर नहीं आई।", "hi", "MEDIUM"),
            ("जमीन विवाद को लेकर हथियारों से खूनी संघर्ष हो रहा है, तुरंत मजिस्ट्रेट और पुलिस बल भेजें।", "hi", "CRITICAL"),
            ("राजस्व रिकॉर्ड में नाम की स्पेलिंग सुधारने हेतु सामान्य आवेदन।", "hi", "LOW"),
            ("Patwari namantaran ke liye rishwat maang raha hai aur file rok ke baitha hai.", "hinglish", "MEDIUM"),
            ("Khasra nakal 4 mahine se pending hai tehsil ke chakkar kaat rahe hain.", "hinglish", "MEDIUM"),
            ("Sarkari zameen par dabang logo ne boundary bana kar kabza kar liya hai.", "hinglish", "HIGH"),
            ("Seemankan ke liye apply kiya tha par koi officer spot inspect karne nahi aaya.", "hinglish", "MEDIUM"),
            ("Zameen ke vivad me aapas me hathiyar chal gaye hain jaan ka khatra hai.", "hinglish", "CRITICAL"),
            ("Khatauni me father name correction ki request hai.", "hinglish", "LOW")
        ]
    },
    # 10. Police / Home
    {
        "dept": "Police / Home",
        "examples": [
            ("Armed robbery in neighborhood house, thieves fled with weapons, immediate police interception needed.", "en", "CRITICAL"),
            ("Police station refusing to register FIR for stolen motorcycle despite providing CCTV footage.", "en", "MEDIUM"),
            ("Illegal liquor selling and gambling den operating near village primary school, creating menace.", "en", "MEDIUM"),
            ("Anti-social elements harassing school girls near marketplace, urgent police patrolling required.", "en", "HIGH"),
            ("Blaring high-decibel DJ loudspeakers playing past midnight disturbing sick elderly residents.", "en", "MEDIUM"),
            ("Request to deploy traffic personnel during morning school hours near highway crossing.", "en", "LOW"),
            ("मोहल्ले में हथियारबंद बदमाशों ने घर में घुसकर लूटपाट की है, जान का खतरा है, तुरंत पुलिस भेजें।", "hi", "CRITICAL"),
            ("मोटरसाइकिल चोरी होने की सीसीटीवी फुटेज होने के बाद भी थाना पुलिस एफआईआर दर्ज नहीं कर रही।", "hi", "MEDIUM"),
            ("स्कूल के पास खुलेआम अवैध शराब और जुए का अड्डा चल रहा है, माहौल खराब हो रहा है।", "hi", "MEDIUM"),
            ("बाजार में मनचलों द्वारा छात्राओं के साथ छेड़छाड़ की जा रही है, पुलिस गश्त बढ़ाई जाए।", "hi", "HIGH"),
            ("देर रात 1 बजे तक तेज आवाज में डीजे बज रहा है, मरीज और बुजुर्ग सो नहीं पा रहे हैं।", "hi", "MEDIUM"),
            ("स्कूल के पास सुबह के समय यातायात पुलिसकर्मी तैनात करने का निवेदन।", "hi", "LOW"),
            ("Armed gundon ne ghar me ghus kar humla kiya hai jaan ka khatra hai turant police bhejo.", "hinglish", "CRITICAL"),
            ("Chori ki shikayat par thana wale FIR darj nahi kar rahe hain taal rahe hain.", "hinglish", "MEDIUM"),
            ("Basti me illegal desi sharab bechi ja rahi hai jhagda fasaad hota hai.", "hinglish", "MEDIUM"),
            ("Market me ladkiyon par comments pass karte hain ladke, police patrolling lagwayein.", "hinglish", "HIGH"),
            ("Raat ko 12 baje ke baad bhi loud DJ baj raha hai complaint karein.", "hinglish", "MEDIUM"),
            ("Highway turn par police traffic checkpost lagwane ki request hai.", "hinglish", "LOW")
        ]
    },
    # 11. Women & Child Development
    {
        "dept": "Women & Child Development",
        "examples": [
            ("Severely malnourished infants at Anganwadi not receiving emergency medical referral or nutrition.", "en", "HIGH"),
            ("Anganwadi centre remains locked for weeks, supplementary nutrition food packets being sold illegally.", "en", "HIGH"),
            ("Eligible woman not received Ladli Behna Yojana monthly financial aid for past 4 installments.", "en", "MEDIUM"),
            ("Anganwadi worker not conducting door-to-door home visits or tracking immunization cards.", "en", "MEDIUM"),
            ("Children fed contaminated milk at anganwadi centre, child unconscious and foaming, critical emergency.", "en", "CRITICAL"),
            ("Request to provide new story books and toys for children at Anganwadi Kendra.", "en", "LOW"),
            ("आंगनवाड़ी केंद्र में गंभीर कुपोषित बच्चों को पोषण आहार और एनआरसी रेफरल नहीं दिया जा रहा।", "hi", "HIGH"),
            ("आंगनवाड़ी केंद्र महीनों से बंद रहता है और बच्चों का सूखा राशन खुले बाजार में बेचा जा रहा है।", "hi", "HIGH"),
            ("लाड़ली बहना योजना की पात्र हितग्राही होने के बावजूद पिछले 4 माह से किस्त खाते में नहीं आई।", "hi", "MEDIUM"),
            ("आंगनवाड़ी कार्यकर्ता बच्चों का टीकाकरण कार्ड और वजन रिकॉर्ड दर्ज नहीं कर रही हैं।", "hi", "MEDIUM"),
            ("आंगनवाड़ी में दिए गए भोजन से बच्चे बेहोश हो रहे हैं, फूड पॉइजनिंग का गंभीर जानलेवा खतरा है।", "hi", "CRITICAL"),
            ("आंगनवाड़ी केंद्र के बच्चों के लिए खिलौने और सीखने की सामग्री उपलब्ध कराने की प्रार्थना।", "hi", "LOW"),
            ("Anganwadi me bacho ko poshan aahar nahi mil raha worker ghapla kar rahi hai.", "hinglish", "HIGH"),
            ("Ladli behna yojana ka monthly paisa account me 4 mahine se nahi aaya.", "hinglish", "MEDIUM"),
            ("Anganwadi kendra hamesha band rehta hai time par nahi khulta.", "hinglish", "MEDIUM"),
            ("Anganwadi ke khane se bache behosh ho gaye hain emergency medical aid bhejiye.", "hinglish", "CRITICAL"),
            ("Anganwadi me bacho ke baithne ke liye mat aur khilone lagwane ki request.", "hinglish", "LOW")
        ]
    },
    # 12. Social Justice & Welfare
    {
        "dept": "Social Justice & Welfare",
        "examples": [
            ("Old-age pension for 82-year-old destitute widow stopped for 6 months without explanation.", "en", "HIGH"),
            ("Disability pension and motorized tricycle not provided despite 80% permanent disability certificate.", "en", "HIGH"),
            ("Widow pension application approved in portal but monthly benefit never disbursed into bank account.", "en", "MEDIUM"),
            ("SC/ST pre-matric and post-matric scholarship amount not credited for academic session.", "en", "MEDIUM"),
            ("Old age home destitute inmates abandoned without food and water for 3 days, starving condition.", "en", "CRITICAL"),
            ("Request for updating address on social security pension passbook.", "en", "LOW"),
            ("80 वर्षीय असहाय बुजुर्ग महिला की वृद्धावस्था पेंशन पिछले 6 महीने से बंद पड़ी है, भुखमरी की नौबत है।", "hi", "HIGH"),
            ("80% दिव्यांगता प्रमाण पत्र होने के बाद भी दिव्यांग पेंशन और ट्राइसाइकिल सहायता नहीं दी जा रही।", "hi", "HIGH"),
            ("विधवा पेंशन का स्वीकृति आदेश जारी होने के बावजूद बैंक खाते में राशि नहीं भेजी जा रही।", "hi", "MEDIUM"),
            ("छात्रवृत्ति की राशि पोर्टल पर अप्रूव होने के बाद भी विद्यार्थी के बैंक खाते में नहीं आई।", "hi", "MEDIUM"),
            ("वृद्धाश्रम में बुजुर्गों को बिना भोजन-पानी के बंद कर दिया गया है, गंभीर स्थिति में हैं, तुरंत जांच करें।", "hi", "CRITICAL"),
            ("पेंशन पासबुक पर नया बैंक खाता नंबर दर्ज कराने का अनुरोध।", "hi", "LOW"),
            ("Dadi ji ki vridhavastha pension 6 mahine se band hai bina kisi reason ke.", "hinglish", "HIGH"),
            ("Divyang pension aur tricycle ke liye application diya tha par approval nahi mila.", "hinglish", "HIGH"),
            ("Vidhva pension ka paisa account me credit nahi ho raha hai office me koi sunwai nahi hai.", "hinglish", "MEDIUM"),
            ("Scholarship ka paisa portal se approved hai par bank me nahi aaya.", "hinglish", "MEDIUM"),
            ("Old age home me buzurg logo ko khana nahi mil raha emergency help bhejo.", "hinglish", "CRITICAL"),
            ("Pension passbook me address change karne ki request hai.", "hinglish", "LOW")
        ]
    },
    # 13. Agriculture & Farmers' Welfare
    {
        "dept": "Agriculture & Farmers' Welfare",
        "examples": [
            ("Urea and DAP fertilizers completely out of stock at cooperative society during peak sowing, black marketing rampant.", "en", "HIGH"),
            ("Pradhan Mantri Fasal Bima crop damage compensation not disbursed after 80% crop ruined by unseasonal rain.", "en", "HIGH"),
            ("Krishi Upaj Mandi traders manipulating electronic weighing scales to shortchange small farmers.", "en", "MEDIUM"),
            ("PM-Kisan Samman Nidhi installment stopped due to land mapping error in revenue department.", "en", "MEDIUM"),
            ("Highly spurious pesticide supplied by agriculture dealer wiped out 200 acres of soybean crop completely.", "en", "HIGH"),
            ("Massive fire in grain procurement godown destroying thousands of quintals of wheat, raging fire.", "en", "CRITICAL"),
            ("Request to set up soil health testing camp in gram panchayat before sowing season.", "en", "LOW"),
            ("बोवनी के समय प्राथमिक कृषि साख सहकारी समिति में यूरिया और डीएपी खाद खत्म है, कालाबाजारी हो रही है।", "hi", "HIGH"),
            ("अतिवृष्टि और ओलावृष्टि से 80% फसल बर्बाद हो गई लेकिन प्रधानमंत्री फसल बीमा का क्लेम नहीं मिला।", "hi", "HIGH"),
            ("कृषि उपज मंडी में व्यापारी कांटा तौल में गड़बड़ी कर किसानों की फसल की चोरी कर रहे हैं।", "hi", "MEDIUM"),
            ("पीएम किसान सम्मान निधि की किस्त ई-केवाईसी और लैंड सीडिंग के नाम पर कई महीनों से अटकी है।", "hi", "MEDIUM"),
            ("अनाज उपार्जन केंद्र के गेहूं गोदाम में भीषण आग लग गई है, जान-माल का बड़ा खतरा, तुरंत दमकल भेजें।", "hi", "CRITICAL"),
            ("ग्राम पंचायत स्तर पर मिट्टी परीक्षण (सॉइल हेल्थ कार्ड) शिविर लगाने का निवेदन।", "hi", "LOW"),
            ("Khad aur DAP society me nahi mil raha kisan subah se line me lage hain black ho raha hai.", "hinglish", "HIGH"),
            ("Fasal bima ka claim amount abhi tak nahi aaya baarish se poori fasal kharab ho gayi thi.", "hinglish", "HIGH"),
            ("Mandi me vyapari weighing scale me chori kar rahe hain kisan ke sath dhokha ho raha hai.", "hinglish", "MEDIUM"),
            ("PM kisan samman nidhi ka paisa account me nahi aa raha hai.", "hinglish", "MEDIUM"),
            ("Anaj mandi ke godown me aag lag gayi hai emergency fire tender bhejo.", "hinglish", "CRITICAL"),
            ("Soil test karwane ke liye sample camp lagwaya jaye gaon me.", "hinglish", "LOW")
        ]
    },
    # 14. Animal Husbandry & Veterinary
    {
        "dept": "Animal Husbandry & Veterinary",
        "examples": [
            ("Pack of aggressive stray rabid dogs attacking pedestrians and school children, 5 people bitten today.", "en", "CRITICAL"),
            ("Dead cattle carcass rotting on roadside for 3 days, causing unbearable stench and hygiene hazard.", "en", "HIGH"),
            ("Government veterinary hospital doctor absent, critical illness in dairy cattle going untreated.", "en", "HIGH"),
            ("Lumpy skin disease outbreak spreading among village livestock, vaccination drive urgently needed.", "en", "HIGH"),
            ("Artificial insemination facility and veterinary medicines not available at sub-centre.", "en", "MEDIUM"),
            ("Request to install water troughs for stray animals and cattle during peak summer.", "en", "LOW"),
            ("पागल आवारा कुत्तों के झुंड ने राहगीरों और बच्चों पर हमला कर दिया है, 5 लोग लहूलुहान हैं, तुरंत पकड़ें।", "hi", "CRITICAL"),
            ("सड़क किनारे मृत पशु का शव तीन दिनों से पड़ा सड़ रहा है, भयंकर दुर्गंध और बीमारी का खतरा है।", "hi", "HIGH"),
            ("पशु चिकित्सालय में डॉक्टर नदारद हैं, दुधारू गाय गंभीर रूप से बीमार है, कोई इलाज नहीं मिल रहा।", "hi", "HIGH"),
            ("गांव में मवेशियों में लंपी वायरस तेजी से फैल रहा है, पशुपालन विभाग तुरंत टीकाकरण दल भेजे।", "hi", "HIGH"),
            ("पशु औषधालय में जरूरी दवाएं और कृत्रिम गर्भाधान की सुविधा उपलब्ध नहीं है।", "hi", "MEDIUM"),
            ("गर्मी के मौसम में आवारा पशुओं के लिए पानी की चरही (हौद) बनवाने का निवेदन।", "hi", "LOW"),
            ("Colony me paagal kutto ne bacho ko kaat liya hai emergency animal squad bhejiye.", "hinglish", "CRITICAL"),
            ("Sadak par dead animal pada hai 3 din se badboo aa rahi hai nagar nigam hatwaye.", "hinglish", "HIGH"),
            ("Pashu hospital me doctor nahi hai bimar gaay ka ilaj nahi ho pa raha hai.", "hinglish", "HIGH"),
            ("Gaon me pashuo me lumpy bimari fail rahi hai vaccination camp lagwaya jaye.", "hinglish", "HIGH"),
            ("Veterinary sub center par basic dava nahi milti hai.", "hinglish", "MEDIUM"),
            ("Garmi me pashuo ke peene ke paani ke liye tank banwane ki request hai.", "hinglish", "LOW")
        ]
    },
    # 15. IT & Digital Government Services
    {
        "dept": "IT & Digital Government Services",
        "examples": [
            ("MP Online kiosk operator charging Rs 250 extra over official fees for issuing domicile certificate.", "en", "MEDIUM"),
            ("Samagra portal server down continuously for four days, citizens unable to complete mandatory e-KYC.", "en", "HIGH"),
            ("Digital caste and income certificate application arbitrarily rejected online without any reason given.", "en", "MEDIUM"),
            ("State scholarship portal throwing 500 server error on final submission deadline day, students stranded.", "en", "HIGH"),
            ("Citizen grievance portal hacked and phishing links sent to registered users, major cyber breach.", "en", "CRITICAL"),
            ("Request to update helpline phone number on district portal contact us page.", "en", "LOW"),
            ("एमपी ऑनलाइन कियोस्क संचालक मूल निवासी प्रमाण पत्र के लिए सरकारी फीस से 200 रुपये अधिक वसूल रहा है।", "hi", "MEDIUM"),
            ("समग्र पोर्टल का सर्वर पिछले चार दिनों से ठप है, लाड़ली बहना और राशन ई-केवाईसी नहीं हो पा रही है।", "hi", "HIGH"),
            ("आय एवं जाति प्रमाण पत्र का ऑनलाइन आवेदन बिना कोई कारण बताए निरस्त कर दिया गया।", "hi", "MEDIUM"),
            ("छात्रवृत्ति पोर्टल पर अंतिम तिथि के दिन तकनीकी खराबी आ रही है, फॉर्म सबमिट नहीं हो रहा।", "hi", "HIGH"),
            ("सरकारी पोर्टल का डेटा ब्रीच हो गया है और नागरिकों के निजी विवरण लीक हो रहे हैं, तुरंत सर्वर डाउन करें।", "hi", "CRITICAL"),
            ("पोर्टल पर हेल्पलाइन नंबर और ईमेल आईडी अपडेट करने का निवेदन।", "hi", "LOW"),
            ("MP Online kiosk wala certificate ke extra 200 rupaye le raha hai raseed nahi de raha.", "hinglish", "MEDIUM"),
            ("Samagra portal ka server 4 din se band hai e-kyc nahi ho pa rahi hai.", "hinglish", "HIGH"),
            ("Online caste certificate apply kiya tha bina reason reject kar diya portal par.", "hinglish", "MEDIUM"),
            ("Scholarship website par form submit karne par error 500 aa raha hai date nikal jayegi.", "hinglish", "HIGH"),
            ("Portal par cyber fraud ho raha hai citizen account compromise ho gaye hain emergency.", "hinglish", "CRITICAL"),
            ("Website contact page par landline number update karwane ki request.", "hinglish", "LOW")
        ]
    }
]

def generate_multilingual_variants(base_list):
    """
    Expands base seed complaints with realistic citizen phrasing variations:
    spelling, greetings, urgency markers, local location tags (e.g. Ward 2, Betul, Sehore, Rewa, Indore, Gwalior),
    and grammatical variations in English, Hindi, and Hinglish.
    """
    expanded = []
    
    locations_hi = ["वार्ड 3 में", "गाँव में", "तहसील के पास", "चौराहे पर", "कॉलोनी में", "हमारे मोहल्ले में", "मेन रोड पर"]
    locations_hinglish = ["Ward 3 me", "Gaon me", "Tehsil ke paas", "Chauraha par", "Colony me", "Mohalla me", "Main road par"]
    locations_en = ["in Ward 3", "in our village", "near tehsil", "at the main square", "in our colony", "in the locality", "on main road"]
    
    greetings_hi = ["श्रीमान जी, ", "निवेदन है कि ", "शिकायत है कि ", "कृपया ध्यान दें, ", ""]
    greetings_hinglish = ["Sir, ", "Nivedan hai ki ", "Complaint hai ki ", "Please help, ", ""]
    greetings_en = ["Respected Sir, ", "Please note, ", "Complaint: ", "Urgent request: ", ""]

    for item in base_list:
        dept = item["dept"]
        for text, lang, prio in item["examples"]:
            if is_golden(text):
                continue
            expanded.append({
                "text": text,
                "department": dept,
                "priority": prio,
                "language": lang
            })
            
            # Generate 2 realistic citizen variations
            if lang == "hi":
                var1 = random.choice(greetings_hi) + random.choice(locations_hi) + " " + text
                expanded.append({
                    "text": var1,
                    "department": dept,
                    "priority": prio,
                    "language": lang
                })
            elif lang == "hinglish":
                var1 = random.choice(greetings_hinglish) + random.choice(locations_hinglish) + " " + text
                expanded.append({
                    "text": var1,
                    "department": dept,
                    "priority": prio,
                    "language": lang
                })
            elif lang == "en":
                var1 = random.choice(greetings_en) + text + " " + random.choice(locations_en) + "."
                expanded.append({
                    "text": var1,
                    "department": dept,
                    "priority": prio,
                    "language": lang
                })
                
    return expanded

def build_datasets():
    print("Loading original grievance_dataset.csv...")
    orig_path = os.path.join(DATASET_DIR, "grievance_dataset.csv")
    df_orig = pd.read_csv(orig_path)
    
    # 1. Map existing English complaints to 15 Departments & infer verified priority
    mapped_rows = []
    for idx, r in df_orig.iterrows():
        t = str(r["text"]).strip()
        cat = str(r["category"]).strip()
        
        # Skip golden test complaints
        if is_golden(t):
            continue
            
        dept = CATEGORY_TO_DEPT_MAP.get(cat)
        if not dept:
            # Check if text mentions rural/panchayat or police or agriculture
            t_lower = t.lower()
            if any(w in t_lower for w in ["panchayat", "village", "gram", "rural"]):
                dept = "Panchayat & Rural Development"
            elif any(w in t_lower for w in ["police", "theft", "crime", "robbery"]):
                dept = "Police / Home"
            elif any(w in t_lower for w in ["farmer", "crop", "agriculture", "fertilizer", "seed"]):
                dept = "Agriculture & Farmers' Welfare"
            elif any(w in t_lower for w in ["anganwadi", "nutrition", "pregnant", "child"]):
                dept = "Women & Child Development"
            else:
                dept = FALLBACK_DEPARTMENT
                
        prio = infer_priority_from_text(t, dept)
        
        mapped_rows.append({
            "text": t,
            "department": dept,
            "priority": prio,
            "language": "en"
        })
        
    df_mapped = pd.DataFrame(mapped_rows)
    print(f"Mapped {len(df_mapped)} historical English complaints.")
    
    # 2. Generate curated multilingual records
    from multilingual_augmenter import generate_augmented_records
    multilingual_curated = generate_multilingual_variants(MULTILINGUAL_SEEDS)
    augmented_records = generate_augmented_records()
    all_curated = multilingual_curated + augmented_records
    df_curated = pd.DataFrame(all_curated)
    print(f"Generated {len(df_curated)} high-quality multilingual curated complaints.")
    
    # Combine datasets
    df_combined = pd.concat([df_mapped, df_curated], ignore_index=True)
    
    # Remove exact text duplicates
    before_dedup = len(df_combined)
    df_combined = df_combined.drop_duplicates(subset=["text"]).reset_index(drop=True)
    print(f"Deduplicated dataset: from {before_dedup} to {len(df_combined)} rows.")
    
    # Save the 3 target datasets:
    # A. Department dataset (text, department, language)
    dept_df = df_combined[["text", "department", "language"]].copy()
    dept_csv_path = os.path.join(DATASET_DIR, "department_dataset.csv")
    dept_df.to_csv(dept_csv_path, index=False, encoding="utf-8")
    print(f"Saved Department Dataset ({len(dept_df)} rows) -> {dept_csv_path}")
    
    # B. Priority dataset (text, priority, language)
    prio_df = df_combined[["text", "priority", "language"]].copy()
    prio_csv_path = os.path.join(DATASET_DIR, "priority_dataset.csv")
    prio_df.to_csv(prio_csv_path, index=False, encoding="utf-8")
    print(f"Saved Priority Dataset ({len(prio_df)} rows) -> {prio_csv_path}")
    
    # C. Multilingual dataset (text, language, department, priority)
    multi_df = df_combined[["text", "language", "department", "priority"]].copy()
    multi_csv_path = os.path.join(DATASET_DIR, "multilingual_dataset.csv")
    multi_df.to_csv(multi_csv_path, index=False, encoding="utf-8")
    print(f"Saved Multilingual Dataset ({len(multi_df)} rows) -> {multi_csv_path}")
    
    # Save Golden Benchmark
    golden_json_path = os.path.join(DATASET_DIR, "golden_benchmark.json")
    with open(golden_json_path, "w", encoding="utf-8") as f:
        json.dump(GOLDEN_COMPLAINTS, f, ensure_ascii=False, indent=2)
    print(f"Saved Golden Benchmark ({len(GOLDEN_COMPLAINTS)} complaints) -> {golden_json_path}")
    
    print("\nDataset Summary:")
    print("Department Counts:")
    print(df_combined["department"].value_counts())
    print("\nPriority Counts:")
    print(df_combined["priority"].value_counts())
    print("\nLanguage Counts:")
    print(df_combined["language"].value_counts())

if __name__ == "__main__":
    build_datasets()
