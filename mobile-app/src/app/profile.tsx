// src/app/profile.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useLanguage } from '../i18n/LanguageContext';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

export default function Profile() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [ward, setWard] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadProfile();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadProfile = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const storedCitizen = await AsyncStorage.getItem('citizen');
      const citizenData = storedCitizen ? JSON.parse(storedCitizen) : {};

      const currentMobile = session?.mobile || citizenData?.mobile || '';
      const savedPhoto = currentMobile
        ? await AsyncStorage.getItem(`profile_image_${currentMobile}`)
        : null;

      const mergedUser = {
        name: session?.name || citizenData?.name || '',
        mobile: currentMobile,
        village: session?.village || citizenData?.village || '',
        ward: session?.ward || citizenData?.ward || '',
        profileImage: savedPhoto || null,
      };

      setUser(mergedUser);
      setName(mergedUser.name);
      setMobile(mergedUser.mobile);
      setVillage(mergedUser.village);
      setWard(mergedUser.ward);
      setProfileImage(savedPhoto || null);
    } catch (error) {
      console.log('Profile loading error:', error);
    }
  };

  const chooseImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            language === 'hi'
              ? 'अनुमति आवश्यक है'
              : 'Permission Required',
            language === 'hi'
              ? 'प्रोफाइल फोटो चुनने के लिए Gallery की अनुमति दें।'
              : 'Please allow Gallery access to select a profile photo.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const photoUri = result.assets[0].base64
          ? `data:image/jpeg;base64,${result.assets[0].base64}`
          : result.assets[0].uri;

        setProfileImage(photoUri);

        // Auto-persist immediately strictly for this user's mobile number
        const sessionData = await AsyncStorage.getItem('user_session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const currentMobile = session?.mobile || mobile || '';

        if (currentMobile) {
          await AsyncStorage.setItem(`profile_image_${currentMobile}`, photoUri);
        }

        const updatedUser = {
          ...(user || {}),
          name: name || user?.name || '',
          mobile: currentMobile,
          village: village || user?.village || '',
          ward: ward || user?.ward || '',
          profileImage: photoUri,
        };

        await AsyncStorage.setItem('citizen', JSON.stringify(updatedUser));
        if (session) {
          session.profileImage = photoUri;
          await AsyncStorage.setItem('user_session', JSON.stringify(session));
        }

        setUser(updatedUser);
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  const saveProfile = async () => {
    try {
      if (!name.trim() || !mobile.trim()) {
        Alert.alert(
          language === 'hi'
            ? 'जानकारी अधूरी है'
            : 'Incomplete Information',
          language === 'hi'
            ? 'कृपया नाम और मोबाइल नंबर भरें।'
            : 'Please fill name and mobile number.'
        );
        return;
      }

      const cleanMobile = mobile.trim();
      const updatedUser = {
        ...user,
        name: name.trim(),
        mobile: cleanMobile,
        village: village.trim(),
        ward: ward.trim(),
        profileImage,
      };

      await AsyncStorage.setItem('citizen', JSON.stringify(updatedUser));
      if (cleanMobile && profileImage) {
        await AsyncStorage.setItem(`profile_image_${cleanMobile}`, profileImage);
      }

      const sessionData = await AsyncStorage.getItem('user_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.name = name.trim();
        session.mobile = cleanMobile;
        session.village = village.trim();
        session.ward = ward.trim();
        session.profileImage = profileImage;
        await AsyncStorage.setItem('user_session', JSON.stringify(session));
      }

      setUser(updatedUser);
      setEditing(false);

      Alert.alert(
        language === 'hi' ? 'सफल' : 'Success',
        language === 'hi'
          ? 'प्रोफाइल सफलतापूर्वक अपडेट हो गई।'
          : 'Profile updated successfully.'
      );
    } catch (error) {
      console.log('Profile save error:', error);
    }
  };

  // LOGOUT
  const logout = async () => {
    const doLogout = async () => {
      try {
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
            language === 'hi'
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
      language === 'hi' ? 'लॉग आउट' : 'Logout',
      language === 'hi'
        ? 'क्या आप लॉग आउट करना चाहते हैं?'
        : 'Are you sure you want to logout?',
      [
        {
          text: language === 'hi' ? 'रद्द करें' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'hi' ? 'लॉग आउट' : 'Logout',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  const labels = {
    profile:
      language === 'hi' ? 'मेरी प्रोफाइल' : 'My Profile',

    citizen:
      language === 'hi' ? 'नागरिक' : 'Citizen',

    personalInfo:
      language === 'hi'
        ? 'व्यक्तिगत जानकारी'
        : 'Personal Information',

    name:
      language === 'hi' ? 'नाम' : 'Name',

    mobile:
      language === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number',

    village:
      language === 'hi' ? 'गाँव' : 'Village',

    ward:
      language === 'hi' ? 'वार्ड' : 'Ward',

    edit:
      language === 'hi'
        ? 'प्रोफाइल एडिट करें'
        : 'Edit Profile',

    save:
      language === 'hi'
        ? 'सेव करें'
        : 'Save Changes',

    cancel:
      language === 'hi'
        ? 'रद्द करें'
        : 'Cancel',

    addPhoto:
      language === 'hi'
        ? 'प्रोफाइल फोटो जोड़ें'
        : 'Add Profile Photo',

    changePhoto:
      language === 'hi'
        ? 'प्रोफाइल फोटो बदलें'
        : 'Change Profile Photo',

    account:
      language === 'hi'
        ? 'अकाउंट'
        : 'Account',

    language:
      language === 'hi'
        ? 'भाषा'
        : 'Language',

    logout:
      language === 'hi'
        ? 'लॉग आउट'
        : 'Logout',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back-outline"
                size={22}
                color={COLORS.primary}
              />
            </Pressable>

            <Text style={styles.headerTitle}>
              {labels.profile}
            </Text>

            <Pressable
              style={styles.languageButton}
              onPress={() =>
                setLanguage(
                  language === 'hi' ? 'en' : 'hi'
                )
              }
            >
              <Ionicons
                name="language-outline"
                size={18}
                color={COLORS.primary}
              />

              <Text style={styles.languageText}>
                {language === 'hi' ? 'EN' : 'हि'}
              </Text>
            </Pressable>
          </View>

          {/* PROFILE CARD */}
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={52}
                    color={COLORS.primary}
                  />
                </View>
              )}

              <Pressable
                style={styles.cameraButton}
                onPress={chooseImage}
              >
                <Ionicons
                  name="camera-outline"
                  size={19}
                  color={COLORS.textWhite}
                />
              </Pressable>
            </View>

            <Text style={styles.profileName}>
              {name ||
                (language === 'hi'
                  ? 'नागरिक'
                  : 'Citizen')}
            </Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name="person-outline"
                size={15}
                color={COLORS.indiaGreen}
              />

              <Text style={styles.roleText}>
                {labels.citizen}
              </Text>
            </View>

            <Pressable
              style={styles.photoButton}
              onPress={chooseImage}
            >
              <Ionicons
                name="image-outline"
                size={19}
                color={COLORS.indiaGreen}
              />

              <Text style={styles.photoButtonText}>
                {profileImage
                  ? labels.changePhoto
                  : labels.addPhoto}
              </Text>
            </Pressable>
          </View>

          {/* PERSONAL INFORMATION */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {labels.personalInfo}
            </Text>

            {!editing && (
              <Pressable
                onPress={() => setEditing(true)}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={COLORS.accent}
                />
              </Pressable>
            )}
          </View>

          <View style={styles.infoCard}>
            <ProfileField
              icon="person-outline"
              label={labels.name}
              value={name}
              editable={editing}
              onChangeText={setName}
            />

            <ProfileField
              icon="call-outline"
              label={labels.mobile}
              value={mobile}
              editable={editing}
              keyboardType="phone-pad"
              onChangeText={setMobile}
            />

            <ProfileField
              icon="location-outline"
              label={labels.village}
              value={village}
              editable={editing}
              onChangeText={setVillage}
            />

            <ProfileField
              icon="map-outline"
              label={labels.ward}
              value={ward}
              editable={editing}
              onChangeText={setWard}
              last
            />
          </View>

          {/* EDIT ACTIONS */}
          {editing && (
            <View style={styles.editActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setName(user?.name || '');
                  setMobile(user?.mobile || '');
                  setVillage(user?.village || '');
                  setWard(user?.ward || '');
                  setProfileImage(
                    user?.profileImage || null
                  );
                  setEditing(false);
                }}
              >
                <Text style={styles.cancelText}>
                  {labels.cancel}
                </Text>
              </Pressable>

              <Pressable
                style={styles.saveButton}
                onPress={saveProfile}
              >
                <Ionicons
                  name="checkmark-outline"
                  size={19}
                  color={COLORS.textWhite}
                />

                <Text style={styles.saveText}>
                  {labels.save}
                </Text>
              </Pressable>
            </View>
          )}

          {/* ACCOUNT */}
          <Text style={styles.sectionTitleStandalone}>
            {labels.account}
          </Text>

          <View style={styles.accountCard}>
            {/* LANGUAGE */}
            <Pressable
              style={styles.accountRow}
              onPress={() =>
                setLanguage(
                  language === 'hi' ? 'en' : 'hi'
                )
              }
            >
              <View style={styles.accountIcon}>
                <Ionicons
                  name="language-outline"
                  size={21}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={styles.accountTitle}>
                  {labels.language}
                </Text>

                <Text style={styles.accountSubtitle}>
                  {language === 'hi'
                    ? 'हिंदी'
                    : 'English'}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={21}
                color={COLORS.textMuted}
              />
            </Pressable>

            <View style={styles.divider} />

            {/* LOGOUT */}
            <Pressable
              style={styles.accountRow}
              onPress={logout}
            >
              <View style={styles.logoutIcon}>
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color={COLORS.error}
                />
              </View>

              <View style={styles.accountTextWrapper}>
                <Text style={styles.logoutTitle}>
                  {labels.logout}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={21}
                color={COLORS.error}
              />
            </Pressable>
          </View>

          <Text style={styles.footerText}>
            VillageApp
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileField({
  icon,
  label,
  value,
  editable,
  onChangeText,
  keyboardType,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editable: boolean;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.fieldRow,
        last && styles.lastField,
      ]}
    >
      <View style={styles.fieldIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>
          {label}
        </Text>

        {editable ? (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            style={styles.input}
            keyboardType={keyboardType}
            placeholderTextColor={COLORS.textMuted}
          />
        ) : (
          <Text style={styles.fieldValue}>
            {value || '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    paddingHorizontal: SPACING.screen,
    paddingBottom: 35,
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.title,
    lineHeight: TYPOGRAPHY.lineTitle,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
  },

  languageButton: {
    height: 40,
    minWidth: 52,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  languageText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.bold,
  },

  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xxl,
    paddingVertical: 25,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.medium,
  },

  avatarWrapper: {
    position: 'relative',
    marginBottom: SPACING.md,
  },

  avatarImage: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },

  avatarPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileName: {
    fontSize: TYPOGRAPHY.subtitle + 5,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    marginTop: 7,
  },

  roleText: {
    color: COLORS.indiaGreen,
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.bold,
  },

  photoButton: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: COLORS.indiaGreen,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.normal,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },

  photoButtonText: {
    color: COLORS.indiaGreen,
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.bold,
  },

  sectionHeader: {
    marginTop: SPACING.section,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  sectionTitleStandalone: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    marginTop: SPACING.section,
    marginBottom: 11,
  },

  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.normal,
    ...SHADOWS.small,
  },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  lastField: {
    borderBottomWidth: 0,
  },

  fieldIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  fieldContent: {
    flex: 1,
  },

  fieldLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
    marginBottom: 3,
  },

  fieldValue: {
    fontSize: TYPOGRAPHY.large,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  input: {
    fontSize: TYPOGRAPHY.large,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.semiBold,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },

  editActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: 15,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
  },

  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  saveText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
  },

  accountCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 15,
    ...SHADOWS.small,
  },

  accountRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  logoutIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  accountTextWrapper: {
    flex: 1,
  },

  accountTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  accountSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  logoutTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.error,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  footerText: {
    textAlign: 'center',
    marginTop: 25,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.semiBold,
  },
});