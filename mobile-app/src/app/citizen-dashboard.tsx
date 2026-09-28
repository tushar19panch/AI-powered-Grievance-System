import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';

import { useLanguage } from '../i18n/LanguageContext';
import { complaintApi } from '../services/api';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PanchayatShowcaseCard } from '../components/PanchayatShowcaseCard';
import { DashboardBottomBar } from '../components/DashboardBottomBar';
import { VillageInfoModal } from '../components/VillageInfoModal';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type Citizen = {
  name?: string;
  mobile?: string;
  village?: string;
  ward?: string;
  wardNumber?: string;
  district?: string;
  block?: string;
  state?: string;
  profileImage?: string | null;
};

export default function CitizenDashboard() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const isHindi = language === 'hi';

  const [user, setUser] = useState<Citizen | null>(null);
  const [totalComplaints, setTotalComplaints] = useState(0);
  const [inProgressComplaints, setInProgressComplaints] = useState(0);
  const [resolvedComplaints, setResolvedComplaints] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [villageInfoVisible, setVillageInfoVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const loadCitizenData = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const storedCitizen = await AsyncStorage.getItem('citizen');
      const citizen: Citizen = storedCitizen ? JSON.parse(storedCitizen) : {};

      const currentMobile = String(session?.mobile || citizen?.mobile || '').trim();
      const photo = currentMobile
        ? await AsyncStorage.getItem(`profile_image_${currentMobile}`)
        : null;

      const mergedCitizen: Citizen = {
        name: session?.name || citizen?.name || (isHindi ? 'नागरिक' : 'Citizen'),
        mobile: currentMobile,
        village: session?.village || citizen?.village || (isHindi ? 'मुख्य ग्राम' : 'Main Village'),
        ward: session?.ward || citizen?.ward || '',
        profileImage: photo || null,
      };

      setUser(mergedCitizen);

      // Load complaints from backend
      try {
        let apiData = await complaintApi.getCitizenComplaints();
        if (!Array.isArray(apiData) || apiData.length === 0) {
          try {
            const offline = await AsyncStorage.getItem('offline_complaints');
            const offlineArr = offline ? JSON.parse(offline) : [];
            if (Array.isArray(offlineArr) && offlineArr.length > 0) {
              apiData = offlineArr;
            }
          } catch (offErr) {}
        }

        if (Array.isArray(apiData)) {
          let tot = 0;
          let inProg = 0;
          let res = 0;

          apiData.forEach((c: any) => {
            tot++;
            const s = String(c.status || '').toUpperCase();
            if (s === 'RESOLVED' || s === 'CLOSED') {
              res++;
            } else if (
              s === 'IN PROGRESS' ||
              s === 'IN_PROGRESS' ||
              s === 'ACTION TAKEN' ||
              s === 'ACTION_TAKEN'
            ) {
              inProg++;
            }
          });

          setTotalComplaints(tot);
          setInProgressComplaints(inProg);
          setResolvedComplaints(res);
        }
      } catch (err) {
        console.log('Backend complaint fetch error for citizen:', err);
      }
    } catch (e) {
      console.log('Error loading citizen dashboard:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCitizenData();
    }, [language])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const openComplaints = (filterType: string) => {
    router.push({
      pathname: '/(tabs)/complaints',
      params: { filter: filterType },
    } as any);
  };

  const openProfile = () => {
    router.push('/profile' as any);
  };

  const openReportProblem = () => {
    router.push('/report' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* TRICOLOR TOP STRIPE */}
        <View style={styles.tricolorBar}>
          <View style={styles.saffronStripe} />
          <View style={styles.whiteStripe} />
          <View style={styles.greenStripe} />
        </View>

        {/* =================================================
            TOP HEADER (MATCHING ADMIN & SECRETARY)
        ================================================= */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="home-outline" size={21} color={COLORS.white} />
              </View>
              <Text style={styles.appTitle}>VillageApp</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isHindi ? 'नागरिक सेवा पोर्टल' : 'Citizen Service Portal'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* LANGUAGE TOGGLE */}
            <TouchableOpacity
              style={styles.languageButton}
              onPress={toggleLanguage}
              activeOpacity={0.8}
            >
              <Ionicons name="language-outline" size={16} color={COLORS.primary} />
              <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
            </TouchableOpacity>

            {/* PROFILE PHOTO (CLICKABLE - OPENS PROFILE) */}
            <TouchableOpacity
              style={styles.headerProfileButton}
              onPress={openProfile}
              activeOpacity={0.8}
            >
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  style={[styles.profileImage, { width: 40, height: 40, borderRadius: 20 }]}
                />
              ) : (
                <View style={[styles.profilePlaceholder, { width: 40, height: 40, borderRadius: 20 }]}>
                  <Ionicons name="person-outline" size={19} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* OFFLINE SYNC BANNER */}
        <OfflineSyncBanner isHindi={isHindi} onSyncComplete={loadCitizenData} />

        {/* =================================================
            WELCOME / GRAM PANCHAYAT SHOWCASE BANNER
        ================================================= */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <PanchayatShowcaseCard
            userName={user?.name || (isHindi ? 'नागरिक' : 'Citizen')}
            villageName={user?.village || (isHindi ? 'मुख्य ग्राम' : 'Main Village')}
            isHindi={isHindi}
          />
        </Animated.View>

        {/* =================================================
            COMPLAINT OVERVIEW / STATS (3 STAT CARDS)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'शिकायतों का अवलोकन' : 'Complaint Overview'}
            </Text>
          </View>

          <View style={styles.sectionIcon}>
            <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
          </View>
        </View>

        <View style={styles.statsRow}>
          {/* TOTAL */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => openComplaints('all')}
            activeOpacity={0.85}
          >
            <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statNumber}>{totalComplaints}</Text>
            <Text style={styles.statLabel}>{t.total}</Text>
          </TouchableOpacity>

          {/* IN PROGRESS */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => openComplaints('in-progress')}
            activeOpacity={0.85}
          >
            <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statNumber}>{inProgressComplaints}</Text>
            <Text style={styles.statLabel}>{t.inProgress}</Text>
          </TouchableOpacity>

          {/* RESOLVED */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => openComplaints('resolved')}
            activeOpacity={0.85}
          >
            <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statNumber}>{resolvedComplaints}</Text>
            <Text style={styles.statLabel}>{t.resolved}</Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            1. DEDICATED SINGLE REPORT PROBLEM CARD
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'समस्या रिपोर्ट करें' : 'Report Grievance'}
            </Text>
          </View>

          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={13} color={COLORS.primary} />
            <Text style={styles.aiText}>
              {isHindi ? 'AI सक्षम' : 'AI Powered'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.singleReportCard}
          onPress={openReportProblem}
          activeOpacity={0.85}
        >
          <View style={styles.singleReportIconBox}>
            <Ionicons name="megaphone" size={26} color={COLORS.primary} />
          </View>

          <View style={styles.singleReportInfo}>
            <Text style={styles.singleReportTitle}>
              {isHindi ? 'नई शिकायत दर्ज करें' : 'Report a Problem'}
            </Text>
            <Text style={styles.singleReportHint}>
              {isHindi ? 'बोलकर या लिखकर समस्या बताएं' : 'Speak or describe your issue'}
            </Text>
          </View>

          <View style={styles.reportArrowCircle}>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* =================================================
            2. DEDICATED PANCHAYAT SERVICES & RECORDS (2X2 GRID)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'पंचायत सेवाएं एवं रिकॉर्ड्स' : 'Panchayat Services & Records'}
            </Text>
          </View>
        </View>

        <View style={styles.servicesGridCard}>
          <View style={styles.servicesGrid}>
            {/* MY COMPLAINTS */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => openComplaints('all')}
              activeOpacity={0.85}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="list-outline" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.serviceActionLabel} numberOfLines={2}>
                {isHindi ? 'मेरी शिकायतें' : 'My Complaints'}
              </Text>
            </TouchableOpacity>

            {/* WARD SCORECARD */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => router.push('/ward-scorecard' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: COLORS.accentLight }]}>
                <Ionicons name="stats-chart-outline" size={24} color={COLORS.saffron} />
              </View>
              <Text style={styles.serviceActionLabel} numberOfLines={2}>
                {isHindi ? 'वार्ड स्कोरकार्ड' : 'Ward Scorecard'}
              </Text>
            </TouchableOpacity>

            {/* HELPLINE */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => router.push('/help-line' as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: COLORS.infoLight }]}>
                <Ionicons name="call-outline" size={24} color={COLORS.info} />
              </View>
              <Text style={styles.serviceActionLabel} numberOfLines={2}>
                {isHindi ? 'हेल्पलाइन संपर्क' : 'Helpline Contacts'}
              </Text>
            </TouchableOpacity>

            {/* VILLAGE INFO / GRAM PARICHAY */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => setVillageInfoVisible(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.serviceIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="business-outline" size={24} color="#9333EA" />
              </View>
              <Text style={styles.serviceActionLabel} numberOfLines={2}>
                {isHindi ? 'ग्राम परिचय' : 'Village Info'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* UNIVERSAL BOTTOM NAVIGATION BAR (HOME, NOTICES, PROFILE) */}
      <DashboardBottomBar activeTab="home" role="citizen" isHindi={isHindi} />

      {/* VILLAGE INFO MODAL */}
      <VillageInfoModal
        visible={villageInfoVisible}
        onClose={() => setVillageInfoVisible(false)}
        villageName={user?.village || (isHindi ? 'ग्राम पंचायत' : 'Gram Panchayat')}
        district={user?.district}
        block={user?.block}
        state={user?.state || 'Madhya Pradesh'}
        wardNumber={user?.wardNumber || user?.ward}
        isHindi={isHindi}
      />

      {/* FULL ENLARGED PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={previewVisible}
        imageUri={user?.profileImage}
        userName={user?.name || (isHindi ? 'नागरिक' : 'Citizen')}
        userRole={isHindi ? `नागरिक • ${user?.village || 'ग्राम पंचायत'}` : `Citizen • ${user?.village || 'Gram Panchayat'}`}
        onClose={() => setPreviewVisible(false)}
        onChangePhoto={() => {
          setPreviewVisible(false);
          openProfile();
        }}
        isHindi={isHindi}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.normal,
    paddingBottom: 25,
  },
  tricolorBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  saffronStripe: {
    flex: 1,
    backgroundColor: '#FF9933',
  },
  whiteStripe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  greenStripe: {
    flex: 1,
    backgroundColor: '#138808',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  languageText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerProfileButton: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 1,
  },
  profileImage: {
    borderRadius: 20,
  },
  profilePlaceholder: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.navy,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  singleReportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...SHADOWS.small,
    marginBottom: 14,
  },
  singleReportIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleReportInfo: {
    flex: 1,
  },
  singleReportTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
  },
  singleReportHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: '500',
  },
  reportArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  servicesGridCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceActionCard: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceActionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerLine: {
    width: 50,
    height: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
    marginVertical: 4,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});