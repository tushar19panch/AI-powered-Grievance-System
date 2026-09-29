import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const isHindi = language === 'hi';

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* =========================================================================
            1. TOP HERO CARD (LOGO + TITLE + MOTTO)
            ========================================================================= */}
        <View style={styles.topHeroCard}>
          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => setSettingsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-sharp" size={20} color="#64748B" />
          </TouchableOpacity>

          {/* House / Village Logo with Leaves */}
          <View style={styles.logoRow}>
            {/* Left Leaf */}
            <View style={styles.leafLeft}>
              <Ionicons name="leaf" size={28} color="#2E7D32" />
            </View>

            {/* Central House Illustration Badge */}
            <View style={styles.houseBadge}>
              {/* House Graphic */}
              <View style={styles.houseContainer}>
                <View style={styles.roofTriangle}>
                  <Ionicons name="home" size={48} color="#0B1B4F" />
                </View>
                {/* Window & Details */}
                <View style={styles.houseWindow}>
                  <View style={styles.windowPane} />
                  <View style={styles.windowPane} />
                  <View style={styles.windowPane} />
                  <View style={styles.windowPane} />
                </View>
                <View style={styles.doorKnob} />
              </View>
            </View>

            {/* Right Leaf */}
            <View style={styles.leafRight}>
              <Ionicons name="leaf" size={28} color="#2E7D32" />
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.welcomeText}>
            {isHindi ? 'स्वागत है' : 'WELCOME TO'}
          </Text>

          <Text style={styles.appTitle}>
            Village<Text style={styles.appTitleDark}>App</Text>
          </Text>

          <Text style={styles.appTagline}>
            {isHindi
              ? 'आपकी आवाज़, आपका गाँव, आपका समाधान'
              : 'Your Voice, Your Village, Your Solution'}
          </Text>
        </View>

        {/* =========================================================================
            2. CREATE ACCOUNT CARD
            ========================================================================= */}
        <TouchableOpacity
          style={styles.whiteActionCard}
          onPress={() => router.push('/role-selection')}
          activeOpacity={0.85}
        >
          <View style={styles.navyIconBox}>
            <Ionicons name="person-add" size={22} color="#0B1B4F" />
          </View>

          <View style={styles.cardTextBox}>
            <Text style={styles.actionCardTitle}>
              {isHindi ? 'खाता बनाएं' : 'Create Account'}
            </Text>
            <Text style={styles.actionCardDesc}>
              {isHindi ? 'शुरू करने के लिए अपनी भूमिका चुनें' : 'Choose your role to get started'}
            </Text>
          </View>

          <View style={styles.navyCircleBtn}>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* =========================================================================
            4. ALREADY HAVE AN ACCOUNT? (LOGIN CARD)
            ========================================================================= */}
        <TouchableOpacity
          style={styles.whiteActionCard}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <View style={styles.orangeIconBox}>
            <Ionicons name="log-in-outline" size={24} color="#EA580C" />
          </View>

          <View style={styles.cardTextBox}>
            <Text style={styles.actionCardTitle}>
              {isHindi ? 'पहले से खाता है?' : 'Already have an account?'}
            </Text>
            <Text style={styles.actionCardDesc}>
              {isHindi
                ? 'मोबाइल नंबर व पासवर्ड से लॉगिन करें'
                : 'Login using your mobile number and password'}
            </Text>
          </View>

          <View style={styles.orangeLoginBtn}>
            <Text style={styles.orangeLoginBtnText}>
              {isHindi ? 'लॉगिन' : 'Login'}
            </Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* =========================================================================
            5. FOOTER
            ========================================================================= */}
        <View style={styles.footerContainer}>
          <View style={styles.footerPill} />
          <Text style={styles.footerText}>
            {isHindi
              ? 'डिजिटल गाँव • बेहतर समाधान'
              : 'Digital Village • Better Solutions'}
          </Text>
        </View>
      </ScrollView>

      {/* SETTINGS / LANGUAGE MODAL */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isHindi ? 'सेटिंग्स एवं भाषा' : 'Settings & Language'}
              </Text>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Language Toggle */}
            <TouchableOpacity
              style={styles.modalRow}
              onPress={toggleLanguage}
              activeOpacity={0.8}
            >
              <View style={styles.modalRowLeft}>
                <Ionicons name="language" size={20} color="#0B1B4F" />
                <Text style={styles.modalRowLabel}>
                  {isHindi ? 'भाषा' : 'Language'}
                </Text>
              </View>
              <View style={styles.modalPill}>
                <Text style={styles.modalPillText}>{isHindi ? 'हिंदी' : 'English'}</Text>
              </View>
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity
              style={styles.modalRow}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <View style={styles.modalRowLeft}>
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color="#EA580C" />
                <Text style={styles.modalRowLabel}>
                  {isHindi ? 'थीम' : 'Dark Mode'}
                </Text>
              </View>
              <View style={styles.modalPill}>
                <Text style={styles.modalPillText}>{isDark ? 'Dark' : 'Light'}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSettingsModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseBtnText}>
                {isHindi ? 'हो गया' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================================
   STYLES - MATCHING EXACT PIXEL-PERFECT DESIGN FROM SCREENSHOT
   ========================================================================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },

  /* 1. TOP HERO CARD */
  topHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  settingsBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  leafLeft: {
    transform: [{ rotate: '-35deg' }],
    marginRight: 12,
    marginTop: 10,
  },
  leafRight: {
    transform: [{ rotate: '35deg' }, { scaleX: -1 }],
    marginLeft: 12,
    marginTop: 10,
  },
  houseBadge: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  houseContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roofTriangle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseWindow: {
    position: 'absolute',
    top: 22,
    left: 4,
    width: 14,
    height: 14,
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#0B1B4F',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  windowPane: {
    width: 5,
    height: 5,
    borderWidth: 0.5,
    borderColor: '#0B1B4F',
  },
  doorKnob: {
    position: 'absolute',
    top: 26,
    right: 14,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B',
  },
  welcomeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0B1B4F',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appTitleDark: {
    color: '#0B1B4F',
  },
  appTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },

  /* 2. PEACH CARD (RAISE PROBLEM) */
  peachCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#FFEDD5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  peachIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  cardTextBox: {
    flex: 1,
  },
  peachCardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  peachCardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },

  /* 3. WHITE ACTION CARDS */
  whiteActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1.5,
  },
  navyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orangeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionCardDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },
  navyCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0B1B4F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1B4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  orangeLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F97316',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  orangeLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* 5. FOOTER */
  footerContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  footerPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F97316',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.2,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  modalPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    backgroundColor: '#0B1B4F',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});