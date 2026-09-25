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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

export default function AdminRegister() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const isHindi = language === 'hi';

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  useEffect(() => {
    Animated.stagger(160, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const handleRegister = async () => {
    if (loading) return;

    if (
      !name.trim() ||
      !mobile.trim() ||
      !village.trim() ||
      !adminId.trim() ||
      !password ||
      !confirmPassword
    ) {
      showAlert(
        isHindi ? 'जानकारी अधूरी है' : 'Missing Information',
        isHindi
          ? 'कृपया सभी जानकारी भरें।'
          : 'Please fill all fields.'
      );
      return;
    }

    const cleanMobile = mobile.trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      showAlert(
        isHindi ? 'मोबाइल नंबर गलत है' : 'Invalid Mobile Number',
        isHindi
          ? 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (password.length < 6) {
      showAlert(
        isHindi ? 'कमजोर पासवर्ड' : 'Weak Password',
        isHindi
          ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert(
        isHindi ? 'पासवर्ड की गलती' : 'Password Error',
        isHindi
          ? 'पासवर्ड और कन्फर्म पासवर्ड समान नहीं हैं।'
          : 'Password and Confirm Password do not match.'
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
        role: 'SARPANCH',
        villageName: village.trim(),
        officialId: adminId.trim(),
        adminId: adminId.trim(),
      });

      // Auto-login
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
        'admin',
        JSON.stringify({
          name: name.trim(),
          mobile: cleanMobile,
          village: village.trim(),
          adminId: adminId.trim(),
          profileImage: null,
        })
      );

      await AsyncStorage.setItem(
        'user_session',
        JSON.stringify({
          isLoggedIn: true,
          role: 'sarpanch',
          name: name.trim(),
          mobile: cleanMobile,
          village: village.trim(),
          token: loginData?.token || '',
          loginAt: new Date().toISOString(),
        })
      );

      // Direct redirect to Sarpanch Dashboard
      router.replace('/admin');
    } catch (error: any) {
      console.log('Sarpanch register error:', error);
      let errMsg = error?.message || '';
      if (errMsg.includes('Official ID is already registered')) {
        errMsg = isHindi
          ? 'यह ऑफिशियल आईडी (Official ID) पहले से किसी सरपंच के लिए पंजीकृत है। कृपया अपनी अलग आईडी (उदा. SARP-102 या कोई नया नंबर) दर्ज करें।'
          : 'This Official ID is already registered. Please enter a different unique Official ID (e.g. SARP-102).';
      } else if (errMsg.includes('Mobile number already registered')) {
        errMsg = isHindi
          ? 'यह मोबाइल नंबर पहले से पंजीकृत है। कृपया सीधे लॉगिन करें।'
          : 'This mobile number is already registered. Please login directly.';
      } else if (!errMsg) {
        errMsg = isHindi
          ? 'पंजीकरण में समस्या आई। कृपया पुनः प्रयास करें।'
          : 'Unable to register. Please try again.';
      }

      showAlert(isHindi ? 'पंजीकरण विफल' : 'Registration Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      keyboardType?: 'default' | 'numeric' | 'phone-pad';
      secureTextEntry?: boolean;
      maxLength?: number;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    }
  ) => (
    <>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputIconBox}>
          <Ionicons
            name={icon}
            size={20}
            color={COLORS.navy}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          {...options}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* NATIONAL FLAG STRIPE */}
        <View style={styles.flagLine}>
          <View style={styles.saffronLine} />

          <View style={styles.whiteLine}>
            <View style={styles.ashokaDot} />
          </View>

          <View style={styles.greenLine} />
        </View>

        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
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
              size={18}
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
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [25, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.personCircle}>
            <Ionicons
              name="person-outline"
              size={48}
              color={COLORS.navy}
            />

            <View style={styles.greenDot} />
          </View>

          <View style={styles.roleBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color={COLORS.textWhite}
            />

            <Text style={styles.badgeText}>
              HEAD • SARPANCH
            </Text>
          </View>

          <Text style={styles.title}>
            {isHindi
              ? 'सरपंच / एडमिन पंजीकरण'
              : 'Sarpanch / Admin Registration'}
          </Text>

          <Text style={styles.subtitle}>
            {isHindi
              ? 'गांव की समस्याओं और शिकायतों का नेतृत्व करने के लिए खाता बनाएं'
              : 'Create your account to lead village problem resolution'}
          </Text>
        </Animated.View>

        {/* FORM CARD */}
        <Animated.View
          style={[
            styles.formCard,
            {
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [45, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.formHeading}>
            <View style={styles.formHeadingIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.formHeadingContent}>
              <Text style={styles.formTitle}>
                {isHindi
                  ? 'अपनी जानकारी भरें'
                  : 'Enter your details'}
              </Text>

              <Text style={styles.formSubtitle}>
                {isHindi
                  ? 'सभी जानकारी सही दर्ज करें'
                  : 'Please provide accurate information'}
              </Text>
            </View>
          </View>

          {/* NAME */}
          {renderInput(
            'person-outline',
            isHindi ? 'पूरा नाम' : 'Full Name',
            isHindi
              ? 'अपना पूरा नाम दर्ज करें'
              : 'Enter your full name',
            name,
            setName,
            { autoCapitalize: 'words' }
          )}

          {/* MOBILE */}
          {renderInput(
            'call-outline',
            isHindi ? 'मोबाइल नंबर' : 'Mobile Number',
            isHindi
              ? '10 अंकों का मोबाइल नंबर'
              : '10-digit mobile number',
            mobile,
            setMobile,
            {
              keyboardType: 'phone-pad',
              maxLength: 10,
            }
          )}

          {/* VILLAGE */}
          {renderInput(
            'location-outline',
            isHindi ? 'गांव' : 'Village',
            isHindi
              ? 'गांव का नाम दर्ज करें'
              : 'Enter village name',
            village,
            setVillage,
            { autoCapitalize: 'words' }
          )}

          {/* ADMIN ID */}
          {renderInput(
            'card-outline',
            isHindi
              ? 'सरपंच / एडमिन आईडी'
              : 'Sarpanch / Admin ID',
            isHindi
              ? 'अपनी एडमिन आईडी दर्ज करें'
              : 'Enter your Admin ID',
            adminId,
            setAdminId,
            { autoCapitalize: 'characters' }
          )}

          {/* PASSWORD */}
          {renderInput(
            'lock-closed-outline',
            isHindi ? 'पासवर्ड' : 'Password',
            isHindi
              ? 'पासवर्ड बनाएं'
              : 'Create password',
            password,
            setPassword,
            { secureTextEntry: true }
          )}

          {/* CONFIRM PASSWORD */}
          {renderInput(
            'lock-closed-outline',
            isHindi
              ? 'पासवर्ड की पुष्टि करें'
              : 'Confirm Password',
            isHindi
              ? 'पासवर्ड फिर से दर्ज करें'
              : 'Confirm password',
            confirmPassword,
            setConfirmPassword,
            { secureTextEntry: true }
          )}

          {/* INFO */}
          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={COLORS.success}
              />
            </View>

            <Text style={styles.infoText}>
              {isHindi
                ? 'सरपंच गांव की शिकायतों पर कार्रवाई और समस्या समाधान का नेतृत्व करेगा।'
                : 'The Sarpanch will lead complaint resolution and village problem management.'}
            </Text>
          </View>
        </Animated.View>

        {/* REGISTER BUTTON */}
        <Animated.View
          style={{
            opacity: buttonAnim,
            transform: [
              {
                translateY: buttonAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [35, 0],
                }),
              },
            ],
          }}
        >
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
              <ActivityIndicator size="small" color={COLORS.textWhite} />
            ) : null}

            <Text style={styles.registerText}>
              {loading
                ? isHindi
                  ? 'खाता बनाया जा रहा है...'
                  : 'Creating Account...'
                : isHindi
                  ? 'खाता बनाएं'
                  : 'Create Account'}
            </Text>

            {!loading && (
              <Ionicons
                name="arrow-forward-outline"
                size={21}
                color={COLORS.textWhite}
              />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerSaffron} />

          <Text style={styles.footerText}>
            VillageApp •{' '}
            {isHindi
              ? 'बेहतर गांव की ओर एक कदम'
              : 'One step towards a better village'}
          </Text>

          <View style={styles.footerGreen} />
        </View>
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
    paddingBottom: SPACING.xxl,
  },

  flagLine: {
    height: 4,
    width: '100%',
    flexDirection: 'row',
    marginBottom: SPACING.md,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },

  saffronLine: {
    flex: 1,
    backgroundColor: COLORS.saffron,
  },

  whiteLine: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ashokaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.navy,
  },

  greenLine: {
    flex: 1,
    backgroundColor: COLORS.indiaGreen,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  languageText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
    marginLeft: 6,
  },

  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },

  personCircle: {
    width: 92,
    height: 92,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },

  greenDot: {
    position: 'absolute',
    bottom: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.indiaGreen,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    marginBottom: SPACING.sm,
  },

  badgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textWhite,
    letterSpacing: 0.6,
    marginLeft: 5,
  },

  title: {
    fontSize: TYPOGRAPHY.largeHeading,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.navy,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    lineHeight: TYPOGRAPHY.lineBody,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },

  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  formHeadingIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  formHeadingContent: {
    flex: 1,
  },

  formTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  formSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  label: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
    marginTop: SPACING.normal,
    marginBottom: SPACING.sm,
  },

  inputContainer: {
    height: 53,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },

  inputIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  input: {
    flex: 1,
    height: 52,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },

  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.small,
    lineHeight: TYPOGRAPHY.lineSmall,
    color: COLORS.textSecondary,
  },

  registerButton: {
    height: 58,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.medium,
  },

  registerText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  footer: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },

  footerSaffron: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.saffron,
  },

  footerGreen: {
    width: 25,
    height: 2,
    backgroundColor: COLORS.indiaGreen,
  },

  footerText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});