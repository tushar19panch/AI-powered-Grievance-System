import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authApi, getAuthToken, setAuthToken, isValidJwt } from '../services/api';

import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type UserRole = 'CITIZEN' | 'SARPANCH' | 'SECRETARY' | 'BLOCK_OFFICER' | 'DISTRICT_OFFICER';

export default function LoginScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();

  const [selectedRole, setSelectedRole] = useState<UserRole>('CITIZEN');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHindi = language === 'hi';

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  useEffect(() => {
    checkExistingSession();
  }, []);

  const routeByRole = (role?: string) => {
    const r = String(role || '').toLowerCase();
    if (r === 'citizen') {
      router.replace('/citizen-dashboard');
    } else if (r === 'sarpanch' || r === 'admin') {
      router.replace('/admin');
    } else if (r === 'secretary') {
      router.replace('/secretary');
    } else if (r === 'block_officer' || r === 'bdo') {
      router.replace('/bdo-dashboard' as any);
    } else if (r === 'district_officer' || r === 'dm') {
      router.replace('/dm-dashboard' as any);
    }
  };

  const checkExistingSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');

      if (session) {
        const parsedSession = JSON.parse(session);

        if (parsedSession?.isLoggedIn === true) {
          const token = await getAuthToken();
          if (!token || !isValidJwt(token)) {
            console.log('Stored session has no valid JWT. Checking credentials for auto-heal...');
            const savedPass = parsedSession.password;
            const savedMobile = parsedSession.mobile || parsedSession.adminId || parsedSession.secretaryId;
            if (savedPass && savedMobile) {
              try {
                const refreshed = await authApi.login({
                  mobileNumber: savedMobile,
                  identifier: savedMobile,
                  password: savedPass,
                });
                if (refreshed?.token && isValidJwt(refreshed.token)) {
                  parsedSession.token = refreshed.token;
                  await AsyncStorage.setItem('user_session', JSON.stringify(parsedSession));
                  await setAuthToken(refreshed.token);
                  routeByRole(parsedSession.role);
                  return;
                }
              } catch (reauthErr) {
                console.log('Auto re-authentication failed:', reauthErr);
              }
            }
            if (savedMobile) {
              setMobile(savedMobile);
            }
            return;
          }

          routeByRole(parsedSession?.role);
        }
      }
    } catch (error) {
      console.log('Session check error:', error);
    }
  };

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const handleLogin = async () => {
    if (!mobile.trim() || !password) {
      const fieldName = selectedRole === 'CITIZEN'
        ? (isHindi ? 'मोबाइल नंबर' : 'mobile number')
        : (isHindi ? 'आईडी' : 'ID');
      showAlert(
        isHindi ? 'जानकारी अधूरी है' : 'Missing Information',
        isHindi
          ? `कृपया अपना ${fieldName} और पासवर्ड दर्ज करें।`
          : `Please enter your ${fieldName} and password.`
      );
      return;
    }

    const cleanIdentifier = mobile.trim();

    // Strict 10-digit check only for Citizens
    if (selectedRole === 'CITIZEN' && !/^\d{10}$/.test(cleanIdentifier)) {
      showAlert(
        isHindi ? 'मोबाइल नंबर गलत है' : 'Invalid Mobile Number',
        isHindi
          ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    try {
      setLoading(true);

      // Call Backend Login API
      let loginData;
      try {
        loginData = await authApi.login({
          mobileNumber: cleanIdentifier,
          password: password,
        });
      } catch (apiErr: any) {
        console.log('API Login attempt failed, checking offline cache:', apiErr);

        // Fallback check on local caches if offline
        const savedCitizen = await AsyncStorage.getItem('citizen');
        const savedAdmin = await AsyncStorage.getItem('admin');
        const savedSecretary = await AsyncStorage.getItem('secretary');

        if (savedCitizen) {
          const c = JSON.parse(savedCitizen);
          if (String(c.mobile || '').trim() === cleanIdentifier && c.password === password) {
            loginData = { name: c.name, mobileNumber: cleanIdentifier, role: 'CITIZEN' as const };
          }
        }
        if (!loginData && savedAdmin) {
          const a = JSON.parse(savedAdmin);
          const idMatches =
            String(a.adminId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(a.officialId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(a.mobile || '').trim() === cleanIdentifier;
          if (idMatches && a.password === password) {
            loginData = { name: a.name, mobileNumber: cleanIdentifier, role: 'SARPANCH' as const };
          }
        }
        if (!loginData && savedSecretary) {
          const s = JSON.parse(savedSecretary);
          const idMatches =
            String(s.secretaryId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(s.officialId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(s.mobile || '').trim() === cleanIdentifier;
          if (idMatches && s.password === password) {
            loginData = { name: s.name, mobileNumber: cleanIdentifier, role: 'SECRETARY' as const };
          }
        }

        const savedBdo = await AsyncStorage.getItem('bdo');
        if (!loginData && savedBdo) {
          const b = JSON.parse(savedBdo);
          const idMatches =
            String(b.bdoId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(b.officialId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(b.mobile || '').trim() === cleanIdentifier;
          if (idMatches && b.password === password) {
            loginData = { name: b.name, mobileNumber: cleanIdentifier, role: 'BLOCK_OFFICER' as const };
          }
        }

        const savedDm = await AsyncStorage.getItem('dm');
        if (!loginData && savedDm) {
          const d = JSON.parse(savedDm);
          const idMatches =
            String(d.dmId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(d.officialId || '').trim().toLowerCase() === cleanIdentifier.toLowerCase() ||
            String(d.mobile || '').trim() === cleanIdentifier;
          if (idMatches && d.password === password) {
            loginData = { name: d.name, mobileNumber: cleanIdentifier, role: 'DISTRICT_OFFICER' as const };
          }
        }

        if (!loginData) {
          throw new Error(apiErr?.message || 'Login failed. Invalid ID/Mobile number or password.');
        }
      }

      // -------------------------------------------------------------
      // STRICT ROLE TAB VALIDATION
      // -------------------------------------------------------------
      // STRICT ROLE TAB VALIDATION
      // -------------------------------------------------------------
      const actualRole = String(loginData?.role || '').toUpperCase();
      const requestedRole = selectedRole.toUpperCase();

      const isActualAdmin = actualRole === 'SARPANCH' || actualRole === 'ADMIN';
      const isRequestedAdmin = requestedRole === 'SARPANCH' || requestedRole === 'ADMIN';

      const isActualSecretary = actualRole === 'SECRETARY';
      const isRequestedSecretary = requestedRole === 'SECRETARY';

      const isActualBdo = actualRole === 'BLOCK_OFFICER';
      const isRequestedBdo = requestedRole === 'BLOCK_OFFICER';

      const isActualDm = actualRole === 'DISTRICT_OFFICER';
      const isRequestedDm = requestedRole === 'DISTRICT_OFFICER';

      const isActualCitizen = actualRole === 'CITIZEN' || (!isActualAdmin && !isActualSecretary && !isActualBdo && !isActualDm);
      const isRequestedCitizen = requestedRole === 'CITIZEN';

      if (isRequestedCitizen && !isActualCitizen) {
        const targetRole = isActualAdmin
          ? (isHindi ? 'ग्राम प्रधान / सरपंच' : 'Sarpanch / Admin')
          : isActualSecretary
          ? (isHindi ? 'ग्राम सचिव' : 'Secretary')
          : isActualBdo
          ? (isHindi ? 'प्रखंड विकास अधिकारी (BDO)' : 'BDO')
          : (isHindi ? 'जिलाधिकारी (DM)' : 'DM');
        showAlert(
          isHindi ? 'भूमिका चयन त्रुटि' : 'Incorrect Role Selected',
          isHindi
            ? `यह खाता ${targetRole} का है। कृपया सही टैब चुनकर लॉगिन करें।`
            : `This account is registered as ${targetRole}. Please select the correct tab to login.`
        );
        return;
      }

      if (isRequestedAdmin && !isActualAdmin) {
        showAlert(
          isHindi ? 'भूमिका चयन त्रुटि' : 'Incorrect Role Selected',
          isHindi ? 'यह खाता सरपंच का नहीं है।' : 'This account is not a Sarpanch account.'
        );
        return;
      }

      if (isRequestedSecretary && !isActualSecretary) {
        showAlert(
          isHindi ? 'भूमिका चयन त्रुटि' : 'Incorrect Role Selected',
          isHindi ? 'यह खाता ग्राम सचिव का नहीं है।' : 'This account does not have Secretary permissions.'
        );
        return;
      }

      if (isRequestedBdo && !isActualBdo) {
        showAlert(
          isHindi ? 'भूमिका चयन त्रुटि' : 'Incorrect Role Selected',
          isHindi ? 'यह खाता प्रखंड विकास अधिकारी (BDO) का नहीं है।' : 'This account is not a BDO account.'
        );
        return;
      }

      if (isRequestedDm && !isActualDm) {
        showAlert(
          isHindi ? 'भूमिका चयन त्रुटि' : 'Incorrect Role Selected',
          isHindi ? 'यह खाता जिलाधिकारी (DM) का नहीं है।' : 'This account is not a District Officer (DM) account.'
        );
        return;
      }

      // Determine role from backend response or current selection
      const userRole = (loginData?.role || selectedRole).toUpperCase();
      const roleStr = userRole === 'SARPANCH'
        ? 'sarpanch'
        : userRole === 'SECRETARY'
        ? 'secretary'
        : userRole === 'BLOCK_OFFICER'
        ? 'bdo'
        : userRole === 'DISTRICT_OFFICER'
        ? 'dm'
        : 'citizen';

      const userMobileOrId = loginData?.mobileNumber || cleanIdentifier;
      const resolvedOfficialId = loginData?.officialId || (selectedRole !== 'CITIZEN' ? cleanIdentifier : undefined);
      const resolvedBlock = loginData?.block || '';
      const resolvedDistrict = loginData?.district || '';

      // Save user session
      const validToken = loginData?.token && isValidJwt(loginData.token) ? loginData.token : '';
      if (validToken) {
        await setAuthToken(validToken);
      }
      await AsyncStorage.setItem(
        'user_session',
        JSON.stringify({
          isLoggedIn: true,
          role: roleStr,
          name: loginData?.name || '',
          mobile: userMobileOrId,
          password: password,
          village: loginData?.villageName || '',
          ward: loginData?.wardNumber || '',
          officialId: resolvedOfficialId,
          bdoId: resolvedOfficialId,
          dmId: resolvedOfficialId,
          block: resolvedBlock,
          district: resolvedDistrict,
          token: validToken,
          loginAt: new Date().toISOString(),
        })
      );

      // Route to respective dashboard
      if (userRole === 'SARPANCH') {
        await AsyncStorage.setItem(
          'admin',
          JSON.stringify({
            name: loginData?.name || '',
            mobile: userMobileOrId,
            village: loginData?.villageName || '',
            adminId: resolvedOfficialId,
            officialId: resolvedOfficialId,
          })
        );
        router.replace('/admin');
      } else if (userRole === 'SECRETARY') {
        await AsyncStorage.setItem(
          'secretary',
          JSON.stringify({
            name: loginData?.name || '',
            mobile: userMobileOrId,
            village: loginData?.villageName || '',
            secretaryId: resolvedOfficialId,
            officialId: resolvedOfficialId,
          })
        );
        router.replace('/secretary');
      } else if (userRole === 'BLOCK_OFFICER') {
        await AsyncStorage.setItem(
          'bdo',
          JSON.stringify({
            name: loginData?.name || '',
            mobile: userMobileOrId,
            bdoId: resolvedOfficialId,
            officialId: resolvedOfficialId,
            district: resolvedDistrict,
            block: resolvedBlock,
          })
        );
        router.replace('/bdo-dashboard' as any);
      } else if (userRole === 'DISTRICT_OFFICER') {
        await AsyncStorage.setItem(
          'dm',
          JSON.stringify({
            name: loginData?.name || '',
            mobile: userMobileOrId,
            dmId: resolvedOfficialId,
            officialId: resolvedOfficialId,
            district: resolvedDistrict,
          })
        );
        router.replace('/dm-dashboard' as any);
      } else {
        await AsyncStorage.setItem(
          'citizen',
          JSON.stringify({
            name: loginData?.name || '',
            mobile: userMobileOrId,
            village: loginData?.villageName || '',
            ward: loginData?.wardNumber || '',
            role: 'citizen',
          })
        );
        router.replace('/citizen-dashboard');
      }
    } catch (error: any) {
      console.log('Login error:', error);
      showAlert(
        isHindi ? 'Login विफल' : 'Login Failed',
        error?.message || (isHindi ? 'मोबाइल नंबर या पासवर्ड गलत है।' : 'Incorrect credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const openRegister = () => {
    if (selectedRole === 'SARPANCH') {
      router.push('/admin-register');
    } else if (selectedRole === 'SECRETARY') {
      router.push('/secretary-register');
    } else if (selectedRole === 'BLOCK_OFFICER') {
      router.push('/bdo-register' as any);
    } else if (selectedRole === 'DISTRICT_OFFICER') {
      router.push('/dm-register' as any);
    } else {
      router.push('/register');
    }
  };

  const getRoleTitle = () => {
    switch (selectedRole) {
      case 'SARPANCH':
        return isHindi ? 'सरपंच / एडमिन' : 'SARPANCH / ADMIN';
      case 'SECRETARY':
        return isHindi ? 'ग्राम सचिव' : 'GRAM SECRETARY';
      case 'BLOCK_OFFICER':
        return isHindi ? 'प्रखंड विकास अधिकारी (BDO)' : 'BLOCK OFFICER (BDO)';
      case 'DISTRICT_OFFICER':
        return isHindi ? 'जिलाधिकारी (DM / कलेक्टर)' : 'DISTRICT MAGISTRATE (DM)';
      default:
        return isHindi ? 'नागरिक' : 'CITIZEN';
    }
  };

  const getRoleIcon = () => {
    switch (selectedRole) {
      case 'SARPANCH':
        return 'ribbon-outline';
      case 'SECRETARY':
        return 'briefcase-outline';
      case 'BLOCK_OFFICER':
        return 'business-outline';
      case 'DISTRICT_OFFICER':
        return 'shield-checkmark-outline';
      default:
        return 'person-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* TRICOLOR STRIPE */}
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
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons
                name="home-outline"
                size={42}
                color={COLORS.navy}
              />
              <View style={styles.onlineDot} />
            </View>

            {/* ROLE SELECTOR PILLS (ALL 5 TIERS & ROLES) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roleTabsContainer}
              style={{ maxHeight: 48, marginBottom: SPACING.md }}
            >
              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'CITIZEN' && styles.activeRoleTab,
                ]}
                onPress={() => setSelectedRole('CITIZEN')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="person"
                  size={14}
                  color={selectedRole === 'CITIZEN' ? COLORS.textWhite : COLORS.navy}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'CITIZEN' && styles.activeRoleTabText,
                  ]}
                >
                  {isHindi ? 'नागरिक' : 'Citizen'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'SARPANCH' && styles.activeRoleTab,
                ]}
                onPress={() => setSelectedRole('SARPANCH')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="ribbon"
                  size={14}
                  color={selectedRole === 'SARPANCH' ? COLORS.textWhite : COLORS.navy}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'SARPANCH' && styles.activeRoleTabText,
                  ]}
                >
                  {isHindi ? 'सरपंच' : 'Sarpanch'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'SECRETARY' && styles.activeRoleTab,
                ]}
                onPress={() => setSelectedRole('SECRETARY')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="briefcase"
                  size={14}
                  color={selectedRole === 'SECRETARY' ? COLORS.textWhite : COLORS.navy}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'SECRETARY' && styles.activeRoleTabText,
                  ]}
                >
                  {isHindi ? 'सचिव' : 'Secretary'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'BLOCK_OFFICER' && styles.activeRoleTab,
                ]}
                onPress={() => setSelectedRole('BLOCK_OFFICER')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="business"
                  size={14}
                  color={selectedRole === 'BLOCK_OFFICER' ? COLORS.textWhite : COLORS.navy}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'BLOCK_OFFICER' && styles.activeRoleTabText,
                  ]}
                >
                  {isHindi ? 'BDO (प्रखंड)' : 'BDO (Block)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'DISTRICT_OFFICER' && styles.activeRoleTab,
                ]}
                onPress={() => setSelectedRole('DISTRICT_OFFICER')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={selectedRole === 'DISTRICT_OFFICER' ? COLORS.textWhite : COLORS.navy}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'DISTRICT_OFFICER' && styles.activeRoleTabText,
                  ]}
                >
                  {isHindi ? 'DM (जिला)' : 'DM (District)'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.roleBadge}>
              <Ionicons
                name={getRoleIcon() as any}
                size={14}
                color={COLORS.textWhite}
              />
              <Text style={styles.badgeText}>{getRoleTitle()}</Text>
            </View>

            <Text style={styles.title}>
              {isHindi ? 'स्वागत है' : 'Welcome Back'}
            </Text>

            <Text style={styles.subtitle}>
              {isHindi
                ? `अपने ${getRoleTitle()} खाते में Login करें`
                : `Login to your ${getRoleTitle()} account`}
            </Text>
          </View>

          {/* LOGIN CARD */}
          <View style={styles.loginCard}>
            <View style={styles.formHeading}>
              <View style={styles.formHeadingIcon}>
                <Ionicons
                  name="log-in-outline"
                  size={22}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.formHeadingContent}>
                <Text style={styles.formTitle}>
                  {isHindi ? 'Login करें' : 'Sign In'}
                </Text>

                <Text style={styles.formSubtitle}>
                  {isHindi
                    ? 'अपनी जानकारी दर्ज करें'
                    : 'Enter your account details'}
                </Text>
              </View>
            </View>

            {/* IDENTIFIER */}
            <Text style={styles.label}>
              {selectedRole === 'CITIZEN'
                ? (isHindi ? 'मोबाइल नंबर' : 'Mobile Number')
                : selectedRole === 'SARPANCH'
                  ? (isHindi ? 'सरपंच आईडी या मोबाइल नंबर' : 'Sarpanch ID or Mobile Number')
                  : selectedRole === 'SECRETARY'
                    ? (isHindi ? 'ग्राम सचिव आईडी या मोबाइल नंबर' : 'Secretary ID or Mobile Number')
                    : selectedRole === 'BLOCK_OFFICER'
                      ? (isHindi ? 'BDO आईडी या मोबाइल नंबर' : 'BDO ID or Mobile Number')
                      : (isHindi ? 'DM आईडी या मोबाइल नंबर' : 'DM ID or Mobile Number')}
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name={
                    selectedRole === 'CITIZEN'
                      ? 'call-outline'
                      : selectedRole === 'SARPANCH'
                        ? 'ribbon-outline'
                        : selectedRole === 'SECRETARY'
                          ? 'briefcase-outline'
                          : selectedRole === 'BLOCK_OFFICER'
                            ? 'business-outline'
                            : 'shield-checkmark-outline'
                  }
                  size={20}
                  color={COLORS.navy}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder={
                  selectedRole === 'CITIZEN'
                    ? (isHindi ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number')
                    : selectedRole === 'SARPANCH'
                      ? (isHindi ? 'सरपंच आईडी (उदा. SAR-001) या मोबाइल' : 'Sarpanch ID or Mobile Number')
                      : selectedRole === 'SECRETARY'
                        ? (isHindi ? 'सचिव आईडी (उदा. SEC-001) या मोबाइल' : 'Secretary ID or Mobile Number')
                        : selectedRole === 'BLOCK_OFFICER'
                          ? (isHindi ? 'BDO आईडी (उदा. BDO-001) या मोबाइल' : 'BDO ID (e.g. BDO-001) or Mobile')
                          : (isHindi ? 'DM आईडी (उदा. DM-001) या मोबाइल' : 'DM ID (e.g. DM-001) or Mobile')
                }
                placeholderTextColor={COLORS.textMuted}
                value={mobile}
                onChangeText={setMobile}
                keyboardType={selectedRole === 'CITIZEN' ? 'phone-pad' : 'default'}
                maxLength={30}
                autoCapitalize={selectedRole === 'CITIZEN' ? 'none' : 'characters'}
              />
            </View>

            {/* PASSWORD */}
            <Text style={styles.label}>
              {isHindi ? 'पासवर्ड' : 'Password'}
            </Text>

            <View style={styles.inputContainer}>
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
                    ? 'अपना पासवर्ड दर्ज करें'
                    : 'Enter your password'
                }
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={21}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* FORGOT PASSWORD LINK */}
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/forgot-password', params: { role: selectedRole } } as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  {isHindi ? '🔑 पासवर्ड भूल गए?' : '🔑 Forgot Password?'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* LOGIN BUTTON */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.textWhite} />
              ) : (
                <Ionicons
                  name="log-in-outline"
                  size={22}
                  color={COLORS.textWhite}
                />
              )}

              <Text style={styles.loginText}>
                {loading
                  ? isHindi
                    ? 'Login हो रहा है...'
                    : 'Signing In...'
                  : isHindi
                    ? 'Login करें'
                    : 'Login'}
              </Text>

              {!loading && (
                <Ionicons
                  name="arrow-forward-outline"
                  size={21}
                  color={COLORS.textWhite}
                />
              )}
            </TouchableOpacity>
          </View>

          {/* CREATE ACCOUNT */}
          <View style={styles.createAccountBox}>
            <Text style={styles.createAccountText}>
              {isHindi
                ? 'क्या आपका Account नहीं है?'
                : "Don't have an account?"}
            </Text>

            <TouchableOpacity
              onPress={openRegister}
              activeOpacity={0.7}
            >
              <Text style={styles.createAccountLink}>
                {isHindi
                  ? ` नया ${getRoleTitle()} खाता बनाएं`
                  : ` Create ${getRoleTitle()} Account`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ROLE SELECTION BUTTON */}
          <TouchableOpacity
            style={styles.switchRoleBox}
            onPress={() => router.push('/role-selection')}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={16} color={COLORS.navy} />
            <Text style={styles.switchRoleText}>
              {isHindi
                ? 'अन्य भूमिका चुनें (Role Selection)'
                : 'Select Role / All Roles'}
            </Text>
          </TouchableOpacity>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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
    marginBottom: SPACING.lg,
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
    marginBottom: SPACING.lg,
  },

  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.saffron,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },

  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.indiaGreen,
  },

  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.round,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },

  roleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: RADIUS.round,
  },

  activeRoleTab: {
    backgroundColor: COLORS.navy,
  },

  roleTabText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
  },

  activeRoleTabText: {
    color: COLORS.textWhite,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.saffron,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    marginBottom: SPACING.xs,
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
    marginTop: 4,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    lineHeight: TYPOGRAPHY.lineBody,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: SPACING.lg,
  },

  loginCard: {
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
    minHeight: 53,
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

  eyeButton: {
    width: 40,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },

  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },

  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
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

  loginButton: {
    height: 58,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },

  disabledButton: {
    opacity: 0.65,
  },

  loginText: {
    color: COLORS.textWhite,
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
    marginHorizontal: SPACING.sm,
  },

  createAccountBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
    flexWrap: 'wrap',
  },

  createAccountText: {
    fontSize: TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
  },

  createAccountLink: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.primary,
  },

  switchRoleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
  },

  switchRoleText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
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