import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
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
import { complaintApi, villageApi, authApi, getAuthToken, setAuthToken, isValidJwt } from '../services/api';
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
  const [pendingComplaints, setPendingComplaints] = useState(0);
  const [inProgressComplaints, setInProgressComplaints] = useState(0);
  const [resolvedComplaints, setResolvedComplaints] = useState(0);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [sarpanchName, setSarpanchName] = useState<string>('');
  const [sarpanchMobile, setSarpanchMobile] = useState<string>('9876543211');
  const [secretaryName, setSecretaryName] = useState<string>('');
  const [secretaryMobile, setSecretaryMobile] = useState<string>('9876543210');
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

      // Fetch village officials for this village
      try {
        let syncedSarpanch: any = null;
        let syncedSecretary: any = null;

        if (mergedCitizen.village) {
          try {
            const officials = await authApi.getVillageOfficials(mergedCitizen.village);
            if (officials?.sarpanch?.name) syncedSarpanch = officials.sarpanch;
            if (officials?.secretary?.name) syncedSecretary = officials.secretary;
          } catch (e) {
            console.log('authApi.getVillageOfficials error:', e);
          }
        }

        if (!syncedSarpanch && mergedCitizen.village) {
          const cached = await AsyncStorage.getItem(`sarpanch_sync_${mergedCitizen.village}`);
          if (cached) syncedSarpanch = JSON.parse(cached);
        }
        if (!syncedSecretary && mergedCitizen.village) {
          const cached = await AsyncStorage.getItem(`secretary_sync_${mergedCitizen.village}`);
          if (cached) syncedSecretary = JSON.parse(cached);
        }

        if (!syncedSarpanch) {
          const adminRaw = await AsyncStorage.getItem('admin');
          if (adminRaw) {
            const a = JSON.parse(adminRaw);
            if (a.name) syncedSarpanch = a;
          }
        }
        if (!syncedSecretary) {
          const secRaw = await AsyncStorage.getItem('secretary');
          if (secRaw) {
            const s = JSON.parse(secRaw);
            if (s.name) syncedSecretary = s;
          }
        }

        if (syncedSarpanch?.name) setSarpanchName(syncedSarpanch.name);
        if (syncedSarpanch?.mobile) setSarpanchMobile(syncedSarpanch.mobile);
        if (syncedSecretary?.name) setSecretaryName(syncedSecretary.name);
        if (syncedSecretary?.mobile) setSecretaryMobile(syncedSecretary.mobile);
      } catch (offErr) {
        console.log('Error fetching village officials for citizen dashboard:', offErr);
      }

      // Load complaints from backend
      try {
        let token = await getAuthToken();
        if (!token || !isValidJwt(token)) {
          const savedPass = session?.password || (citizen as any)?.password;
          if (savedPass && currentMobile) {
            try {
              const loginRes = await authApi.login({
                mobileNumber: currentMobile,
                identifier: currentMobile,
                password: savedPass,
                role: 'CITIZEN',
              });
              if (loginRes?.token && isValidJwt(loginRes.token)) {
                await setAuthToken(loginRes.token);
              }
            } catch (autoErr) {
              console.log('Auto re-authentication failed in dashboard:', autoErr);
            }
          }
        }

        let apiData: any[] = [];
        try {
          apiData = await complaintApi.getCitizenComplaints();
        } catch (err: any) {
          if (err?.message?.includes('Access Denied')) {
            const savedPass = session?.password || (citizen as any)?.password;
            if (savedPass && currentMobile) {
              try {
                const retryLogin = await authApi.login({
                  mobileNumber: currentMobile,
                  identifier: currentMobile,
                  password: savedPass,
                  role: 'CITIZEN',
                });
                if (retryLogin?.token && isValidJwt(retryLogin.token)) {
                  await setAuthToken(retryLogin.token);
                  apiData = await complaintApi.getCitizenComplaints();
                }
              } catch {}
            }
          }
          if (!apiData || apiData.length === 0) {
            console.log('Backend complaint fetch notice for citizen:', err?.message || err);
          }
        }

        if (!Array.isArray(apiData) || apiData.length === 0) {
          try {
            const offline = await AsyncStorage.getItem('@village_offline_complaints_queue');
            const fallbackOffline = await AsyncStorage.getItem('offline_complaints');
            const offlineArr = offline ? JSON.parse(offline) : (fallbackOffline ? JSON.parse(fallbackOffline) : []);
            if (Array.isArray(offlineArr) && offlineArr.length > 0) {
              apiData = offlineArr.map((o: any) => ({
                id: o.id,
                status: 'SUBMITTED',
                ...o.payload,
              }));
            }
          } catch (offErr) {}
        }

        if (Array.isArray(apiData)) {
          let tot = 0;
          let pending = 0;
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
            } else {
              pending++;
            }
          });

          setTotalComplaints(tot);
          setPendingComplaints(pending);
          setInProgressComplaints(inProg);
          setResolvedComplaints(res);
          setRecentComplaints(apiData.slice(0, 5));
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
            COMPLAINT OVERVIEW / STATS (4 STAT CARDS)
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

        <View style={styles.servicesGridCard}>
          <View style={styles.servicesGrid}>
            {/* TOTAL */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => openComplaints('all')}
              activeOpacity={0.82}
            >
              <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.statNumber}>{totalComplaints}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isHindi ? 'कुल शिकायतें' : 'Total Grievances'}
              </Text>
            </TouchableOpacity>

            {/* PENDING */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => openComplaints('pending')}
              activeOpacity={0.82}
            >
              <View style={[styles.statIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              </View>
              <Text style={styles.statNumber}>{pendingComplaints}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isHindi ? 'लंबित' : 'Pending'}
              </Text>
            </TouchableOpacity>

            {/* IN PROGRESS */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => openComplaints('in-progress')}
              activeOpacity={0.82}
            >
              <View style={[styles.statIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time-outline" size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.statNumber}>{inProgressComplaints}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isHindi ? 'प्रगति में' : 'In Progress'}
              </Text>
            </TouchableOpacity>

            {/* RESOLVED */}
            <TouchableOpacity
              style={styles.serviceActionCard}
              onPress={() => openComplaints('resolved')}
              activeOpacity={0.82}
            >
              <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.statNumber}>{resolvedComplaints}</Text>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isHindi ? 'निस्तारित' : 'Resolved'}
              </Text>
            </TouchableOpacity>
          </View>
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

        {/* =================================================
            🏛️ VILLAGE LEADERSHIP CONTACTS (SARPANCH & SECRETARY)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'ग्राम पंचायत पदाधिकारी संपर्क' : 'Panchayat Leadership Contacts'}
            </Text>
          </View>
        </View>

        <View style={styles.leadershipRow}>
          {/* SARPANCH CARD */}
          <View style={[styles.leaderCard, { borderColor: '#FDE68A' }]}>
            <View style={styles.leaderHeader}>
              <View style={[styles.leaderIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="ribbon" size={20} color={COLORS.saffron} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName} numberOfLines={1}>
                  {sarpanchName || (isHindi ? 'श्री रमेश पटेल' : 'Shri Ramesh Patel')}
                </Text>
                <Text style={[styles.leaderRole, { color: COLORS.saffron }]} numberOfLines={1}>
                  {isHindi ? 'ग्राम सरपंच' : 'Sarpanch'}
                </Text>
              </View>
            </View>

            <View style={styles.leaderBtnRow}>
              <TouchableOpacity
                style={styles.leaderCallBtn}
                onPress={() => Linking.openURL(`tel:${sarpanchMobile || '9876543211'}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={13} color="#FFFFFF" />
                <Text style={styles.leaderCallText}>{isHindi ? 'कॉल' : 'Call'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.leaderWaBtn}
                onPress={() => Linking.openURL(`https://wa.me/91${sarpanchMobile || '9876543211'}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={13} color="#15803D" />
                <Text style={styles.leaderWaText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECRETARY CARD */}
          <View style={[styles.leaderCard, { borderColor: '#BFDBFE' }]}>
            <View style={styles.leaderHeader}>
              <View style={[styles.leaderIconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaderName} numberOfLines={1}>
                  {secretaryName || (isHindi ? 'श्री विजय शर्मा' : 'Shri Vijay Sharma')}
                </Text>
                <Text style={[styles.leaderRole, { color: COLORS.primary }]} numberOfLines={1}>
                  {isHindi ? 'ग्राम सचिव' : 'Secretary'}
                </Text>
              </View>
            </View>

            <View style={styles.leaderBtnRow}>
              <TouchableOpacity
                style={styles.leaderCallBtn}
                onPress={() => Linking.openURL(`tel:${secretaryMobile || '9876543210'}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={13} color="#FFFFFF" />
                <Text style={styles.leaderCallText}>{isHindi ? 'कॉल' : 'Call'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.leaderWaBtn}
                onPress={() => Linking.openURL(`https://wa.me/91${secretaryMobile || '9876543210'}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={13} color="#15803D" />
                <Text style={styles.leaderWaText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* =================================================
            3. RECENT REPORTS / RECENT COMPLAINTS LIST
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'हालिया शिकायतें' : 'Recent Grievances'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openComplaints('all')} activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>{isHindi ? 'सभी देखें →' : 'View All →'}</Text>
          </TouchableOpacity>
        </View>

        {recentComplaints.length === 0 ? (
          <View style={styles.emptyReportsCard}>
            <Ionicons name="document-text-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyReportsTitle}>
              {isHindi ? 'अभी कोई शिकायत दर्ज नहीं है' : 'No reports submitted yet'}
            </Text>
            <Text style={styles.emptyReportsSub}>
              {isHindi
                ? 'समस्या होने पर ऊपर दिए गए "नई शिकायत दर्ज करें" पर टैप करें।'
                : 'Tap "Report a Problem" above to register a complaint.'}
            </Text>
          </View>
        ) : (
          <View style={styles.recentReportsList}>
            {recentComplaints.map((c, idx) => {
              const st = String(c.status || 'SUBMITTED').toUpperCase();
              let badgeColor: string = COLORS.primary;
              let badgeBg: string = COLORS.primaryLight;
              let badgeLabel = isHindi ? 'लंबित' : 'Pending';

              if (st === 'RESOLVED' || st === 'CLOSED') {
                badgeColor = COLORS.success;
                badgeBg = COLORS.successLight;
                badgeLabel = isHindi ? 'समाधान' : 'Resolved';
              } else if (
                st === 'IN PROGRESS' ||
                st === 'IN_PROGRESS' ||
                st === 'ACTION TAKEN' ||
                st === 'ACTION_TAKEN'
              ) {
                badgeColor = COLORS.warning;
                badgeBg = COLORS.warningLight;
                badgeLabel = isHindi ? 'प्रगति में' : 'In Progress';
              }

              return (
                <TouchableOpacity
                  key={String(c.id || idx)}
                  style={styles.recentReportItem}
                  onPress={() => {
                    if (c.id) {
                      router.push({
                        pathname: '/complaint-details',
                        params: { id: c.id },
                      } as any);
                    } else {
                      openComplaints('all');
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.recentReportTop}>
                    <View style={styles.recentReportCategoryRow}>
                      <Ionicons name="folder-open" size={14} color={COLORS.primary} />
                      <Text style={styles.recentReportCategory} numberOfLines={1}>
                        {c.category || c.problemType || (isHindi ? 'ग्राम समस्या' : 'Village Issue')}
                      </Text>
                    </View>
                    <View style={[styles.recentStatusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.recentStatusText, { color: badgeColor }]}>
                        {badgeLabel}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.recentReportDesc} numberOfLines={2}>
                    {c.description || (isHindi ? 'विवरण उपलब्ध नहीं' : 'No description provided')}
                  </Text>

                  <View style={styles.recentReportFooter}>
                    <Text style={styles.recentReportId}>#{c.id || idx + 1}</Text>
                    <Text style={styles.recentReportWard}>
                      {c.wardNumber || c.ward || c.location || (isHindi ? 'वार्ड' : 'Ward')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
        sarpanchName={sarpanchName}
        secretaryName={secretaryName}
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
  viewAllLink: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyReportsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.small,
  },
  emptyReportsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navy,
    marginTop: 8,
  },
  emptyReportsSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  recentReportsList: {
    gap: 10,
    marginBottom: 16,
  },
  recentReportItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  recentReportTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recentReportCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  recentReportCategory: {
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.navy,
  },
  recentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  recentStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recentReportDesc: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  recentReportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  recentReportId: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.primary,
  },
  recentReportWard: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  leadershipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  leaderCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    ...SHADOWS.small,
  },
  leaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  leaderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
  },
  leaderRole: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  leaderBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  leaderCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    borderRadius: 8,
  },
  leaderCallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaderWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  leaderWaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
});