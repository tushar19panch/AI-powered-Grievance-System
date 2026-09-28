import os
import sys
from flask import Flask, request, jsonify

# Add project root to sys.path so modules in subfolders import cleanly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from pipeline.analyze_complaint import analyze_complaint

app = Flask(__name__)

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "UP",
        "service": "AI-Grievance-Analysis-Service",
        "version": "1.0.0"
    }), 200

@app.route("/analyze", methods=["POST"])
@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json(silent=True, force=True) or {}
        if not data and request.form:
            data = request.form.to_dict()
        
        # Support multiple common field keys for complaint text
        complaint_text = (
            data.get("complaint") or 
            data.get("description") or 
            data.get("text") or 
            (request.data.decode("utf-8", errors="ignore").strip() if request.data else "") or
            ""
        )
        
        if isinstance(complaint_text, dict):
            complaint_text = complaint_text.get("complaint") or complaint_text.get("description") or ""

        if not str(complaint_text).strip():
            return jsonify({
                "error": "Complaint text is required",
                "category": "Other",
                "department": "General Grievance / Administration",
                "priority": "LOW",
                "sentiment": "NEUTRAL"
            }), 400
        
        # Run ML Pipeline
        analysis_result = analyze_complaint(str(complaint_text))
        
        # Formulate clean JSON response
        response_data = {
            "category": analysis_result.get("category") or "Other",
            "department": analysis_result.get("department") or "General Grievance / Administration",
            "priority": analysis_result.get("priority") or "MEDIUM",
            "sentiment": analysis_result.get("sentiment") or "NEUTRAL",
            "priority_indicators": analysis_result.get("priority_indicators", []),
            "sentiment_indicators": analysis_result.get("sentiment_indicators", [])
        }
        
        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "category": "Other",
            "department": "General Grievance / Administration",
            "priority": "MEDIUM",
            "sentiment": "NEUTRAL"
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[AI SERVICE] Grievance Analysis Microservice running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
