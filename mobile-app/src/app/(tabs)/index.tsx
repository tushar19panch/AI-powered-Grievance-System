import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../i18n/LanguageContext';

const COLORS = {
  orange: '#FF9933',
  orangeDark: '#E7831F',
  orangeLight: '#FFF3E7',
  navy: '#000080',
  navyLight: '#F0F0FA',
  white: '#FFFFFF',
  background: '#F7F8FA',
  dark: '#17251E',
  text: '#596760',
  muted: '#7C8882',
  border: '#E3E6E4',
};

export default function HomeScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  const openAppInfo = () => {
    setInfoModalVisible(true);
  };

  // CREATE ACCOUNT / REPORT
  const openRoleSelection = () => {
    router.push('/role-selection');
  };

  // EXISTING USER LOGIN
  const openLogin = () => {
    router.push('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
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
          <View style={styles.brandRow}>
            <View style={styles.logoBox}>
              <Ionicons
                name="home"
                size={24}
                color={COLORS.white}
              />
            </View>

            <View>
              <Text style={styles.brandName}>
                VillageApp
              </Text>

              <Text style={styles.brandSubtitle}>
                {language === 'hi'
                  ? 'ग्राम पंचायत सेवा'
                  : 'Gram Panchayat Service'}
              </Text>
            </View>
          </View>

          <View style={styles.headerButtons}>
            {/* LANGUAGE */}
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
                {language === 'hi' ? 'EN' : 'हि'}
              </Text>
            </TouchableOpacity>

            {/* APP INFO */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openAppInfo}
              activeOpacity={0.8}
            >
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={COLORS.navy}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* TRICOLOR STRIPE */}
        <Animated.View
          style={[
            styles.tricolor,
            { opacity: fadeAnim },
          ]}
        >
          <View
            style={[
              styles.stripe,
              { backgroundColor: COLORS.orange },
            ]}
          />

          <View
            style={[
              styles.stripe,
              {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#E6E6E6',
              },
            ]}
          />

          <View
            style={[
              styles.stripe,
              { backgroundColor: COLORS.navy },
            ]}
          />
        </Animated.View>

        {/* MAIN HERO */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Decorative circles */}
          <View style={styles.circleOne} />
          <View style={styles.circleTwo} />

          {/* Village Illustration */}
          <View style={styles.villageIllustration}>
            <View style={styles.sun}>
              <Ionicons
                name="sunny"
                size={32}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.house}>
              <View style={styles.roof}>
                <Ionicons
                  name="home"
                  size={76}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.houseWindow}>
                <View style={styles.windowCrossVertical} />
                <View style={styles.windowCrossHorizontal} />
              </View>

              <View style={styles.houseDoor}>
                <View style={styles.doorKnob} />
              </View>
            </View>

            <View style={styles.treeLeft}>
              <Ionicons
                name="leaf"
                size={42}
                color="#4C8A52"
              />
            </View>

            <View style={styles.treeRight}>
              <Ionicons
                name="leaf"
                size={38}
                color="#4C8A52"
              />
            </View>
          </View>

          {/* Welcome Text */}
          <View style={styles.heroText}>
            <Text style={styles.welcomeSmall}>
              {language === 'hi'
                ? 'आपका स्वागत है'
                : 'WELCOME TO'}
            </Text>

            <Text style={styles.welcomeTitle}>
              VillageApp
            </Text>

            <Text style={styles.tagline}>
              {language === 'hi'
                ? 'आपकी आवाज़, आपके गांव का समाधान'
                : 'Your Voice, Your Village, Your Solution'}
            </Text>
          </View>
        </Animated.View>

        {/* DESCRIPTION / RAISE PROBLEM (CLICKABLE) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openRoleSelection}
        >
          <Animated.View
            style={[
              styles.descriptionCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.descriptionIcon}>
              <Ionicons
                name="megaphone-outline"
                size={25}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.descriptionContent}>
              <Text style={styles.descriptionTitle}>
                {language === 'hi'
                  ? 'अपने गांव की समस्या बताएं'
                  : 'Raise Your Village Problem'}
              </Text>

              <Text style={styles.descriptionText}>
                {language === 'hi'
                  ? 'समस्या दर्ज करें और उसके समाधान की स्थिति आसानी से देखें।'
                  : 'Report problems and easily track their resolution.'}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.orange}
              style={{ marginLeft: 'auto', alignSelf: 'center' }}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* CREATE ACCOUNT */}
        <Animated.View
          style={[
            styles.accountCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.accountIcon}>
            <Ionicons
              name="person-add"
              size={28}
              color={COLORS.navy}
            />
          </View>

          <View style={styles.accountContent}>
            <Text style={styles.accountTitle}>
              {language === 'hi'
                ? 'खाता बनाएं'
                : 'Create Account'}
            </Text>

            <Text style={styles.accountText}>
              {language === 'hi'
                ? 'अपनी भूमिका चुनकर शुरुआत करें'
                : 'Choose your role to get started'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={openRoleSelection}
            activeOpacity={0.85}
          >
            <Ionicons
              name="arrow-forward"
              size={25}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* EXISTING USER LOGIN */}
        <Animated.View
          style={[
            styles.loginCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.loginIcon}>
            <Ionicons
              name="log-in-outline"
              size={27}
              color={COLORS.orange}
            />
          </View>

          <View style={styles.loginContent}>
            <Text style={styles.loginTitle}>
              {language === 'hi'
                ? 'पहले से खाता है?'
                : 'Already have an account?'}
            </Text>

            <Text style={styles.loginText}>
              {language === 'hi'
                ? 'मोबाइल नंबर और पासवर्ड से लॉगिन करें'
                : 'Login using your mobile number and password'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={openLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.loginButtonText}>
              {language === 'hi'
                ? 'लॉगिन'
                : 'Login'}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color={COLORS.white}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* FOOTER */}
        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.footerLine} />

          <Text style={styles.footerText}>
            {language === 'hi'
              ? 'डिजिटल गांव • बेहतर समाधान'
              : 'Digital Village • Better Solutions'}
          </Text>
        </Animated.View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* INFORMATION MODAL POPUP */}
      <Modal
        visible={infoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.infoModalBackdrop}>
          <View style={styles.infoModalCard}>
            {/* Header */}
            <View style={styles.infoModalHeader}>
              <View style={styles.infoIconBox}>
                <Ionicons name="information" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.infoModalTitle}>
                {language === 'hi' ? 'VillageApp जानकारी' : 'About VillageApp'}
              </Text>
              <Text style={styles.infoModalSubtitle}>
                {language === 'hi'
                  ? 'ग्राम पंचायत डिजिटल शिकायत प्रबंधन प्रणाली'
                  : 'Gram Panchayat Digital Grievance Portal'}
              </Text>
            </View>

            {/* Body */}
            <View style={styles.infoModalBody}>
              <View style={styles.infoItemRow}>
                <View style={[styles.infoBullet, { backgroundColor: '#FF9933' }]}>
                  <Ionicons name="person" size={14} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoItemHead}>
                    {language === 'hi' ? 'नागरिक सेवा' : 'Citizen Service'}
                  </Text>
                  <Text style={styles.infoItemDesc}>
                    {language === 'hi'
                      ? 'गाँव की समस्या (पानी, सड़क, बिजली) की फोटो व स्थान के साथ शिकायत दर्ज करें।'
                      : 'Lodge complaints with photos and real-time location.'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItemRow}>
                <View style={[styles.infoBullet, { backgroundColor: '#000080' }]}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoItemHead}>
                    {language === 'hi' ? 'सरपंच एवं सचिव' : 'Sarpanch & Secretary'}
                  </Text>
                  <Text style={styles.infoItemDesc}>
                    {language === 'hi'
                      ? 'शिकायतों की समीक्षा कर त्वरित कार्रवाई और समाधान स्थिति अपडेट करते हैं।'
                      : 'Review issues and update resolution progress live.'}
                  </Text>
                </View>
              </View>

              {/* Helpline Box */}
              <View style={styles.infoHelplineBox}>
                <Ionicons name="call" size={20} color="#138808" />
                <View>
                  <Text style={styles.infoHelplineTitle}>
                    {language === 'hi' ? 'टोल-फ्री हेल्पलाइन' : 'Toll-Free Helpline'}
                  </Text>
                  <Text style={styles.infoHelplineNum}>1800-180-1555</Text>
                </View>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.infoCloseBtn}
              onPress={() => setInfoModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.infoCloseBtnText}>
                {language === 'hi' ? 'समझ गया' : 'Got it'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  brandName: {
    fontSize: 21,
    fontWeight: '900',
    color: COLORS.dark,
  },

  brandSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 2,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  languageButton: {
    height: 38,
    minWidth: 48,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    elevation: 2,
  },

  languageText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.navy,
  },

  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  /* TRICOLOR */

  tricolor: {
    height: 5,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 17,
  },

  stripe: {
    flex: 1,
  },

  /* HERO */

  heroCard: {
    minHeight: 370,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 25,
    elevation: 7,
    shadowColor: '#000',
    shadowOpacity: 0.11,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    marginBottom: 17,
  },

  circleOne: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: COLORS.orangeLight,
    top: -75,
    right: -70,
  },

  circleTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.navyLight,
    bottom: -70,
    left: -60,
  },

  villageIllustration: {
    width: 230,
    height: 175,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sun: {
    position: 'absolute',
    top: 5,
    right: 20,
  },

  house: {
    width: 130,
    height: 120,
    backgroundColor: '#FFF1E3',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.orange,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },

  roof: {
    position: 'absolute',
    top: 20,
    left: 27,
  },

  houseWindow: {
    position: 'absolute',
    left: 16,
    bottom: 22,
    width: 29,
    height: 29,
    borderRadius: 5,
    backgroundColor: '#DDE8F4',
    borderWidth: 2,
    borderColor: COLORS.navy,
  },

  windowCrossVertical: {
    position: 'absolute',
    width: 2,
    height: 25,
    backgroundColor: COLORS.navy,
    left: 12,
    top: 0,
  },

  windowCrossHorizontal: {
    position: 'absolute',
    width: 25,
    height: 2,
    backgroundColor: COLORS.navy,
    top: 12,
    left: 0,
  },

  houseDoor: {
    width: 28,
    height: 52,
    borderRadius: 6,
    backgroundColor: COLORS.navy,
    marginBottom: 0,
  },

  doorKnob: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.orange,
    right: 5,
    top: 25,
  },

  treeLeft: {
    position: 'absolute',
    left: 5,
    bottom: 18,
  },

  treeRight: {
    position: 'absolute',
    right: 0,
    bottom: 15,
  },

  heroText: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 3,
  },

  welcomeSmall: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.orange,
    letterSpacing: 1.2,
  },

  welcomeTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.navy,
    marginTop: 2,
  },

  tagline: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 5,
  },

  /* DESCRIPTION */

  descriptionCard: {
    backgroundColor: COLORS.orangeLight,
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0C2',
    marginBottom: 15,
  },

  descriptionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  descriptionContent: {
    flex: 1,
  },

  descriptionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.dark,
  },

  descriptionText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.text,
    marginTop: 3,
  },

  /* CREATE ACCOUNT */

  accountCard: {
    backgroundColor: COLORS.white,
    borderRadius: 23,
    minHeight: 105,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    marginBottom: 12,
  },

  accountIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: COLORS.navyLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  accountContent: {
    flex: 1,
    paddingHorizontal: 12,
  },

  accountTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.dark,
  },

  accountText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    marginTop: 3,
  },

  startButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },

  /* EXISTING USER LOGIN */

  loginCard: {
    backgroundColor: COLORS.white,
    borderRadius: 23,
    minHeight: 105,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0C2',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  loginIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor: COLORS.orangeLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginContent: {
    flex: 1,
    paddingHorizontal: 12,
  },

  loginTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.dark,
  },

  loginText: {
    fontSize: 10.5,
    lineHeight: 16,
    color: COLORS.muted,
    marginTop: 3,
  },

  loginButton: {
    minWidth: 82,
    height: 43,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    elevation: 3,
  },

  loginButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.white,
  },

  /* FOOTER */

  footer: {
    alignItems: 'center',
    marginTop: 20,
  },

  footerLine: {
    width: 42,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.orange,
    marginBottom: 7,
  },

  footerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },

  bottomSpace: {
    height: 25,
  },

  /* INFO MODAL */
  infoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  infoModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
  },

  infoModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },

  infoIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 3,
  },

  infoModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.dark,
    textAlign: 'center',
  },

  infoModalSubtitle: {
    fontSize: 11.5,
    color: COLORS.muted,
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '600',
  },

  infoModalBody: {
    gap: 12,
    marginVertical: 10,
  },

  infoItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8F9FB',
    padding: 10,
    borderRadius: 12,
  },

  infoBullet: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  infoItemHead: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
  },

  infoItemDesc: {
    fontSize: 11,
    color: '#475467',
    lineHeight: 16,
    marginTop: 2,
  },

  infoHelplineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },

  infoHelplineTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },

  infoHelplineNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1B5E20',
  },

  infoCloseBtn: {
    marginTop: 16,
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  infoCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});