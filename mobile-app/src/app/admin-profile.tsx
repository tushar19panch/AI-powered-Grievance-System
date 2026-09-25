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

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type Admin = {
  name: string;
  mobile: string;
  village: string;
  adminId: string;
  profileImage?: string | null;
};

export default function AdminProfile() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const isHindi = language === 'hi';

  const [admin, setAdmin] = useState<Admin>({
    name: '',
    mobile: '',
    village: '',
    adminId: '',
    profileImage: null,
  });

  const [editing, setEditing] = useState(false);

  useEffect(() => {
    loadAdmin();
  }, []);

  const loadAdmin = async () => {
    try {
      const data = await AsyncStorage.getItem('admin');

      if (data) {
        setAdmin(JSON.parse(data));
      }
    } catch {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        isHindi
          ? 'प्रोफाइल लोड नहीं हो सकी।'
          : 'Unable to load profile.'
      );
    }
  };

  const pickImage = async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        isHindi ? 'अनुमति आवश्यक' : 'Permission Required',
        isHindi
          ? 'प्रोफाइल फोटो चुनने के लिए gallery की अनुमति दें।'
          : 'Please allow gallery access to choose a profile photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      setAdmin((prev) => ({
        ...prev,
        profileImage: uri,
      }));
    }
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
      await AsyncStorage.setItem(
        'admin',
        JSON.stringify({
          ...admin,
          name: admin.name.trim(),
          mobile: admin.mobile.trim(),
          village: admin.village.trim(),
          adminId: admin.adminId.trim(),
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
        isHindi
          ? 'प्रोफाइल सेव नहीं हो सकी।'
          : 'Unable to save profile.'
      );
    }
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
            <View style={styles.photoWrapper}>
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
            </View>

            <Text style={styles.profileName}>
              {admin.name ||
                (isHindi
                  ? 'सरपंच / एडमिन'
                  : 'Sarpanch / Admin')}
            </Text>

            <View style={styles.roleBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color={COLORS.accent}
              />

              <Text style={styles.roleText}>
                {isHindi
                  ? 'सरपंच / एडमिन'
                  : 'Sarpanch / Admin'}
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

              <Text style={styles.sectionSubtitle}>
                {isHindi
                  ? 'अपनी जानकारी अपडेट करें'
                  : 'Update your information'}
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
                  value={admin.name}
                  onChangeText={(text) =>
                    setAdmin({
                      ...admin,
                      name: text,
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
                  value={admin.mobile}
                  onChangeText={(text) =>
                    setAdmin({
                      ...admin,
                      mobile: text,
                    })
                  }
                  editable={editing}
                  keyboardType="phone-pad"
                  placeholder={
                    isHindi
                      ? 'मोबाइल नंबर'
                      : 'Mobile number'
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
                  value={admin.village}
                  onChangeText={(text) =>
                    setAdmin({
                      ...admin,
                      village: text,
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

            {/* ADMIN ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isHindi ? 'एडमिन आईडी' : 'Admin ID'}
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
                  value={admin.adminId}
                  editable={false}
                  placeholder="Admin ID"
                  placeholderTextColor={COLORS.textMuted}
                />

                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color={COLORS.textMuted}
                />
              </View>

              <Text style={styles.helperText}>
                {isHindi
                  ? 'एडमिन आईडी बदली नहीं जा सकती।'
                  : 'Admin ID cannot be changed.'}
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

          {/* SECURITY INFO */}
          <View style={styles.infoBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={COLORS.success}
            />

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {isHindi
                  ? 'प्रोफाइल सुरक्षित है'
                  : 'Profile Protected'}
              </Text>

              <Text style={styles.infoText}>
                {isHindi
                  ? 'आपकी प्रोफाइल जानकारी केवल प्रशासनिक उपयोग के लिए है।'
                  : 'Your profile information is used for administrative purposes only.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
});