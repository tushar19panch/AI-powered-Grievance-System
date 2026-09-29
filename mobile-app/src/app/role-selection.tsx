import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();
  const isHindi = language === 'hi';

  // Animation values
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const slideHeader = useRef(new Animated.Value(20)).current;

  const card1Anim = useRef(new Animated.Value(0)).current;
  const card1Slide = useRef(new Animated.Value(25)).current;

  const card2Anim = useRef(new Animated.Value(0)).current;
  const card2Slide = useRef(new Animated.Value(25)).current;

  const card3Anim = useRef(new Animated.Value(0)).current;
  const card3Slide = useRef(new Animated.Value(25)).current;

  const bottomAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered smooth entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeHeader, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideHeader, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(card1Anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(card1Slide, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(card2Anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(card2Slide, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(card3Anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(card3Slide, {
            toValue: 0,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(bottomAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const openCitizen = () => {
    router.push('/register');
  };

  const openAdmin = () => {
    router.push('/admin-register');
  };

  const openSecretary = () => {
    router.push('/secretary-register');
  };

  const openLogin = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* =========================================================================
            1. TOP NAVIGATION BAR
            ========================================================================= */}
        <Animated.View
          style={[
            styles.topNav,
            {
              opacity: fadeHeader,
              transform: [{ translateY: slideHeader }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.brandBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.brandIconBox, { backgroundColor: '#000080' }]}>
              <Ionicons name="home" size={15} color="#FFFFFF" />
            </View>
            <Text style={[styles.brandText, { color: colors.textPrimary }]}>
              Village<Text style={{ color: '#000080', fontWeight: '900' }}>App</Text>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* THEME TOGGLE */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={17}
                color={isDark ? '#F59E0B' : '#0B1B4F'}
              />
            </TouchableOpacity>

            {/* LANGUAGE TOGGLE */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={toggleLanguage}
              activeOpacity={0.7}
            >
              <Ionicons name="language-outline" size={16} color="#0B1B4F" />
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                {isHindi ? 'EN' : 'हि'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* =========================================================================
            2. HERO HEADER BANNER
            ========================================================================= */}
        <Animated.View
          style={[
            styles.heroHeaderCard,
            {
              opacity: fadeHeader,
              transform: [{ translateY: slideHeader }],
            },
          ]}
        >
          <Text style={styles.heroTitle}>
            {isHindi ? 'अपनी भूमिका चुनें' : 'Choose Your Role'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {isHindi
              ? 'ग्राम पंचायत डिजिटल सेवा में आपका स्वागत है। पोर्टल में आगे बढ़ने के लिए अपना सही पद/भूमिका चुनें।'
              : 'Welcome to VillageApp. Select your official role to access your dedicated dashboard.'}
          </Text>
        </Animated.View>

        {/* SECTION HEADING */}
        <Animated.View style={[styles.sectionHeadingBox, { opacity: fadeHeader }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {isHindi ? 'उपलब्ध भूमिकाएं' : 'Available Roles'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {isHindi ? 'शुरू करने के लिए कार्ड पर टैप करें' : 'Tap a card to proceed'}
          </Text>
        </Animated.View>

        {/* =========================================================================
            3. ROLE CARD 1: CITIZEN (नागरिक)
            ========================================================================= */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: card1Anim,
              transform: [{ translateY: card1Slide }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.premiumRoleCard, styles.citizenBorder, { backgroundColor: colors.card }]}
            onPress={openCitizen}
            activeOpacity={0.88}
          >
            {/* Top Accent Strip */}
            <View style={[styles.roleTopBar, { backgroundColor: '#0B1B4F' }]} />

            <View style={styles.roleCardBody}>
              <View style={styles.roleCardMain}>
                <View style={[styles.roleIconCircle, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="person" size={28} color="#0B1B4F" />
                </View>

                <View style={styles.roleInfo}>
                  <View style={styles.roleBadgeRow}>
                    <View style={[styles.roleTag, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="people-outline" size={12} color="#0B1B4F" />
                      <Text style={[styles.roleTagText, { color: '#0B1B4F' }]}>
                        {isHindi ? 'ग्रामवासी' : 'Citizen'}
                      </Text>
                    </View>
                    <View style={styles.popularTag}>
                      <Text style={styles.popularTagText}>
                        {isHindi ? 'पॉपुलर' : 'POPULAR'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                    {isHindi ? 'ग्रामीण नागरिक' : 'Village Citizen'}
                  </Text>
                  <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
                    {isHindi
                      ? 'ग्राम पंचायत नागरिक सेवा पोर्टल'
                      : 'Citizen access for village services and grievances'}
                  </Text>
                </View>

                <View style={[styles.actionCircle, { backgroundColor: '#0B1B4F' }]}>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* =========================================================================
            4. ROLE CARD 2: SARPANCH / ADMIN (ग्राम प्रधान)
            ========================================================================= */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: card2Anim,
              transform: [{ translateY: card2Slide }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.premiumRoleCard, styles.sarpanchBorder, { backgroundColor: colors.card }]}
            onPress={openAdmin}
            activeOpacity={0.88}
          >
            {/* Top Accent Strip */}
            <View style={[styles.roleTopBar, { backgroundColor: '#EA580C' }]} />

            <View style={styles.roleCardBody}>
              <View style={styles.roleCardMain}>
                <View style={[styles.roleIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="shield-checkmark" size={28} color="#EA580C" />
                </View>

                <View style={styles.roleInfo}>
                  <View style={styles.roleBadgeRow}>
                    <View style={[styles.roleTag, { backgroundColor: '#FFF7ED' }]}>
                      <Ionicons name="ribbon-outline" size={12} color="#EA580C" />
                      <Text style={[styles.roleTagText, { color: '#EA580C' }]}>
                        {isHindi ? 'प्रशासन' : 'Governance'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                    {isHindi ? 'ग्राम प्रधान / सरपंच' : 'Gram Sarpanch'}
                  </Text>
                  <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
                    {isHindi
                      ? 'ग्राम पंचायत प्रशासन एवं निगरानी'
                      : 'Village leadership and complaint management'}
                  </Text>
                </View>

                <View style={[styles.actionCircle, { backgroundColor: '#EA580C' }]}>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* =========================================================================
            5. ROLE CARD 3: SECRETARY (ग्राम सचिव)
            ========================================================================= */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: card3Anim,
              transform: [{ translateY: card3Slide }],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.premiumRoleCard, styles.secretaryBorder, { backgroundColor: colors.card }]}
            onPress={openSecretary}
            activeOpacity={0.88}
          >
            {/* Top Accent Strip */}
            <View style={[styles.roleTopBar, { backgroundColor: '#15803D' }]} />

            <View style={styles.roleCardBody}>
              <View style={styles.roleCardMain}>
                <View style={[styles.roleIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="business" size={28} color="#15803D" />
                </View>

                <View style={styles.roleInfo}>
                  <View style={styles.roleBadgeRow}>
                    <View style={[styles.roleTag, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="document-text-outline" size={12} color="#15803D" />
                      <Text style={[styles.roleTagText, { color: '#15803D' }]}>
                        {isHindi ? 'अधिकारी' : 'Official'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.roleTitle, { color: colors.textPrimary }]}>
                    {isHindi ? 'ग्राम विकास अधिकारी / सचिव' : 'Gram Secretary'}
                  </Text>
                  <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
                    {isHindi
                      ? 'सरकारी प्रशासनिक निगरानी एवं विभागीय समन्वय'
                      : 'Administrative supervision and department coordination'}
                  </Text>
                </View>

                <View style={[styles.actionCircle, { backgroundColor: '#15803D' }]}>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* =========================================================================
            6. ALREADY REGISTERED (LOGIN LINK)
            ========================================================================= */}
        <Animated.View style={[styles.loginSection, { opacity: bottomAnim }]}>
          <View style={styles.loginDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {isHindi ? 'या सीधे प्रवेश करें' : 'or login directly'}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={openLogin}
            activeOpacity={0.82}
          >
            <View style={styles.loginBtnIcon}>
              <Ionicons name="log-in-outline" size={20} color="#0B1B4F" />
            </View>
            <Text style={[styles.loginBtnText, { color: colors.textPrimary }]}>
              {isHindi ? 'पहले से खाता है? लॉगिन करें' : 'Already registered? Login'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#0B1B4F" />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 35 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================================
   STYLES - ENHANCED PREMIUM DESIGN
   ========================================================================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },

  /* TOP NAV */
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  brandIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* HERO HEADER CARD */
  heroHeaderCard: {
    backgroundColor: '#0B1B4F',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#0B1B4F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBadgeRow: {
    marginBottom: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FED7AA',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#C7D2FE',
    lineHeight: 18,
    fontWeight: '500',
  },

  /* SECTION HEADING */
  sectionHeadingBox: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* PREMIUM ROLE CARDS */
  cardWrapper: {
    marginBottom: 14,
  },
  premiumRoleCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  citizenBorder: {
    borderColor: '#C7D2FE',
  },
  sarpanchBorder: {
    borderColor: '#FED7AA',
  },
  secretaryBorder: {
    borderColor: '#BBF7D0',
  },
  roleTopBar: {
    height: 4.5,
    width: '100%',
  },
  roleCardBody: {
    padding: 16,
  },
  roleCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  roleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  popularTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  roleDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },
  actionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  /* CHIPS ROW */
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featureChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },

  /* LOGIN SECTION */
  loginSection: {
    marginTop: 6,
  },
  loginDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.2,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  loginBtnIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});