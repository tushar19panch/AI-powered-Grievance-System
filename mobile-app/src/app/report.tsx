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

      const payload = {
        problemType: 'General Problem',
        category: 'Village Issue',
        description: finalDescription,
        location: location || `Ward ${problemWard || ward || '1'}`,
        photo: image || undefined,
        audioUrl: audioUri || undefined,
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
          ward: problemWard || ward,
        });
        backendId = offlineItem.id;
        isSavedOffline = true;
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

        <Text style={styles.bottomNote}>
          {isHindi
            ? '🤖 AI द्वारा आपकी समस्या का स्वतः वर्गीकरण कर संबंधित ग्राम पंचायत विभाग को भेजा जाएगा।'
            : '🤖 AI will automatically classify and route your grievance to the concerned department.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...SHADOWS.small,
  },
  languageText: {
    marginLeft: 5,
    fontSize: 13,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  citizenInfoCol: {
    flex: 1,
  },
  citizenNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  citizenWardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.success,
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
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  required: {
    color: COLORS.error,
  },

  // ==========================================
  // WARD CARD
  // ==========================================
  wardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  wardQuestion: {
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: SPACING.sm,
  },
  wardChoiceRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  wardChoice: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  wardChoiceActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight,
  },
  wardChoiceActiveSaffron: {
    borderColor: COLORS.saffron,
    backgroundColor: COLORS.accentLight,
  },
  wardChoiceText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
  },
  wardChoiceTextActive: {
    color: COLORS.success,
  },
  wardChoiceTextSaffron: {
    color: COLORS.saffron,
  },
  wardOptionsWrap: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  wardOptionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wardSelectLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
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
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  wardOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  wardOption: {
    width: '23%',
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  wardOptionActive: {
    backgroundColor: COLORS.saffron,
    borderColor: COLORS.saffron,
  },
  wardOptionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.bold,
  },
  wardOptionTextActive: {
    color: COLORS.white,
  },
  selectedWardRow: {
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
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
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  selectedWardBold: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.extraBold,
  },
  changeWardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  changeWardText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.saffron,
  },

  // ==========================================
  // AUDIO CARD
  // ==========================================
  audioCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  audioMicCircleRecording: {
    backgroundColor: COLORS.errorLight,
  },
  audioTextBlock: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: TYPOGRAPHY.extraBold,
  },
  audioDuration: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  recordButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stopRecordButton: {
    backgroundColor: COLORS.error,
  },
  recordButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.extraBold,
  },
  audioActions: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  playAudioButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.successLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  playAudioText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.extraBold,
  },
  removeAudioButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  removeAudioText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  // ==========================================
  // DESCRIPTION INPUT
  // ==========================================
  descriptionInput: {
    minHeight: 120,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.sm,
    ...SHADOWS.small,
  },
  photoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  photoButtonTitle: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
    textAlign: 'center',
  },
  photoButtonSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
    textAlign: 'center',
  },
  imageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.success,
    marginLeft: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  removeText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.error,
    marginLeft: 3,
  },

  // ==========================================
  // MERGED GPS LOCATION CARD
  // ==========================================
  locationCard: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: SPACING.md,
    gap: 10,
    ...SHADOWS.small,
  },
  locationCardActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight,
  },
  locationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
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
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
  },
  locationCardSub: {
    fontSize: 11,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  complaintIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  complaintLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
  },
  complaintId: {
    fontSize: 20,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.primary,
    marginTop: 2,
  },
  complaintHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // ==========================================
  // SUBMIT
  // ==========================================
  submitButton: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: 8,
    ...SHADOWS.medium,
  },
  submitText: {
    color: COLORS.textWhite,
    fontSize: 15,
    fontWeight: TYPOGRAPHY.extraBold,
  },
  bottomNote: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: 15,
  },
});