import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi, setAuthToken } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

export default function BdoRegisterScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { colors, isDark } = useTheme();
  const isHindi = language === 'hi';

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState('Madhya Pradesh');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [bdoId, setBdoId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 500,
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

    if (!name.trim()) {
      showAlert(
        isHindi ? 'नाम आवश्यक है' : 'Name Required',
        isHindi ? 'कृपया अधिकारी का पूरा नाम दर्ज करें।' : 'Please enter officer full name.'
      );
      return;
    }

    const cleanMobile = mobile.trim();
    if (!cleanMobile || !/^\d{10}$/.test(cleanMobile)) {
      showAlert(
        isHindi ? 'अमान्य मोबाइल नंबर' : 'Invalid Mobile Number',
        isHindi ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (!district.trim()) {
      showAlert(
        isHindi ? 'जिला आवश्यक है' : 'District Required',
        isHindi ? 'कृपया अधिकार क्षेत्र का जिला दर्ज करें।' : 'Please enter district jurisdiction.'
      );
      return;
    }

    if (!block.trim()) {
      showAlert(
        isHindi ? 'प्रखंड / ब्लॉक आवश्यक है' : 'Block Required',
        isHindi ? 'कृपया अपने ब्लॉक / तहसील का नाम दर्ज करें।' : 'Please enter your block/taluka name.'
      );
      return;
    }

    if (!bdoId.trim()) {
      showAlert(
        isHindi ? 'BDO आईडी आवश्यक है' : 'BDO ID Required',
        isHindi ? 'कृपया आधिकारिक BDO पहचान कोड दर्ज करें (उदा. BDO-IND-01).' : 'Please enter BDO official ID (e.g. BDO-IND-01).'
      );
      return;
    }

    if (password.length < 6) {
      showAlert(
        isHindi ? 'कमजोर पासवर्ड' : 'Weak Password',
        isHindi ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।' : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert(
        isHindi ? 'पासवर्ड मेल नहीं खाता' : 'Password Mismatch',
        isHindi ? 'पासवर्ड और कन्फर्म पासवर्ड एक समान होने चाहिए।' : 'Passwords do not match.'
      );
      return;
    }

    setLoading(true);
    try {
      await authApi.register({
        name: name.trim(),
        mobileNumber: cleanMobile,
        password: password,
        role: 'BLOCK_OFFICER',
        state: state.trim() || 'Madhya Pradesh',
        district: district.trim(),
        block: block.trim(),
        officialId: bdoId.trim(),
        bdoId: bdoId.trim(),
      });

      // Auto-login
      let loginData: any;
      try {
        loginData = await authApi.login({
          mobileNumber: cleanMobile,
          password: password,
          role: 'BLOCK_OFFICER',
        });
      } catch (loginErr) {
        console.log('BDO Auto-login notice:', loginErr);
      }

      if (loginData?.token) {
        await setAuthToken(loginData.token);
      }

      await AsyncStorage.setItem(
        'bdo',
        JSON.stringify({
          name: name.trim(),
          mobile: cleanMobile,
          district: district.trim(),
          block: block.trim(),
          bdoId: bdoId.trim(),
        })
      );

      await AsyncStorage.setItem(
        'user_session',
        JSON.stringify({
          isLoggedIn: true,
          role: 'block_officer',
          name: name.trim(),
          mobile: cleanMobile,
          district: district.trim(),
          block: block.trim(),
          token: loginData?.token || '',
          loginAt: new Date().toISOString(),
        })
      );

      showAlert(
        isHindi ? 'पंजीकरण सफल' : 'Registration Successful',
        isHindi
          ? `प्रखंड विकास अधिकारी (BDO) के रूप में आपका स्वागत है।`
          : 'Welcome as Block Development Officer.'
      );

      router.replace('/bdo-dashboard' as any);
    } catch (err: any) {
      console.log('BDO registration error:', err);
      showAlert(
        isHindi ? 'पंजीकरण विफल' : 'Registration Failed',
        err?.message || (isHindi ? 'पंजीकरण में त्रुटि आई। कृपया पुनः प्रयास करें।' : 'An error occurred during registration.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* TOP NAV BAR */}
          <Animated.View style={[styles.navBar, { opacity: headerAnim }]}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={styles.navRight}>
              <TouchableOpacity
                style={[styles.langBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={toggleLanguage}
                activeOpacity={0.8}
              >
                <Ionicons name="language-outline" size={14} color="#1E40AF" />
                <Text style={styles.langText}>{isHindi ? 'English' : 'हिंदी'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* HEADER BANNER */}
          <Animated.View style={[styles.headerSection, { opacity: headerAnim }]}>
            <View style={styles.tierBadge}>
              <Ionicons name="layers" size={14} color="#FFFFFF" />
              <Text style={styles.tierBadgeText}>
                {isHindi ? 'प्रशासनिक स्तर 2 • ब्लॉक मुख्यालय' : 'Tier 2 Authority • Block HQ'}
              </Text>
            </View>

            <View style={styles.headerIconBox}>
              <Ionicons name="business" size={32} color="#1E3A8A" />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isHindi ? 'प्रखंड विकास अधिकारी पंजीकरण' : 'Block Development Officer (BDO)'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isHindi
                ? 'ब्लॉक स्तर पर शिकायतों के पर्यवेक्षण, तकनीकी मंजूरी एवं ग्राम पंचायत समन्वय हेतु आधिकारिक पंजीकरण।'
                : 'Official portal for block-level grievance oversight, technical approvals, and Gram Panchayat coordination.'}
            </Text>
          </Animated.View>

          {/* FORM CONTAINER */}
          <Animated.View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: formAnim }]}>
            {/* Officer Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                {isHindi ? 'अधिकारी का पूरा नाम' : 'Officer Full Name'} <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={18} color="#1E40AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder={isHindi ? 'उदा. श्री राजेश शर्मा' : 'e.g. Rajesh Sharma'}
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                {isHindi ? 'आधिकारिक मोबाइल नंबर' : 'Official Mobile Number'} <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={18} color="#1E40AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder={isHindi ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>
            </View>

            {/* District & Block Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  {isHindi ? 'जिला' : 'District'} <Text style={styles.req}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                  <Ionicons name="map-outline" size={16} color="#1E40AF" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder={isHindi ? 'उदा. इंदौर' : 'e.g. Indore'}
                    placeholderTextColor={colors.textSecondary}
                    value={district}
                    onChangeText={setDistrict}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  {isHindi ? 'प्रखंड / ब्लॉक' : 'Block / Taluka'} <Text style={styles.req}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                  <Ionicons name="business-outline" size={16} color="#1E40AF" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder={isHindi ? 'उदा. सांवर' : 'e.g. Sanwer'}
                    placeholderTextColor={colors.textSecondary}
                    value={block}
                    onChangeText={setBlock}
                  />
                </View>
              </View>
            </View>

            {/* BDO Official ID */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                {isHindi ? 'BDO पहचान कोड (Official ID)' : 'BDO Official Code / ID'} <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                <Ionicons name="card-outline" size={18} color="#1E40AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder={isHindi ? 'उदा. BDO-002 या BDO-IND-01' : 'e.g. BDO-002 or BDO-IND-01'}
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={bdoId}
                  onChangeText={setBdoId}
                />
              </View>
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                {isHindi ? 'सरकारी पदस्थापना आदेशानुसार आबंटित BDO कोड' : 'Official BDO registration/posting code'}
              </Text>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                {isHindi ? 'गोपनीय पासवर्ड' : 'Password'} <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#1E40AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                {isHindi ? 'पासवर्ड की पुष्टि करें' : 'Confirm Password'} <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.border }]}>
                <Ionicons name="checkmark-done-outline" size={18} color="#1E40AF" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <Animated.View style={{ opacity: buttonAnim, marginTop: 12 }}>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>
                      {isHindi ? 'BDO खाता पंजीकृत करें' : 'Register BDO Account'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Login Link */}
            <View style={styles.loginRow}>
              <Text style={[styles.loginPromptText, { color: colors.textSecondary }]}>
                {isHindi ? 'पहले से BDO खाता मौजूद है?' : 'Already have a BDO account?'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
                <Text style={styles.loginLinkText}>
                  {isHindi ? ' यहाँ लॉगिन करें' : ' Login here'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
    marginBottom: 12,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  req: {
    color: '#DC2626',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 2,
  },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  loginPromptText: {
    fontSize: 13,
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
});
