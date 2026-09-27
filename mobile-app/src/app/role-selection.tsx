import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../i18n/LanguageContext';

const THEME = {
  saffron: '#FF9933',
  saffronDark: '#E67E17',
  saffronLight: '#FFF4E6',
  saffronBorder: '#FED7AA',

  navy: '#000080',
  navyDark: '#00005C',
  navyLight: '#EEF0FB',
  navyBorder: '#C7D2FE',

  green: '#138808',
  greenDark: '#0D6805',
  greenLight: '#EAF7EE',
  greenBorder: '#BBF7D0',

  dark: '#0F172A',
  textDark: '#1E293B',
  textMuted: '#64748B',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
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
      Animated.stagger(100, [
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

  const openHelp = () => {
    router.push('/help-line');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP NAVIGATION BAR */}
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
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={THEME.navy} />
          </TouchableOpacity>

          <View style={styles.brandBadge}>
            <View style={styles.brandIconBox}>
              <Ionicons name="home" size={14} color={THEME.white} />
            </View>
            <Text style={styles.brandText}>VillageApp</Text>
          </View>

          <TouchableOpacity
            style={styles.langBtn}
            onPress={toggleLanguage}
            activeOpacity={0.7}
          >
            <Ionicons name="language-outline" size={16} color={THEME.navy} />
            <Text style={styles.langBtnText}>{isHindi ? 'English' : 'हिंदी'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* TRICOLOR STRIPE */}
        <Animated.View
          style={[
            styles.tricolorBar,
            { opacity: fadeHeader },
          ]}
        >
          <View style={[styles.tricolorPart, { backgroundColor: THEME.saffron }]} />
          <View
            style={[
              styles.tricolorPart,
              {
                backgroundColor: THEME.white,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#E2E8F0',
              },
            ]}
          />
          <View style={[styles.tricolorPart, { backgroundColor: THEME.green }]} />
        </Animated.View>

        {/* HERO BANNER */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: fadeHeader,
              transform: [{ translateY: slideHeader }],
            },
          ]}
        >
          <View style={styles.heroDecoCircle1} />
          <View style={styles.heroDecoCircle2} />

          <View style={styles.heroPill}>
            <Ionicons name="shield-checkmark" size={13} color={THEME.saffron} />
            <Text style={styles.heroPillText}>
              {isHindi ? 'ई-ग्राम स्वराज • डिजिटल पोर्टल' : 'E-Gram Swaraj • Digital Portal'}
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            {isHindi ? 'अपनी भूमिका चुनें' : 'Choose Your Role'}
          </Text>

          <Text style={styles.heroSubtitle}>
            {isHindi
              ? 'ग्राम पंचायत डिजिटल सेवा में आपका स्वागत है। अपनी भूमिका चुनकर शुरू करें।'
              : 'Welcome to Gram Panchayat digital services. Select your role to get started.'}
          </Text>
        </Animated.View>

        {/* SECTION HEADER */}
        <Animated.View style={[styles.sectionHeader, { opacity: fadeHeader }]}>
          <Text style={styles.sectionHeading}>
            {isHindi ? 'उपलब्ध भूमिकाएं' : 'Available Roles'}
          </Text>
          <Text style={styles.sectionSub}>
            {isHindi ? 'जारी रखने के लिए अपनी भूमिका चुनें' : 'Select your role to continue'}
          </Text>
        </Animated.View>

        {/* ================= 1. CITIZEN CARD ================= */}
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
            style={[styles.roleCard, styles.citizenCardBorder]}
            onPress={openCitizen}
            activeOpacity={0.85}
          >
            {/* Top Accent Strip */}
            <View style={[styles.cardAccentBar, { backgroundColor: THEME.navy }]} />

            <View style={styles.cardMainRow}>
              <View style={[styles.iconContainer, { backgroundColor: THEME.navyLight }]}>
                <Ionicons name="person" size={28} color={THEME.navy} />
              </View>

              <View style={styles.cardInfoCol}>
                <View style={styles.badgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: THEME.navyLight }]}>
                    <Ionicons name="people-outline" size={11} color={THEME.navy} />
                    <Text style={[styles.roleBadgeText, { color: THEME.navy }]}>
                      {isHindi ? 'ग्रामवासी' : 'Citizen'}
                    </Text>
                  </View>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>
                      {isHindi ? 'लोकप्रिय' : 'POPULAR'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>
                  {isHindi ? 'नागरिक (Citizen)' : 'Citizen'}
                </Text>
              </View>

              <View style={[styles.arrowCircle, { backgroundColor: THEME.navy }]}>
                <Ionicons name="arrow-forward" size={18} color={THEME.white} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ================= 2. SARPANCH / ADMIN CARD ================= */}
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
            style={[styles.roleCard, styles.adminCardBorder]}
            onPress={openAdmin}
            activeOpacity={0.85}
          >
            {/* Top Accent Strip */}
            <View style={[styles.cardAccentBar, { backgroundColor: THEME.saffron }]} />

            <View style={styles.cardMainRow}>
              <View style={[styles.iconContainer, { backgroundColor: THEME.saffronLight }]}>
                <Ionicons name="shield-checkmark" size={28} color={THEME.saffronDark} />
              </View>

              <View style={styles.cardInfoCol}>
                <View style={styles.badgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: THEME.saffronLight }]}>
                    <Ionicons name="ribbon-outline" size={11} color={THEME.saffronDark} />
                    <Text style={[styles.roleBadgeText, { color: THEME.saffronDark }]}>
                      {isHindi ? 'ग्राम प्रधान' : 'Panchayat Head'}
                    </Text>
                  </View>
                  <View style={[styles.headBadge, { backgroundColor: THEME.saffronLight }]}>
                    <Text style={[styles.headBadgeText, { color: THEME.saffronDark }]}>HEAD</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>
                  {isHindi ? 'सरपंच / एडमिन' : 'Sarpanch / Admin'}
                </Text>
              </View>

              <View style={[styles.arrowCircle, { backgroundColor: THEME.saffron }]}>
                <Ionicons name="arrow-forward" size={18} color={THEME.white} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ================= 3. SECRETARY CARD ================= */}
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
            style={[styles.roleCard, styles.secretaryCardBorder]}
            onPress={openSecretary}
            activeOpacity={0.85}
          >
            {/* Top Accent Strip */}
            <View style={[styles.cardAccentBar, { backgroundColor: THEME.green }]} />

            <View style={styles.cardMainRow}>
              <View style={[styles.iconContainer, { backgroundColor: THEME.greenLight }]}>
                <Ionicons name="clipboard" size={28} color={THEME.green} />
              </View>

              <View style={styles.cardInfoCol}>
                <View style={styles.badgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: THEME.greenLight }]}>
                    <Ionicons name="briefcase-outline" size={11} color={THEME.green} />
                    <Text style={[styles.roleBadgeText, { color: THEME.green }]}>
                      {isHindi ? 'प्रशासनिक अधिकारी' : 'Official'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>
                  {isHindi ? 'सचिव / सुपरवाइजर' : 'Secretary / Supervisor'}
                </Text>
              </View>

              <View style={[styles.arrowCircle, { backgroundColor: THEME.green }]}>
                <Ionicons name="arrow-forward" size={18} color={THEME.white} />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ================= EXISTING ACCOUNT LOGIN CARD ================= */}
        <Animated.View style={[styles.loginPromptWrapper, { opacity: bottomAnim }]}>
          <TouchableOpacity
            style={styles.loginPromptCard}
            onPress={openLogin}
            activeOpacity={0.85}
          >
            <View style={styles.loginPromptLeft}>
              <View style={styles.loginPromptIcon}>
                <Ionicons name="key-outline" size={22} color={THEME.saffronDark} />
              </View>
              <View style={styles.loginPromptTexts}>
                <Text style={styles.loginPromptTitle}>
                  {isHindi ? 'पहले से खाता है?' : 'Already have an account?'}
                </Text>
                <Text style={styles.loginPromptSub}>
                  {isHindi ? 'मोबाइल नंबर व पासवर्ड से सीधे लॉगिन करें' : 'Login directly with mobile & password'}
                </Text>
              </View>
            </View>

            <View style={styles.loginPromptBtn}>
              <Text style={styles.loginPromptBtnText}>
                {isHindi ? 'लॉगिन' : 'Login'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={THEME.white} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* TRUST & HELPLINE FOOTER */}
        <Animated.View style={[styles.footerContainer, { opacity: bottomAnim }]}>
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark" size={16} color={THEME.green} />
            <Text style={styles.trustText}>
              {isHindi
                ? 'सुरक्षित एवं प्रमाणित • डिजिटल ग्राम सेवा'
                : '100% Secure & Verified • Digital Village Initiative'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.helpBtn}
            onPress={openHelp}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={15} color={THEME.navy} />
            <Text style={styles.helpBtnText}>
              {isHindi ? 'ग्राम सहायता केंद्र (Helpline)' : 'Village Helpline Center'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
  },

  /* TOP NAVIGATION BAR */
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  brandIconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: THEME.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },

  brandText: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.navy,
    letterSpacing: 0.3,
  },

  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.navy,
  },

  /* TRICOLOR BAR */
  tricolorBar: {
    height: 4,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'column',
    marginBottom: 16,
  },

  tricolorPart: {
    flex: 1,
  },

  /* HERO BANNER */
  heroCard: {
    backgroundColor: THEME.navy,
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: THEME.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  heroDecoCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },

  heroDecoCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 153, 51, 0.12)',
  },

  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  heroPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.white,
    letterSpacing: 0.2,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.white,
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.88)',
  },

  /* SECTION HEADER */
  sectionHeader: {
    marginBottom: 14,
  },

  sectionHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.dark,
    letterSpacing: 0.1,
  },

  sectionSub: {
    fontSize: 12,
    color: THEME.textMuted,
    marginTop: 2,
  },

  /* ROLE CARDS */
  cardWrapper: {
    marginBottom: 14,
  },

  roleCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: THEME.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },

  citizenCardBorder: {
    borderColor: THEME.navyBorder,
  },

  adminCardBorder: {
    borderColor: THEME.saffronBorder,
  },

  secretaryCardBorder: {
    borderColor: THEME.greenBorder,
  },

  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  cardInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
    gap: 4,
  },

  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  popularBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  popularBadgeText: {
    color: THEME.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  headBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },

  headBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.dark,
    letterSpacing: 0.1,
  },

  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  /* LOGIN PROMPT CARD */
  loginPromptWrapper: {
    marginTop: 6,
    marginBottom: 16,
  },

  loginPromptCard: {
    backgroundColor: THEME.white,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: THEME.saffronBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  loginPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  loginPromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.saffronLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  loginPromptTexts: {
    flex: 1,
  },

  loginPromptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.dark,
  },

  loginPromptSub: {
    fontSize: 10.5,
    color: THEME.textMuted,
    marginTop: 1,
  },

  loginPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.saffronDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
    shadowColor: THEME.saffronDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },

  loginPromptBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.white,
  },

  /* FOOTER */
  footerContainer: {
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.greenBorder,
  },

  trustText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.greenDark,
  },

  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },

  helpBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.navy,
    textDecorationLine: 'underline',
  },

  bottomSpace: {
    height: 20,
  },
});