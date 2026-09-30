import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { chatApi, ChatMessageResult } from '../services/api';
import {
  voiceAssistant,
  SupportedVoiceLanguage,
} from '../services/voiceAssistantService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface GramMitraModalProps {
  visible: boolean;
  onClose: () => void;
  initialLanguage?: SupportedVoiceLanguage;
  initialComplaintId?: number | string;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  intent?: string;
  complaintData?: any;
  aiAnalysis?: any;
  quickReplies?: string[];
  wasVoice?: boolean;
}

export function GramMitraModal({
  visible,
  onClose,
  initialLanguage = 'hi',
  initialComplaintId,
}: GramMitraModalProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<SupportedVoiceLanguage>(initialLanguage);
  const [sessionContext, setSessionContext] = useState<Record<string, any>>({});
  const [conversationId] = useState<string>(() => 'chat_' + Date.now());

  // Voice Assistance State
  const [voiceMode, setVoiceMode] = useState<boolean>(true); // Auto-read aloud when ON
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  // Pulse animation for recording mic
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    if (isListening) {
      animLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      animLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isListening]);

  // Load voice mode preference from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('@gram_mitra_voice_mode');
        if (saved !== null) {
          setVoiceMode(saved === 'true');
        }
      } catch {}
    })();
  }, []);

  // Stop speech if modal is closed
  useEffect(() => {
    if (!visible) {
      voiceAssistant.stop();
      voiceAssistant.stopListening();
      setActiveSpeakingId(null);
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [visible]);

  // Initialize Welcome Message
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcomeText =
        language === 'hi'
          ? 'नमस्ते! मैं आपका **ग्राम मित्र** AI आवाज़ व नागरिक सहायक हूँ। 🙏\n\nआप मुझसे बोलकर या लिखकर बात कर सकते हैं:\n• नई शिकायत दर्ज करना ("नल खराब है")\n• शिकायत की स्थिति जांचना ("#38 का स्टेटस")\n• समाधान समय सीमा व नियम\n• लंबित मामलों को आगे बढ़ाना'
          : language === 'hinglish'
          ? 'Namaste! Main aapka **Gram Mitra** AI Voice Assistant hu. 🙏\n\nAap bolkar ya likhkar complaint register kar sakte hain, purani complaint ka status pooch sakte hain (#38), ya rules jaan sakte hain.'
          : 'Hello! I am **Gram Mitra**, your AI Voice & Grievance Assistant. 🙏\n\nYou can speak or type:\n• File a grievance ("Broken water pipe")\n• Track complaint status ("Status of #38")\n• Check resolution timelines\n• Escalate delayed complaints';

      const initialQuickReplies =
        language === 'hi'
          ? ['🎤 आवाज़ से शिकायत दर्ज करें', '🔍 स्थिति जांचें (#38)', '⏱️ समाधान समय सीमा (SLA)', '⚡ शिकायत एस्केलेट करें']
          : language === 'hinglish'
          ? ['🎤 Voice Complaint', '🔍 Track Status (#38)', '⏱️ Resolution Time', '⚡ Escalate Complaint']
          : ['🎤 Speak Grievance', '🔍 Track Status (#38)', '⏱️ Resolution Time', '⚡ Escalate Issue'];

      const welcomeMsg: MessageItem = {
        id: 'welcome_1',
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: initialQuickReplies,
      };

      setMessages([welcomeMsg]);

      if (initialComplaintId) {
        handleSend(`Track complaint #${initialComplaintId}`);
      }
    }
  }, [visible, language]);

  // Stop speech helper
  const handleStopSpeech = async () => {
    await voiceAssistant.stop();
    setActiveSpeakingId(null);
  };

  // Speak a specific bot message
  const speakMessage = (id: string, text: string) => {
    if (activeSpeakingId === id) {
      handleStopSpeech();
      return;
    }

    setActiveSpeakingId(id);
    voiceAssistant.speak(text, {
      id,
      language,
      onDone: () => setActiveSpeakingId(null),
      onError: () => setActiveSpeakingId(null),
    });
  };

  // ==========================================
  // SPEECH-TO-TEXT (VOICE INPUT)
  // ==========================================
  const startVoiceInput = async () => {
    // 1. Immediately stop any bot speech playing so it doesn't talk over user
    await handleStopSpeech();

    // 2. Try Web Speech API (Chrome, Edge, Safari, Firefox web simulator)
    if (voiceAssistant.isWebSpeechRecognitionSupported()) {
      setIsListening(true);
      setInterimTranscript('');

      const started = voiceAssistant.startWebSpeechRecognition({
        language,
        onStart: () => {
          setIsListening(true);
        },
        onInterim: (text) => {
          setInterimTranscript(text);
          setInputText(text);
        },
        onFinal: (finalText) => {
          setIsListening(false);
          setInterimTranscript('');
          if (finalText && finalText.trim()) {
            setInputText(finalText.trim());
            handleSend(finalText.trim(), true);
          }
        },
        onEnd: () => {
          setIsListening(false);
        },
        onError: (err) => {
          console.log('Web speech error:', err);
          setIsListening(false);
        },
      });

      if (started) return;
    }

    // 3. Fallback: Native audio recording via expo-audio
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          language === 'hi' ? 'माइक्रोफ़ोन अनुमति' : 'Microphone Permission',
          language === 'hi'
            ? 'आवाज़ से बोलने के लिए माइक्रोफ़ोन की अनुमति आवश्यक है।'
            : 'Microphone permission is required to record audio.'
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsListening(true);
      setInterimTranscript(
        language === 'hi' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now'
      );
    } catch (error) {
      console.log('Audio recording error:', error);
      Alert.alert(
        language === 'hi' ? 'रिकॉर्डिंग त्रुटि' : 'Recording Error',
        language === 'hi'
          ? 'माइक्रोफ़ोन शुरू नहीं हो सका।'
          : 'Unable to start audio recording.'
      );
    }
  };

  const stopVoiceInputAndSend = async () => {
    setIsListening(false);
    voiceAssistant.stopListening();

    // If native audio recorder was used:
    if (recorderState.isRecording) {
      try {
        await audioRecorder.stop();
        if (audioRecorder.uri) {
          setLoading(true);
          try {
            let base64Audio = '';
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              const res = await fetch(audioRecorder.uri);
              const blob = await res.blob();
              const reader = new FileReader();
              base64Audio = await new Promise((resolve) => {
                reader.onloadend = () => {
                  const dataUrl = reader.result as string;
                  resolve(dataUrl.split(',')[1] || dataUrl);
                };
                reader.readAsDataURL(blob);
              });
            }

            if (base64Audio) {
              const transcribeRes = await chatApi.transcribeAudio(base64Audio, language);
              if (transcribeRes && transcribeRes.text && transcribeRes.text.trim()) {
                handleSend(transcribeRes.text.trim(), true);
                setInterimTranscript('');
                return;
              }
            }
          } catch (e) {
            console.log('Transcription call failed:', e);
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.log('Error stopping native audio recorder:', err);
      }
    }

    // If live transcript exists:
    if (
      interimTranscript.trim() &&
      interimTranscript !== 'सुन रहा हूँ... बोलिए' &&
      interimTranscript !== 'Listening... Speak now'
    ) {
      handleSend(interimTranscript.trim(), true);
      setInterimTranscript('');
    } else if (inputText.trim()) {
      handleSend(inputText.trim(), true);
    }
  };

  const cancelVoiceInput = async () => {
    setIsListening(false);
    setInterimTranscript('');
    voiceAssistant.stopListening();
    if (recorderState.isRecording) {
      try {
        await audioRecorder.stop();
      } catch {}
    }
  };

  // ==========================================
  // SEND MESSAGE HANDLER
  // ==========================================
  const handleSend = async (textToSend?: string, wasSpoken: boolean = false) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    // Stop speaking when user sends a new message
    await handleStopSpeech();

    const userMsg: MessageItem = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wasVoice: wasSpoken,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const activeSession = { ...sessionContext };
      if (!activeSession.citizen_mobile) {
        try {
          const userSessionData = await AsyncStorage.getItem('user_session');
          const storedCitizen = await AsyncStorage.getItem('citizen');
          const villageSession = await AsyncStorage.getItem('@village_user_session');
          const parsedSession = userSessionData ? JSON.parse(userSessionData) : null;
          const parsedCitizen = storedCitizen ? JSON.parse(storedCitizen) : null;
          const parsedVillage = villageSession ? JSON.parse(villageSession) : null;
          const mob =
            parsedSession?.mobile ||
            parsedSession?.mobileNumber ||
            parsedCitizen?.mobile ||
            parsedCitizen?.mobileNumber ||
            parsedVillage?.mobile ||
            parsedVillage?.mobileNumber;
          if (mob) {
            activeSession.citizen_mobile = mob;
          }
        } catch (ignored) {}
      }

      const res: ChatMessageResult = await chatApi.sendMessage({
        message: text,
        language,
        conversationId,
        sessionContext: activeSession,
      });

      if (res.sessionContext) {
        setSessionContext(res.sessionContext);
      }

      const botMsg: MessageItem = {
        id: 'bot_' + Date.now(),
        sender: 'bot',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: res.intent,
        complaintData: res.complaintData,
        aiAnalysis: res.aiAnalysis,
        quickReplies: res.quickReplies,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Automatically speak reply if Voice Mode is active
      if (voiceMode && res.reply) {
        speakMessage(botMsg.id, res.reply);
      }
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text:
          language === 'hi'
            ? 'क्षमा करें, संदेश भेजने में समस्या आई। कृपया पुनः प्रयास करें।'
            : 'Sorry, there was an issue communicating with Gram Mitra. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: ['Try Again', 'Main Menu'],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const getPriorityBadgeColor = (prio?: string) => {
    switch (String(prio).toUpperCase()) {
      case 'CRITICAL':
      case 'VERY_HIGH':
        return { bg: '#FEE2E2', text: '#DC2626' };
      case 'HIGH':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'LOW':
        return { bg: '#DCFCE7', text: '#16A34A' };
      default:
        return { bg: '#E0F2FE', text: '#0284C7' };
    }
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (String(status).toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'IN_PROGRESS':
      case 'ACTION_TAKEN':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'ESCALATED':
      case 'OVERDUE':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#EDE9FE', text: '#6D28D9' };
    }
  };

  const handleCloseModal = async () => {
    await handleStopSpeech();
    cancelVoiceInput();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleCloseModal}>
      <SafeAreaView style={styles.safeArea}>
        {/* TRICOLOR TOP HEADER */}
        <View style={styles.tricolorHeader}>
          <View style={styles.saffron} />
          <View style={styles.white} />
          <View style={styles.green} />
        </View>

        {/* MODAL HEADER */}
        <View style={styles.header}>
          <View style={styles.botHeaderInfo}>
            <View style={styles.botAvatar}>
              <Ionicons name="chatbubbles" size={20} color={COLORS.white} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.headerTitle}>ग्राम मित्र (Gram Mitra)</Text>
                <View style={styles.onlineDot} />
              </View>
              <Text style={styles.headerSubtitle}>AI Voice Assistant • 24/7 Active</Text>
            </View>
          </View>

          {/* ACTIONS: VOICE TOGGLE, LANGUAGE & CLOSE */}
          <View style={styles.headerActions}>
            {/* Auto-Voice Output Toggle */}
            <TouchableOpacity
              style={[styles.voiceToggleBadge, voiceMode && styles.voiceToggleBadgeActive]}
              onPress={() => {
                const next = !voiceMode;
                setVoiceMode(next);
                AsyncStorage.setItem('@gram_mitra_voice_mode', String(next));
                if (!next) {
                  handleStopSpeech();
                }
              }}
              activeOpacity={0.7}
              accessibilityLabel="Voice Mode Toggle"
            >
              <Ionicons
                name={voiceMode ? 'volume-high' : 'volume-mute'}
                size={14}
                color={voiceMode ? '#16A34A' : COLORS.textMuted}
              />
              <Text style={[styles.voiceToggleText, voiceMode && styles.voiceToggleTextActive]}>
                {voiceMode
                  ? language === 'hi'
                    ? 'आवाज़ ऑन'
                    : 'Voice ON'
                  : language === 'hi'
                  ? 'आवाज़ बंद'
                  : 'Voice OFF'}
              </Text>
            </TouchableOpacity>

            {/* Language toggle */}
            <TouchableOpacity
              style={styles.langBadge}
              onPress={() => {
                handleStopSpeech();
                const nextLang: SupportedVoiceLanguage =
                  language === 'hi' ? 'hinglish' : language === 'hinglish' ? 'en' : 'hi';
                setLanguage(nextLang);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.langBadgeText}>
                {language === 'hi' ? '🇮🇳 हिंदी' : language === 'hinglish' ? '🇮🇳 Hinglish' : '🌐 English'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* CHAT MESSAGES BODY */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.chatContainer}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.messageRow,
                  item.sender === 'user' ? styles.userRow : styles.botRow,
                ]}
              >
                {item.sender === 'bot' && (
                  <View style={styles.smallBotAvatar}>
                    <Ionicons name="sparkles" size={12} color={COLORS.white} />
                  </View>
                )}

                <View style={{ maxWidth: '85%' }}>
                  {/* MESSAGE BUBBLE */}
                  <View
                    style={[
                      styles.bubble,
                      item.sender === 'user' ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        item.sender === 'user' ? styles.userBubbleText : styles.botBubbleText,
                      ]}
                    >
                      {item.text}
                    </Text>

                    {/* BUBBLE FOOTER: SPEAKER BUTTON + TIMESTAMP */}
                    <View style={styles.bubbleFooter}>
                      {item.sender === 'bot' && (
                        <TouchableOpacity
                          style={[
                            styles.ttsButton,
                            activeSpeakingId === item.id && styles.ttsButtonActive,
                          ]}
                          onPress={() => speakMessage(item.id, item.text)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={activeSpeakingId === item.id ? 'pause-circle' : 'volume-high-outline'}
                            size={14}
                            color={activeSpeakingId === item.id ? COLORS.primary : COLORS.textMuted}
                          />
                          <Text
                            style={[
                              styles.ttsButtonLabel,
                              activeSpeakingId === item.id && styles.ttsButtonLabelActive,
                            ]}
                          >
                            {activeSpeakingId === item.id
                              ? language === 'hi'
                                ? 'रुकें'
                                : 'Stop'
                              : language === 'hi'
                              ? 'सुनें'
                              : 'Listen'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {item.wasVoice && (
                          <Ionicons name="mic" size={11} color="rgba(255,255,255,0.7)" />
                        )}
                        <Text
                          style={[
                            styles.timestampText,
                            item.sender === 'user' ? styles.userTimestamp : styles.botTimestamp,
                          ]}
                        >
                          {item.timestamp}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* COMPLAINT STATUS CARD */}
                  {item.complaintData && (
                    <View style={styles.cardPreview}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.cardHeaderTitle}>
                          #GRV-{String(item.complaintData.id).padStart(3, '0')}
                        </Text>
                        <View
                          style={[
                            styles.statusPill,
                            { backgroundColor: getStatusBadgeColor(item.complaintData.status).bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: getStatusBadgeColor(item.complaintData.status).text },
                            ]}
                          >
                            {item.complaintData.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardDetailRow}>
                        <Text style={styles.cardDetailLabel}>Category:</Text>
                        <Text style={styles.cardDetailVal}>
                          {item.complaintData.category || item.complaintData.problemType}
                        </Text>
                      </View>

                      <View style={styles.cardDetailRow}>
                        <Text style={styles.cardDetailLabel}>Priority:</Text>
                        <Text
                          style={[
                            styles.cardDetailVal,
                            {
                              color: getPriorityBadgeColor(item.complaintData.priority).text,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {item.complaintData.priority}
                        </Text>
                      </View>

                      {item.complaintData.location && (
                        <View style={styles.cardDetailRow}>
                          <Text style={styles.cardDetailLabel}>Location:</Text>
                          <Text style={styles.cardDetailVal}>{item.complaintData.location}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* QUICK REPLIES */}
                  {item.quickReplies && item.quickReplies.length > 0 && (
                    <View style={styles.quickRepliesContainer}>
                      {item.quickReplies.map((qr, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.quickReplyChip}
                          onPress={() => handleSend(qr)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.quickReplyText}>{qr}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}

            {loading && (
              <View style={[styles.messageRow, styles.botRow]}>
                <View style={styles.smallBotAvatar}>
                  <Ionicons name="sparkles" size={12} color={COLORS.white} />
                </View>
                <View style={[styles.bubble, styles.botBubble, { paddingVertical: 10 }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* ACTIVE VOICE LISTENING BANNER */}
          {isListening && (
            <View style={styles.listeningOverlay}>
              <View style={styles.listeningIndicatorRow}>
                <Animated.View
                  style={[
                    styles.pulsingMicOuter,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <View style={styles.pulsingMicInner}>
                    <Ionicons name="mic" size={18} color={COLORS.white} />
                  </View>
                </Animated.View>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.listeningTitle}>
                    {language === 'hi'
                      ? '🎙️ सुन रहा हूँ... अपनी शिकायत बोलिए'
                      : '🎙️ Listening... Speak your grievance'}
                  </Text>
                  <Text style={styles.listeningSubtitle} numberOfLines={2}>
                    {interimTranscript ||
                      (language === 'hi'
                        ? 'आवाज़ पहचानी जा रही है...'
                        : 'Listening to your voice...')}
                  </Text>
                </View>

                {/* CANCEL & SEND BUTTONS */}
                <TouchableOpacity
                  style={styles.cancelListeningBtn}
                  onPress={cancelVoiceInput}
                  activeOpacity={0.7}
                  accessibilityLabel="Cancel voice input"
                >
                  <Ionicons name="close" size={18} color="#EF4444" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendListeningBtn}
                  onPress={stopVoiceInputAndSend}
                  activeOpacity={0.7}
                  accessibilityLabel="Send spoken voice input"
                >
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* INPUT BAR */}
          <View style={styles.inputBar}>
            {/* MICROPHONE BUTTON */}
            <TouchableOpacity
              style={[
                styles.micButton,
                isListening && styles.micButtonActive,
              ]}
              onPress={isListening ? stopVoiceInputAndSend : startVoiceInput}
              activeOpacity={0.8}
              accessibilityLabel="Microphone Voice Input"
            >
              <Ionicons
                name={isListening ? 'stop' : 'mic'}
                size={20}
                color={isListening ? COLORS.white : COLORS.primary}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder={
                language === 'hi'
                  ? 'लिखें या 🎤 दबाकर बोलें...'
                  : language === 'hinglish'
                  ? 'Likhain ya 🎤 dabakar bolein...'
                  : 'Type or tap 🎤 to speak...'
              }
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || loading) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tricolorHeader: {
    flexDirection: 'row',
    height: 3,
  },
  saffron: { flex: 1, backgroundColor: '#FF9933' },
  white: { flex: 1, backgroundColor: '#FFFFFF' },
  green: { flex: 1, backgroundColor: '#138808' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  botHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginLeft: 6,
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  voiceToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  voiceToggleBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  voiceToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  voiceToggleTextActive: {
    color: '#15803D',
  },
  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  langBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 4,
  },

  chatContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  smallBotAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    ...SHADOWS.small,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userBubbleText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  botBubbleText: {
    color: COLORS.textPrimary,
  },

  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ttsButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  ttsButtonLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  ttsButtonLabelActive: {
    color: COLORS.primary,
  },

  timestampText: {
    fontSize: 10,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  botTimestamp: {
    color: COLORS.textMuted,
  },

  cardPreview: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cardDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardDetailVal: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  quickRepliesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickReplyChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.round,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...SHADOWS.small,
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ACTIVE LISTENING OVERLAY
  listeningOverlay: {
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  listeningIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingMicOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingMicInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  listeningSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  cancelListeningBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendListeningBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    ...SHADOWS.small,
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.round,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});
