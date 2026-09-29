import os
import sys
from flask import Flask, request, jsonify

# Add project root to sys.path so modules in subfolders import cleanly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

import importlib
import pipeline.image_matcher as img_matcher_module
import pipeline.analyze_complaint as analyzer_module
from pipeline.whisper_transcriber import transcribe_audio_file

app = Flask(__name__)

@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "UP",
        "service": "AI-Grievance-Analysis-Service",
        "multimodal": True,
        "image_matching": "ACTIVE",
        "audio_transcription": "OFFLINE_WHISPER_ACTIVE",
        "version": "2.1.0"
    }), 200

@app.route("/fingerprint", methods=["POST"])
@app.route("/api/fingerprint", methods=["POST"])
def get_fingerprint():
    """
    Computes and returns the visual fingerprint (pHash, dHash, color vector, entropy) of an uploaded image.
    """
    try:
        data = request.get_json(silent=True, force=True) or {}
        if not data and request.form:
            data = request.form.to_dict()

        image_data = data.get("image") or data.get("image_base64") or data.get("photo") or ""
        
        # Check if multipart file uploaded
        if not image_data and "file" in request.files:
            file = request.files["file"]
            image_data = file.read()

        if not image_data:
            return jsonify({"error": "No image provided"}), 400

        importlib.reload(img_matcher_module)
        fp = img_matcher_module.compute_image_fingerprint(image_data)
        return jsonify({
            "status": "SUCCESS",
            "fingerprint": fp
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/check-image", methods=["POST"])
@app.route("/api/check-image", methods=["POST"])
def check_image():
    """
    Dedicated endpoint to check if an image is DUPLICATE, FAKE, MISMATCH, or GENUINE against village records.
    """
    try:
        importlib.reload(img_matcher_module)
        data = request.get_json(silent=True, force=True) or {}
        image_data = data.get("image") or data.get("image_base64") or data.get("photo") or ""
        existing_records = data.get("existing_records") or data.get("existing_images") or []
        expected_category = data.get("category") or data.get("expected_category")

        if not image_data:
            return jsonify({
                "classification": "GENUINE",
                "reason": "No image provided to analyze",
                "similarity_score": 0.0
            }), 200

        fp = img_matcher_module.compute_image_fingerprint(image_data)
        match_result = img_matcher_module.match_image_against_database(fp, existing_records, expected_category=expected_category)
        
        return jsonify({
            "status": "SUCCESS",
            "fingerprint": fp,
            **match_result
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e),
            "classification": "GENUINE",
            "similarity_score": 0.0
        }), 500


@app.route("/analyze", methods=["POST"])
@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    Full Multimodal analysis: Analyzes Text (Category, Dept, Priority, Sentiment) 
    AND Image (Duplicate, Fake, Mismatch, Genuine classification).
    """
    try:
        importlib.reload(img_matcher_module)
        data = request.get_json(silent=True, force=True) or {}
        if not data and request.form:
            data = request.form.to_dict()
        
        # 1. Extract complaint text
        complaint_text = (
            data.get("complaint") or 
            data.get("description") or 
            data.get("text") or 
            (request.data.decode("utf-8", errors="ignore").strip() if request.data else "") or
            ""
        )
        if isinstance(complaint_text, dict):
            complaint_text = complaint_text.get("complaint") or complaint_text.get("description") or ""

        # 2. Text ML Analysis
        if str(complaint_text).strip():
            for mod_name in list(sys.modules.keys()):
                if 'category_model' in mod_name or 'department_mapping' in mod_name or 'analyze_complaint' in mod_name or 'urgency_rules' in mod_name:
                    try:
                        importlib.reload(sys.modules[mod_name])
                    except Exception:
                        pass
            analysis_result = analyzer_module.analyze_complaint(str(complaint_text))
        else:
            analysis_result = {
                "category": "Other",
                "department": "General Grievance / Administration",
                "priority": "MEDIUM",
                "sentiment": "NEUTRAL",
                "priority_indicators": [],
                "sentiment_indicators": []
            }
        
        # 3. Image Analysis (if image provided)
        image_data = data.get("image") or data.get("image_base64") or data.get("photo") or ""
        existing_records = data.get("existing_records") or data.get("existing_images") or []
        
        image_result = {
            "classification": "GENUINE",
            "image_hash": None,
            "duplicate_of_id": None,
            "similarity_score": 0.0,
            "reason": "Text-only complaint or unique image"
        }

        if image_data:
            try:
                fp = img_matcher_module.compute_image_fingerprint(image_data)
                img_match = img_matcher_module.match_image_against_database(
                    fp, 
                    existing_records, 
                    expected_category=analysis_result.get("category")
                )
                image_result = {
                    "classification": img_match.get("classification", "GENUINE"),
                    "image_hash": fp.get("phash"),
                    "duplicate_of_id": img_match.get("duplicate_of_id"),
                    "similarity_score": img_match.get("similarity_score", 0.0),
                    "reason": img_match.get("reason", "Unique image verified")
                }
            except Exception as img_err:
                print(f"[IMAGE ERROR] {img_err}")
                image_result["reason"] = f"Image processing error: {img_err}"

        # 4. Formulate clean JSON response
        response_data = {
            "category": analysis_result.get("category") or "Other",
            "department": analysis_result.get("department") or "General Grievance / Administration",
            "priority": analysis_result.get("priority") or "MEDIUM",
            "sentiment": analysis_result.get("sentiment") or "NEUTRAL",
            "classification": image_result["classification"],
            "image_hash": image_result["image_hash"],
            "duplicate_of_id": image_result["duplicate_of_id"],
            "similarity_score": image_result["similarity_score"],
            "classification_reason": image_result["reason"],
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
            "sentiment": "NEUTRAL",
            "classification": "GENUINE"
        }), 500


@app.route("/transcribe", methods=["POST"])
@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    """
    Transcribes uploaded audio (WAV/MP3/M4A or base64) into text using Local Offline Whisper.
    Accepts:
      - Multipart file: 'file' or 'audio'
      - JSON/Form: 'audio_base64', 'audio', 'language' (optional: 'hi', 'en')
    """
    try:
        data = request.get_json(silent=True, force=True) or {}
        if not data and request.form:
            data = request.form.to_dict()

        language = data.get("language") or request.args.get("language")
        model_name = data.get("model") or "base"

        # Check multipart files
        audio_input = None
        if "file" in request.files:
            audio_input = request.files["file"].read()
        elif "audio" in request.files:
            audio_input = request.files["audio"].read()
        else:
            audio_input = data.get("audio") or data.get("audio_base64") or ""

        if not audio_input:
            return jsonify({
                "status": "ERROR",
                "error": "No audio file or base64 payload provided."
            }), 400

        result = transcribe_audio_file(audio_input, language=language, model_name=model_name)
        return jsonify(result), (200 if result.get("status") == "SUCCESS" else 500)

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "text": "",
            "error": str(e)
        }), 500


@app.route("/transcribe-and-analyze", methods=["POST"])
@app.route("/api/transcribe-and-analyze", methods=["POST"])
def transcribe_and_analyze():
    """
    All-in-One: Transcribes Voice Audio -> Analyzes Category, Department, Priority & Sentiment.
    """
    try:
        data = request.get_json(silent=True, force=True) or {}
        if not data and request.form:
            data = request.form.to_dict()

        language = data.get("language") or request.args.get("language")
        model_name = data.get("model") or "base"

        audio_input = None
        if "file" in request.files:
            audio_input = request.files["file"].read()
        elif "audio" in request.files:
            audio_input = request.files["audio"].read()
        else:
            audio_input = data.get("audio") or data.get("audio_base64") or ""

        if not audio_input:
            return jsonify({"error": "No audio provided"}), 400

        # 1. Transcribe audio with Whisper
        transcription = transcribe_audio_file(audio_input, language=language, model_name=model_name)
        transcribed_text = transcription.get("text", "")

        # 2. Analyze transcribed text
        if transcribed_text.strip():
            analysis = analyze_complaint(transcribed_text)
        else:
            analysis = {
                "category": "Other",
                "department": "General Grievance / Administration",
                "priority": "MEDIUM",
                "sentiment": "NEUTRAL"
            }

        return jsonify({
            "status": "SUCCESS",
            "transcription": transcription,
            "analysis": analysis
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


from pipeline.chat_nlu import understand_user_message


@app.route("/chat/understand", methods=["POST"])
@app.route("/api/chat/understand", methods=["POST"])
def chat_understand():
    """
    Conversational NLU Endpoint for Gram Mitra.
    Identifies intents: SUBMIT_COMPLAINT, TRACK_COMPLAINT, COMPLAINT_STATUS, HOW_TO_COMPLAIN,
    UPDATE_COMPLAINT, ESCALATE_COMPLAINT, GENERAL_FAQ, UNKNOWN.
    Detects generic triggers, vague complaints, and extracts entities (ID, Ward).
    """
    try:
        data = request.get_json(silent=True, force=True) or {}
        if not data and request.form:
            data = request.form.to_dict()

        message = data.get("message") or data.get("text") or ""
        active_intent = data.get("active_intent")

        result = understand_user_message(message, active_intent=active_intent)
        return jsonify({
            "status": "SUCCESS",
            **result
        }), 200

    except Exception as e:
        return jsonify({
            "status": "ERROR",
            "error": str(e),
            "intent": "UNKNOWN"
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[AI SERVICE] Multimodal Grievance Analysis Microservice running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)

