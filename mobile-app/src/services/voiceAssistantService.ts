import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { chatApi } from './api';

export type SupportedVoiceLanguage = 'hi' | 'en' | 'hinglish';

/**
 * Strips markdown symbols, URLs, technical indicators, and emojis
 * so that Text-to-Speech engines pronounce text smoothly and naturally.
 */
export function sanitizeTextForSpeech(text: string, language: SupportedVoiceLanguage = 'hi'): string {
  if (!text) return '';

  let cleaned = text;

  // 1. Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/gi, '');

  // 2. Expand complaint numbers nicely
  if (language === 'hi') {
    cleaned = cleaned.replace(/#(\d+)/g, 'शिकायत नंबर $1');
    cleaned = cleaned.replace(/GRV-(\d+)/gi, 'शिकायत नंबर $1');
  } else {
    cleaned = cleaned.replace(/#(\d+)/g, 'complaint number $1');
    cleaned = cleaned.replace(/GRV-(\d+)/gi, 'complaint number $1');
  }

  // 3. Strip markdown syntax: bold, italic, headers, inline code
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  cleaned = cleaned.replace(/__(.*?)__/g, '$1');
  cleaned = cleaned.replace(/_(.*?)_/g, '$1');
  cleaned = cleaned.replace(/`{1,3}(.*?)`{1,3}/g, '$1');
  cleaned = cleaned.replace(/^#+\s+/gm, '');

  // 4. Convert bullet points and list dashes to pauses
  cleaned = cleaned.replace(/^[•\-\*]\s+/gm, ', ');
  cleaned = cleaned.replace(/\n[•\-\*]\s+/g, ', ');

  // 5. Remove unwanted symbols and emojis (keeps Devanagari and Latin letters/numbers)
  cleaned = cleaned.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    ' '
  );

  // 6. Clean up line breaks and duplicate spaces
  cleaned = cleaned.replace(/\n+/g, '. ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Text-to-Speech Assistant Manager
 */
class VoiceAssistantManager {
  private activeSpeakingId: string | null = null;
  private isSpeakingState: boolean = false;
  private webRecognitionInstance: any = null;
  private isListeningState: boolean = false;

  // ==========================================
  // TEXT-TO-SPEECH (TTS)
  // ==========================================

  /**
   * Speaks the given text in Hindi or English using expo-speech / Web SpeechSynthesis.
   */
  async speak(
    text: string,
    options: {
      id?: string;
      language?: SupportedVoiceLanguage;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onDone?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): Promise<void> {
    const {
      id = 'tts_' + Date.now(),
      language = 'hi',
      rate = 0.95,
      pitch = 1.0,
      onStart,
      onDone,
      onError,
    } = options;

    // Stop any ongoing speech first
    await this.stop();

    const cleanText = sanitizeTextForSpeech(text, language);
    if (!cleanText) {
      if (onDone) onDone();
      return;
    }

    this.activeSpeakingId = id;
    this.isSpeakingState = true;
    if (onStart) onStart();

    // Map language code
    const langCode = language === 'hi' ? 'hi-IN' : language === 'hinglish' ? 'hi-IN' : 'en-IN';

    // 1. Web speech synthesis fallback if on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = langCode;
        utterance.rate = rate;
        utterance.pitch = pitch;

        // Try to pick a natural voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const matchingVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().startsWith(language === 'hi' ? 'hi' : 'en') ||
              v.name.toLowerCase().includes(language === 'hi' ? 'hindi' : 'india')
          );
          if (matchingVoice) {
            utterance.voice = matchingVoice;
          }
        }

        utterance.onend = () => {
          this.activeSpeakingId = null;
          this.isSpeakingState = false;
          if (onDone) onDone();
        };

        utterance.onerror = (e) => {
          this.activeSpeakingId = null;
          this.isSpeakingState = false;
          if (onError) onError(e);
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn('Web speech synthesis failed, falling back to expo-speech:', e);
      }
    }

    // 2. Primary expo-speech engine
    try {
      Speech.speak(cleanText, {
        language: langCode,
        rate,
        pitch,
        onDone: () => {
          this.activeSpeakingId = null;
          this.isSpeakingState = false;
          if (onDone) onDone();
        },
        onStopped: () => {
          this.activeSpeakingId = null;
          this.isSpeakingState = false;
          if (onDone) onDone();
        },
        onError: (err) => {
          this.activeSpeakingId = null;
          this.isSpeakingState = false;
          if (onError) onError(err);
        },
      });
    } catch (err) {
      this.activeSpeakingId = null;
      this.isSpeakingState = false;
      if (onError) onError(err);
    }
  }

  /**
   * Stops any ongoing TTS audio immediately.
   */
  async stop(): Promise<void> {
    this.activeSpeakingId = null;
    this.isSpeakingState = false;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    try {
      await Speech.stop();
    } catch {}
  }

  getActiveSpeakingId(): string | null {
    return this.activeSpeakingId;
  }

  isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  // ==========================================
  // SPEECH-TO-TEXT (STT / VOICE INPUT)
  // ==========================================

  /**
   * Checks if browser Web Speech API is supported.
   */
  isWebSpeechRecognitionSupported(): boolean {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  /**
   * Starts listening to user voice via Web Speech Recognition with live streaming transcript.
   */
  startWebSpeechRecognition(options: {
    language?: SupportedVoiceLanguage;
    onInterim?: (interimText: string) => void;
    onFinal?: (finalText: string) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: any) => void;
  }): boolean {
    if (!this.isWebSpeechRecognitionSupported()) return false;

    this.stopListening();

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang =
        options.language === 'hi' || options.language === 'hinglish' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        this.isListeningState = true;
        if (options.onStart) options.onStart();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript + ' ';
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (finalTranscript + interimTranscript).trim();
        if (combined && options.onInterim) {
          options.onInterim(combined);
        }

        if (finalTranscript.trim() && options.onFinal) {
          options.onFinal(finalTranscript.trim());
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e);
        if (e.error !== 'no-speech') {
          this.isListeningState = false;
        }
        if (options.onError) options.onError(e);
      };

      recognition.onend = () => {
        this.isListeningState = false;
        this.webRecognitionInstance = null;
        if (options.onEnd) options.onEnd();
      };

      this.webRecognitionInstance = recognition;
      recognition.start();
      return true;
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
      this.isListeningState = false;
      if (options.onError) options.onError(err);
      return false;
    }
  }

  /**
   * Stops speech recognition session.
   */
  stopListening(): void {
    if (this.webRecognitionInstance) {
      try {
        this.webRecognitionInstance.stop();
      } catch {}
      this.webRecognitionInstance = null;
    }
    this.isListeningState = false;
  }

  isListening(): boolean {
    return this.isListeningState;
  }
}

export const voiceAssistant = new VoiceAssistantManager();
