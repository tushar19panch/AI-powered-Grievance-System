import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useLanguage } from '../i18n/LanguageContext';
import { complaintApi } from '../services/api';
import { queueOfflineComplaint } from '../services/offlineSyncService';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../theme';

interface SubmittedComplaintInfo {
  id: string;
  problemType: string;
  category: string;
  department: string;
  priority: string;
  sentiment: string;
  ward: string;
  location: string;
  description: string;
  status: string;
  photo?: string | null;
  audioUrl?: string | null;
  isOffline?: boolean;
}

export default function ReportScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal State with AI details
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedData, setSubmittedData] = useState<SubmittedComplaintInfo | null>(null);

  const [userName, setUserName] = useState('');
  const [ward, setWard] = useState('');
  const [problemWard, setProblemWard] = useState('');
  const [differentWard, setDifferentWard] = useState(false);
  const [showWardList, setShowWardList] = useState(false);

  // Audio Recording & Voice-to-Text State
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
  const recorderState = useAudioRecorderState(audioRecorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(audioUri);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  const wardOptions = Array.from(
    { length: 20 },
    (_, index) => `Ward ${index + 1}`
  );

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  // ==========================================
  // LOAD CITIZEN
  // ==========================================
  useEffect(() => {
    const loadUser = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('user_session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const storedCitizen = await AsyncStorage.getItem('citizen');
        const citizen = storedCitizen ? JSON.parse(storedCitizen) : null;

        const name = session?.name || citizen?.name || '';
        const userWard = session?.ward || citizen?.ward || '';

        setUserName(name);
        setWard(userWard);
        setProblemWard(userWard || 'Ward 1');
      } catch (error) {
        console.log('Unable to load user:', error);
      }
    };

    loadUser();
  }, []);

  // ==========================================
  // IMAGE CONVERSION HELPER
  // ==========================================
  const processImageUri = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    if (asset.base64) {
      return asset.base64.startsWith('data:')
        ? asset.base64
        : `data:image/jpeg;base64,${asset.base64}`;
    }
    const uri = asset.uri;
    if (uri && uri.startsWith('data:')) {
      return uri;
    }
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(uri);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.log('Error converting image to data URL:', e);
      return uri;
    }
  };

  // ==========================================
  // CAMERA
  // ==========================================
  const takePhoto = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isHindi ? 'कैमरा अनुमति' : 'Camera Permission',
            isHindi
              ? 'फोटो लेने के लिए कैमरा अनुमति आवश्यक है।'
              : 'Camera permission is required to take a photo.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const photoUri = await processImageUri(result.assets[0]);
        setImage(photoUri);
      }
    } catch (err) {
      console.log('Camera error:', err);
    }
  };

  // ==========================================
  // GALLERY
  // ==========================================
  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isHindi ? 'गैलरी अनुमति' : 'Gallery Permission',
            isHindi
              ? 'फोटो चुनने के लिए गैलरी अनुमति आवश्यक है।'
              : 'Gallery permission is required to select a photo.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const photoUri = await processImageUri(result.assets[0]);
        setImage(photoUri);
      }
    } catch (err) {
      console.log('Gallery picker error:', err);
    }
  };

  const removePhoto = () => {
    setImage(null);
  };

  // ==========================================
  // VOICE-TO-TEXT & AUDIO RECORDING
  // ==========================================
  const startSpeechToText = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = isHindi ? 'hi-IN' : 'en-IN';

          recognition.onstart = () => {
            setIsTranscribing(true);
          };

          recognition.onresult = (event: any) => {
            let fullTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript + ' ';
            }
            if (fullTranscript.trim()) {
              setDescription((prev) => {
                // If previous was empty, set directly, otherwise append clean text
                return fullTranscript.trim();
              });
            }
          };

          recognition.onerror = (e: any) => {
            console.log('Speech recognition error:', e);
            setIsTranscribing(false);
          };

          recognition.onend = () => {
            setIsTranscribing(false);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (err) {
          console.log('Web speech init error:', err);
        }
      }
    }
  };

  const stopSpeechToText = () => {
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    setIsTranscribing(false);
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          isHindi ? 'माइक्रोफोन अनुमति' : 'Microphone Permission',
          isHindi
            ? 'आवाज़ रिकॉर्ड करने के लिए माइक्रोफोन की अनुमति आवश्यक है।'
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

      // Also trigger real-time Voice-to-Text transcription
      startSpeechToText();
    } catch (error) {
      console.log('Audio recording error:', error);
      Alert.alert(
        isHindi ? 'रिकॉर्डिंग शुरू नहीं हुई' : 'Recording Error',
        isHindi
          ? 'ऑडियो रिकॉर्डिंग शुरू नहीं हो सकी।'
          : 'Unable to start audio recording.'
      );
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        setAudioUri(audioRecorder.uri);
      }
      stopSpeechToText();
    } catch (error) {
      console.log('Audio stop error:', error);
      stopSpeechToText();
    }
  };

  const removeAudio = () => {
    try {
      audioPlayer.pause();
      audioPlayer.seekTo(0);
    } catch {}
    setAudioUri(null);
  };

  const toggleAudioPlayback = () => {
    if (!audioUri) return;
    try {
      if (audioPlayer.playing) {
        audioPlayer.pause();
      } else {
        audioPlayer.play();
      }
    } catch (error) {
      console.log('Audio playback error:', error);
    }
  };

  const handleSelectMyWard = () => {
    setDifferentWard(false);
    setShowWardList(false);
    setProblemWard(ward || 'Ward 1');
  };

  const handleSelectOtherWardTab = () => {
    setDifferentWard(true);
    setShowWardList(true);
  };

  const handlePickSpecificWard = (selectedWard: string) => {
    setProblemWard(selectedWard);
    setShowWardList(false);
  };

  // ==========================================
  // LOCATION
  // ==========================================
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isHindi ? 'लोकेशन अनुमति' : 'Location Permission',
          isHindi
            ? 'GPS लोकेशन प्राप्त करने के लिए अनुमति आवश्यक है।'
            : 'Location permission is required.'
        );
        setIsGettingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const latitude = currentLocation.coords.latitude.toFixed(6);
      const longitude = currentLocation.coords.longitude.toFixed(6);

      setLocation(`${latitude}, ${longitude}`);
    } catch (error) {
      Alert.alert(
        isHindi ? 'लोकेशन में समस्या' : 'Location Error',
        isHindi
          ? 'आपकी वर्तमान लोकेशन प्राप्त नहीं हो सकी।'
          : 'Unable to get your current location.'
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const extractWardFromText = (text: string): string | null => {
    if (!text) return null;
    const match = text.match(/(?:ward|वार्ड|w)[\s\-:]*(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 50) {
        return `Ward ${num}`;
      }
    }
    return null;
  };

  const detectedWard = extractWardFromText(description);

  // ==========================================
  // SUBMIT PROBLEM
  // ==========================================
  const submitProblem = async () => {
    const hasText = description.trim().length > 0;
    const hasAudio = !audioUri;

    if ((!hasText && !hasAudio) || !image || !problemWard) {
      Alert.alert(
        isHindi ? 'जानकारी अधूरी है' : 'Missing Information',
        isHindi
          ? 'कृपया समस्या का विवरण (बोलकर या लिखकर), समस्या का वार्ड और फोटो दर्ज करें।'
          : 'Please provide the problem description (voice or text), ward and photo.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (location) {
        const parts = location.split(',');
        if (parts.length >= 2) {
          const pLat = parseFloat(parts[0].trim());
          const pLng = parseFloat(parts[1].trim());
          if (!isNaN(pLat)) lat = pLat;
          if (!isNaN(pLng)) lng = pLng;
        }
      }

      const finalDescription = hasText
        ? description.trim()
        : isHindi
          ? 'आवाज़ रिकॉर्डिंग द्वारा दर्ज समस्या'
          : 'Voice recorded problem description';

      // Convert audio recording to Base64 so it can be played anywhere
      let audioPayload = audioUri;
      if (audioUri && (audioUri.startsWith('file://') || audioUri.startsWith('/'))) {
        try {
          const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
            encoding: 'base64',
          });
          if (base64Audio) {
            audioPayload = `data:audio/m4a;base64,${base64Audio}`;
          }
        } catch (fsErr) {
          console.log('Audio base64 conversion error:', fsErr);
        }
      }

      const effectiveWard = problemWard || ward || 'Ward 1';

      // Smart Category & Priority inference fallback
      const lowerDesc = finalDescription.toLowerCase();
      let deducedCategory = 'Village Issue';
      let deducedProblemType = 'General Problem';
      let deducedPriority = 'MEDIUM';
      let deducedDepartment = 'General Grievance / Administration';
      let deducedSentiment = 'NEUTRAL';

      if (lowerDesc.includes('पानी') || lowerDesc.includes('जल') || lowerDesc.includes('नल') || lowerDesc.includes('पाइप') || lowerDesc.includes('water') || lowerDesc.includes('हैंडपंप') || lowerDesc.includes('tanker')) {
        deducedCategory = 'Water Supply';
        deducedProblemType = 'Water Supply';
        deducedDepartment = 'Water Supply Department';
      } else if (lowerDesc.includes('सड़क') || lowerDesc.includes('मार्ग') || lowerDesc.includes('रास्ता') || lowerDesc.includes('गड्ढा') || lowerDesc.includes('road') || lowerDesc.includes('pothole') || lowerDesc.includes('खड़ंजा') || lowerDesc.includes('पुलिया')) {
        deducedCategory = 'Roads & Transportation';
        deducedProblemType = 'Roads & Transportation';
        deducedDepartment = 'Roads & Transportation Department';
      } else if (lowerDesc.includes('लाइट') || lowerDesc.includes('बल्ब') || lowerDesc.includes('अंधेरा') || lowerDesc.includes('light') || lowerDesc.includes('बिजली') || lowerDesc.includes('तार') || lowerDesc.includes('करंट') || lowerDesc.includes('खंभा') || lowerDesc.includes('पोल') || lowerDesc.includes('ट्रांसफार्मर')) {
        deducedCategory = 'Electricity';
        deducedProblemType = 'Electricity';
        deducedDepartment = 'Electricity Department';
      } else if (lowerDesc.includes('कचरा') || lowerDesc.includes('सफाई') || lowerDesc.includes('कूड़ा') || lowerDesc.includes('गंदगी') || lowerDesc.includes('garbage') || lowerDesc.includes('waste') || lowerDesc.includes('कूड़ेदान')) {
        deducedCategory = 'Waste Management';
        deducedProblemType = 'Waste Management';
        deducedDepartment = 'Waste Management Department';
      } else if (lowerDesc.includes('नाली') || lowerDesc.includes('जल निकासी') || lowerDesc.includes('drain') || lowerDesc.includes('ganda paani') || lowerDesc.includes('गटर') || lowerDesc.includes('सीवर')) {
        deducedCategory = 'Drainage';
        deducedProblemType = 'Drainage';
        deducedDepartment = 'Drainage Department';
      } else if (lowerDesc.includes('शौचालय') || lowerDesc.includes('टॉयलेट') || lowerDesc.includes('toilet') || lowerDesc.includes('sanitation') || lowerDesc.includes('इज्जत घर')) {
        deducedCategory = 'Sanitation';
        deducedProblemType = 'Sanitation';
        deducedDepartment = 'Sanitation Department';
      } else if (lowerDesc.includes('अस्पताल') || lowerDesc.includes('दवा') || lowerDesc.includes('डॉक्टर') || lowerDesc.includes('hospital') || lowerDesc.includes('medicine') || lowerDesc.includes('clinic') || lowerDesc.includes('नर्स') || lowerDesc.includes('इलाज')) {
        deducedCategory = 'Healthcare';
        deducedProblemType = 'Healthcare';
        deducedDepartment = 'Health Department';
      } else if (lowerDesc.includes('स्कूल') || lowerDesc.includes('विद्यालय') || lowerDesc.includes('school') || lowerDesc.includes('शिक्षक') || lowerDesc.includes('मिड डे मील') || lowerDesc.includes('आंगनवाड़ी')) {
        deducedCategory = 'Education';
        deducedProblemType = 'Education';
        deducedDepartment = 'Education Department';
      } else if (lowerDesc.includes('पशु') || lowerDesc.includes('कुत्ता') || lowerDesc.includes('गाय') || lowerDesc.includes('भैंस') || lowerDesc.includes('animal') || lowerDesc.includes('dog') || lowerDesc.includes('मवेशी')) {
        deducedCategory = 'Animal & Veterinary';
        deducedProblemType = 'Animal & Veterinary';
        deducedDepartment = 'Animal & Veterinary Department';
      } else if (lowerDesc.includes('राशन') || lowerDesc.includes('पेंशन') || lowerDesc.includes('ration') || lowerDesc.includes('pension') || lowerDesc.includes('योजना')) {
        deducedCategory = 'Welfare Services';
        deducedProblemType = 'Welfare Services';
        deducedDepartment = 'Welfare Services Department';
      } else if (lowerDesc.includes('जमीन') || lowerDesc.includes('पटवारी') || lowerDesc.includes('खसरा') || lowerDesc.includes('property') || lowerDesc.includes('अतिक्रमण') || lowerDesc.includes('कब्जा')) {
        deducedCategory = 'Property & Revenue';
        deducedProblemType = 'Property & Revenue';
        deducedDepartment = 'Property & Revenue Department';
      }

      if (lowerDesc.includes('आपातकालीन') || lowerDesc.includes('खतरा') || lowerDesc.includes('करंट') || lowerDesc.includes('तुरंत') || lowerDesc.includes('emergency') || lowerDesc.includes('critical') || lowerDesc.includes('urgent') || lowerDesc.includes('danger') || lowerDesc.includes('जान का खतरा') || lowerDesc.includes('तार टूट')) {
        deducedPriority = 'CRITICAL';
      } else if (lowerDesc.includes('गंभीर') || lowerDesc.includes('भारी') || lowerDesc.includes('बंद पड़ा') || lowerDesc.includes('severe') || lowerDesc.includes('heavy') || lowerDesc.includes('blocked') || lowerDesc.includes('५ दिन') || lowerDesc.includes('5 दिन') || lowerDesc.includes('डॉक्टर नहीं')) {
        deducedPriority = 'HIGH';
      } else if (lowerDesc.includes('छोटा') || lowerDesc.includes('हल्का') || lowerDesc.includes('minor') || lowerDesc.includes('routine') || lowerDesc.includes('निवेदन')) {
        deducedPriority = 'LOW';
      }

      if (lowerDesc.includes('नहीं') || lowerDesc.includes('खराब') || lowerDesc.includes('समस्या') || lowerDesc.includes('परेशान') || lowerDesc.includes('no') || lowerDesc.includes('bad') || lowerDesc.includes('broken')) {
        deducedSentiment = 'NEGATIVE';
      }

      const payload = {
        problemType: deducedProblemType,
        category: deducedCategory,
        department: deducedDepartment,
        priority: deducedPriority,
        description: finalDescription,
        location: location || `${effectiveWard}`,
        photo: image || undefined,
        audioUrl: audioPayload || audioUri || undefined,
        latitude: lat,
        longitude: lng,
      };

      let backendId: string | null = null;
      let isSavedOffline = false;
      let finalCategory = deducedCategory;
      let finalDepartment = deducedDepartment;
      let finalPriority = deducedPriority;
      let finalSentiment = deducedSentiment;

      try {
        const apiRes = await complaintApi.createComplaint(payload);
        if (apiRes?.id) {
          backendId = String(apiRes.id);
          if (apiRes.category) finalCategory = apiRes.category;
          if (apiRes.department) finalDepartment = apiRes.department;
          if (apiRes.priority) finalPriority = apiRes.priority;
          if (apiRes.sentiment) finalSentiment = apiRes.sentiment;
        }
      } catch (apiErr) {
        console.log('Backend complaint submission failed, queuing offline:', apiErr);
        const offlineItem = await queueOfflineComplaint(payload, {
          citizenName: userName,
          ward: effectiveWard,
        });
        backendId = offlineItem.id;
        isSavedOffline = true;
      }

      if (backendId && audioUri) {
        try {
          await AsyncStorage.setItem(`complaint_audio_${backendId}`, audioUri);
        } catch {}
      }

      const newComplaintId = backendId || String(Date.now());
      setComplaintId(newComplaintId);

      // Set complete submitted details for the Pop-up Modal
      setSubmittedData({
        id: newComplaintId,
        problemType: deducedProblemType,
        category: finalCategory,
        department: finalDepartment,
        priority: finalPriority,
        sentiment: finalSentiment,
        ward: effectiveWard,
        location: location || effectiveWard,
        description: finalDescription,
        status: 'SUBMITTED',
        photo: image,
        audioUrl: audioUri,
        isOffline: isSavedOffline,
      });

      // Show Problem Details Pop-up Modal
      setShowSuccessModal(true);

      // Clear input fields
      setDescription('');
      setImage(null);
      setLocation(null);
      setAudioUri(null);
      setProblemWard(ward || 'Ward 1');
      setDifferentWard(false);
    } catch (error) {
      console.log('Unable to submit complaint:', error);
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi
          ? 'शिकायत दर्ज नहीं हो सकी। कृपया फिर प्रयास करें।'
          : 'Unable to submit complaint. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const p = String(priority || '').toUpperCase();
    if (p === 'CRITICAL' || p === 'VERY_HIGH' || p === 'VERY HIGH') return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
    if (p === 'HIGH') return { bg: '#FFEDD5', text: '#C2410C', border: '#FDBA74' };
    if (p === 'MEDIUM') return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
    return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
  };

  const getSentimentBadge = (sentiment: string) => {
    const s = String(sentiment || '').toUpperCase();
    if (s === 'NEGATIVE') return { label: isHindi ? 'नकारात्मक (Negative)' : 'Negative', icon: 'sad-outline', color: '#DC2626' };
    if (s === 'POSITIVE') return { label: isHindi ? 'सकारात्मक (Positive)' : 'Positive', icon: 'happy-outline', color: '#16A34A' };
    return { label: isHindi ? 'सामान्य (Neutral)' : 'Neutral', icon: 'help-circle-outline', color: '#475569' };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TRICOLOR TOP STRIPE */}
        <View style={styles.tricolorBar}>
          <View style={styles.saffronStripe} />
          <View style={styles.whiteStripe} />
          <View style={styles.greenStripe} />
        </View>

        {/* HEADER WITH BACK BUTTON */}
        <View style={styles.header}>
          <View style={styles.headerLeftRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
            </TouchableOpacity>

            <View>
              <Text style={styles.headerTitle}>
                {isHindi ? 'समस्या दर्ज करें' : 'Report a Problem'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isHindi ? 'AI सक्षम ग्राम पंचायत पोर्टल' : 'AI Powered Grievance Portal'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Ionicons name="language-outline" size={16} color={COLORS.primary} />
            <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </View>

        {/* OFFLINE SYNC BANNER */}
        <OfflineSyncBanner isHindi={isHindi} />

        {/* CITIZEN & REGISTERED WARD SUMMARY BAR */}
        {userName || ward ? (
          <View style={styles.citizenProfileBar}>
            <View style={styles.citizenIconCircle}>
              <Ionicons name="person" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.citizenInfoCol}>
              <Text style={styles.citizenNameText}>{userName || (isHindi ? 'नागरिक' : 'Citizen')}</Text>
              <Text style={styles.citizenWardSub}>
                {ward ? (isHindi ? `पंजीकृत वार्ड: ${ward}` : `Registered: ${ward}`) : (isHindi ? 'ग्राम पंचायत नागरिक' : 'Gram Panchayat Citizen')}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.verifiedText}>{isHindi ? 'सत्यापित' : 'Active'}</Text>
            </View>
          </View>
        ) : null}

        {/* =================================================
            1. PROBLEM WARD SELECTION
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="home-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'समस्या का वार्ड' : 'Problem Ward'}
            </Text>
          </View>
        </View>

        <View style={styles.wardCard}>
          <Text style={styles.wardQuestion}>
            {isHindi ? 'क्या समस्या आपके वार्ड में है?' : 'Is the problem in your ward?'}
          </Text>

          <View style={styles.wardChoiceRow}>
            <TouchableOpacity
              style={[
                styles.wardChoice,
                !differentWard && styles.wardChoiceActive,
              ]}
              onPress={handleSelectMyWard}
              activeOpacity={0.8}
            >
              <Ionicons
                name={!differentWard ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={!differentWard ? COLORS.success : COLORS.textMuted}
              />
              <Text style={[styles.wardChoiceText, !differentWard && styles.wardChoiceTextActive]}>
                {isHindi ? `हाँ (${ward || 'मेरा वार्ड'})` : `Yes (${ward || 'My Ward'})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.wardChoice,
                differentWard && styles.wardChoiceActiveSaffron,
              ]}
              onPress={handleSelectOtherWardTab}
              activeOpacity={0.8}
            >
              <Ionicons
                name={differentWard ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={differentWard ? COLORS.saffron : COLORS.textMuted}
              />
              <Text style={[styles.wardChoiceText, differentWard && styles.wardChoiceTextSaffron]}>
                {isHindi ? 'अन्य वार्ड' : 'Other Ward'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* OPEN WARD LIST ONLY WHEN OTHER WARD IS SELECTED AND LIST IS OPEN */}
          {differentWard && showWardList ? (
            <View style={styles.wardOptionsWrap}>
              <View style={styles.wardOptionsHeaderRow}>
                <Text style={styles.wardSelectLabel}>
                  {isHindi ? 'समस्या वाला वार्ड चुनें:' : 'Select Problem Ward:'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowWardList(false)}
                  style={styles.closeListBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeListText}>{isHindi ? 'बंद करें' : 'Hide'}</Text>
                  <Ionicons name="chevron-up" size={14} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.wardOptionsGrid}>
                {wardOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.wardOption,
                      problemWard === item && styles.wardOptionActive,
                    ]}
                    onPress={() => handlePickSpecificWard(item)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.wardOptionText,
                        problemWard === item && styles.wardOptionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* SELECTED WARD SUMMARY BAR WITH CHANGE BUTTON */}
          <View style={styles.selectedWardRow}>
            <View style={styles.selectedWardLeft}>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              <Text style={styles.selectedWardText}>
                {isHindi ? 'समस्या का वार्ड:' : 'Problem Ward:'}{' '}
                <Text style={styles.selectedWardBold}>{problemWard || ward || 'Ward 1'}</Text>
              </Text>
            </View>

            {differentWard && !showWardList ? (
              <TouchableOpacity
                onPress={() => setShowWardList(true)}
                style={styles.changeWardButton}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={12} color={COLORS.saffron} />
                <Text style={styles.changeWardText}>{isHindi ? 'वार्ड बदलें' : 'Change'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* =================================================
            2. VOICE RECORDING & LIVE VOICE-TO-TEXT (MIC)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="mic-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'आवाज़ रिकॉर्ड करें (Voice to Text)' : 'Record Voice & Voice-to-Text'}
            </Text>
          </View>
        </View>

        <View style={styles.audioCard}>
          <View style={styles.audioTopRow}>
            <View
              style={[
                styles.audioMicCircle,
                recorderState.isRecording && styles.audioMicCircleRecording,
              ]}
            >
              <Ionicons
                name={recorderState.isRecording ? 'radio' : 'mic-outline'}
                size={26}
                color={recorderState.isRecording ? COLORS.error : COLORS.primary}
              />
            </View>

            <View style={styles.audioTextBlock}>
              <Text style={styles.audioTitle}>
                {recorderState.isRecording
                  ? isHindi ? '🎙️ रिकॉर्डिंग व स्पीच-टू-टेक्स्ट जारी...' : '🎙️ Recording & Transcribing...'
                  : audioUri
                    ? isHindi ? 'ऑडियो रिकॉर्ड हो गया' : 'Audio Recorded'
                    : isHindi ? 'बोलकर समस्या बताएं' : 'Speak into Microphone'}
              </Text>
              <Text style={styles.audioDuration}>
                {recorderState.isRecording
                  ? `${Math.floor(recorderState.durationMillis / 1000)}s`
                  : audioUri
                    ? isHindi ? 'ऑडियो व टेक्स्ट तैयार' : 'Audio & Text Ready'
                    : isHindi ? 'AI स्वतः टेक्स्ट में बदलेगा' : 'Auto converts speech to text'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.recordButton,
                recorderState.isRecording && styles.stopRecordButton,
              ]}
              onPress={recorderState.isRecording ? stopRecording : startRecording}
              activeOpacity={0.85}
            >
              <Ionicons
                name={recorderState.isRecording ? 'stop' : 'mic'}
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.recordButtonText}>
                {recorderState.isRecording
                  ? isHindi ? 'रोकें' : 'Stop'
                  : isHindi ? 'रिकॉर्ड' : 'Record'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* LIVE TRANSCRIBING BANNER */}
          {isTranscribing && (
            <View style={styles.transcribingBanner}>
              <ActivityIndicator size="small" color="#EA580C" />
              <Text style={styles.transcribingText}>
                {isHindi ? 'आवाज़ को टेक्स्ट में लिखा जा रहा है...' : 'Converting speech to text in real-time...'}
              </Text>
            </View>
          )}

          {audioUri && !recorderState.isRecording ? (
            <View style={styles.audioActions}>
              <TouchableOpacity
                style={styles.playAudioButton}
                onPress={toggleAudioPlayback}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={audioPlayer.playing ? 'pause' : 'play'}
                  size={17}
                  color={COLORS.primary}
                />
                <Text style={styles.playAudioText}>
                  {audioPlayer.playing
                    ? isHindi ? 'रोकें' : 'Pause'
                    : isHindi ? 'सुनें' : 'Play'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeAudioButton}
                onPress={removeAudio}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.removeAudioText}>
                  {isHindi ? 'हटाएं' : 'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* =================================================
            3. PROBLEM DESCRIPTION (TEXT)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'समस्या का विवरण (AI इनपुट)' : 'Problem Description (AI Input)'}
            </Text>
          </View>
        </View>

        <TextInput
          style={styles.descriptionInput}
          placeholder={
            isHindi
              ? 'यहाँ समस्या का विवरण लिखें या माइक से बोलें (जैसे: 5 दिन से पानी की सप्लाई बंद है, सड़क पर गड्ढा है)...'
              : 'Describe the issue or dictate by voice (e.g. No water supply for 5 days, broken road)...'
          }
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* SMART WARD DETECTION & SYNC BANNER */}
        {detectedWard && detectedWard !== problemWard ? (
          <View style={styles.wardMismatchCard}>
            <View style={styles.mismatchLeft}>
              <Ionicons name="sparkles" size={17} color={COLORS.saffron} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.mismatchTitle}>
                  {isHindi
                    ? `विवरण में "${detectedWard}" मिला`
                    : `"${detectedWard}" detected in details`}
                </Text>
                <Text style={styles.mismatchSub}>
                  {isHindi
                    ? `वर्तमान चयनित: ${problemWard}`
                    : `Currently selected: ${problemWard}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.syncWardBtn}
              onPress={() => {
                setProblemWard(detectedWard);
                setDifferentWard(true);
              }}
              activeOpacity={0.82}
            >
              <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
              <Text style={styles.syncWardBtnText}>
                {isHindi ? `${detectedWard} चुनें` : `Set ${detectedWard}`}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* =================================================
            4. PROBLEM PHOTO
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'समस्या की फोटो' : 'Problem Photo'}
              <Text style={styles.required}> *</Text>
            </Text>
          </View>
        </View>

        {!image ? (
          <View style={styles.photoRow}>
            {/* CAMERA */}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={takePhoto}
              activeOpacity={0.8}
            >
              <View style={styles.photoIcon}>
                <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.photoButtonTitle}>
                {isHindi ? 'कैमरा से फोटो लें' : 'Take Photo'}
              </Text>
              <Text style={styles.photoButtonSub}>
                {isHindi ? 'नया फोटो' : 'Camera'}
              </Text>
            </TouchableOpacity>

            {/* GALLERY */}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.photoIcon}>
                <Ionicons name="images-outline" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.photoButtonTitle}>
                {isHindi ? 'गैलरी से चुनें' : 'Choose Gallery'}
              </Text>
              <Text style={styles.photoButtonSub}>
                {isHindi ? 'मौजूदा फोटो' : 'Gallery'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageCard}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <View style={styles.imageBottom}>
              <View style={styles.imageSuccess}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.imageSuccessText}>
                  {isHindi ? 'फोटो जुड़ गई है' : 'Photo Attached'}
                </Text>
              </View>

              <TouchableOpacity onPress={removePhoto} style={styles.removeButton}>
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.removeText}>{isHindi ? 'हटाएं' : 'Remove'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =================================================
            5. MERGED GPS LOCATION BUTTON / CARD
        ================================================= */}
        <TouchableOpacity
          style={[styles.locationCard, location && styles.locationCardActive]}
          onPress={getCurrentLocation}
          activeOpacity={0.85}
          disabled={isGettingLocation}
        >
          <View style={[styles.locationIconBox, location && styles.locationIconBoxActive]}>
            <Ionicons
              name={location ? 'location' : 'locate-outline'}
              size={22}
              color={location ? COLORS.success : COLORS.primary}
            />
          </View>

          <View style={styles.locationInfoCol}>
            <Text style={styles.locationCardTitle}>
              {location
                ? isHindi ? 'GPS लोकेशन दर्ज हो गई' : 'GPS Location Captured'
                : isGettingLocation
                  ? isHindi ? 'लोकेशन प्राप्त हो रही है...' : 'Fetching location...'
                  : isHindi ? 'वर्तमान GPS लोकेशन जोड़ें' : 'Add Current GPS Location'}
            </Text>
            <Text style={styles.locationCardSub} numberOfLines={1}>
              {location
                ? location
                : isHindi ? 'टैप करके सटीक लोकेशन दर्ज करें (वैकल्पिक)' : 'Tap to capture exact coordinates (Optional)'}
            </Text>
          </View>

          <View style={styles.locationActionTag}>
            <Ionicons
              name={location ? 'checkmark-circle' : 'chevron-forward'}
              size={20}
              color={location ? COLORS.success : COLORS.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
          onPress={submitProblem}
          activeOpacity={0.88}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={18} color={COLORS.white} />
          )}
          <Text style={styles.submitText}>
            {isSubmitting
              ? isHindi ? 'AI विश्लेषण व शिकायत दर्ज हो रही है...' : 'AI Analyzing & Submitting...'
              : isHindi ? 'शिकायत दर्ज करें' : 'Submit Problem'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* =================================================
          CLEAN CITIZEN CONFIRMATION POP-UP MODAL
      ================================================= */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          router.replace('/citizen-dashboard');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* TRICOLOR TOP BAR */}
            <View style={styles.modalTricolorBar}>
              <View style={styles.saffronStripe} />
              <View style={styles.whiteStripe} />
              <View style={styles.greenStripe} />
            </View>

            <View style={styles.modalBodyContent}>
              {/* SUCCESS ICON CIRCLE */}
              <View style={styles.modalSuccessCircle}>
                <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
              </View>

              {/* THANKS & MAIN TITLE */}
              <Text style={styles.modalThankYouTitle}>
                {isHindi ? 'धन्यवाद !' : 'Thank You!'}
              </Text>

              <Text style={styles.modalMainMessage}>
                {isHindi
                  ? 'आपकी समस्या सफलतापूर्वक दर्ज कर ली गई है।'
                  : 'Your problem has been submitted successfully.'}
              </Text>

              {/* RESOLUTION ASSURANCE MESSAGE */}
              <View style={styles.resolutionMessageBox}>
                <Ionicons name="time" size={18} color="#EA580C" />
                <Text style={styles.resolutionMessageText}>
                  {isHindi
                    ? 'आपकी समस्या का समाधान जल्द ही किया जाएगा।'
                    : 'Your problem will be resolved soon.'}
                </Text>
              </View>

              {/* COMPLAINT ID BADGE */}
              {submittedData?.id ? (
                <View style={styles.modalTicketPill}>
                  <Ionicons name="ticket-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.modalTicketText}>
                    {isHindi ? 'शिकायत संख्या:' : 'Complaint ID:'} #{submittedData?.id}
                  </Text>
                </View>
              ) : null}

              {/* ACTION BUTTONS */}
              <View style={styles.modalActionGroup}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setShowSuccessModal(false);
                    router.replace('/citizen-dashboard');
                  }}
                  activeOpacity={0.88}
                >
                  <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalPrimaryBtnText}>
                    {isHindi ? 'डैशबोर्ड पर जाएं' : 'Go to Dashboard'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => setShowSuccessModal(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                  <Text style={styles.modalSecondaryBtnText}>
                    {isHindi ? 'ठीक है' : 'OK'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: SPACING.screen,
    paddingBottom: SPACING.xxl,
  },

  // ==========================================
  // TRICOLOR & HEADER
  // ==========================================
  tricolorBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  saffronStripe: {
    flex: 1,
    backgroundColor: '#FF9933',
  },
  whiteStripe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  greenStripe: {
    flex: 1,
    backgroundColor: '#138808',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingVertical: 4,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
    ...SHADOWS.small,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // ==========================================
  // CITIZEN PROFILE BAR
  // ==========================================
  citizenProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  citizenIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  citizenInfoCol: {
    flex: 1,
  },
  citizenNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  citizenWardSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },

  // ==========================================
  // SECTIONS
  // ==========================================
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: 8,
    gap: 8,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  required: {
    color: COLORS.error,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },

  // ==========================================
  // WARD CARD
  // ==========================================
  wardCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  wardQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  wardChoiceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  wardChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  wardChoiceActive: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  wardChoiceActiveSaffron: {
    borderColor: COLORS.saffron,
    backgroundColor: '#FFFBEB',
  },
  wardChoiceText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  wardChoiceTextActive: {
    color: '#166534',
    fontWeight: '800',
  },
  wardChoiceTextSaffron: {
    color: '#B45309',
    fontWeight: '800',
  },
  wardOptionsWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  wardOptionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wardSelectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  closeListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  closeListText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '700',
  },
  wardOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wardOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wardOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  wardOptionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  wardOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selectedWardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginTop: 10,
  },
  selectedWardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedWardText: {
    fontSize: 12,
    color: '#475569',
  },
  selectedWardBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  changeWardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeWardText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },

  // ==========================================
  // AUDIO & VOICE-TO-TEXT CARD
  // ==========================================
  audioCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  audioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioMicCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioMicCircleRecording: {
    backgroundColor: '#FEE2E2',
  },
  audioTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  audioTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  audioDuration: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    gap: 5,
  },
  stopRecordButton: {
    backgroundColor: '#DC2626',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  transcribingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  transcribingText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '700',
  },
  audioActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  playAudioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E8F5',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 5,
  },
  playAudioText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  removeAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    gap: 4,
  },
  removeAudioText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },

  // ==========================================
  // DESCRIPTION INPUT
  // ==========================================
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: 13.5,
    color: '#0F172A',
    minHeight: 110,
    ...SHADOWS.small,
  },

  // ==========================================
  // PHOTO
  // ==========================================
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  photoButtonTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  photoButtonSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    ...SHADOWS.small,
  },
  previewImage: {
    width: '100%',
    height: 180,
  },
  imageBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  imageSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageSuccessText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#138808',
    marginLeft: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  removeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 3,
  },

  // ==========================================
  // GPS LOCATION CARD
  // ==========================================
  locationCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: SPACING.md,
    gap: 10,
    ...SHADOWS.small,
  },
  locationCardActive: {
    borderColor: '#138808',
    backgroundColor: '#EAF6E8',
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationIconBoxActive: {
    backgroundColor: '#DCFCE7',
  },
  locationInfoCol: {
    flex: 1,
  },
  locationCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  locationCardSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  locationActionTag: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ==========================================
  // SUBMIT BUTTON
  // ==========================================
  submitButton: {
    height: 52,
    backgroundColor: '#000080',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: 8,
    ...SHADOWS.medium,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '900',
  },

  /* WARD MISMATCH BANNER */
  wardMismatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 8,
  },
  mismatchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  mismatchTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#92400E',
  },
  mismatchSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
    fontWeight: '600',
  },
  syncWardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9933',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncWardBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // ==========================================
  // SUCCESS POP-UP MODAL STYLES
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.screen,
  },
  modalCard: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  modalTricolorBar: {
    flexDirection: 'row',
    height: 5,
    width: '100%',
  },
  modalBodyContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalSuccessCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#86EFAC',
    ...SHADOWS.small,
  },
  modalThankYouTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalMainMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  resolutionMessageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  resolutionMessageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
    lineHeight: 18,
  },
  modalTicketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E8F5',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    marginBottom: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  modalTicketText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  detailsSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  detailItemRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    gap: 4,
  },
  categoryBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  deptValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 16,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  sentimentBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  detailSingleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailSingleLabel: {
    fontSize: 12,
    color: '#475569',
  },
  detailSingleValue: {
    fontWeight: '800',
    color: '#0F172A',
  },
  descBox: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descBoxLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  descBoxText: {
    fontSize: 11.5,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  /* MODAL ACTION GROUP */
  modalActionGroup: {
    gap: 10,
  },
  modalPrimaryBtn: {
    height: 48,
    backgroundColor: '#000080',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...SHADOWS.medium,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalSecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  modalCloseBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
});