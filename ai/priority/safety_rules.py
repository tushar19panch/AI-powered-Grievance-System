"""
safety_rules.py
Critical Safety-Rule Layer for Emergency Life-Safety Hazard Detection.
Runs alongside ML models to ensure zero misses on life-threatening emergencies.
Covers English, Hindi (Devanagari), and Hinglish (Roman script).
"""

import re
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Explicit hazard pattern dictionaries with descriptions
SAFETY_HAZARD_PATTERNS = {
    "ELECTROCUTION_HAZARD": {
        "description": "Life-threatening electrical shock / fallen live wire hazard",
        "patterns": [
            r"\blive\s*(?:electric\s*)?wire\b",
            r"\bexposed\s*(?:electric\s*)?wire\b",
            r"\belectrocution\b",
            r"\belectric\s*shock\b",
            r"\bhigh\s*voltage\s*wire\b",
            r"\bsparking\s*(?:wire|pole|transformer)\b",
            r"\bwire\s*snapped\b",
            r"\b11\s*kv\b",
            r"\bcurrent\s*lag\s*(?:sakta|raha|gaya)\b",
            r"\bbijli\s*ka\s*taar\s*(?:gir|toot|latak)\b",
            r"\blive\s*taar\b",
            r"\btaar\s*se\s*chingari\b",
            r"चालू\s*तार",
            r"बिजली\s*का\s*तार\s*(?:गिर|टूट|लटक)",
            r"करंट\s*लग\s*(?:रहा|सकता|गया)",
            r"11000\s*वोल्ट",
            r"हाई\s*वोल्टेज\s*तार",
            r"चिंगारियां\s*निकल\s*रही"
        ]
    },
    "FIRE_OR_EXPLOSION": {
        "description": "Active fire or explosive hazard",
        "patterns": [
            r"\bserious\s*fire\b",
            r"\bmajor\s*fire\b",
            r"\braging\s*fire\b",
            r"\bbuilding\s*on\s*fire\b",
            r"\bcylinder\s*(?:blast|explosion)\b",
            r"\btransformer\s*fire\b",
            r"\bblaze\b",
            r"\baag\s*lag\s*gayi\b",
            r"\bcylinder\s*phat\s*gaya\b",
            r"\btransformer\s*me\s*aag\b",
            r"भीषण\s*आग",
            r"आग\s*लग\s*गई",
            r"सिलेंडर\s*(?:ब्लास्ट|फट)",
            r"ट्रांसफार्मर\s*में\s*आग"
        ]
    },
    "STRUCTURAL_COLLAPSE": {
        "description": "Building, ceiling, or bridge collapse with trapped victims",
        "patterns": [
            r"\bbuilding\s*collapse\b",
            r"\broof\s*collapsed?\b",
            r"\bceiling\s*collapsed?\b",
            r"\bbridge\s*collapsed?\b",
            r"\bwall\s*collapsed?\b",
            r"\bpeople\s*trapped\b",
            r"\bchildren\s*trapped\b",
            r"\bdebris\s*trapped\b",
            r"\bchhat\s*(?:gir|dhas)\s*gayi\b",
            r"\bdeewar\s*(?:gir|dhas)\s*gayi\b",
            r"\blog\s*dabe\s*hain\b",
            r"मकान\s*(?:ढह|गिर|धंस)",
            r"छत\s*(?:गिर|धंस)\s*गई",
            r"दीवार\s*गिर\s*गई",
            r"पुल\s*धंस\s*गया",
            r"मलबे\s*में\s*(?:दबे|फंसे)",
            r"बच्चे\s*दबे\s*हैं"
        ]
    },
    "TOXIC_GAS_OR_POISON": {
        "description": "Toxic gas leakage or severe chemical contamination hazard",
        "patterns": [
            r"\bgas\s*leak(?:age)?\b",
            r"\btoxic\s*gas\b",
            r"\bpoisonous\s*(?:gas|chemical|water)\b",
            r"\bchemical\s*leak\b",
            r"\bpeople\s*suffocating\b",
            r"\bgas\s*leak\s*ho\s*gaya\b",
            r"\bdam\s*ghut\s*raha\b",
            r"\bzehreeli\s*gas\b",
            r"जहरीली\s*गैस",
            r"गैस\s*रिसाव",
            r"दम\s*घुट\s*रहा"
        ]
    },
    "UNCOVERED_DEEP_PIT_MANHOLE": {
        "description": "Uncovered deep pit, well, or manhole entrapment emergency",
        "patterns": [
            r"\bdeep\s*open\s*manhole\b",
            r"\bchild\s*fell\s*into\s*(?:drain|manhole|well|pit)\b",
            r"\buncovered\s*deep\s*manhole\b",
            r"\bkhula\s*gehra\s*manhole\b",
            r"\bbacha\s*manhole\s*me\s*gir\s*gaya\b",
            r"खुला\s*गहरा\s*मैनहोल",
            r"बच्चा\s*(?:मैनहोल|नाले|कुएं)\s*में\s*गिर\s*गया",
            r"गहरा\s*खुला\s*गड्ढा\s*जानलेवा"
        ]
    },
    "ARMED_VIOLENCE": {
        "description": "Armed assault or gunfire threat",
        "patterns": [
            r"\barmed\s*(?:robbery|assault|intruders)\b",
            r"\bactive\s*gunfire\b",
            r"\bshooting\s*in\b",
            r"\bhathiyarband\s*gunde\b",
            r"\bgoli\s*chali\b",
            r"हथियारबंद\s*(?:हमला|बदमाश)",
            r"गोलीबारी"
        ]
    }
}

COMPILED_RULES = {
    hazard_code: {
        "description": data["description"],
        "regexes": [re.compile(p, re.IGNORECASE) for p in data["patterns"]]
    }
    for hazard_code, data in SAFETY_HAZARD_PATTERNS.items()
}

def evaluate_safety_rules(text: str) -> dict:
    """
    Evaluates text against critical life-safety rules.
    Returns:
    {
        "is_critical_hazard": bool,
        "hazard_type": str or None,
        "hazard_description": str or None,
        "matched_pattern": str or None
    }
    """
    if not text or not str(text).strip():
        return {
            "is_critical_hazard": False,
            "hazard_type": None,
            "hazard_description": None,
            "matched_pattern": None
        }

    clean_text = str(text).strip()

    for hazard_code, data in COMPILED_RULES.items():
        for r in data["regexes"]:
            match = r.search(clean_text)
            if match:
                return {
                    "is_critical_hazard": True,
                    "hazard_type": hazard_code,
                    "hazard_description": data["description"],
                    "matched_pattern": match.group(0)
                }

    return {
        "is_critical_hazard": False,
        "hazard_type": None,
        "hazard_description": None,
        "matched_pattern": None
    }

if __name__ == "__main__":
    tests = [
        "A live electric wire has fallen on the road",
        "सड़क पर बिजली का चालू तार गिर गया है",
        "Sadak par bijli ka live taar gir gaya hai current lag sakta hai",
        "There is a serious fire near the market",
        "बाजार में भीषण आग लग गई है",
        "Market me aag lag gayi hai cylinder blast ho gaya",
        "Deep open manhole on dark road, child fell into manhole",
        "पार्क की बेंच टूटी हुई है",
        "5 din se paani nahi aa raha hai"
    ]
    for t in tests:
        res = evaluate_safety_rules(t)
        print(f"[{'CRITICAL' if res['is_critical_hazard'] else 'NORMAL'}] {t[:50]} -> {res.get('hazard_type')}")
