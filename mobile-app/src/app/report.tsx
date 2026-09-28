import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

  const [userName, setUserName] = useState('');
  const [ward, setWard] = useState('');
  const [problemWard, setProblemWard] = useState('');
  const [differentWard, setDifferentWard] = useState(false);
  const [showWardList, setShowWardList] = useState(false);

  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
  const recorderState = useAudioRecorderState(audioRecorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(audioUri);

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
  // AUDIO RECORDING
  // ==========================================
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
    } catch (error) {
      console.log('Audio stop error:', error);
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
    const hasAudio = !!audioUri;

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

      // Smart Category & Priority inference
      const lowerDesc = finalDescription.toLowerCase();
      let deducedCategory = 'Village Issue';
      let deducedProblemType = 'General Problem';
      let deducedPriority = 'MEDIUM';

      if (lowerDesc.includes('पानी') || lowerDesc.includes('जल') || lowerDesc.includes('नल') || lowerDesc.includes('पाइप') || lowerDesc.includes('water')) {
        deducedCategory = 'Water';
        deducedProblemType = 'Drinking Water Supply';
      } else if (lowerDesc.includes('सड़क') || lowerDesc.includes('मार्ग') || lowerDesc.includes('रास्ता') || lowerDesc.includes('गड्ढा') || lowerDesc.includes('road')) {
        deducedCategory = 'Roads';
        deducedProblemType = 'Road & Street Work';
      } else if (lowerDesc.includes('लाइट') || lowerDesc.includes('बल्ब') || lowerDesc.includes('अंधेरा') || lowerDesc.includes('light')) {
        deducedCategory = 'Street Lights';
        deducedProblemType = 'Street Lighting';
      } else if (lowerDesc.includes('कचरा') || lowerDesc.includes('सफाई') || lowerDesc.includes('कूड़ा') || lowerDesc.includes('गंदगी') || lowerDesc.includes('garbage')) {
        deducedCategory = 'Garbage/Sanitation';
        deducedProblemType = 'Cleanliness & Waste';
      } else if (lowerDesc.includes('नाली') || lowerDesc.includes('जल निकासी') || lowerDesc.includes('drain')) {
        deducedCategory = 'Drainage';
        deducedProblemType = 'Drainage System';
      } else if (lowerDesc.includes('बिजली') || lowerDesc.includes('ट्रांसफार्मर') || lowerDesc.includes('तार') || lowerDesc.includes('करंट') || lowerDesc.includes('electric')) {
        deducedCategory = 'Electricity';
        deducedProblemType = 'Electricity Grid';
      }

      if (lowerDesc.includes('आपातकालीन') || lowerDesc.includes('खतरा') || lowerDesc.includes('करंट') || lowerDesc.includes('तुरंत') || lowerDesc.includes('emergency') || lowerDesc.includes('critical') || lowerDesc.includes('urgent') || lowerDesc.includes('danger')) {
        deducedPriority = 'VERY_HIGH';
      } else if (lowerDesc.includes('गंभीर') || lowerDesc.includes('भारी') || lowerDesc.includes('बंद पड़ा') || lowerDesc.includes('severe') || lowerDesc.includes('heavy') || lowerDesc.includes('blocked')) {
        deducedPriority = 'HIGH';
      } else if (lowerDesc.includes('छोटा') || lowerDesc.includes('हल्का') || lowerDesc.includes('minor') || lowerDesc.includes('routine')) {
        deducedPriority = 'LOW';
      }

      const payload = {
        problemType: deducedProblemType,
        category: deducedCategory,
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

      try {
        const apiRes = await complaintApi.createComplaint(payload);
        if (apiRes?.id) {
          backendId = String(apiRes.id);
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

      if (isSavedOffline) {
        Alert.alert(
          isHindi ? '📶 शिकायत ऑफलाइन सुरक्षित' : '📶 Complaint Saved Offline',
          isHindi
            ? `इंटरनेट न होने के कारण आपकी शिकायत सुरक्षित सेव कर ली गई है। कनेक्ट होने पर यह अपने आप सिंक हो जाएगी।\n\nअस्थायी आईडी: #${newComplaintId}`
            : `Your complaint has been saved offline. It will synchronize automatically when online.\n\nOffline ID: #${newComplaintId}`
        );
      } else {
        Alert.alert(
          isHindi ? 'शिकायत सफलतापूर्वक दर्ज हुई' : 'Complaint Submitted Successfully',
          isHindi
            ? `आपकी शिकायत आईडी: #${newComplaintId}\nAI द्वारा समस्या को उपयुक्त विभाग में भेज दिया गया है।`
            : `Complaint ID: #${newComplaintId}\nAI has routed your problem to the concerned department.`
        );
      }

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
            <Text style={styles.sectionSubtitle}>
              {isHindi ? 'जिस वार्ड में समस्या मौजूद है' : 'Ward where the issue exists'}
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
            2. VOICE RECORDING (MIC)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="mic-outline" size={18} color={COLORS.primary} />
          </View>
          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'आवाज़ रिकॉर्ड करें' : 'Record Voice'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isHindi ? 'माइक दबाकर समस्या बोलकर बताएं' : 'Speak to record your problem'}
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
                  ? isHindi ? 'रिकॉर्डिंग चल रही है...' : 'Recording in progress...'
                  : audioUri
                    ? isHindi ? 'ऑडियो रिकॉर्ड हो गया' : 'Audio Recorded'
                    : isHindi ? 'बोलकर समस्या बताएं' : 'Speak into Microphone'}
              </Text>
              <Text style={styles.audioDuration}>
                {recorderState.isRecording
                  ? `${Math.floor(recorderState.durationMillis / 1000)}s`
                  : audioUri
                    ? isHindi ? 'ऑडियो सुरक्षित' : 'Audio Ready'
                    : isHindi ? 'सुविधाजनक व आसान' : 'Optional & Convenient'}
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
              {isHindi ? 'समस्या का विवरण' : 'Problem Description'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isHindi ? 'समस्या को अपने शब्दों में लिखें' : 'Write details in your own words'}
            </Text>
          </View>
        </View>

        <TextInput
          style={styles.descriptionInput}
          placeholder={
            isHindi
              ? 'यहाँ समस्या का विवरण लिखें (जैसे: सड़क पर गड्ढा, पानी की लाइन टूटी, स्ट्रीट लाइट बंद आदि)...'
              : 'Describe the issue (e.g. Broken road, no water supply, street light off)...'
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
            <Text style={styles.sectionSubtitle}>
              {isHindi ? 'समस्या की स्पष्ट फोटो जोड़ें' : 'Add a clear photo of the problem'}
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

        {/* COMPLAINT ID CONFIRMATION */}
        {complaintId ? (
          <View style={styles.complaintBox}>
            <View style={styles.complaintIcon}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.complaintLabel}>
              {isHindi ? 'आपकी शिकायत आईडी' : 'Your Complaint ID'}
            </Text>
            <Text style={styles.complaintId}>{complaintId}</Text>
            <Text style={styles.complaintHint}>
              {isHindi
                ? 'इस ID से आप कभी भी शिकायत की स्थिति देख सकते हैं।'
                : 'Use this ID to track your complaint progress.'}
            </Text>
          </View>
        ) : null}

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
          onPress={submitProblem}
          activeOpacity={0.88}
          disabled={isSubmitting}
        >
          <Ionicons name="send" size={18} color={COLORS.white} />
          <Text style={styles.submitText}>
            {isSubmitting
              ? isHindi ? 'शिकायत दर्ज हो रही है...' : 'Submitting...'
              : isHindi ? 'शिकायत दर्ज करें' : 'Submit Problem'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginTop: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.round,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...SHADOWS.small,
  },
  languageText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: '800',
    color: '#000080',
  },

  // ==========================================
  // CITIZEN PROFILE BAR
  // ==========================================
  citizenProfileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 10,
    ...SHADOWS.small,
  },
  citizenIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  citizenInfoCol: {
    flex: 1,
  },
  citizenNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  citizenWardSub: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 1,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF6E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#138808',
  },

  // ==========================================
  // SECTION HEADERS
  // ==========================================
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 1,
    fontWeight: '500',
  },
  required: {
    color: '#DC2626',
    fontWeight: '800',
  },

  // ==========================================
  // WARD CARD
  // ==========================================
  wardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  wardQuestion: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  wardChoiceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  wardChoice: {
    flex: 1,
    minHeight: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  wardChoiceActive: {
    borderColor: '#138808',
    backgroundColor: '#EAF6E8',
  },
  wardChoiceActiveSaffron: {
    borderColor: '#FF9933',
    backgroundColor: '#FFF1E3',
  },
  wardChoiceText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  wardChoiceTextActive: {
    color: '#138808',
    fontWeight: '800',
  },
  wardChoiceTextSaffron: {
    color: '#D97706',
    fontWeight: '800',
  },
  wardOptionsWrap: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
  },
  wardOptionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wardSelectLabel: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '700',
  },
  closeListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  closeListText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  wardOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wardOption: {
    width: '23%',
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  wardOptionActive: {
    backgroundColor: '#FF9933',
    borderColor: '#FF9933',
  },
  wardOptionText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '700',
  },
  wardOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selectedWardRow: {
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#E8E8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedWardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  selectedWardText: {
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '600',
  },
  selectedWardBold: {
    color: '#000080',
    fontWeight: '900',
  },
  changeWardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  changeWardText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },

  // ==========================================
  // AUDIO CARD
  // ==========================================
  audioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  audioMicCircleRecording: {
    backgroundColor: '#FEECEC',
  },
  audioTextBlock: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '800',
  },
  audioDuration: {
    marginTop: 2,
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  recordButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#000080',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stopRecordButton: {
    backgroundColor: '#DC2626',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  audioActions: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  playAudioButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    backgroundColor: '#EAF6E8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  playAudioText: {
    color: '#138808',
    fontSize: 12,
    fontWeight: '800',
  },
  removeAudioButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEECEC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  removeAudioText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },

  // ==========================================
  // DESCRIPTION INPUT
  // ==========================================
  descriptionInput: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 13.5,
    color: '#0F172A',
    lineHeight: 20,
    fontWeight: '500',
  },

  // ==========================================
  // PHOTO
  // ==========================================
  photoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  photoButton: {
    flex: 1,
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
    ...SHADOWS.small,
  },
  photoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: '#E8E8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  photoButtonTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  photoButtonSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    textAlign: 'center',
  },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
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
  // MERGED GPS LOCATION CARD
  // ==========================================
  locationCard: {
    minHeight: 60,
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
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  locationCardSub: {
    fontSize: 11.5,
    color: '#475569',
    marginTop: 1,
  },
  locationActionTag: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ==========================================
  // COMPLAINT BOX
  // ==========================================
  complaintBox: {
    backgroundColor: '#E8E8F5',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  complaintIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    ...SHADOWS.small,
  },
  complaintLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '700',
  },
  complaintId: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000080',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  complaintHint: {
    fontSize: 11.5,
    color: '#334155',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },

  // ==========================================
  // SUBMIT
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
});