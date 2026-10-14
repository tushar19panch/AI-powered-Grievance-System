"""
test_retrained_multilingual_pipeline.py
End-to-End Validation Test Suite for the Retrained Multilingual AI Pipeline for Madhya Pradesh.
Tests:
1. 15 Madhya Pradesh Departments Routing
2. Multilingual Processing (English, Hindi, Hinglish)
3. Priority Prediction (LOW, MEDIUM, HIGH, CRITICAL)
4. Critical Hazard Safety Rule Layer
5. Safe Fallback Behavior for Ambiguous / Low-Confidence Complaints
6. Flask /analyze Endpoint Integration
7. Golden Benchmark Evaluation
"""

import sys
import json
import unittest

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app import app
from pipeline.analyze_complaint import analyze_complaint
from priority.safety_rules import evaluate_safety_rules
from routing.route_complaint import route_complaint
from priority.predict_priority import predict_priority

class TestMultilingualAiPipeline(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()

    def test_department_routing_english_hindi_hinglish(self):
        """Verifies equivalent complaints across EN, HI, Hinglish route to identical MP departments."""
        test_triplets = [
            # Water Supply
            ("There has been no water supply for five days",
             "पाँच दिनों से पानी की सप्लाई नहीं आ रही है।",
             "5 din se paani nahi aa raha hai",
             "Public Health Engineering / Water Supply"),
            # Electricity / Energy
            ("Live electric wire has fallen on the road",
             "सड़क पर बिजली का चालू तार गिर गया है, जानलेवा खतरा है",
             "Sadak par bijli ka live taar gir gaya hai current lag sakta hai",
             "Electricity / Energy"),
            # Roads
            ("The main road has deep potholes causing accidents",
             "मुख्य सड़क पर बहुत सारे गड्ढे हो गए हैं",
             "Main road par bahut saare gaddhe hain",
             "Public Works / Roads"),
            # Healthcare
            ("The government hospital has no medicines available",
             "सरकारी अस्पताल में जरूरी दवाइयां उपलब्ध नहीं हैं",
             "Sarkari hospital me dawai aur medicines nahi mil rahi hain",
             "Public Health & Family Welfare")
        ]

        print("\n" + "=" * 60)
        print("TEST 1: MULTILINGUAL DEPARTMENT ROUTING CONSISTENCY")
        print("=" * 60)

        for en_text, hi_text, hinglish_text, expected_dept in test_triplets:
            r_en = route_complaint(en_text)
            r_hi = route_complaint(hi_text)
            r_hinglish = route_complaint(hinglish_text)

            print(f"\n[EN]       : {en_text[:40]} -> {r_en['department']} (Conf: {r_en['confidence']:.2f})")
            print(f"[HI]       : {hi_text[:40]} -> {r_hi['department']} (Conf: {r_hi['confidence']:.2f})")
            print(f"[HINGLISH] : {hinglish_text[:40]} -> {r_hinglish['department']} (Conf: {r_hinglish['confidence']:.2f})")

            self.assertEqual(r_en["department"], expected_dept)
            self.assertEqual(r_hi["department"], expected_dept)
            self.assertEqual(r_hinglish["department"], expected_dept)

    def test_priority_levels(self):
        """Verifies correct priority classification across LOW, MEDIUM, HIGH, CRITICAL."""
        print("\n" + "=" * 60)
        print("TEST 2: PRIORITY PREDICTION (LOW, MEDIUM, HIGH, CRITICAL)")
        print("=" * 60)

        prio_tests = [
            ("A live electric wire has fallen sparking on street", "CRITICAL"),
            ("बाजार के पास भीषण आग लग गई है, तुरंत दमकल भेजें", "CRITICAL"),
            ("Water supply has been completely halted for 5 days in colony", "HIGH"),
            ("सरकारी अस्पताल में डॉक्टर नदारद हैं और जरूरी दवाइयां नहीं हैं", "HIGH"),
            ("Streetlight not working in lane 4", "MEDIUM"),
            ("Main road par gaddhe ho gaye hain", "MEDIUM"),
            ("Request to repaint park benches and trim garden grass", "LOW"),
            ("पार्क की बेंच की पुताई और रंग-रोगन कराने की प्रार्थना", "LOW")
        ]

        for text, exp_prio in prio_tests:
            res = predict_priority(text)
            print(f"[{res['priority']:8s}] Exp: {exp_prio:8s} | Conf: {res['confidence']:.2f} | Source: {res['source'][:20]:20s} | {text[:45]}")
            self.assertEqual(res["priority"], exp_prio)

    def test_critical_safety_rule_layer(self):
        """Verifies zero misses on life safety hazards (electrocution, fire, structural collapse, toxic gas)."""
        print("\n" + "=" * 60)
        print("TEST 3: CRITICAL HAZARD SAFETY RULE LAYER (ZERO HAZARD LEAKAGE)")
        print("=" * 60)

        hazards = [
            ("Live 11kV wire snapped on road sparking", "ELECTROCUTION_HAZARD"),
            ("बिजली का चालू तार टूटकर गिर गया है करंट लग रहा है", "ELECTROCUTION_HAZARD"),
            ("Sadak par live wire gir gaya hai current lag sakta hai", "ELECTROCUTION_HAZARD"),
            ("Major fire in marketplace with cylinder blast", "FIRE_OR_EXPLOSION"),
            ("दुकान में सिलेंडर ब्लास्ट हो गया भीषण आग लग गई", "FIRE_OR_EXPLOSION"),
            ("Primary school roof collapsed people trapped under debris", "STRUCTURAL_COLLAPSE"),
            ("मकान की छत गिर गई है लोग मलबे में दबे हैं", "STRUCTURAL_COLLAPSE"),
            ("Deep open manhole on dark street child fell into drain", "UNCOVERED_DEEP_PIT_MANHOLE")
        ]

        for h_text, exp_type in hazards:
            s_res = evaluate_safety_rules(h_text)
            print(f"[HAZARD DETECTED] Type: {s_res['hazard_type']} | Matched: '{s_res['matched_pattern']}' | Text: {h_text[:40]}")
            self.assertTrue(s_res["is_critical_hazard"])
            self.assertEqual(s_res["hazard_type"], exp_type)

    def test_safe_fallback_behavior(self):
        """Verifies that completely ambiguous or empty complaints route to General Administration / Manual Review."""
        print("\n" + "=" * 60)
        print("TEST 4: SAFE FALLBACK BEHAVIOR FOR UNCERTAIN / AMBIGUOUS COMPLAINTS")
        print("=" * 60)

        ambiguous_cases = [
            "",
            "   ",
            "xyz random gibberish qwerty",
            "kuch samajh nahi aa raha sir please help"
        ]

        for text in ambiguous_cases:
            res = route_complaint(text, confidence_threshold=0.35)
            print(f"[FALLBACK OK] Fallback: {res['is_fallback']} | Dept: {res['department']} | Text: '{text}'")
            self.assertTrue(res["is_fallback"])
            self.assertEqual(res["department"], "General Administration / Manual Review")

    def test_flask_analyze_endpoint(self):
        """Verifies /analyze endpoint returns full payload compliant with Spring Boot."""
        print("\n" + "=" * 60)
        print("TEST 5: FLASK /analyze ENDPOINT INTEGRATION")
        print("=" * 60)

        payload = {
            "complaint": "5 din se paani nahi aa raha hai colony me"
        }
        res = self.client.post("/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()

        print("Response JSON:")
        for k, v in data.items():
            print(f"  • {k:22s}: {v}")

        self.assertEqual(data["department"], "Public Health Engineering / Water Supply")
        self.assertEqual(data["priority"], "HIGH")
        self.assertEqual(data["language"], "hinglish")
        self.assertIn("priority_indicators", data)
        self.assertIn("sentiment_indicators", data)

if __name__ == "__main__":
    unittest.main()
