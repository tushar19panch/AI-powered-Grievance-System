import os
import tempfile
import base64
import logging

logger = logging.getLogger("whisper_transcriber")

# Global cache for loaded whisper models
_WHISPER_MODELS = {}

def get_whisper_model(model_name="base"):
    """
    Loads and caches the local Whisper model in memory.
    """
    global _WHISPER_MODELS
    if model_name not in _WHISPER_MODELS:
        try:
            import whisper
            print(f"[WHISPER] Loading local Whisper '{model_name}' model into memory...")
            _WHISPER_MODELS[model_name] = whisper.load_model(model_name)
            print(f"[WHISPER] Model '{model_name}' loaded successfully.")
        except Exception as e:
            print(f"[WHISPER] Local PyTorch/Whisper load note: {e}")
            raise e
    return _WHISPER_MODELS[model_name]


def fallback_speech_recognition(audio_file_path, language="hi-IN"):
    """
    High-accuracy Hindi & English voice recognition fallback using SpeechRecognition engine.
    100% Free, handles Indian accents and Hindi dialects cleanly.
    """
    import speech_recognition as sr
    recognizer = sr.Recognizer()
    
    with sr.AudioFile(audio_file_path) as source:
        audio_data = recognizer.record(source)
    
    # Try Hindi first or specified language
    target_lang = "hi-IN" if (language and "hi" in language.lower()) else "en-IN"
    
    try:
        text = recognizer.recognize_google(audio_data, language=target_lang)
        return {
            "status": "SUCCESS",
            "text": text,
            "detected_language": target_lang,
            "engine": "SpeechRecognition-Engine"
        }
    except sr.UnknownValueError:
        # If Hindi failed to decode speech, try English
        try:
            alt_lang = "en-IN" if target_lang == "hi-IN" else "hi-IN"
            text = recognizer.recognize_google(audio_data, language=alt_lang)
            return {
                "status": "SUCCESS",
                "text": text,
                "detected_language": alt_lang,
                "engine": "SpeechRecognition-Engine"
            }
        except Exception:
            return {
                "status": "SUCCESS",
                "text": "",
                "detected_language": target_lang,
                "engine": "SpeechRecognition-Engine",
                "note": "No clear speech detected in audio file"
            }
    except Exception as e:
        return {
            "status": "ERROR",
            "text": "",
            "error": str(e)
        }


def transcribe_audio_file(audio_input, language=None, model_name="base"):
    """
    Transcribes audio into text using Local Whisper / Speech Engine.

    Args:
        audio_input: Can be:
                     - File path (str)
                     - Base64 encoded string (str)
                     - Raw audio bytes (bytes)
        language: Language code ('hi' for Hindi, 'en' for English, or None)
        model_name: Whisper model size ('tiny', 'base', 'small'). Default: 'base'
    """
    temp_file_path = None
    try:
        # 1. Determine if input is a file path, base64 string, or raw bytes
        if isinstance(audio_input, str):
            if os.path.isfile(audio_input):
                audio_file_path = audio_input
            else:
                if "base64," in audio_input:
                    audio_input = audio_input.split("base64,")[1]
                audio_bytes = base64.b64decode(audio_input.strip())
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                temp_file.write(audio_bytes)
                temp_file.flush()
                temp_file.close()
                temp_file_path = temp_file.name
                audio_file_path = temp_file_path

        elif isinstance(audio_input, bytes):
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            temp_file.write(audio_input)
            temp_file.flush()
            temp_file.close()
            temp_file_path = temp_file.name
            audio_file_path = temp_file_path

        else:
            return {
                "status": "ERROR",
                "text": "",
                "error": f"Unsupported audio input type: {type(audio_input)}"
            }

        # 2. Try Whisper First
        try:
            model = get_whisper_model(model_name)
            options = {"fp16": False}
            if language and str(language).strip():
                options["language"] = str(language).strip()
            
            result = model.transcribe(audio_file_path, **options)
            return {
                "status": "SUCCESS",
                "text": result.get("text", "").strip(),
                "detected_language": result.get("language", language or "unknown"),
                "segments_count": len(result.get("segments", [])),
                "engine": f"OpenAI-Whisper-Local-{model_name}"
            }
        except Exception as whisper_err:
            logger.warning(f"Whisper local engine exception ({whisper_err}), invoking fallback speech recognizer...")
            # 3. Fallback to SpeechRecognition Engine
            fallback_res = fallback_speech_recognition(audio_file_path, language=language or "hi-IN")
            return fallback_res

    except Exception as e:
        logger.exception(f"Audio transcription failed: {e}")
        return {
            "status": "ERROR",
            "text": "",
            "error": str(e)
        }

    finally:
        # Cleanup temporary audio file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
