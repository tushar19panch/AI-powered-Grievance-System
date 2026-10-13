"""
multilingual_augmenter.py
Generates extensive, diverse, authentic complaints for Madhya Pradesh departments and priority levels
across Hindi, Hinglish, and English.
"""

import random

# Common MP locations to inject for realism
LOCATIONS_HI = [
    "वार्ड 1 में", "वार्ड 4 में", "वार्ड 7 में", "वार्ड 12 में",
    "ग्राम पंचायत में", "गाँव की मुख्य बस्ती में", "तहसील रोड पर",
    "बस स्टैंड के पास", "पुराने बाजार में", "शासकीय अस्पताल के पीछे",
    "प्राथमिक शाला के पास", "चौराहे पर", "कॉलोनी में", "हमारे मोहल्ले में",
    "रेलवे स्टेशन रोड पर", "सब्जी मंडी के पास", "आंगनवाड़ी के सामने"
]

LOCATIONS_HINGLISH = [
    "Ward 1 me", "Ward 4 me", "Ward 7 me", "Ward 12 me",
    "Gram panchayat me", "Gaon ki basti me", "Tehsil road par",
    "Bus stand ke paas", "Purane bazaar me", "Hospital ke peeche",
    "Primary school ke paas", "Chauraha par", "Colony me", "Mohalla me",
    "Station road par", "Mandi ke paas", "Anganwadi ke samne"
]

LOCATIONS_EN = [
    "in Ward 1", "in Ward 4", "in Ward 7", "in Ward 12",
    "in the Gram Panchayat", "in village residential area", "near Tehsil road",
    "near the bus station", "in the old market", "behind the government hospital",
    "near the primary school", "at the main square", "in our colony", "in our locality",
    "near the railway station", "near the vegetable market", "in front of the Anganwadi"
]

PREFIXES_HI = [
    "माननीय महोदय, ", "शिकायत है कि ", "निवेदन है कि ",
    "कृपया ध्यान दें, ", "समस्या यह है कि ", "सूचना: ", ""
]

PREFIXES_HINGLISH = [
    "Respected Sir, ", "Complaint hai ki ", "Nivedan hai ki ",
    "Please help, ", "Problem yeh hai ki ", "Sir ji, ", ""
]

PREFIXES_EN = [
    "Respected Officer, ", "Complaint regarding ", "I wish to report that ",
    "Please take immediate note: ", "Sir, ", ""
]

# Patterns for each of the underrepresented departments and priorities
PATTERNS = {
    "Panchayat & Rural Development": {
        "hi": [
            ("ग्राम पंचायत सचिव कई दिनों से कार्यालय नहीं आ रहे हैं, जरूरी प्रमाण पत्र अटका है।", "MEDIUM"),
            ("मनरेगा की मजदूरी पिछले 3 महीने से मजदूरों के खाते में नहीं आई है।", "HIGH"),
            ("गांव में सीसी रोड का निर्माण अधूरा पड़ा है, कीचड़ और गड्ढे हो गए हैं।", "MEDIUM"),
            ("ग्राम सभा की बैठक समय पर नहीं बुलाई जा रही है, विकास कार्य ठप हैं।", "LOW"),
            ("पंचायत भवन की बाउंड्री वॉल ढह गई है, तुरंत मरम्मत कराई जाए।", "MEDIUM"),
            ("गांव की गलियों में पंचायत द्वारा सफाई और कचरा उठान नहीं करवाया जा रहा।", "MEDIUM"),
            ("ग्राम रोजगार सहायक (GRS) जॉब कार्ड बनाने में पैसे की मांग कर रहे हैं।", "MEDIUM"),
            ("पंचायत के पुराने कुएं की मुंडेर टूट गई है, रात में जानलेवा गिरने का खतरा है।", "HIGH"),
            ("पंचायत भवन की पुरानी छत की बल्ली टूटकर नीचे गिर गई, लोग बाल-बाल बचे।", "CRITICAL"),
            ("पंचायत भवन के बाहर सूचना बोर्ड लगाने का निवेदन है।", "LOW")
        ],
        "hinglish": [
            ("Panchayat sachiv hamesha absent rehte hain, zaroori documents verify nahi ho rahe.", "MEDIUM"),
            ("NREGA mazdoori 3 mahine se pending hai bank account me nahi aayi.", "HIGH"),
            ("Gaon me cemented road ka kaam aadha chhod diya thekedar ne.", "MEDIUM"),
            ("Gram sabha meeting nahi hoti gaon me vikas ruka hua hai.", "LOW"),
            ("Panchayat bhavan ki deewar toot gayi hai repair ki zarurat hai.", "MEDIUM"),
            ("Panchayat ki taraf se gaon me safai bilkul nahi ho rahi gandagi hai.", "MEDIUM"),
            ("GRS job card ke liye extra paise maang raha hai.", "MEDIUM"),
            ("Kuan ka boundary tuta hua hai koi bhi gir sakta hai dangerous hai.", "HIGH"),
            ("Panchayat building ki chhat girne wali hai jaan ka khatra hai.", "CRITICAL"),
            ("Panchayat office par naya board lagwane ki request hai.", "LOW")
        ],
        "en": [
            ("The Gram Panchayat Secretary remains absent during office hours, public work stalled.", "MEDIUM"),
            ("MGNREGA wages unpaid for past three months for village laborers.", "HIGH"),
            ("Village concrete road construction left unfinished with mud and gravel.", "MEDIUM"),
            ("Gram Sabha meetings are not being convened as mandated by rules.", "LOW"),
            ("Boundary wall of Panchayat building damaged, requires repair.", "MEDIUM"),
            ("Rural sanitation not maintained by Gram Panchayat, waste accumulating in lanes.", "MEDIUM"),
            ("Gram Rozgar Sahayak demanding illegal commission for issue of job cards.", "MEDIUM"),
            ("Unprotected open village well without parapet wall posing severe hazard.", "HIGH"),
            ("Panchayat community hall ceiling collapsed suddenly, imminent life threat.", "CRITICAL"),
            ("Request to install updated information board outside Panchayat office.", "LOW")
        ]
    },
    "Police / Home": {
        "hi": [
            ("हथियारबंद बदमाशों ने घर में घुसकर हमला किया, जानलेवा खतरा है, तुरंत पुलिस भेजें।", "CRITICAL"),
            ("बाजार के पास मनचलों द्वारा छात्राओं से छेड़छाड़ की जा रही है, पुलिस गश्त बढ़ाई जाए।", "HIGH"),
            ("चौराहे पर अवैध शराब और जुए का धंधा चल रहा है, लड़ाई-झगड़े होते हैं।", "MEDIUM"),
            ("चोरी की लिखित शिकायत देने के बाद भी थाना पुलिस एफआईआर दर्ज नहीं कर रही।", "MEDIUM"),
            ("देर रात 12 बजे तक तेज आवाज में डीजे और लाउडस्पीकर बज रहा है।", "MEDIUM"),
            ("इलाके में रात की पुलिस पेट्रोलिंग नियमित रूप से कराने की मांग।", "LOW"),
            ("दुकानदार से रंगदारी और धमकी देने वाले गुंडों पर सख्त कार्रवाई की जाए।", "HIGH"),
            ("भीड़भाड़ वाले इलाके में गोलीबारी की घटना हुई है, तुरंत पुलिस बल पहुंचे।", "CRITICAL"),
            ("कॉलोनी के नुक्कड़ पर तेज रफ्तार स्टंट करने वाले बाइकरों पर रोक लगाई जाए।", "MEDIUM"),
            ("यातायात नियमों के पालन हेतु चौराहे पर बैरिकेडिंग और ट्रैफिक पुलिस लगाई जाए।", "LOW")
        ],
        "hinglish": [
            ("Armed criminals ne ghar me ghus kar attacking kiya hai turant police bhejo.", "CRITICAL"),
            ("Market me ladkiyon se chhedchhad hoti hai police patrolling badhaiye.", "HIGH"),
            ("Colony me illegal sharab aur satta chal raha hai mahol kharab hai.", "MEDIUM"),
            ("Thana me bike chori ki FIR darj nahi kar rahe hain police wale.", "MEDIUM"),
            ("Raat ko 1 baje tak loud speaker baj raha hai mana karne par jhagda karte hain.", "MEDIUM"),
            ("Area me night police patrolling regular karwane ki request hai.", "LOW"),
            ("Gunde dukandaar se hafta vasooli kar rahe hain aur dhamki de rahe hain.", "HIGH"),
            ("Market me firing hui hai log bhag rahe hain police emergency hai.", "CRITICAL"),
            ("Speeding bike riders rash driving kar rahe hain colony me.", "MEDIUM"),
            ("Chauraha par traffic signal aur police lagwane ki request hai.", "LOW")
        ],
        "en": [
            ("Armed intruders assaulted family members, imminent life threat, dispatch police immediately.", "CRITICAL"),
            ("Harassment of young women near marketplace, urgent police deployment needed.", "HIGH"),
            ("Illegal liquor sale and gambling den operating openly in residential area.", "MEDIUM"),
            ("Local police station refusing to register FIR for stolen vehicle.", "MEDIUM"),
            ("High-decibel DJ loudspeakers playing past midnight in violation of noise limits.", "MEDIUM"),
            ("Request for regular night police patrolling in the colony.", "LOW"),
            ("Extortionists threatening local shopkeepers with violence.", "HIGH"),
            ("Gunfire reported in crowded market, urgent tactical police intervention required.", "CRITICAL"),
            ("Reckless speeding and bike stunts endangering pedestrians.", "MEDIUM"),
            ("Request for traffic barricading and personnel at busy junction.", "LOW")
        ]
    },
    "Women & Child Development": {
        "hi": [
            ("आंगनवाड़ी केंद्र कई दिनों से बंद है, बच्चों को पोषण आहार नहीं मिल रहा।", "HIGH"),
            ("आंगनवाड़ी में दिए गए सड़े दूध से कई बच्चे बेहोश हो गए, फूड पॉइजनिंग, तुरंत डॉक्टर भेजें।", "CRITICAL"),
            ("लाड़ली बहना योजना की स्वीकृत किस्त 3 महीने से बैंक खाते में नहीं आई।", "MEDIUM"),
            ("कुपोषित बच्चों का एनआरसी (NRC) में भर्ती कराने हेतु आंगनवाड़ी कार्यकर्ता सहयोग नहीं कर रहीं।", "HIGH"),
            ("आंगनवाड़ी कार्यकर्ता केंद्र पर समय पर उपस्थित नहीं रहतीं, बच्चों की देखरेख नहीं होती।", "MEDIUM"),
            ("गर्भवती महिलाओं को पोषण किट और आयरन की गोलियां वितरित नहीं की जा रही हैं।", "HIGH"),
            ("आंगनवाड़ी केंद्र में साफ-सफाई और पेयजल की उचित व्यवस्था नहीं है।", "MEDIUM"),
            ("आंगनवाड़ी केंद्र में बच्चों के बैठने के लिए खिलौने और चटाई उपलब्ध कराने का निवेदन।", "LOW"),
            ("प्रधानमंत्री मातृ वंदना योजना के तहत मिलने वाली राशि का भुगतान अटका हुआ है।", "MEDIUM"),
            ("आंगनवाड़ी केंद्र भवन का रंग-रोगन कराने की प्रार्थना है।", "LOW")
        ],
        "hinglish": [
            ("Anganwadi kendra band rehta hai bacho ko poshan aahar nahi mil raha.", "HIGH"),
            ("Anganwadi me khana khane se bache behosh ho gaye food poisoning emergency hai.", "CRITICAL"),
            ("Ladli behna yojana ka monthly paisa account me nahi aaya 3 mahine se.", "MEDIUM"),
            ("Malnourished bacho ko nutrition aur treatment me anganwadi worker help nahi kar rahi.", "HIGH"),
            ("Anganwadi worker time par nahi aati center par tala laga rehta hai.", "MEDIUM"),
            ("Pregnant ladies ko nutrition packets aur iron tablets nahi mil rahi hain.", "HIGH"),
            ("Anganwadi me saaf paani aur toilet ki suvidha nahi hai.", "MEDIUM"),
            ("Anganwadi bacho ke liye toys aur books provide karne ki request hai.", "LOW"),
            ("Matru vandana yojana ka payment portal par approved hone par bhi nahi aaya.", "MEDIUM"),
            ("Anganwadi building me painting karwane ki request.", "LOW")
        ],
        "en": [
            ("Anganwadi centre closed for days, supplementary nutrition stopped for young children.", "HIGH"),
            ("Spoiled food at Anganwadi caused children to collapse, severe food poisoning emergency.", "CRITICAL"),
            ("Ladli Behna monthly assistance not received in bank account for past 3 months.", "MEDIUM"),
            ("Severe malnutrition cases not being referred to Nutritional Rehabilitation Centre.", "HIGH"),
            ("Anganwadi worker absent regularly, centre neglected.", "MEDIUM"),
            ("Supplementary nutrition packets and iron supplements not distributed to pregnant women.", "HIGH"),
            ("Lack of hygienic drinking water and sanitary toilet at Anganwadi centre.", "MEDIUM"),
            ("Request to provide toys, learning mats and charts at Anganwadi centre.", "LOW"),
            ("Pending disbursement under Pradhan Mantri Matru Vandana Yojana.", "MEDIUM"),
            ("Request to repaint the walls of the Anganwadi centre.", "LOW")
        ]
    },
    "Agriculture & Farmers' Welfare": {
        "hi": [
            ("सहकारी समिति पर यूरिया और डीएपी खाद की भारी किल्लत है, किसान दिनभर कतार में खड़े हैं।", "HIGH"),
            ("अतिवृष्टि से बर्बाद हुई फसल का प्रधानमंत्री फसल बीमा क्लेम अभी तक नहीं मिला है।", "HIGH"),
            ("कृषि उपज मंडी में व्यापारियों द्वारा तौल कांटे में हेराफेरी कर किसानों को लूटा जा रहा है।", "MEDIUM"),
            ("कृषि गोदाम में रखे हजारों क्विंटल अनाज में भीषण आग लग गई है, तुरंत दमकल भेजें।", "CRITICAL"),
            ("पीएम किसान सम्मान निधि की किस्त जमीन सत्यापन के नाम पर 6 महीने से रुकी है।", "MEDIUM"),
            ("कृषि विभाग से वितरित किए गए प्रमाणित बीज खराब निकले, अंकुरण ही नहीं हुआ।", "HIGH"),
            ("नहर से सिंचाई के लिए तय रोस्टर के अनुसार पानी नहीं छोड़ा जा रहा, फसल सूख रही है।", "HIGH"),
            ("मिट्टी परीक्षण हेतु ग्राम में सॉइल हेल्थ कार्ड शिविर आयोजित करने का निवेदन।", "LOW"),
            ("नकली कीटनाशक बेचने वाली दुकान पर जांच कर सख्त कार्रवाई की जाए।", "HIGH"),
            ("कृषि यंत्र अनुदान योजना के तहत आवेदन का सत्यापन शीघ्र कराने की प्रार्थना।", "LOW")
        ],
        "hinglish": [
            ("Society me urea aur DAP khad nahi mil rahi hai black me bechi ja rahi hai.", "HIGH"),
            ("Barish se fasal kharab hone ke baad bhi PM fasal bima ka paisa nahi mila.", "HIGH"),
            ("Krishi mandi me weighing scale me chori ki ja rahi hai kisan pareshan hain.", "MEDIUM"),
            ("Mandi godown me bhishan aag lag gayi hai anaj jal raha hai emergency help bhejein.", "CRITICAL"),
            ("PM kisan samman nidhi ki installment account me nahi aayi 6 mahine se.", "MEDIUM"),
            ("Govt certified beej kharab nikla kisan ki buwai bekaar ho gayi.", "HIGH"),
            ("Nehar me sinchai ka paani nahi chhoda ja raha fasal sookh rahi hai.", "HIGH"),
            ("Soil testing camp gaon me lagwane ki request hai.", "LOW"),
            ("Market me nakli pesticide becha ja raha hai crops damage ho rahi hain.", "HIGH"),
            ("Tractor subsidy application verification karwane ki request hai.", "LOW")
        ],
        "en": [
            ("Acute shortage of Urea and DAP fertilizers at cooperative society, black marketing rampant.", "HIGH"),
            ("Crop loss insurance compensation under PMFBY not credited after extensive weather damage.", "HIGH"),
            ("Traders manipulating weighing scales at Krishi Upaj Mandi, cheating farmers.", "MEDIUM"),
            ("Massive fire broke out in agricultural grain warehouse, raging inferno, send fire engines.", "CRITICAL"),
            ("PM Kisan Samman Nidhi installment withheld due to pending land verification.", "MEDIUM"),
            ("Defective subsidized seeds failed to germinate, severe financial loss to farmers.", "HIGH"),
            ("Irrigation canal water not released as per schedule, crops drying up.", "HIGH"),
            ("Request to conduct soil health card testing camp in the village.", "LOW"),
            ("Spurious and unlicensed pesticides being sold in the market damaging fields.", "HIGH"),
            ("Request for expedited verification of farm equipment subsidy application.", "LOW")
        ]
    },
    "School Education": {
        "hi": [
            ("शासकीय स्कूल के कमरे की छत का मलबा गिर गया, बच्चे मलबे में दबे हैं, तुरंत रेस्क्यू भेजें।", "CRITICAL"),
            ("मध्याह्न भोजन में सड़ा हुआ और कीड़ेयुक्त खाना परोसा गया, कई बच्चे बीमार पड़े।", "HIGH"),
            ("सरकारी हाई स्कूल में शिक्षक नियमित रूप से नहीं आ रहे, पढ़ाई पूरी तरह चौपट है।", "MEDIUM"),
            ("कन्या विद्यालय में छात्राओं के लिए कोई चालू शौचालय नहीं है, छात्राएं परेशान हैं।", "HIGH"),
            ("कक्षा में बैठने के लिए पर्याप्त बेंच और पीने के पानी की व्यवस्था नहीं है।", "MEDIUM"),
            ("बारिश के मौसम में स्कूल की छत से पानी टपकता है, प्लास्टर उखड़ रहा है।", "HIGH"),
            ("सरकारी स्कूल के खेल मैदान की सफाई और बाउंड्री वॉल की मरम्मत का अनुरोध।", "LOW"),
            ("गणित और विज्ञान के विषय शिक्षक महीनों से नहीं हैं, नए शिक्षक की नियुक्ति की जाए।", "MEDIUM"),
            ("सत्र शुरू होने के बाद भी छात्रों को पाठ्यपुस्तकें और ड्रेस का वितरण नहीं हुआ।", "MEDIUM"),
            ("विद्यालय के सूचना पट्ट और मुख्य द्वार पर पेंट कराने की अर्जी।", "LOW")
        ],
        "hinglish": [
            ("School ki chhat achanak gir gayi bache injure ho gaye emergency rescue team bhejo.", "CRITICAL"),
            ("Midday meal me kharab khana dene se bacho ki tabiyat kharab ho gayi.", "HIGH"),
            ("Govt school me teachers regular nahi aate padhai ka nuksan ho raha hai.", "MEDIUM"),
            ("School me girls toilet band pada hai saaf safai nahi hai.", "HIGH"),
            ("Classroom me desks toote hain aur drinking water filter kharab hai.", "MEDIUM"),
            ("School ki chhat tapak rahi hai kabhi bhi gir sakti hai.", "HIGH"),
            ("School ground ki safai aur gate repair karwane ki request hai.", "LOW"),
            ("Science aur Maths teacher post vacant hai padhai nahi ho pa rahi.", "MEDIUM"),
            ("Students ko books aur uniform abhi tak distribute nahi hui.", "MEDIUM"),
            ("School board aur wall painting karwane ka nivedan.", "LOW")
        ],
        "en": [
            ("Classroom ceiling collapsed inside school, children trapped, immediate rescue required.", "CRITICAL"),
            ("Contaminated mid-day meal served causing multiple students to fall sick.", "HIGH"),
            ("Government school teachers chronically absent or arriving late, education disrupted.", "MEDIUM"),
            ("Lack of functional toilet facility for female students in government school.", "HIGH"),
            ("Insufficient student benches and non-functional drinking water facility in school.", "MEDIUM"),
            ("School building roof leaking severely during rains with falling plaster.", "HIGH"),
            ("Request for cleaning school playground and repairing boundary wall.", "LOW"),
            ("Key subject teachers for science and mathematics not appointed for months.", "MEDIUM"),
            ("Textbooks and uniforms not distributed to students months into academic year.", "MEDIUM"),
            ("Request for routine whitewashing and painting of school signboard.", "LOW")
        ]
    },
    "Social Justice & Welfare": {
        "hi": [
            ("वृद्धावस्था पेंशन 6 माह से बंद पड़ी है, असहाय बुजुर्ग महिला भुखमरी की कगार पर है।", "HIGH"),
            ("80% दिव्यांगता के बावजूद दिव्यांग पेंशन और सहायक उपकरण (ट्राइसाइकिल) नहीं मिला।", "HIGH"),
            ("विधवा पेंशन का स्वीकृति आदेश जारी होने के बावजूद बैंक खाते में पैसा नहीं आया।", "MEDIUM"),
            ("विद्यार्थी की अनुसूचित जाति/जनजाति छात्रवृत्ति पोर्टल पर पास होने के बाद भी अटकी है।", "MEDIUM"),
            ("वृद्धाश्रम में बुजुर्गों को बंद कर दिया गया है बिना भोजन पानी के, जान का खतरा है।", "CRITICAL"),
            ("समग्र आईडी में आधार ई-केवाईसी में गलती के कारण कल्याणकारी योजनाएं बंद हो गई हैं।", "MEDIUM"),
            ("संबल योजना के तहत अनुग्रह सहायता राशि का भुगतान 4 महीने से लंबित है।", "HIGH"),
            ("पेंशन पासबुक में नया बैंक खाता नंबर अपडेट कराने का सामान्य आवेदन।", "LOW"),
            ("दिव्यांग प्रमाण पत्र नवीनीकरण हेतु शिविर आयोजित करने की प्रार्थना।", "LOW"),
            ("कल्याणकारी योजनाओं की जानकारी हेतु शिविर लगाने का निवेदन।", "LOW")
        ],
        "hinglish": [
            ("Vridhavastha pension 6 mahine se band hai buzurg log pareshan hain.", "HIGH"),
            ("Divyang certificate hone ke baad bhi pension aur tricycle nahi mili.", "HIGH"),
            ("Vidhva pension sanction hone ke baad bhi account me nahi aa rahi.", "MEDIUM"),
            ("SC/ST scholarship ka paisa portal se pass hokar bhi account me credit nahi hua.", "MEDIUM"),
            ("Old age home me buzurg logo ko band kar rakha hai bhooke pyase emergency help.", "CRITICAL"),
            ("Samagra e-kyc mismatch ki wajah se pension ruk gayi hai.", "MEDIUM"),
            ("Sambal yojana ka payment 4 mahine se pending hai.", "HIGH"),
            ("Pension passbook me bank account update karwane ki request.", "LOW"),
            ("Divyang camp lagwane ke liye nivedan.", "LOW"),
            ("Welfare schemes awareness camp lagwaya jaye gaon me.", "LOW")
        ],
        "en": [
            ("Old age pension withheld for six consecutive months, elderly resident facing starvation.", "HIGH"),
            ("Disability pension and motorized tricycle not sanctioned despite valid certificate.", "HIGH"),
            ("Approved widow pension benefit not disbursed into recipient's bank account.", "MEDIUM"),
            ("Pre-matric scholarship grant sanctioned on portal but uncredited to student account.", "MEDIUM"),
            ("Elderly persons locked without food or water in shelter, grave life hazard, intervene immediately.", "CRITICAL"),
            ("Samagra ID Aadhaar e-KYC mismatch causing arbitrary suspension of social security.", "MEDIUM"),
            ("Sambal Yojana ex-gratia financial assistance delayed for over four months.", "HIGH"),
            ("Request to update bank account details on pension passbook.", "LOW"),
            ("Request to organize disability certification camp in rural area.", "LOW"),
            ("Request for public awareness stall regarding state welfare schemes.", "LOW")
        ]
    }
}

def generate_augmented_records():
    records = []
    
    for dept, lang_dict in PATTERNS.items():
        for lang, examples in lang_dict.items():
            locs = LOCATIONS_HI if lang == "hi" else (LOCATIONS_HINGLISH if lang == "hinglish" else LOCATIONS_EN)
            prefixes = PREFIXES_HI if lang == "hi" else (PREFIXES_HINGLISH if lang == "hinglish" else PREFIXES_EN)
            
            for base_text, prio in examples:
                # Add base
                records.append({
                    "text": base_text,
                    "department": dept,
                    "priority": prio,
                    "language": lang
                })
                # Add 3 variants with varied locations and prefixes
                for _ in range(3):
                    p = random.choice(prefixes)
                    l = random.choice(locs)
                    if lang == "en":
                        var_text = f"{p}{base_text.rstrip('.')} {l}."
                    elif lang == "hi":
                        var_text = f"{p}{l} {base_text}"
                    else:
                        var_text = f"{p}{l} {base_text}"
                    records.append({
                        "text": var_text,
                        "department": dept,
                        "priority": prio,
                        "language": lang
                    })
                    
    return records
