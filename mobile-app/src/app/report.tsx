import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../theme';

export default function ReportScreen() {
  const { language, setLanguage } = useLanguage();

  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [complaintId, setComplaintId] = useState<string | null>(null);

  const [userName, setUserName] = useState('');
  const [ward, setWard] = useState('');
  const [problemWard, setProblemWard] = useState('');
  const [differentWard, setDifferentWard] = useState(false);

  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    directory: 'document',
  });
  const recorderState = useAudioRecorderState(audioRecorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(audioUri);

  const isHindi = language === 'hi';

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
        const data = await AsyncStorage.getItem('citizen');

        if (data) {
          const user = JSON.parse(data);

          setUserName(user.name || '');
          setWard(user.ward || '');
          setProblemWard(user.ward || '');
        }
      } catch (error) {
        console.log('Unable to load user:', error);
      }
    };

    loadUser();
  }, []);

  // ==========================================
  // CAMERA
  // ==========================================

  const takePhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        isHindi ? 'कैमरा अनुमति' : 'Camera Permission',
        isHindi
          ? 'फोटो लेने के लिए कैमरा अनुमति आवश्यक है।'
          : 'Camera permission is required to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // ==========================================
  // GALLERY
  // ==========================================

  const pickFromGallery = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        isHindi ? 'गैलरी अनुमति' : 'Gallery Permission',
        isHindi
          ? 'फोटो चुनने के लिए गैलरी अनुमति आवश्यक है।'
          : 'Gallery permission is required to select a photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // ==========================================
  // REMOVE PHOTO
  // ==========================================

  const removePhoto = () => {
    setImage(null);
  };

  // ==========================================
  // AUDIO RECORDING
  // ==========================================

  const startRecording = async () => {
    try {
      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

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

  const selectProblemWard = (selectedWard: string) => {
    setProblemWard(selectedWard);
    setDifferentWard(selectedWard !== ward);
  };

  // ==========================================
  // LOCATION
  // ==========================================

  const getCurrentLocation = async () => {
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        isHindi ? 'लोकेशन अनुमति' : 'Location Permission',
        isHindi
          ? 'लोकेशन प्राप्त करने के लिए अनुमति आवश्यक है।'
          : 'Location permission is required.'
      );
      return;
    }

    try {
      const currentLocation =
        await Location.getCurrentPositionAsync({});

      const latitude =
        currentLocation.coords.latitude;

      const longitude =
        currentLocation.coords.longitude;

      setLocation(`${latitude}, ${longitude}`);
    } catch (error) {
      Alert.alert(
        isHindi ? 'लोकेशन में समस्या' : 'Location Error',
        isHindi
          ? 'आपकी वर्तमान लोकेशन प्राप्त नहीं हो सकी।'
          : 'Unable to get your current location.'
      );
    }
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const submitProblem = async () => {
    if (!description.trim() || !image || !problemWard) {
      Alert.alert(
        isHindi ? 'जानकारी अधूरी है' : 'Missing Information',
        isHindi
          ? 'कृपया समस्या का विवरण, समस्या का वार्ड और फोटो दर्ज करें।'
          : 'Please provide the description, problem ward and photo.'
      );
      return;
    }

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

      let backendComplaintId: string | null = null;
      try {
        const apiRes = await complaintApi.createComplaint({
          problemType: 'General Problem',
          category: 'Village Issue',
          description: description.trim(),
          location: location || `Ward ${problemWard || ward || '1'}`,
          photo: image || undefined,
          audioUrl: audioUri || undefined,
          latitude: lat,
          longitude: lng,
        });
        if (apiRes?.id) {
          backendComplaintId = `GP-${new Date().getFullYear()}-${apiRes.id}`;
        }
      } catch (apiErr) {
        console.log('Backend API failed, saving locally:', apiErr);
      }

      const newComplaintId =
        backendComplaintId ||
        `GP-${new Date().getFullYear()}-${Math.floor(
          10000 + Math.random() * 90000
        )}`;

      const complaint = {
        complaintId: newComplaintId,
        citizenName: userName,
        citizenWard: ward,
        problemWard: problemWard,
        ward: problemWard,
        category: 'General',
        priority: 'Normal',
        department: null,
        deadline: null,
        description: description.trim(),
        photo: image,
        audio: audioUri,
        location: location,
        status: 'SUBMITTED',
        dateTime: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        `complaint_${newComplaintId}`,
        JSON.stringify(complaint)
      );

      setComplaintId(newComplaintId);

      Alert.alert(
        isHindi
          ? 'शिकायत सफलतापूर्वक दर्ज हुई'
          : 'Complaint Submitted Successfully',
        isHindi
          ? `शिकायत आईडी: ${newComplaintId}`
          : `Complaint ID: ${newComplaintId}`
      );

      setDescription('');
      setImage(null);
      setLocation(null);
      setAudioUri(null);
      setProblemWard(ward);
      setDifferentWard(false);
    } catch (error) {
      console.log('Unable to submit complaint:', error);

      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi
          ? 'शिकायत दर्ज नहीं हो सकी। कृपया फिर प्रयास करें।'
          : 'Unable to submit complaint. Please try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <View style={styles.brandSaffron} />

              <Text style={styles.appName}>
                VillageApp
              </Text>

              <View style={styles.brandGreen} />
            </View>

            <Text style={styles.headerTitle}>
              {isHindi
                ? 'समस्या दर्ज करें'
                : 'Report a Problem'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Ionicons
              name="language-outline"
              size={17}
              color={COLORS.primary}
            />

            <Text style={styles.languageText}>
              {isHindi ? 'English' : 'हिंदी'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* INTRO */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons
              name="megaphone-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.introContent}>
            <Text style={styles.introTitle}>
              {isHindi
                ? 'गांव की समस्या बताएं'
                : 'Tell us your village problem'}
            </Text>

            <Text style={styles.introText}>
              {isHindi
                ? 'समस्या अपने शब्दों में लिखें और उसकी फोटो जोड़ें।'
                : 'Describe the problem in your own words and add a photo.'}
            </Text>
          </View>
        </View>

        {/* CITIZEN */}
        {userName ? (
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="person-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {isHindi ? 'नागरिक' : 'Citizen'}
              </Text>

              <Text style={styles.infoValue}>
                {userName}
              </Text>
            </View>
          </View>
        ) : null}

        {/* WARD */}
        {ward ? (
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="home-outline"
                size={19}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>
                {isHindi ? 'वार्ड' : 'Ward'}
              </Text>

              <Text style={styles.infoValue}>
                {ward}
              </Text>

              <Text style={styles.autoText}>
                {isHindi
                  ? 'आपकी प्रोफाइल से स्वचालित'
                  : 'Automatically taken from your profile'}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color={COLORS.success}
            />
          </View>
        ) : null}

        {/* =================================================
            PROBLEM WARD
        ================================================= */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="home-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'समस्या का वार्ड' : 'Problem Ward'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isHindi
                ? 'जिस वार्ड में समस्या है'
                : 'Ward where the problem exists'}
            </Text>
          </View>
        </View>

        <View style={styles.wardCard}>
          <View style={styles.wardTopRow}>
            <View style={styles.wardIcon}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.wardTextBlock}>
              <Text style={styles.wardLabel}>
                {isHindi ? 'आपका पंजीकृत वार्ड' : 'Your Registered Ward'}
              </Text>
              <Text style={styles.wardValue}>
                {ward || (isHindi ? 'उपलब्ध नहीं' : 'Not available')}
              </Text>
            </View>

            <Ionicons
              name="checkmark-circle"
              size={21}
              color={COLORS.success}
            />
          </View>

          <View style={styles.wardQuestionBox}>
            <Text style={styles.wardQuestion}>
              {isHindi
                ? 'क्या समस्या आपके वार्ड में है?'
                : 'Is the problem in your ward?'}
            </Text>

            <View style={styles.wardChoiceRow}>
              <TouchableOpacity
                style={[
                  styles.wardChoice,
                  !differentWard && styles.wardChoiceActive,
                ]}
                onPress={() => selectProblemWard(ward)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    !differentWard
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={20}
                  color={
                    !differentWard
                      ? COLORS.success
                      : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.wardChoiceText,
                    !differentWard && styles.wardChoiceTextActive,
                  ]}
                >
                  {isHindi ? 'हाँ' : 'Yes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.wardChoice,
                  differentWard && styles.wardChoiceActiveSaffron,
                ]}
                onPress={() => setDifferentWard(true)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    differentWard
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={20}
                  color={
                    differentWard
                      ? COLORS.saffron
                      : COLORS.textMuted
                  }
                />
                <Text
                  style={[
                    styles.wardChoiceText,
                    differentWard && styles.wardChoiceTextSaffron,
                  ]}
                >
                  {isHindi ? 'नहीं' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {differentWard ? (
            <View style={styles.wardOptionsWrap}>
              <Text style={styles.wardSelectLabel}>
                {isHindi ? 'समस्या वाला वार्ड चुनें' : 'Select Problem Ward'}
              </Text>

              <View style={styles.wardOptionsGrid}>
                {wardOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.wardOption,
                      problemWard === item && styles.wardOptionActive,
                    ]}
                    onPress={() => selectProblemWard(item)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.wardOptionText,
                        problemWard === item &&
                          styles.wardOptionTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.selectedWardRow}>
            <Ionicons
              name="location-outline"
              size={17}
              color={COLORS.primary}
            />
            <Text style={styles.selectedWardText}>
              {isHindi ? 'समस्या का वार्ड:' : 'Problem Ward:'}{' '}
              <Text style={styles.selectedWardBold}>
                {problemWard || ward || '-'}
              </Text>
            </Text>
          </View>
        </View>

        {/* DESCRIPTION */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="create-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi
                ? 'समस्या का विवरण'
                : 'Problem Description'}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {isHindi
                ? 'समस्या को स्पष्ट रूप से बताएं'
                : 'Explain the problem clearly'}
            </Text>
          </View>
        </View>

        <TextInput
          style={styles.descriptionInput}
          placeholder={
            isHindi
              ? 'उदाहरण: हमारे वार्ड में 3 दिन से पानी नहीं आ रहा है...'
              : 'Example: There has been no water supply in our ward for 3 days...'
          }
          placeholderTextColor={COLORS.textMuted}
          multiline
          numberOfLines={7}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* =================================================
            AUDIO
        ================================================= */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="mic-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'आवाज़ रिकॉर्ड करें' : 'Record Voice'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isHindi
                ? 'अपनी समस्या बोलकर बताएं'
                : 'Describe the problem with your voice'}
            </Text>
          </View>
        </View>

        <View style={styles.audioCard}>
          <View style={styles.audioTopRow}>
            <View
              style={[
                styles.audioMicCircle,
                recorderState.isRecording &&
                  styles.audioMicCircleRecording,
              ]}
            >
              <Ionicons
                name={
                  recorderState.isRecording
                    ? 'radio'
                    : 'mic-outline'
                }
                size={27}
                color={
                  recorderState.isRecording
                    ? COLORS.error
                    : COLORS.primary
                }
              />
            </View>

            <View style={styles.audioTextBlock}>
              <Text style={styles.audioTitle}>
                {recorderState.isRecording
                  ? isHindi
                    ? 'रिकॉर्डिंग चल रही है...'
                    : 'Recording...'
                  : audioUri
                    ? isHindi
                      ? 'ऑडियो रिकॉर्ड हो गया'
                      : 'Audio recorded'
                    : isHindi
                      ? 'आवाज़ से समस्या बताएं'
                      : 'Explain by voice'}
              </Text>

              <Text style={styles.audioDuration}>
                {recorderState.isRecording
                  ? `${Math.floor(
                      recorderState.durationMillis / 1000
                    )}s`
                  : audioUri
                    ? isHindi
                      ? 'रिकॉर्डिंग तैयार है'
                      : 'Recording ready'
                    : isHindi
                      ? 'वैकल्पिक'
                      : 'Optional'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.recordButton,
                recorderState.isRecording &&
                  styles.stopRecordButton,
              ]}
              onPress={
                recorderState.isRecording
                  ? stopRecording
                  : startRecording
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name={
                  recorderState.isRecording
                    ? 'stop'
                    : 'mic'
                }
                size={20}
                color={COLORS.white}
              />
              <Text style={styles.recordButtonText}>
                {recorderState.isRecording
                  ? isHindi
                    ? 'रोकें'
                    : 'Stop'
                  : isHindi
                    ? 'रिकॉर्ड'
                    : 'Record'}
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
                  name={
                    audioPlayer.playing
                      ? 'pause'
                      : 'play'
                  }
                  size={18}
                  color={COLORS.primary}
                />
                <Text style={styles.playAudioText}>
                  {audioPlayer.playing
                    ? isHindi
                      ? 'रोकें'
                      : 'Pause'
                    : isHindi
                      ? 'सुनें'
                      : 'Play'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeAudioButton}
                onPress={removeAudio}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={COLORS.error}
                />
                <Text style={styles.removeAudioText}>
                  {isHindi ? 'हटाएं' : 'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* PHOTO */}

        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="camera-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi
                ? 'समस्या की फोटो'
                : 'Problem Photo'}

              <Text style={styles.required}>
                {' '}*
              </Text>
            </Text>

            <Text style={styles.sectionSubtitle}>
              {isHindi
                ? 'समस्या की स्पष्ट फोटो जोड़ें'
                : 'Add a clear photo of the problem'}
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
                <Ionicons
                  name="camera-outline"
                  size={23}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.photoButtonTitle}>
                {isHindi
                  ? 'फोटो लें'
                  : 'Take Photo'}
              </Text>

              <Text style={styles.photoButtonSub}>
                {isHindi ? 'कैमरा' : 'Camera'}
              </Text>
            </TouchableOpacity>

            {/* GALLERY */}
            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickFromGallery}
              activeOpacity={0.8}
            >
              <View style={styles.photoIcon}>
                <Ionicons
                  name="images-outline"
                  size={23}
                  color={COLORS.primary}
                />
              </View>

              <Text style={styles.photoButtonTitle}>
                {isHindi
                  ? 'गैलरी से चुनें'
                  : 'Choose from Gallery'}
              </Text>

              <Text style={styles.photoButtonSub}>
                {isHindi
                  ? 'पहले से मौजूद फोटो'
                  : 'Existing photo'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageCard}>
            <Image
              source={{ uri: image }}
              style={styles.previewImage}
            />

            <View style={styles.imageBottom}>
              <View style={styles.imageSuccess}>
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={COLORS.success}
                />

                <Text style={styles.imageSuccessText}>
                  {isHindi
                    ? 'फोटो जोड़ दी गई'
                    : 'Photo added successfully'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={removePhoto}
                style={styles.removeButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={COLORS.error}
                />

                <Text style={styles.removeText}>
                  {isHindi ? 'हटाएं' : 'Remove'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LOCATION */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons
              name="location-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              {isHindi
                ? 'समस्या की लोकेशन'
                : 'Problem Location'}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {isHindi
                ? 'जहां समस्या है वहां की लोकेशन'
                : 'Location where the problem exists'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.locationButton,
            location && styles.locationActive,
          ]}
          onPress={getCurrentLocation}
          activeOpacity={0.8}
        >
          <View style={styles.locationIcon}>
            <Ionicons
              name={
                location
                  ? 'location'
                  : 'locate-outline'
              }
              size={21}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.locationContent}>
            <Text style={styles.locationTitle}>
              {location
                ? isHindi
                  ? 'लोकेशन प्राप्त हो गई'
                  : 'Location captured'
                : isHindi
                  ? 'वर्तमान लोकेशन प्राप्त करें'
                  : 'Get Current Location'}
            </Text>

            <Text
              style={styles.locationValue}
              numberOfLines={1}
            >
              {location ||
                (isHindi
                  ? 'GPS लोकेशन वैकल्पिक है'
                  : 'GPS location is optional')}
            </Text>
          </View>

          <Ionicons
            name={
              location
                ? 'checkmark-circle'
                : 'chevron-forward'
            }
            size={21}
            color={
              location
                ? COLORS.success
                : COLORS.textMuted
            }
          />
        </TouchableOpacity>

        {/* REQUIRED INFORMATION */}
        <View style={styles.requiredCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.primary}
          />

          <Text style={styles.requiredCardText}>
            {isHindi
              ? 'विवरण, समस्या का वार्ड और फोटो दर्ज करें।'
              : 'Add the description, problem ward and photo.'}
          </Text>
        </View>

        {/* COMPLAINT ID */}
        {complaintId ? (
          <View style={styles.complaintBox}>
            <View style={styles.complaintIcon}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.complaintLabel}>
              {isHindi
                ? 'आपकी शिकायत आईडी'
                : 'Your Complaint ID'}
            </Text>

            <Text style={styles.complaintId}>
              {complaintId}
            </Text>

            <Text style={styles.complaintHint}>
              {isHindi
                ? 'इस ID से आप शिकायत की स्थिति देख सकते हैं।'
                : 'Use this ID to track your complaint status.'}
            </Text>
          </View>
        ) : null}

        {/* SUBMIT */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitProblem}
          activeOpacity={0.85}
        >
          <Ionicons
            name="send-outline"
            size={20}
            color={COLORS.textWhite}
          />

          <Text style={styles.submitText}>
            {isHindi
              ? 'शिकायत दर्ज करें'
              : 'Submit Complaint'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.bottomNote}>
          {isHindi
            ? 'आपकी शिकायत सिस्टम में सुरक्षित रूप से दर्ज की जाएगी।'
            : 'Your complaint will be securely recorded in the system.'}
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
  // HEADER
  // ==========================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  brandSaffron: {
    width: 15,
    height: 3,
    backgroundColor: COLORS.saffron,
    marginRight: 5,
    borderRadius: RADIUS.round,
  },

  brandGreen: {
    width: 15,
    height: 3,
    backgroundColor: COLORS.indiaGreen,
    marginLeft: 5,
    borderRadius: RADIUS.round,
  },

  appName: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.small,
  },

  languageText: {
    marginLeft: 5,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },

  // ==========================================
  // INTRO
  // ==========================================

  introCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  introIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  introContent: {
    flex: 1,
  },

  introTitle: {
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.primaryDark,
  },

  introText: {
    fontSize: TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineBody,
    marginTop: 3,
  },

  // ==========================================
  // INFO
  // ==========================================

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  infoValue: {
    fontSize: TYPOGRAPHY.medium,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
    marginTop: 2,
  },

  autoText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.success,
    marginTop: 2,
  },

  // ==========================================
  // SECTION
  // ==========================================

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  sectionIcon: {
    width: 36,
    height: 36,
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
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  required: {
    color: COLORS.error,
  },

  // ==========================================
  // PROBLEM WARD
  // ==========================================

  wardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },

  wardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  wardIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },

  wardTextBlock: {
    flex: 1,
  },

  wardLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  wardValue: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.medium,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  wardQuestionBox: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  wardQuestion: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
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
    fontSize: TYPOGRAPHY.small,
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
    marginTop: SPACING.md,
  },

  wardSelectLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
    marginBottom: SPACING.sm,
  },

  wardOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  wardOption: {
    width: '22%',
    paddingVertical: 9,
    borderRadius: RADIUS.md,
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
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.bold,
  },

  wardOptionTextActive: {
    color: COLORS.white,
  },

  selectedWardRow: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  selectedWardText: {
    flex: 1,
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
  },

  selectedWardBold: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  // ==========================================
  // AUDIO
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
    width: 50,
    height: 50,
    borderRadius: 25,
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
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  audioDuration: {
    marginTop: 3,
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
  },

  recordButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  stopRecordButton: {
    backgroundColor: COLORS.error,
  },

  recordButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  audioActions: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  playAudioButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.successLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  playAudioText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  removeAudioButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  removeAudioText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  // ==========================================
  // DESCRIPTION
  // ==========================================

  descriptionInput: {
    minHeight: 145,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
  },

  // ==========================================
  // ==========================================

  // ==========================================
  // PHOTO
  // ==========================================

  photoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },

  photoButton: {
    flex: 1,
    minHeight: 125,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    ...SHADOWS.small,
  },

  photoIcon: {
    width: 45,
    height: 45,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  photoButtonTitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  photoButtonSub: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 3,
    textAlign: 'center',
  },

  // ==========================================
  // IMAGE
  // ==========================================

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
    height: 210,
  },

  imageBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },

  imageSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  imageSuccessText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.success,
    marginLeft: 5,
  },

  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xs,
  },

  removeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.error,
    marginLeft: 4,
  },

  // ==========================================
  // LOCATION
  // ==========================================

  locationButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },

  locationActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight,
  },

  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },

  locationContent: {
    flex: 1,
  },

  locationTitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  locationValue: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  // ==========================================
  // REQUIRED
  // ==========================================

  requiredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },

  requiredCardText: {
    flex: 1,
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    lineHeight: TYPOGRAPHY.lineSmall,
    marginLeft: SPACING.sm,
  },

  // ==========================================
  // ==========================================

  complaintBox: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    alignItems: 'center',
  },

  complaintIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  complaintLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  complaintId: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.primary,
    marginTop: 4,
  },

  complaintHint: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    marginTop: 5,
    textAlign: 'center',
  },

  // ==========================================
  // SUBMIT
  // ==========================================

  submitButton: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: SPACING.xl,
    ...SHADOWS.medium,
  },

  submitText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
    marginLeft: SPACING.sm,
  },

  bottomNote: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    lineHeight: TYPOGRAPHY.lineSmall,
  },
});