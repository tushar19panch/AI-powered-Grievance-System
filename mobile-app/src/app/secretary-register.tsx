import React, { useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { LocationHierarchyPicker } from '../components/LocationHierarchyPicker';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

export default function SecretaryRegister() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [village, setVillage] = useState('');
  const [ward, setWard] = useState('');
  const [secretaryId, setSecretaryId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(35)).current;

  const isHindi = language === 'hi';

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  const handleRegister = async () => {
    if (loading) return;

    if (!name.trim()) {
      showAlert(
        isHindi ? 'नाम आवश्यक है' : 'Name Required',
        isHindi ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your name.'
      );
      return;
    }

    const cleanMobile = mobile.trim();
    if (!cleanMobile || !/^[0-9]{10}$/.test(cleanMobile)) {
      showAlert(
        isHindi ? 'गलत मोबाइल नंबर' : 'Invalid Mobile Number',
        isHindi
          ? '10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    // LOCATION HIERARCHY VALIDATION (TEMPORARILY COMMENTED OUT - TO BE IMPLEMENTED LATER)
    /*
    if (!district.trim()) {
      showAlert(isHindi ? 'जिला चुनें' : 'Select District', isHindi ? 'कृपया जिला चुनें।' : 'Please select a district.');
      return;
    }

    if (!block.trim()) {
      showAlert(isHindi ? 'ब्लॉक चुनें' : 'Select Block', isHindi ? 'कृपया ब्लॉक चुनें।' : 'Please select a block.');
      return;
    }
    */

    if (!village.trim()) {
      showAlert(isHindi ? 'गाँव का नाम आवश्यक है' : 'Village Name Required', isHindi ? 'कृपया ग्राम पंचायत / गाँव का नाम दर्ज करें।' : 'Please enter village name.');
      return;
    }

    if (!secretaryId.trim()) {
      showAlert(isHindi ? 'सचिव आईडी आवश्यक है' : 'Secretary ID Required', isHindi ? 'कृपया सचिव आईडी दर्ज करें।' : 'Please enter Secretary ID.');
      return;
    }

    if (password.length < 6) {
      showAlert(
        isHindi ? 'पासवर्ड छोटा है' : 'Password Too Short',
        isHindi
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert(
        isHindi ? 'पासवर्ड अलग हैं' : 'Passwords Do Not Match',
        isHindi
          ? 'दोनों पासवर्ड समान होने चाहिए।'
          : 'Both passwords must match.'
      );
      return;
    }

    setLoading(true);
    try {
      // Call Backend Spring Boot API
      await authApi.register({
        name: name.trim(),
        mobileNumber: cleanMobile,
        password: password,
        role: 'SECRETARY',
        state: 'Madhya Pradesh',
        district: district.trim(),
        block: block.trim(),
        villageName: village.trim(),
        wardNumber: ward.trim() || '1',
        officialId: secretaryId.trim(),
        secretaryId: secretaryId.trim(),
      });

      // Auto login
      let loginData;
      try {
        loginData = await authApi.login({
          mobileNumber: cleanMobile,
          password: password,
        });
      } catch (loginErr) {
        console.log('Auto-login error:', loginErr);
      }

      await AsyncStorage.setItem(
        'secretary',
        JSON.stringify({
          name: name.trim(),
          mobile: cleanMobile,
          village: village.trim(),
          secretaryId: secretaryId.trim(),
        })
      );

      await AsyncStorage.setItem(
        'user_session',
        JSON.stringify({
          isLoggedIn: true,
          role: 'secretary',
          name: name.trim(),
          mobile: cleanMobile,
          village: village.trim(),
          token: loginData?.token || '',
          loginAt: new Date().toISOString(),
        })
      );

      // Direct redirect to Secretary Dashboard
      router.replace('/secretary');
    } catch (error: any) {
      console.log('Secretary register error:', error);
      let errMsg = error?.message || '';
      if (errMsg.includes('Official ID is already registered')) {
        errMsg = isHindi
          ? 'यह ऑफिशियल आईडी (Official ID) पहले से किसी सचिव के लिए पंजीकृत है। कृपया अपनी अलग आईडी (उदा. SEC-102 या कोई नया नंबर) दर्ज करें।'
          : 'This Official ID is already registered. Please enter a different unique Official ID (e.g. SEC-102).';
      } else if (errMsg.includes('Mobile number already registered')) {
        errMsg = isHindi
          ? 'यह मोबाइल नंबर पहले से पंजीकृत है। कृपया सीधे लॉगिन करें।'
          : 'This mobile number is already registered. Please login directly.';
      } else if (!errMsg) {
        errMsg = isHindi
          ? 'रजिस्ट्रेशन में समस्या आई। कृपया पुनः प्रयास करें।'
          : 'Registration failed. Please try again.';
      }

      showAlert(isHindi ? 'पंजीकरण विफल' : 'Registration Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Ionicons
              name="language-outline"
              size={17}
              color={COLORS.navy}
            />

            <Text style={styles.languageText}>
              {isHindi ? 'English' : 'हिंदी'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* HEADER */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerIcon}>
            <Ionicons
              name="clipboard-outline"
              size={36}
              color={COLORS.navy}
            />
          </View>

          <View style={styles.monitorBadge}>
            <Ionicons
              name="eye-outline"
              size={14}
              color={COLORS.navy}
            />

            <Text style={styles.monitorBadgeText}>
              {isHindi ? 'निगरानी' : 'MONITOR'}
            </Text>
          </View>

          <Text style={styles.title}>
            {isHindi
              ? 'सचिव / सुपरवाइजर'
              : 'Secretary / Supervisor'}
          </Text>

          <Text style={styles.subtitle}>
            {isHindi ? 'अपना अकाउंट बनाएं' : 'Create your account'}
          </Text>

          <Text style={styles.headerDescription}>
            {isHindi
              ? 'शिकायतों और गांव की गतिविधियों की निगरानी करें'
              : 'Monitor complaints and village activities'}
          </Text>
        </Animated.View>

        {/* FORM CARD */}
        <Animated.View
          style={[
            styles.formCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi ? 'पूरा नाम' : 'Full Name'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? 'अपना पूरा नाम दर्ज करें'
                    : 'Enter your full name'
                }
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={(text) => setName(text.replace(/[^a-zA-Z\u0900-\u097F\s]/g, ''))}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* MOBILE (DIGITS ONLY) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi ? 'मोबाइल नंबर' : 'Mobile Number'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? '10 अंकों का मोबाइल नंबर'
                    : '10-digit mobile number'
                }
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(text) => setMobile(text.replace(/\D/g, '').slice(0, 10))}
              />
            </View>
          </View>

          {/* VILLAGE NAME */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi ? 'ग्राम पंचायत / गाँव का नाम' : 'Gram Panchayat / Village'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="home-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? 'गाँव का नाम दर्ज करें'
                    : 'Enter village name'
                }
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                value={village}
                onChangeText={setVillage}
              />
            </View>
          </View>

          {/* WARD NUMBER */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi ? 'वार्ड नंबर' : 'Ward Number'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? 'जैसे: Ward 1 या 1'
                    : 'e.g. Ward 1 or 1'
                }
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words"
                value={ward}
                onChangeText={setWard}
              />
            </View>
          </View>

          {/* 
          LOCATION HIERARCHY PICKER (TEMPORARILY COMMENTED OUT - TO BE IMPLEMENTED LATER)
          <LocationHierarchyPicker
            isHindi={isHindi}
            selectedState={state}
            selectedDistrict={district}
            selectedBlock={block}
            selectedVillage={village}
            selectedWard={ward}
            onDistrictChange={setDistrict}
            onBlockChange={setBlock}
            onVillageChange={setVillage}
            onWardChange={setWard}
          />
          */}

          {/* SECRETARY ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi ? 'सचिव आईडी' : 'Secretary ID'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="id-card-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? 'सचिव आईडी दर्ज करें (उदा. SEC201)'
                    : 'Enter Secretary ID (e.g. SEC201)'
                }
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                value={secretaryId}
                onChangeText={setSecretaryId}
              />
            </View>
          </View>

          {/* PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi ? 'पासवर्ड' : 'Password'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? 'कम से कम 6 अक्षर'
                    : 'Minimum 6 characters'
                }
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowPassword(!showPassword)
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={21}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isHindi
                ? 'पासवर्ड की पुष्टि करें'
                : 'Confirm Password'}
            </Text>

            <View style={styles.inputBox}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  isHindi
                    ? 'पासवर्ड दोबारा दर्ज करें'
                    : 'Re-enter password'
                }
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={21}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* INFO */}
          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {isHindi ? 'आपकी भूमिका' : 'Your Role'}
              </Text>

              <Text style={styles.infoText}>
                {isHindi
                  ? 'सचिव / सुपरवाइजर शिकायतों और सरपंच की कार्रवाई की निगरानी करेगा।'
                  : 'Secretary / Supervisor monitors complaints and Sarpanch actions.'}
              </Text>
            </View>
          </View>

          {/* REGISTER BUTTON */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && { opacity: 0.7 },
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.navy} />
            ) : null}

            <Text style={styles.registerButtonText}>
              {loading
                ? isHindi
                  ? 'रजिस्ट्रेशन हो रहा है...'
                  : 'Creating Account...'
                : isHindi
                  ? 'रजिस्ट्रेशन करें'
                  : 'Create Account'}
            </Text>

            {!loading && (
              <View style={styles.buttonIcon}>
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={COLORS.navy}
                />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          VillageApp •{' '}
          {isHindi
            ? 'आपके गांव के लिए'
            : 'For your village'}
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
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.sm,
    paddingBottom: 35,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  languageButton: {
    height: 40,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.small,
  },

  languageText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
  },

  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  headerIcon: {
    width: 82,
    height: 82,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },

  monitorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },

  monitorBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.warning,
    letterSpacing: 1,
  },

  title: {
    fontSize: TYPOGRAPHY.largeHeading,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.navy,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.semiBold,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  headerDescription: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.regular,
    color: COLORS.textMuted,
    marginTop: 7,
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },

  inputGroup: {
    marginBottom: SPACING.normal,
  },

  label: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginLeft: 2,
  },

  inputBox: {
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.md,
  },

  inputIconBox: {
    width: 39,
    height: 39,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    height: '100%',
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.mediumWeight,
    color: COLORS.textPrimary,
  },

  eyeButton: {
    width: 35,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoBox: {
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.success,
  },

  infoText: {
    fontSize: TYPOGRAPHY.small,
    lineHeight: TYPOGRAPHY.lineBody,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  registerButton: {
    height: 57,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    ...SHADOWS.medium,
  },

  registerButtonText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  buttonIcon: {
    width: 39,
    height: 39,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },

  footer: {
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semiBold,
    color: COLORS.textMuted,
  },
});