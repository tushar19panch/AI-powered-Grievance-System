import os
import sys
import numpy as np
import scipy.io.wavfile as wavfile

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from pipeline.whisper_transcriber import transcribe_audio_file

def generate_sample_wav(filename="sample_test.wav"):
    """Creates a brief synthesized sine wave tone WAV file for test verification"""
    samplerate = 16000
    duration = 1.0 # seconds
    t = np.linspace(0., duration, int(samplerate * duration))
    amplitude = np.iinfo(np.int16).max * 0.5
    data = (amplitude * np.sin(2. * np.pi * 440. * t)).astype(np.int16)
    filepath = os.path.join(BASE_DIR, filename)
    wavfile.write(filepath, samplerate, data)
    return filepath

if __name__ == "__main__":
    print("=== Testing Local Offline Whisper Integration ===")
    test_audio = generate_sample_wav()
    print(f"Generated sample audio test file at: {test_audio}")

    try:
        # Test using tiny model for quick verification
        result = transcribe_audio_file(test_audio, model_name="tiny")
        print("Transcription Result:")
        print(result)
        if result.get("status") == "SUCCESS":
            print("\n[SUCCESS] Local Offline Whisper is working perfectly!")
        else:
            print(f"\n[FAILED] {result.get('error')}")
    finally:
        if os.path.exists(test_audio):
            os.remove(test_audio)
