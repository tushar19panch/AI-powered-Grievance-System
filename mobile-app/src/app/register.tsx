import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { authApi } from '../services/api';
import { useEffect, useRef, useState } from 'react';
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
import { useLanguage } from '../i18n/LanguageContext';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [ward, setWard] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const isHindi = language === 'hi';

  const showAlert = (title: string, msg: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
      if (buttons && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    } else {
      Alert.alert(title, msg, buttons);
    }
  };

  useEffect(() => {
    Animated.stagger(150, [
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

    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------
    if (
      !name.trim() ||
      !mobile.trim() ||
      !village.trim() ||
      !ward.trim() ||
      !password ||
      !confirmPassword
    ) {
      showAlert(
        isHindi ? 'जानकारी अधूरी है' : 'Missing Information',
        isHindi
          ? 'कृपया सभी जानकारी (नाम, मोबाइल, गांव, वार्ड, पासवर्ड) भरें।'
          : 'Please fill all required fields.'
      );
      return;
    }

    // -----------------------------------------
    // MOBILE VALIDATION
    // -----------------------------------------
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

    // -----------------------------------------
    // PASSWORD VALIDATION
    // -----------------------------------------
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
      console.log('Sending registration request for:', cleanMobile);
      // Call Backend Spring Boot API
      await authApi.register({
        name: name.trim(),
        mobileNumber: cleanMobile,
        password: password,
        role: 'CITIZEN',
        villageName: village.trim(),
        wardNumber: ward.trim(),
      });

      // Auto login with newly created account
      let loginData;
      try {
        loginData = await authApi.login({
          mobileNumber: cleanMobile,
          password: password,
        });
      } catch (loginErr) {
        console.log('Auto-login after register failed:', loginErr);
      }

      // Also cache locally for offline support
      const citizen = {
        name: name.trim(),
        mobile: cleanMobile,
        village: village.trim(),
        ward: ward.trim(),
        password: password,
        role: 'citizen',
        profileImage: null,
        registeredAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('citizen', JSON.stringify(citizen));
      await AsyncStorage.setItem(
        'user_session',
        JSON.stringify({
          isLoggedIn: true,
          role: 'citizen',
          name: name.trim(),
          mobile: cleanMobile,
          village: village.trim(),
          ward: ward.trim(),
          token: loginData?.token || '',
          loginAt: new Date().toISOString(),
        })
      );

      // Direct redirect to Citizen Dashboard
      router.replace('/citizen-dashboard');
    } catch (error: any) {
      console.log('Registration error:', error);
      showAlert(
        isHindi ? 'पंजीकरण विफल' : 'Registration Failed',
        error?.message ||
          (isHindi
            ? 'पंजीकरण में त्रुटि हुई। कृपया दोबारा प्रयास करें।'
            : 'Error during registration. Please try again.')
      );
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
              size={45}
              color={COLORS.navy}
            />

            <View style={styles.greenDot} />
          </View>

          <View style={styles.roleBadge}>
            <Ionicons
              name="people-outline"
              size={14}
              color={COLORS.textWhite}
            />

            <Text style={styles.badgeText}>
              {isHindi
                ? 'नागरिक खाता'
                : 'CITIZEN ACCOUNT'}
            </Text>
          </View>

          <Text style={styles.title}>
            {isHindi
              ? 'नागरिक पंजीकरण'
              : 'Citizen Registration'}
          </Text>

          <Text style={styles.subtitle}>
            {isHindi
              ? 'अपने गांव से जुड़ें और समस्याओं की आवाज़ उठाएं'
              : 'Join your village and raise your voice'}
          </Text>
        </Animated.View>

        {/* FORM */}
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
                name="document-text-outline"
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

          {/* WARD */}
          {renderInput(
            'grid-outline',
            isHindi ? 'वार्ड नंबर' : 'Ward Number',
            isHindi
              ? 'वार्ड नंबर दर्ज करें'
              : 'Enter ward number',
            ward,
            setWard,
            { keyboardType: 'numeric' }
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

          {/* SECURITY */}
          <View style={styles.infoBox}>
            <View style={styles.infoIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={COLORS.success}
              />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {isHindi
                  ? 'आपकी जानकारी सुरक्षित है'
                  : 'Your information is secure'}
              </Text>

              <Text style={styles.infoText}>
                {isHindi
                  ? 'आपकी व्यक्तिगत जानकारी सुरक्षित रखी जाएगी।'
                  : 'Your personal information will be kept secure.'}
              </Text>
            </View>
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
            ) : (
              <View style={styles.registerIcon}>
                <Ionicons
                  name="person-add-outline"
                  size={21}
                  color={COLORS.textWhite}
                />
              </View>
            )}

            <Text style={styles.registerText}>
              {loading
                ? isHindi
                  ? 'पंजीकरण हो रहा है...'
                  : 'Creating Account...'
                : isHindi
                  ? 'पंजीकरण करें'
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
    height: 42,
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

  personCircle: {
    width: 92,
    height: 92,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
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
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textWhite,
    letterSpacing: 0.5,
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
    marginTop: 3,
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

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.success,
  },

  infoText: {
    fontSize: TYPOGRAPHY.xs,
    lineHeight: TYPOGRAPHY.lineSmall,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  registerButton: {
    height: 58,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  registerIcon: {
    marginRight: SPACING.sm,
  },

  registerText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
    marginRight: SPACING.sm,
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