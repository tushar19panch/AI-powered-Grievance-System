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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatApi, ChatMessageResult } from '../services/api';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface GramMitraModalProps {
  visible: boolean;
  onClose: () => void;
  initialLanguage?: 'hi' | 'en' | 'hinglish';
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
  const [language, setLanguage] = useState<'hi' | 'en' | 'hinglish'>(initialLanguage);
  const [sessionContext, setSessionContext] = useState<Record<string, any>>({});
  const [conversationId] = useState<string>(() => 'chat_' + Date.now());

  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize Welcome Message
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcomeText = language === 'hi'
        ? 'नमस्ते! मैं आपका **ग्राम मित्र** AI नागरिक सहायक हूँ। 🙏\n\nमैं आपकी क्या सहायता कर सकता हूँ?\n• नई शिकायत दर्ज करना\n• शिकायत की स्थिति जांचना (जैसे #38)\n• समाधान समय सीमा व नियम\n• लंबित मामलों को आगे बढ़ाना (Escalation)'
        : language === 'hinglish'
        ? 'Namaste! Main aapka **Gram Mitra** AI Assistant hu. 🙏\n\nAap mujhse nayi complaint register karwa sakte hain, purani complaint ka status check kar sakte hain (#38), ya rules pooch sakte hain.'
        : 'Hello! I am **Gram Mitra**, your AI Citizen Grievance Assistant. 🙏\n\nHow can I help you today?\n• File a new civic grievance\n• Track complaint status (e.g. #38)\n• Check resolution timelines\n• Escalate delayed complaints';

      const initialQuickReplies = language === 'hi'
        ? ['📝 शिकायत दर्ज करें', '🔍 स्थिति जांचें (#38)', '⏱️ समाधान समय सीमा (SLA)', '⚡ शिकायत एस्केलेट करें']
        : language === 'hinglish'
        ? ['📝 Report Problem', '🔍 Track Status (#38)', '⏱️ Resolution Time', '⚡ Escalate Complaint']
        : ['📝 File Complaint', '🔍 Track Status (#38)', '⏱️ Resolution Time', '⚡ Escalate Issue'];

      setMessages([
        {
          id: 'welcome_1',
          sender: 'bot',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          quickReplies: initialQuickReplies,
        },
      ]);

      if (initialComplaintId) {
        handleSend(`Track complaint #${initialComplaintId}`);
      }
    }
  }, [visible, language]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMsg: MessageItem = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          const mob = parsedSession?.mobile || parsedSession?.mobileNumber ||
                      parsedCitizen?.mobile || parsedCitizen?.mobileNumber ||
                      parsedVillage?.mobile || parsedVillage?.mobileNumber;
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
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: 'bot_err_' + Date.now(),
        sender: 'bot',
        text: language === 'hi'
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

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
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
              <Text style={styles.headerSubtitle}>AI Citizen Assistant • 24/7 Active</Text>
            </View>
          </View>

          {/* LANGUAGE TOGGLE & CLOSE */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.langBadge}
              onPress={() => {
                const nextLang = language === 'hi' ? 'hinglish' : language === 'hinglish' ? 'en' : 'hi';
                setLanguage(nextLang);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.langBadgeText}>
                {language === 'hi' ? '🇮🇳 हिंदी' : language === 'hinglish' ? '🇮🇳 Hinglish' : '🌐 English'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
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

                    <Text
                      style={[
                        styles.timestampText,
                        item.sender === 'user' ? styles.userTimestamp : styles.botTimestamp,
                      ]}
                    >
                      {item.timestamp}
                    </Text>
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
                            { color: getPriorityBadgeColor(item.complaintData.priority).text, fontWeight: '700' },
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

          {/* INPUT BAR */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder={
                language === 'hi'
                  ? 'अपनी शिकायत या प्रश्न यहाँ लिखें...'
                  : language === 'hinglish'
                  ? 'Apni complaint ya sawal likhein...'
                  : 'Type your grievance or question here...'
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  botHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 16,
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
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  langBadgeText: {
    fontSize: 12,
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
    padding: 16,
    paddingBottom: 24,
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
  timestampText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    backgroundColor: '#EFF6FF',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: '700',
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  sendButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});
