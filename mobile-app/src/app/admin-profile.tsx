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
import { PanchayatPhotoManagerModal } from '../components/PanchayatPhotoManagerModal';
import { DashboardBottomBar } from '../components/DashboardBottomBar';
import { villageApi } from '../services/api';
import { localizeName, localizeVillageName } from '../utils/hindiTransliteration';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type OfficialProfile = {
  name: string;
  mobile: string;
  village: string;
  block?: string;
  district?: string;
  officialId: string;
  role: 'sarpanch' | 'secretary' | 'admin' | 'bdo' | 'dm';
  profileImage?: string | null;
};

export default function AdminProfile() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const isHindi = language === 'hi';

  const [admin, setAdmin] = useState<OfficialProfile>({
    name: '',
    mobile: '',
    village: '',
    block: '',
    district: '',
    officialId: '',
    role: 'sarpanch',
    profileImage: null,
  });

  const [editing, setEditing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [photoManagerVisible, setPhotoManagerVisible] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);

  useEffect(() => {
    loadAdmin();
  }, []);

  const loadAdmin = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      const adminData = await AsyncStorage.getItem('admin');
      const secretaryData = await AsyncStorage.getItem('secretary');
      const bdoData = await AsyncStorage.getItem('bdo');
      const dmData = await AsyncStorage.getItem('dm');

      const session = sessionData ? JSON.parse(sessionData) : null;
      const adminParsed = adminData ? JSON.parse(adminData) : null;
      const secretaryParsed = secretaryData ? JSON.parse(secretaryData) : null;
      const bdoParsed = bdoData ? JSON.parse(bdoData) : null;
      const dmParsed = dmData ? JSON.parse(dmData) : null;

      let determinedRole: 'sarpanch' | 'secretary' | 'admin' | 'bdo' | 'dm' = 'sarpanch';
      if (session?.role === 'bdo' || (!session?.role && bdoParsed)) {
        determinedRole = 'bdo';
      } else if (session?.role === 'dm' || (!session?.role && dmParsed)) {
        determinedRole = 'dm';
      } else if (session?.role === 'secretary' || (!session?.role && secretaryParsed)) {
        determinedRole = 'secretary';
      } else if (session?.role === 'sarpanch' || session?.role === 'admin' || (!session?.role && adminParsed)) {
        determinedRole = 'sarpanch';
      }

      let activeData: any = {};
      if (determinedRole === 'bdo') {
        activeData = { ...(bdoParsed || {}), ...(session || {}) };
      } else if (determinedRole === 'dm') {
        activeData = { ...(dmParsed || {}), ...(session || {}) };
      } else if (determinedRole === 'secretary') {
        activeData = { ...(secretaryParsed || {}), ...(session || {}) };
      } else {
        activeData = { ...(adminParsed || {}), ...(session || {}) };
      }

      const currentMobile = activeData.mobile || session?.mobile || '';
      let photoUri = activeData.profileImage || null;
      if (currentMobile) {
        const savedPhoto = await AsyncStorage.getItem(`profile_image_${currentMobile}`);
        if (savedPhoto) photoUri = savedPhoto;
      }

      const blockVal = activeData.block || session?.block || '';
      const districtVal = activeData.district || session?.district || '';
      const villageVal = activeData.village || session?.village || '';

      const officialIdVal =
        determinedRole === 'bdo'
          ? (activeData.officialId || activeData.bdoId || session?.officialId || session?.bdoId || '')
          : determinedRole === 'dm'
          ? (activeData.officialId || activeData.dmId || session?.officialId || session?.dmId || '')
          : determinedRole === 'secretary'
          ? (activeData.secretaryId || activeData.officialId || session?.secretaryId || '')
          : (activeData.adminId || activeData.officialId || session?.adminId || '');

      setAdmin({
        name: activeData.name || '',
        mobile: activeData.mobile || currentMobile || '',
        village: villageVal,
        block: blockVal,
        district: districtVal,
        officialId: officialIdVal,
        role: determinedRole,
        profileImage: photoUri,
      });
    } catch {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi
          ? 'प्रोफाइल लोड नहीं हो सकी।'
          : 'Unable to load profile.'
      );
    }
  };

  const applyProfilePhoto = async (photoUri: string | null) => {
    try {
      setAdmin((prev) => ({
        ...prev,
        profileImage: photoUri,
      }));

      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const currentMobile = admin.mobile || session?.mobile || '';

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

      if (admin.role === 'bdo') {
        const bdoData = await AsyncStorage.getItem('bdo');
        const prevBdo = bdoData ? JSON.parse(bdoData) : {};
        await AsyncStorage.setItem(
          'bdo',
          JSON.stringify({ ...prevBdo, ...admin, profileImage: photoUri })
        );
      } else if (admin.role === 'dm') {
        const dmData = await AsyncStorage.getItem('dm');
        const prevDm = dmData ? JSON.parse(dmData) : {};
        await AsyncStorage.setItem(
          'dm',
          JSON.stringify({ ...prevDm, ...admin, profileImage: photoUri })
        );
      } else if (admin.role === 'secretary') {
        const secData = await AsyncStorage.getItem('secretary');
        const prevSec = secData ? JSON.parse(secData) : {};
        await AsyncStorage.setItem(
          'secretary',
          JSON.stringify({ ...prevSec, ...admin, profileImage: photoUri })
        );
      } else {
        const adminData = await AsyncStorage.getItem('admin');
        const prevAdmin = adminData ? JSON.parse(adminData) : {};
        await AsyncStorage.setItem(
          'admin',
          JSON.stringify({ ...prevAdmin, ...admin, profileImage: photoUri })
        );
      }

      Alert.alert(
        isHindi ? 'सफल' : 'Success',
        isHindi
          ? 'प्रोफाइल फोटो सफलतापूर्वक अपडेट हो गई।'
          : 'Profile photo updated successfully.'
      );
    } catch (err) {
      console.log('Error saving official profile photo:', err);
    }
  };

  const processOfficialAsset = async (asset: ImagePicker.ImagePickerAsset) => {
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
        await processOfficialAsset(result.assets[0]);
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
        await processOfficialAsset(result.assets[0]);
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
        ...(admin.profileImage
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

  const convertAssetToDataUrl = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
    if (asset.base64) {
      return asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`;
    }
    if (Platform.OS === 'web' && asset.uri && asset.uri.startsWith('blob:')) {
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.log('Error converting web blob image:', e);
      }
    }
    return asset.uri;
  };

  const applyVillagePhoto = async (photoUri: string | null) => {
    try {
      const isBdo = admin.role === 'bdo';
      const isDm = admin.role === 'dm';
      const entityName = isBdo ? admin.block : isDm ? admin.district : admin.village;
      const storageKey = isBdo
        ? `block_photo_${entityName || 'default'}`
        : isDm
        ? `district_photo_${entityName || 'default'}`
        : `village_photo_${entityName || 'default'}`;
      const coverKey = isBdo ? 'block_cover_photo' : isDm ? 'district_cover_photo' : 'village_cover_photo';
      const eventName = isBdo ? 'block_photo_changed' : isDm ? 'district_photo_changed' : 'village_photo_changed';

      if (entityName && photoUri) {
        await AsyncStorage.setItem(storageKey, photoUri);
      } else if (entityName && !photoUri) {
        await AsyncStorage.removeItem(storageKey);
      }

      if (photoUri) {
        await AsyncStorage.setItem(coverKey, photoUri);
      } else {
        await AsyncStorage.removeItem(coverKey);
      }

      // Sync with backend server
      if (entityName) {
        await villageApi.updatePhoto(entityName, photoUri);
      }

      // Broadcast event for active screens
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(eventName, { detail: photoUri }));
        window.dispatchEvent(new CustomEvent('village_photo_changed', { detail: photoUri }));
      }

      const successMsg = isBdo
        ? (isHindi ? 'विकासखंड फोटो सफलतापूर्वक अपडेट हो गई।' : 'Block photo updated successfully.')
        : isDm
        ? (isHindi ? 'जिला कलेक्ट्रेट फोटो सफलतापूर्वक अपडेट हो गई।' : 'District photo updated successfully.')
        : (isHindi ? 'ग्राम पंचायत फोटो सफलतापूर्वक अपडेट हो गई।' : 'Gram Panchayat photo updated successfully.');

      Alert.alert(isHindi ? 'सफल' : 'Success', successMsg);
    } catch (err) {
      console.log('Error saving cover photo:', err);
    }
  };

  const pickVillagePhotoFromCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isHindi ? 'कैमरा अनुमति' : 'Camera Permission',
            isHindi ? 'फोटो लेने के लिए कैमरे की अनुमति दें।' : 'Please allow camera access.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = await convertAssetToDataUrl(result.assets[0]);
        await applyVillagePhoto(uri);
      }
    } catch (error) {
      console.log('Camera error:', error);
    }
  };

  const pickVillagePhotoFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            isHindi ? 'गैलरी अनुमति' : 'Gallery Permission',
            isHindi ? 'फोटो चुनने के लिए गैलरी की अनुमति दें।' : 'Please allow gallery access.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const uri = await convertAssetToDataUrl(result.assets[0]);
        await applyVillagePhoto(uri);
      }
    } catch (error) {
      console.log('Gallery error:', error);
    }
  };

  const pickVillageCoverPhoto = async () => {
    try {
      const isBdo = admin.role === 'bdo';
      const isDm = admin.role === 'dm';
      const entityKey = isBdo
        ? `block_photos_gallery_${admin.block || 'default'}`
        : isDm
        ? `district_photos_gallery_${admin.district || 'default'}`
        : `village_photos_gallery_${admin.village || 'default'}`;
      const saved = await AsyncStorage.getItem(entityKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGalleryPhotos(parsed);
        } else {
          setGalleryPhotos([]);
        }
      } else {
        const singleKey = isBdo
          ? `block_photo_${admin.block}`
          : isDm
          ? `district_photo_${admin.district}`
          : `village_photo_${admin.village}`;
        const single = await AsyncStorage.getItem(singleKey);
        if (single) {
          setGalleryPhotos([single]);
        } else {
          setGalleryPhotos([]);
        }
      }
    } catch {
      setGalleryPhotos([]);
    }
    setPhotoManagerVisible(true);
  };

  const saveProfile = async () => {
    if (!admin.name.trim()) {
      Alert.alert(
        isHindi ? 'नाम आवश्यक है' : 'Name Required',
        isHindi
          ? 'कृपया अपना नाम दर्ज करें।'
          : 'Please enter your name.'
      );
      return;
    }

    if (!admin.mobile.trim()) {
      Alert.alert(
        isHindi ? 'मोबाइल आवश्यक है' : 'Mobile Required',
        isHindi
          ? 'कृपया मोबाइल नंबर दर्ज करें।'
          : 'Please enter mobile number.'
      );
      return;
    }

    try {
      const cleanName = admin.name.trim();
      const cleanMobile = admin.mobile.trim();
      const cleanVillage = (admin.village || '').trim();
      const cleanBlock = (admin.block || '').trim();
      const cleanDistrict = (admin.district || '').trim();
      const cleanId = (admin.officialId || '').trim();

      const sessionData = await AsyncStorage.getItem('user_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.name = cleanName;
        session.mobile = cleanMobile;
        if (cleanVillage) session.village = cleanVillage;
        if (cleanBlock) session.block = cleanBlock;
        if (cleanDistrict) session.district = cleanDistrict;
        await AsyncStorage.setItem('user_session', JSON.stringify(session));
      }

      if (admin.role === 'bdo') {
        const bdoData = {
          name: cleanName,
          mobile: cleanMobile,
          block: cleanBlock,
          district: cleanDistrict,
          village: cleanBlock,
          officialId: cleanId,
          bdoId: cleanId,
          role: 'bdo',
          profileImage: admin.profileImage,
        };
        await AsyncStorage.setItem('bdo', JSON.stringify(bdoData));
      } else if (admin.role === 'dm') {
        const dmData = {
          name: cleanName,
          mobile: cleanMobile,
          district: cleanDistrict,
          village: cleanDistrict,
          officialId: cleanId,
          dmId: cleanId,
          role: 'dm',
          profileImage: admin.profileImage,
        };
        await AsyncStorage.setItem('dm', JSON.stringify(dmData));
      } else if (admin.role === 'secretary') {
        const secData = {
          name: cleanName,
          mobile: cleanMobile,
          village: cleanVillage,
          secretaryId: cleanId,
          role: 'secretary',
          profileImage: admin.profileImage,
        };
        await AsyncStorage.setItem('secretary', JSON.stringify(secData));
        if (cleanVillage) {
          await AsyncStorage.setItem(`secretary_sync_${cleanVillage}`, JSON.stringify(secData));
        }
      } else {
        const sarpanchData = {
          name: cleanName,
          mobile: cleanMobile,
          village: cleanVillage,
          adminId: cleanId,
          role: 'sarpanch',
          profileImage: admin.profileImage,
        };
        await AsyncStorage.setItem('admin', JSON.stringify(sarpanchData));
        if (cleanVillage) {
          await AsyncStorage.setItem(`sarpanch_sync_${cleanVillage}`, JSON.stringify(sarpanchData));
        }
      }

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
        isHindi
          ? 'प्रोफाइल सेव नहीं हो सकी।'
          : 'Unable to save profile.'
      );
    }
  };

  const logout = async () => {
    const doLogout = async () => {
      try {
        await AsyncStorage.removeItem('admin');
        await AsyncStorage.removeItem('secretary');
        await AsyncStorage.removeItem('bdo');
        await AsyncStorage.removeItem('dm');
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
      const confirmLogout = typeof window !== 'undefined'
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
              onPress={() =>
                setLanguage(isHindi ? 'en' : 'hi')
              }
            >
              <Ionicons
                name="language-outline"
                size={19}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>

          {/* PROFILE PHOTO */}
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.photoWrapper}
              onPress={() => setPreviewVisible(true)}
              activeOpacity={0.85}
            >
              {admin.profileImage ? (
                <Image
                  source={{ uri: admin.profileImage }}
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
              {admin.name
                ? localizeName(admin.name, isHindi)
                : (isHindi
                    ? (admin.role === 'bdo'
                        ? 'प्रखंड विकास अधिकारी'
                        : admin.role === 'dm'
                        ? 'जिलाधिकारी (DM)'
                        : admin.role === 'secretary'
                        ? 'ग्राम पंचायत सचिव'
                        : 'सरपंच / एडमिन')
                    : (admin.role === 'bdo'
                        ? 'Block Development Officer'
                        : admin.role === 'dm'
                        ? 'District Magistrate (DM)'
                        : admin.role === 'secretary'
                        ? 'Panchayat Secretary'
                        : 'Sarpanch / Admin'))}
            </Text>

            <View
              style={[
                styles.roleBadge,
                admin.role === 'secretary' && { backgroundColor: COLORS.successLight },
                admin.role === 'bdo' && { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1 },
                admin.role === 'dm' && { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', borderWidth: 1 },
              ]}
            >
              <Ionicons
                name={
                  admin.role === 'bdo'
                    ? 'business-outline'
                    : admin.role === 'dm'
                    ? 'ribbon-outline'
                    : admin.role === 'secretary'
                    ? 'briefcase-outline'
                    : 'shield-checkmark-outline'
                }
                size={15}
                color={
                  admin.role === 'bdo'
                    ? '#2563EB'
                    : admin.role === 'dm'
                    ? '#7C3AED'
                    : admin.role === 'secretary'
                    ? COLORS.success
                    : COLORS.accent
                }
              />

              <Text
                style={[
                  styles.roleText,
                  admin.role === 'secretary' && { color: COLORS.success },
                  admin.role === 'bdo' && { color: '#1D4ED8' },
                  admin.role === 'dm' && { color: '#6D28D9' },
                ]}
              >
                {admin.role === 'bdo'
                  ? (isHindi ? 'प्रखंड विकास अधिकारी (BDO)' : 'Block Development Officer')
                  : admin.role === 'dm'
                  ? (isHindi ? 'जिलाधिकारी (DM / कलेक्टर)' : 'District Magistrate (DM)')
                  : admin.role === 'secretary'
                  ? (isHindi ? 'ग्राम पंचायत सचिव / सुपरवाइजर' : 'Secretary / Supervisor')
                  : (isHindi ? 'ग्राम प्रधान / सरपंच' : 'Village Head / Sarpanch')}
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
                {admin.profileImage
                  ? isHindi
                    ? 'फोटो बदलें'
                    : 'Change Photo'
                  : isHindi
                  ? 'प्रोफाइल फोटो जोड़ें'
                  : 'Add Profile Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* DETAILS */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {isHindi
                  ? 'व्यक्तिगत जानकारी'
                  : 'Personal Information'}
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
                  value={admin.name || ''}
                  onChangeText={(text) =>
                    setAdmin({
                      ...admin,
                      name: text.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''),
                    })
                  }
                  editable={editing}
                  placeholder={
                    isHindi ? 'अपना नाम' : 'Your name'
                  }
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* MOBILE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isHindi
                  ? 'मोबाइल नंबर'
                  : 'Mobile Number'}
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
                  value={admin.mobile || ''}
                  onChangeText={(text) =>
                    setAdmin({
                      ...admin,
                      mobile: text.replace(/\D/g, '').slice(0, 10),
                    })
                  }
                  editable={editing}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder={
                    isHindi
                      ? 'मोबाइल नंबर'
                      : 'Mobile number'
                  }
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            {/* JURISDICTION / LOCATION */}
            {admin.role === 'bdo' ? (
              <>
                {/* SUB-DIVISION / BLOCK */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {isHindi ? 'विकासखंड / उप-प्रभाग (Block / Sub-Division)' : 'Block / Sub-Division'}
                  </Text>

                  <View
                    style={[
                      styles.inputBox,
                      !editing && styles.disabledBox,
                    ]}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={COLORS.textMuted}
                    />

                    <TextInput
                      style={styles.input}
                      value={admin.block || ''}
                      onChangeText={(text) =>
                        setAdmin({
                          ...admin,
                          block: text.replace(/[^a-zA-Z0-9\u0900-\u097F\s-]/g, ''),
                        })
                      }
                      editable={editing}
                      placeholder={
                        isHindi
                          ? 'विकासखंड / उप-प्रभाग का नाम'
                          : 'Block / Sub-Division name'
                      }
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>

                {/* DISTRICT */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {isHindi ? 'जिला (District)' : 'District'}
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
                      value={admin.district || ''}
                      onChangeText={(text) =>
                        setAdmin({
                          ...admin,
                          district: text.replace(/[^a-zA-Z0-9\u0900-\u097F\s-]/g, ''),
                        })
                      }
                      editable={editing}
                      placeholder={
                        isHindi
                          ? 'जिले का नाम'
                          : 'District name'
                      }
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>
                </View>
              </>
            ) : admin.role === 'dm' ? (
              /* DISTRICT JURISDICTION FOR DM */
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {isHindi ? 'जिला क्षेत्राधिकार (District Jurisdiction)' : 'District Jurisdiction'}
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
                    value={admin.district || ''}
                    onChangeText={(text) =>
                      setAdmin({
                        ...admin,
                        district: text.replace(/[^a-zA-Z0-9\u0900-\u097F\s-]/g, ''),
                      })
                    }
                    editable={editing}
                    placeholder={
                      isHindi
                        ? 'जिले का नाम'
                        : 'District name'
                    }
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            ) : (
              /* GRAM PANCHAYAT FOR SARPANCH / SECRETARY */
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {isHindi ? 'ग्राम पंचायत (Gram Panchayat)' : 'Gram Panchayat'}
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
                    value={admin.village || ''}
                    onChangeText={(text) =>
                      setAdmin({
                        ...admin,
                        village: text.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''),
                      })
                    }
                    editable={editing}
                    placeholder={
                      isHindi
                        ? 'गांव का नाम'
                        : 'Village name'
                    }
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            )}

            {/* OFFICIAL ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {admin.role === 'bdo'
                  ? (isHindi ? 'BDO पहचान कोड (Official ID)' : 'BDO Official ID')
                  : admin.role === 'dm'
                  ? (isHindi ? 'DM पहचान कोड (Official ID)' : 'DM Official ID')
                  : admin.role === 'secretary'
                  ? (isHindi ? 'सचिव आईडी' : 'Secretary ID')
                  : (isHindi ? 'सरपंच आईडी' : 'Sarpanch ID')}
              </Text>

              <View
                style={[
                  styles.inputBox,
                  styles.disabledBox,
                ]}
              >
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={COLORS.textMuted}
                />

                <TextInput
                  style={styles.input}
                  value={admin.officialId || ''}
                  editable={false}
                  placeholder={
                    admin.role === 'bdo'
                      ? 'BDO Official ID'
                      : admin.role === 'dm'
                      ? 'DM Official ID'
                      : admin.role === 'secretary'
                      ? 'Secretary ID'
                      : 'Sarpanch ID'
                  }
                  placeholderTextColor={COLORS.textMuted}
                />

                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color={COLORS.textMuted}
                />
              </View>

              <Text style={styles.helperText}>
                {admin.role === 'bdo'
                  ? (isHindi ? 'BDO पहचान कोड बदला नहीं जा सकता।' : 'BDO ID cannot be changed.')
                  : admin.role === 'dm'
                  ? (isHindi ? 'DM पहचान कोड बदला नहीं जा सकता।' : 'DM ID cannot be changed.')
                  : admin.role === 'secretary'
                  ? (isHindi ? 'सचिव आईडी बदली नहीं जा सकती।' : 'Secretary ID cannot be changed.')
                  : (isHindi ? 'सरपंच आईडी बदली नहीं जा सकती।' : 'Sarpanch ID cannot be changed.')}
              </Text>
            </View>
          </View>

          {/* SAVE */}
          {editing && (
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  loadAdmin();
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

          {/* ACCOUNT SETTINGS SECTION */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {isHindi ? 'खाता एवं सेटिंग्स' : 'Account & Settings'}
              </Text>
            </View>
          </View>

          <View style={styles.accountCard}>
            {/* SHOWCASE COVER PHOTO OPTION */}
            <TouchableOpacity
              style={styles.accountRow}
              onPress={pickVillageCoverPhoto}
              activeOpacity={0.7}
            >
              <View style={styles.accountIconBox}>
                <Ionicons
                  name={admin.role === 'dm' ? 'ribbon-outline' : 'business-outline'}
                  size={20}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={styles.accountTitle}>
                  {admin.role === 'bdo'
                    ? (isHindi ? 'विकासखंड / उप-प्रभाग फोटो गैलरी व प्रबंधन' : 'Block Photo Gallery & Management')
                    : admin.role === 'dm'
                    ? (isHindi ? 'जिला कलेक्ट्रेट फोटो गैलरी व प्रबंधन' : 'Collectorate Photo Gallery & Management')
                    : (isHindi ? 'ग्राम पंचायत फोटो गैलरी व प्रबंधन' : 'Panchayat Photo Gallery & Management')}
                </Text>
                <Text style={styles.accountSubtitle}>
                  {admin.role === 'bdo'
                    ? (isHindi ? 'विकासखंड कार्यालय की फोटो बदलें, जोड़ें, क्रॉप करें या हटाएं' : 'Add, edit, crop, rotate or delete block photos')
                    : admin.role === 'dm'
                    ? (isHindi ? 'कलेक्ट्रेट व जिला प्रशासन की फोटो बदलें, जोड़ें या हटाएं' : 'Add, edit, crop, rotate or delete district photos')
                    : (isHindi ? 'पंचायत फोटो बदलें, जोड़ें, क्रॉप करें या हटाएं' : 'Add, edit, crop, rotate or delete showcase photos')}
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
                  {isHindi ? 'नागरिक, सचिव या अन्य रोल चुनें' : 'Select citizen, secretary or other role'}
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

        </ScrollView>
      </KeyboardAvoidingView>

      {/* UNIVERSAL BOTTOM NAVIGATION BAR */}
      <DashboardBottomBar activeTab="profile" role={admin.role} isHindi={isHindi} />

      {/* FULL ENLARGED PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={previewVisible}
        imageUri={admin.profileImage}
        userName={admin.name || (isHindi ? 'प्रोफाइल' : 'Profile')}
        userRole={
          admin.role === 'bdo'
            ? (isHindi ? 'प्रखंड विकास अधिकारी (BDO)' : 'Block Development Officer')
            : admin.role === 'dm'
            ? (isHindi ? 'जिलाधिकारी (DM)' : 'District Magistrate')
            : admin.role === 'secretary'
            ? (isHindi ? 'ग्राम सचिव' : 'Secretary')
            : (isHindi ? 'सरपंच / एडमिन' : 'Sarpanch')
        }
        onClose={() => setPreviewVisible(false)}
        onChangePhoto={() => {
          setPreviewVisible(false);
          pickImage();
        }}
        isHindi={isHindi}
      />

      {/* PHOTO GALLERY & CROP/ROTATE MANAGER MODAL */}
      <PanchayatPhotoManagerModal
        visible={photoManagerVisible}
        onClose={() => setPhotoManagerVisible(false)}
        role={admin.role}
        villageName={
          admin.role === 'bdo'
            ? (admin.block || (isHindi ? 'विकासखंड' : 'Block'))
            : admin.role === 'dm'
            ? (admin.district || (isHindi ? 'जिला' : 'District'))
            : (admin.village || (isHindi ? 'मुख्य ग्राम पंचायत' : 'Gram Panchayat'))
        }
        photos={galleryPhotos}
        onPhotosUpdated={(updated) => {
          setGalleryPhotos(updated);
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
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    gap: 5,
  },

  roleText: {
    color: COLORS.warning,
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

  helperText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 5,
    marginLeft: 2,
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

  /* ACCOUNT CARD */

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