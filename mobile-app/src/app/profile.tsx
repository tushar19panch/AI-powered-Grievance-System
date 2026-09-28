import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../i18n/LanguageContext';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { DashboardBottomBar } from '../components/DashboardBottomBar';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type CitizenProfile = {
  name: string;
  mobile: string;
  village: string;
  ward: string;
  profileImage?: string | null;
};

export default function CitizenProfileScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [citizen, setCitizen] = useState<CitizenProfile>({
    name: '',
    mobile: '',
    village: '',
    ward: '',
    profileImage: null,
  });

  const [editing, setEditing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    loadCitizen();
  }, []);

  const loadCitizen = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      const citizenData = await AsyncStorage.getItem('citizen');

      const session = sessionData ? JSON.parse(sessionData) : null;
      const citizenParsed = citizenData ? JSON.parse(citizenData) : null;

      const activeData = { ...(citizenParsed || {}), ...(session || {}) };
      const currentMobile = activeData.mobile || session?.mobile || '';

      let photoUri = activeData.profileImage || null;
      if (currentMobile) {
        const savedPhoto = await AsyncStorage.getItem(`profile_image_${currentMobile}`);
        if (savedPhoto) photoUri = savedPhoto;
      }

      setCitizen({
        name: activeData.name || '',
        mobile: currentMobile,
        village: activeData.village || '',
        ward: activeData.ward || activeData.wardNumber || '',
        profileImage: photoUri,
      });
    } catch {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'प्रोफाइल लोड नहीं हो सकी।' : 'Unable to load profile.'
      );
    }
  };

  const applyProfilePhoto = async (photoUri: string | null) => {
    try {
      setCitizen((prev) => ({
        ...prev,
        profileImage: photoUri,
      }));

      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const currentMobile = citizen.mobile || session?.mobile || '';

      if (currentMobile && photoUri) {
        await AsyncStorage.setItem(`profile_image_${currentMobile}`, photoUri);
      } else if (currentMobile && !photoUri) {
        await AsyncStorage.removeItem(`profile_image_${currentMobile}`);
      }

      if (photoUri) {
        await AsyncStorage.setItem('profile_image', photoUri);
      } else {
        await AsyncStorage.removeItem('profile_image');
      }

      if (session) {
        session.profileImage = photoUri;
        await AsyncStorage.setItem('user_session', JSON.stringify(session));
      }

      const citizenData = await AsyncStorage.getItem('citizen');
      const prevCitizen = citizenData ? JSON.parse(citizenData) : {};
      await AsyncStorage.setItem(
        'citizen',
        JSON.stringify({ ...prevCitizen, ...citizen, profileImage: photoUri })
      );

      Alert.alert(
        isHindi ? 'सफल' : 'Success',
        isHindi
          ? 'प्रोफाइल फोटो सफलतापूर्वक अपडेट हो गई।'
          : 'Profile photo updated successfully.'
      );
    } catch (err) {
      console.log('Error saving citizen profile photo:', err);
    }
  };

  const processCitizenAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.base64) {
      const uri = asset.base64.startsWith('data:')
        ? asset.base64
        : `data:image/jpeg;base64,${asset.base64}`;
      await applyProfilePhoto(uri);
      return;
    }
    if (asset.uri) {
      await applyProfilePhoto(asset.uri);
    }
  };

  const pickFromCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isHindi ? 'कैमरा अनुमति' : 'Camera Permission',
            isHindi
              ? 'फोटो लेने के लिए कैमरे की अनुमति दें।'
              : 'Please allow camera access to take a photo.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        await processCitizenAsset(result.assets[0]);
      }
    } catch (error) {
      console.log('Camera error:', error);
    }
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isHindi ? 'गैलरी अनुमति' : 'Gallery Permission',
            isHindi
              ? 'फोटो चुनने के लिए गैलरी की अनुमति दें।'
              : 'Please allow gallery access to select a photo.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        await processCitizenAsset(result.assets[0]);
      }
    } catch (error) {
      console.log('Gallery error:', error);
    }
  };

  const pickImage = () => {
    Alert.alert(
      isHindi ? 'प्रोफाइल फोटो' : 'Profile Photo',
      isHindi ? 'विकल्प चुनें' : 'Select an option',
      [
        {
          text: isHindi ? '📷 कैमरे से फोटो लें' : '📷 Take Photo',
          onPress: pickFromCamera,
        },
        {
          text: isHindi ? '🖼️ गैलरी से चुनें' : '🖼️ Choose from Gallery',
          onPress: pickFromGallery,
        },
        ...(citizen.profileImage
          ? [
              {
                text: isHindi ? '❌ फोटो हटाएं' : '❌ Remove Photo',
                style: 'destructive' as const,
                onPress: () => applyProfilePhoto(null),
              },
            ]
          : []),
        {
          text: isHindi ? 'रद्द करें' : 'Cancel',
          style: 'cancel' as const,
        },
      ]
    );
  };

  const saveProfile = async () => {
    if (!citizen.name.trim()) {
      Alert.alert(
        isHindi ? 'नाम आवश्यक है' : 'Name Required',
        isHindi ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter your name.'
      );
      return;
    }

    if (!citizen.mobile.trim()) {
      Alert.alert(
        isHindi ? 'मोबाइल आवश्यक है' : 'Mobile Required',
        isHindi ? 'कृपया मोबाइल नंबर दर्ज करें।' : 'Please enter mobile number.'
      );
      return;
    }

    try {
      const cleanName = citizen.name.trim();
      const cleanMobile = citizen.mobile.trim();
      const cleanVillage = citizen.village.trim();
      const cleanWard = citizen.ward.trim();

      const sessionData = await AsyncStorage.getItem('user_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.name = cleanName;
        session.mobile = cleanMobile;
        session.village = cleanVillage;
        session.ward = cleanWard;
        await AsyncStorage.setItem('user_session', JSON.stringify(session));
      }

      await AsyncStorage.setItem(
        'citizen',
        JSON.stringify({
          name: cleanName,
          mobile: cleanMobile,
          village: cleanVillage,
          ward: cleanWard,
          profileImage: citizen.profileImage,
        })
      );

      setEditing(false);

      Alert.alert(
        isHindi ? 'सफल' : 'Success',
        isHindi
          ? 'प्रोफाइल सफलतापूर्वक अपडेट हो गई।'
          : 'Profile updated successfully.'
      );
    } catch {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi ? 'प्रोफाइल सेव नहीं हो सकी।' : 'Unable to save profile.'
      );
    }
  };

  const logout = async () => {
    const doLogout = async () => {
      try {
        await AsyncStorage.removeItem('citizen');
        await AsyncStorage.removeItem('user_session');
        await AsyncStorage.removeItem('@village_jwt_token');
        await AsyncStorage.removeItem('@village_user_session');
        await AsyncStorage.removeItem('token');
        router.replace('/(tabs)');
      } catch (error) {
        console.log('Logout error:', error);
        router.replace('/(tabs)');
      }
    };

    if (Platform.OS === 'web') {
      const confirmLogout =
        typeof window !== 'undefined'
          ? window.confirm(
              isHindi
                ? 'क्या आप लॉग आउट करना चाहते हैं?'
                : 'Are you sure you want to logout?'
            )
          : true;
      if (confirmLogout) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      isHindi ? 'लॉग आउट' : 'Logout',
      isHindi
        ? 'क्या आप लॉग आउट करना चाहते हैं?'
        : 'Are you sure you want to logout?',
      [
        {
          text: isHindi ? 'रद्द करें' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isHindi ? 'लॉग आउट' : 'Logout',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  const openMyComplaints = () => {
    router.push('/(tabs)/complaints' as any);
  };

  const switchAccount = () => {
    router.push('/role-selection');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color={COLORS.navy}
              />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>
              {isHindi ? 'मेरी प्रोफाइल' : 'My Profile'}
            </Text>

            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setLanguage(isHindi ? 'en' : 'hi')}
            >
              <Ionicons
                name="language-outline"
                size={19}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          {/* PROFILE PHOTO & HERO */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.photoWrapper}
              onPress={() => setPreviewVisible(true)}
              activeOpacity={0.85}
            >
              {citizen.profileImage ? (
                <Image
                  source={{ uri: citizen.profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={55}
                    color={COLORS.navy}
                  />
                </View>
              )}

              <TouchableOpacity
                style={styles.cameraButton}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="camera-outline"
                  size={19}
                  color={COLORS.textWhite}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            <Text style={styles.profileName}>
              {citizen.name || (isHindi ? 'नागरिक' : 'Citizen')}
            </Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name="people-outline"
                size={15}
                color={COLORS.navy}
              />

              <Text style={styles.roleText}>
                {isHindi ? 'नागरिक / ग्रामीण' : 'Citizen / Resident'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.photoButton}
              onPress={pickImage}
            >
              <Ionicons
                name="image-outline"
                size={17}
                color={COLORS.navy}
              />

              <Text style={styles.photoButtonText}>
                {citizen.profileImage
                  ? isHindi
                    ? 'फोटो बदलें'
                    : 'Change Photo'
                  : isHindi
                  ? 'प्रोफाइल फोटो जोड़ें'
                  : 'Add Profile Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* PERSONAL INFORMATION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {isHindi ? 'व्यक्तिगत जानकारी' : 'Personal Information'}
              </Text>
            </View>

            {!editing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={17}
                  color={COLORS.navy}
                />

                <Text style={styles.editText}>
                  {isHindi ? 'संपादित करें' : 'Edit'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formCard}>
            {/* NAME */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isHindi ? 'नाम' : 'Name'}
              </Text>

              <View
                style={[
                  styles.inputBox,
                  !editing && styles.disabledBox,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.textMuted}
                />

                <TextInput
                  style={styles.input}
                  value={citizen.name || ''}
                  onChangeText={(text) =>
                    setCitizen({
                      ...citizen,
                      name: text.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''),
                    })
                  }
                  editable={editing}
                  placeholder={isHindi ? 'अपना नाम' : 'Your name'}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* MOBILE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
              </Text>

              <View
                style={[
                  styles.inputBox,
                  !editing && styles.disabledBox,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.textMuted}
                />

                <TextInput
                  style={styles.input}
                  value={citizen.mobile || ''}
                  onChangeText={(text) =>
                    setCitizen({
                      ...citizen,
                      mobile: text.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  editable={editing}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder={
                    isHindi ? 'मोबाइल नंबर' : 'Mobile number'
                  }
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* VILLAGE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isHindi ? 'गांव' : 'Village'}
              </Text>

              <View
                style={[
                  styles.inputBox,
                  !editing && styles.disabledBox,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.textMuted}
                />

                <TextInput
                  style={styles.input}
                  value={citizen.village || ''}
                  onChangeText={(text) =>
                    setCitizen({
                      ...citizen,
                      village: text.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''),
                    })
                  }
                  editable={editing}
                  placeholder={isHindi ? 'गांव का नाम' : 'Village name'}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* WARD NUMBER */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isHindi ? 'वार्ड संख्या' : 'Ward Number'}
              </Text>

              <View
                style={[
                  styles.inputBox,
                  !editing && styles.disabledBox,
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={COLORS.textMuted}
                />

                <TextInput
                  style={styles.input}
                  value={citizen.ward || ''}
                  onChangeText={(text) =>
                    setCitizen({
                      ...citizen,
                      ward: text.replace(/\D/g, '').slice(0, 4),
                    })
                  }
                  editable={editing}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder={isHindi ? 'वार्ड संख्या (उदा. 04)' : 'Ward number (e.g. 04)'}
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>
          </View>

          {/* EDIT ACTIONS */}
          {editing && (
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  loadCitizen();
                }}
              >
                <Text style={styles.cancelText}>
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveProfile}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-outline"
                  size={19}
                  color={COLORS.textWhite}
                />

                <Text style={styles.saveText}>
                  {isHindi ? 'सेव करें' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ACCOUNT & SETTINGS SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {isHindi ? 'खाता एवं सेटिंग्स' : 'Account & Settings'}
              </Text>
            </View>
          </View>

          <View style={styles.accountCard}>
            {/* MY COMPLAINTS ROW */}
            <TouchableOpacity
              style={styles.accountRow}
              onPress={openMyComplaints}
              activeOpacity={0.7}
            >
              <View style={styles.accountIconBox}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={styles.accountTitle}>
                  {isHindi ? 'मेरी शिकायतें' : 'My Complaints'}
                </Text>
                <Text style={styles.accountSubtitle}>
                  {isHindi ? 'दर्ज की गई शिकायतों की स्थिति देखें' : 'View status of your registered complaints'}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* SWITCH / ADD ACCOUNT */}
            <TouchableOpacity
              style={styles.accountRow}
              onPress={switchAccount}
              activeOpacity={0.7}
            >
              <View style={styles.accountIconBox}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={styles.accountTitle}>
                  {isHindi ? 'खाता बदलें / जोड़ें' : 'Switch / Add Account'}
                </Text>
                <Text style={styles.accountSubtitle}>
                  {isHindi ? 'सरपंच, सचिव या अन्य रोल चुनें' : 'Select sarpanch, secretary or other role'}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* LANGUAGE */}
            <TouchableOpacity
              style={styles.accountRow}
              onPress={() => setLanguage(isHindi ? 'en' : 'hi')}
              activeOpacity={0.7}
            >
              <View style={styles.accountIconBox}>
                <Ionicons
                  name="language-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={styles.accountTitle}>
                  {isHindi ? 'भाषा (Language)' : 'Language'}
                </Text>
                <Text style={styles.accountSubtitle}>
                  {isHindi ? 'वर्तमान: हिंदी' : 'Current: English'}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* LOGOUT */}
            <TouchableOpacity
              style={styles.accountRow}
              onPress={logout}
              activeOpacity={0.7}
            >
              <View style={[styles.accountIconBox, styles.logoutIconBox]}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={COLORS.error}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={[styles.accountTitle, { color: COLORS.error }]}>
                  {isHindi ? 'लॉग आउट' : 'Logout'}
                </Text>
                <Text style={styles.accountSubtitle}>
                  {isHindi ? 'सुरक्षित रूप से बाहर निकलें' : 'Sign out securely'}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS.error}
              />
            </TouchableOpacity>
          </View>

          {/* SECURITY INFO */}
          <View style={styles.infoBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={COLORS.success}
            />

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {isHindi ? 'प्रोफाइल सुरक्षित है' : 'Profile Protected'}
              </Text>

              <Text style={styles.infoText}>
                {isHindi
                  ? 'आपकी प्रोफाइल जानकारी और शिकायतें डिजिटल रूप से सुरक्षित हैं।'
                  : 'Your profile details and grievances are securely protected.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* UNIVERSAL BOTTOM NAVIGATION BAR */}
      <DashboardBottomBar activeTab="profile" role="citizen" isHindi={isHindi} />

      {/* FULL ENLARGED PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={previewVisible}
        imageUri={citizen.profileImage}
        userName={citizen.name || (isHindi ? 'नागरिक' : 'Citizen')}
        userRole={isHindi ? 'नागरिक / ग्रामीण' : 'Citizen / Resident'}
        onClose={() => setPreviewVisible(false)}
        onChangePhoto={() => {
          setPreviewVisible(false);
          pickImage();
        }}
        isHindi={isHindi}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING.xxl,
  },

  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
  },

  languageButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileSection: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  photoWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },

  profileImage: {
    width: 116,
    height: 116,
    borderRadius: RADIUS.round,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },

  photoPlaceholder: {
    width: 116,
    height: 116,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 3,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraButton: {
    position: 'absolute',
    right: 1,
    bottom: 3,
    width: 38,
    height: 38,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.navy,
    borderWidth: 3,
    borderColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileName: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    gap: 5,
  },

  roleText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },

  photoButtonText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },

  editText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  inputGroup: {
    marginBottom: SPACING.normal,
  },

  label: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: SPACING.sm,
  },

  inputBox: {
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.normal,
  },

  disabledBox: {
    backgroundColor: COLORS.borderLight,
  },

  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  bottomActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.normal,
  },

  cancelButton: {
    flex: 1,
    height: 51,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.bold,
  },

  saveButton: {
    flex: 1.5,
    height: 51,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    ...SHADOWS.small,
  },

  saveText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },

  infoTitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  infoText: {
    fontSize: TYPOGRAPHY.xs,
    lineHeight: TYPOGRAPHY.lineSmall,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  accountCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.card,
    paddingVertical: 14,
  },

  accountIconBox: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutIconBox: {
    backgroundColor: COLORS.errorLight,
  },

  accountTextWrapper: {
    flex: 1,
    marginLeft: 12,
  },

  accountTitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  accountSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 62,
  },
});