import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { isVeryHighPriority, isEmergencyAlertActive } from '../services/complaintClassification';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING as THEME_SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

const SPACING = {
  ...THEME_SPACING,
  small: 8,
  medium: 12,
  large: 20,
};
import { complaintApi, escalationApi, ComplaintData } from '../services/api';
import { playEmergencyAlertSound } from '../services/audioAlertService';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PanchayatShowcaseCard } from '../components/PanchayatShowcaseCard';
import { DashboardBottomBar } from '../components/DashboardBottomBar';
import { ComplaintOverviewSection } from '../components/ComplaintOverviewSection';

const INDIA = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  navy: '#000080',
  lightGreen: '#EAF6EA',
};

type DmProfile = {
  name: string;
  mobile: string;
  district: string;
  officialId: string;
  profileImage?: string | null;
};

export default function DmDashboardScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [dmProfile, setDmProfile] = useState<DmProfile>({
    name: '',
    mobile: '',
    district: '',
    officialId: '',
  });

  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [bdoOfficer, setBdoOfficer] = useState<{
    name: string;
    role: string;
    mobile: string;
    block: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Administrative Action Modal State
  const [actionTicket, setActionTicket] = useState<ComplaintData | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'show_cause' | 'task_force' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Load Dynamic Profile and Complaints from Storage / API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Read Profile from Storage (strictly from user session or dm record - NO DUMMY FALLBACKS)
      let session: any = null;
      let dmData: any = null;

      const rawSession = await AsyncStorage.getItem('user_session');
      if (rawSession) {
        try {
          session = JSON.parse(rawSession);
        } catch {}
      }

      const rawDm = await AsyncStorage.getItem('dm');
      if (rawDm) {
        try {
          dmData = JSON.parse(rawDm);
        } catch {}
      }

      const name = session?.name || dmData?.name || '';
      const mobile = session?.mobile || dmData?.mobile || '';
      const district = session?.district || dmData?.district || session?.village || dmData?.village || '';
      const officialId =
        session?.officialId ||
        session?.dmId ||
        dmData?.officialId ||
        dmData?.dmId ||
        '';

      const photo = mobile ? await AsyncStorage.getItem(`profile_image_${mobile}`) : null;

      setDmProfile({
        name,
        mobile,
        district,
        officialId,
        profileImage: photo || null,
      });

      // 2. Load Subordinate BDO Directorate Info
      const rawBdo = await AsyncStorage.getItem('bdo');
      if (rawBdo) {
        try {
          const bdoObj = JSON.parse(rawBdo);
          setBdoOfficer({
            name: bdoObj.name || (isHindi ? 'प्रखंड विकास अधिकारी (BDO)' : 'Block Officer (BDO)'),
            role: isHindi ? 'प्रशासनिक स्तर 2 • ब्लॉक समन्वय' : 'Tier 2 Block Administration',
            mobile: bdoObj.mobile || '9876543213',
            block: bdoObj.block || (isHindi ? 'प्रखंड मुख्यालय' : 'Block HQ'),
          });
        } catch {}
      } else {
        setBdoOfficer({
          name: isHindi ? 'प्रखंड विकास अधिकारी (BDO)' : 'Block Development Officer (BDO)',
          role: isHindi ? 'प्रशासनिक स्तर 2 • ब्लॉक समन्वय' : 'Tier 2 Block Administration',
          mobile: '9876543213',
          block: isHindi ? 'ब्लॉक एवं तहसील समन्वय' : 'Block & Taluka Coordination',
        });
      }

      // 3. Load Complaints for Tier 3 (DM / District Level)
      let tierComplaints: ComplaintData[] = [];
      try {
        tierComplaints = await escalationApi.getByTier(3);
      } catch (e) {
        console.log('Error fetching tier 3 complaints:', e);
      }

      if (!tierComplaints || tierComplaints.length === 0) {
        try {
          const allList = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(allList)) {
            tierComplaints = allList.filter(
              (c) => c.escalationLevel === 3 || String(c.currentAuthority || '').toUpperCase().includes('DISTRICT')
            );
          }
        } catch (allErr) {
          console.log('Fallback list fetch error:', allErr);
        }
      }

      setComplaints(tierComplaints || []);
    } catch (err) {
      console.log('Unable to load DM dashboard data:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isHindi]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const openProfile = () => {
    router.push('/admin-profile' as any);
  };

  const openComplaints = (filter?: string, priority?: string) => {
    router.push({
      pathname: '/(tabs)/complaints',
      params: {
        ...(filter ? { filter } : {}),
        ...(priority ? { priority } : {}),
      },
    });
  };

  const openHelpLine = () => {
    router.push('/help-line');
  };

  // Perform Sovereign Administrative Action (Resolve, Show Cause, Task Force)
  const handlePerformAction = async () => {
    if (!actionTicket) return;
    const ticketId = actionTicket.id;

    try {
      setActionSubmitting(true);

      if (actionType === 'resolve') {
        const remarks =
          actionRemarks.trim() ||
          (isHindi
            ? 'जिलाधिकारी महोदय द्वारा विशेष जांच रिपोर्ट के आधार पर शिकायत का अंतिम निस्तारण व प्रकरण बंद किया गया।'
            : 'Final resolution and administrative closure ordered by District Magistrate.');
        await complaintApi.updateStatus(ticketId, 'CLOSED', remarks);
        Alert.alert(
          isHindi ? 'अंतिम आदेश जारी' : 'Executive Closure',
          isHindi ? 'जिलाधिकारी स्तर पर प्रकरण का पूर्ण निस्तारण कर दिया गया है।' : 'Grievance officially resolved and closed at Apex level.'
        );
      } else if (actionType === 'show_cause') {
        const noticeText =
          actionRemarks.trim() ||
          (isHindi
            ? 'समय सीमा उल्लंघन एवं कर्तव्य में शिथिलता हेतु जिम्मेदार अधिकारियों पर विभागीय जांच व कारण बताओ नोटिस जारी।'
            : 'Departmental show-cause inquiry instituted by District Collector.');
        await complaintApi.updateStatus(ticketId, 'UNDER_REVIEW', `[DM Show-Cause Notice] ${noticeText}`);
        Alert.alert(
          isHindi ? 'कारण बताओ नोटिस जारी' : 'Show Cause Issued',
          isHindi ? 'दोषी अधिकारियों के विरुद्ध कलेक्ट्रेट से कारण बताओ नोटिस जारी हो गया है।' : 'Disciplinary notice dispatched from Collectorate.'
        );
      } else if (actionType === 'task_force') {
        const deployText =
          actionRemarks.trim() ||
          (isHindi
            ? 'कलेक्टर विशेष उड़नदस्ता (Flying Squad / Task Force) को मौके पर 48 घंटे में प्रत्यक्ष जांच हेतु तैनात किया गया।'
            : 'Collectorate Flying Squad Task Force deployed for on-site inquiry within 48h.');
        await complaintApi.updateStatus(ticketId, 'IN_PROGRESS', `[DM Flying Squad Deployed] ${deployText}`);
        Alert.alert(
          isHindi ? 'उड़नदस्ता तैनात' : 'Task Force Deployed',
          isHindi ? 'विशेष प्रशासनिक जांच दल को मौके पर रवाना करने का आदेश निर्गत हुआ।' : 'Field investigation task force deployed to site.'
        );
      }

      setActionTicket(null);
      setActionType(null);
      setActionRemarks('');
      await loadData();
    } catch (err: any) {
      console.log('DM Action execution error:', err);
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        err?.message || (isHindi ? 'प्रक्रिया पूरी नहीं हो सकी।' : 'Action could not be executed.')
      );
    } finally {
      setActionSubmitting(false);
    }
  };

  // Quick Action Tile Component (matching Admin Category Tile style)
  const ActionCard = ({
    icon,
    label,
    onPress,
    backgroundColor,
    iconColor,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    backgroundColor: string;
    iconColor: string;
  }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View
        style={[
          styles.categoryIcon,
          {
            backgroundColor,
          },
        ]}
      >
        <Ionicons name={icon} size={21} color={iconColor} />
      </View>
      <Text style={styles.categoryText} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Formatted display values strictly from registration/login
  const displayOfficerName = dmProfile.name || (isHindi ? 'जिलाधिकारी (DM / कलेक्टर)' : 'District Magistrate (DM)');
  const displayJurisdiction = dmProfile.district
    ? `${dmProfile.district} ${isHindi ? 'जिला कलेक्ट्रेट' : 'District Collectorate'}`
    : isHindi ? 'जिला प्रशासन मुख्यालय' : 'District Administration HQ';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* =================================================
            1. TOP TRICOLOR BAR
        ================================================= */}
        <View style={styles.tricolorBar}>
          <View style={styles.saffronStripe} />
          <View style={styles.whiteStripe} />
          <View style={styles.greenStripe} />
        </View>

        {/* =================================================
            2. HEADER (MATCHING ADMIN DASHBOARD)
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
              <View style={[styles.logoIcon, { backgroundColor: '#7F1D1D' }]}>
                <Ionicons
                  name="shield-checkmark"
                  size={21}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.appTitle}>VillageApp</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isHindi ? 'जिलाधिकारी (DM / कलेक्टर) डैशबोर्ड' : 'District Magistrate (DM) Dashboard'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* LANGUAGE TOGGLE */}
            <TouchableOpacity
              style={styles.languageButton}
              onPress={toggleLanguage}
              activeOpacity={0.8}
            >
              <Ionicons
                name="language-outline"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.languageText}>
                {isHindi ? 'EN' : 'हि'}
              </Text>
            </TouchableOpacity>

            {/* PROFILE PHOTO */}
            <TouchableOpacity
              style={styles.headerProfileButton}
              onPress={openProfile}
              activeOpacity={0.8}
            >
              {dmProfile?.profileImage ? (
                <Image
                  source={{ uri: dmProfile.profileImage }}
                  style={[styles.profileImage, { width: 40, height: 40, borderRadius: 20 }]}
                />
              ) : (
                <View style={[styles.profilePlaceholder, { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF2F2' }]}>
                  <Ionicons
                    name="shield-outline"
                    size={19}
                    color="#991B1B"
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* =================================================
            3. OFFLINE SYNC BANNER
        ================================================= */}
        <OfflineSyncBanner isHindi={isHindi} onSyncComplete={loadData} />

        {/* =================================================
            4. WELCOME & APEX JURISDICTION SHOWCASE BANNER
        ================================================= */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <PanchayatShowcaseCard
            userName={displayOfficerName}
            villageName={dmProfile.district || (isHindi ? 'जिला' : 'District')}
            role="dm"
            isHindi={isHindi}
            canManagePhotos={true}
            jurisdictionLabel={isHindi ? 'जिला क्षेत्राधिकार: ' : 'District Jurisdiction: '}
          />
        </Animated.View>

        {/* =================================================
            5. 🚨 CRITICAL EMERGENCY SIREN ALERT BANNER
        ================================================= */}
        {complaints.filter((c: any) => isEmergencyAlertActive(c)).length > 0 && (
          <View style={styles.emergencyAlertBanner}>
            <View style={styles.emergencyTopRow}>
              <View style={styles.emergencyIconPulse}>
                <Ionicons name="warning" size={22} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyTitle}>
                  {isHindi ? '🚨 सर्वोच्च जिला आपातकालीन अलर्ट!' : '🚨 Apex District Alert!'}
                </Text>
                <Text style={styles.emergencySub}>
                  {complaints.filter((c: any) => isEmergencyAlertActive(c)).length}{' '}
                  {isHindi
                    ? 'अति-गंभीर शिकायतें स्तर 1 व 2 से अनिस्तारित होकर DM के अंतिम आदेश हेतु लंबित हैं'
                    : 'critical grievances escalated from Tier 1 & 2 awaiting executive DM decision'}
                </Text>
              </View>

              {/* Siren Audio Bell Button */}
              <TouchableOpacity
                style={styles.emergencySirenBtn}
                onPress={async () => {
                  await playEmergencyAlertSound();
                  Alert.alert(
                    isHindi ? '🔔 आपातकालीन अलर्ट सायरन' : '🔔 Emergency Alert Siren',
                    isHindi
                      ? 'जिलाधिकारी स्तर पर लंबित अति-गंभीर शिकायतों पर तत्काल कार्यकारी आदेश अपेक्षित है।'
                      : 'Immediate executive action required for critical escalated district matters.'
                  );
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.emergencyActionBtn}
              onPress={() => openComplaints('priority-very-high')}
              activeOpacity={0.85}
            >
              <Text style={styles.emergencyActionBtnText}>
                {isHindi ? 'गंभीर प्रकरण तुरंत देखें (Take Action)' : 'Review Escalated Complaints Now'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* =================================================
            6. COMPLAINT OVERVIEW & NESTED PRIORITY BREAKDOWN
               (EXACT COMPONENT MATCHING ADMIN SCREEN)
        ================================================= */}
        <ComplaintOverviewSection
          complaints={complaints as any}
          onSelectFilter={openComplaints}
          isHindi={isHindi}
        />

        {/* =================================================
            7. DISTRICT EXECUTIVE CONTROLS & SERVICES GRID
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'कलेक्ट्रेट प्रशासनिक नियंत्रण व सेवाएं' : 'Collectorate Controls & Administrative Services'}
            </Text>
          </View>
        </View>

        <View style={styles.problemCard}>
          <View style={styles.categoryGrid}>
            <ActionCard
              icon="list-outline"
              label={isHindi ? 'शिकायतें प्रबंधित' : 'Manage Queue'}
              onPress={() => openComplaints('all')}
              backgroundColor={COLORS.primaryLight}
              iconColor={COLORS.primary}
            />

            <ActionCard
              icon="document-text-outline"
              label={isHindi ? 'PDF ऑडिट रिपोर्ट' : 'Audit Report'}
              onPress={() => router.push('/audit-report' as any)}
              backgroundColor={COLORS.successLight}
              iconColor={COLORS.success}
            />

            <ActionCard
              icon="stats-chart-outline"
              label={isHindi ? 'जिला स्कोरकार्ड' : 'District Scorecard'}
              onPress={() => router.push('/ward-scorecard' as any)}
              backgroundColor={COLORS.accentLight}
              iconColor={COLORS.saffron}
            />

            <ActionCard
              icon="layers-outline"
              label={isHindi ? 'ब्लॉक समन्वय' : 'Block Sync'}
              onPress={() => openComplaints('priority-very-high')}
              backgroundColor="#EFF6FF"
              iconColor="#1D4ED8"
            />

            <ActionCard
              icon="call-outline"
              label={isHindi ? 'हेल्पलाइन संपर्क' : 'Helplines'}
              onPress={openHelpLine}
              backgroundColor={COLORS.infoLight}
              iconColor={COLORS.info}
            />
          </View>
        </View>

        {/* =================================================
            8. DM SOVEREIGN ACTION DRAWER (APEX CASES)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'जिलाधिकारी स्तर 3 सक्रिय शिकायतें' : 'Tier 3 Apex Escalations'}
            </Text>
          </View>
          <Text style={[styles.sectionBadge, { backgroundColor: '#FEE2E2', color: '#991B1B' }]}>
            {complaints.length} {isHindi ? 'प्रकरण' : 'Cases'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'जिला शिकायतें लोड हो रही हैं...' : 'Loading district grievances...'}
            </Text>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई एस्केलेटेड शिकायत लंबित नहीं' : 'No District Escalations Pending'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'जिले के सभी प्रखंडों व पंचायतों में शिकायतों का त्वरित निस्तारण हो रहा है।'
                : 'All grievances across blocks and panchayats are resolved in time.'}
            </Text>
          </View>
        ) : (
          complaints.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={[styles.ticketBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.ticketBadgeText, { color: '#991B1B' }]}>#{item.id}</Text>
                </View>
                <Text style={styles.ticketDate}>{item.category || item.problemType}</Text>
              </View>

              <Text style={styles.ticketDesc} numberOfLines={2}>
                {item.description}
              </Text>

              <Text style={styles.ticketLoc}>
                📍 {item.location || (isHindi ? 'जिला अधिकार क्षेत्र' : 'District Jurisdiction')}
              </Text>

              {/* Sovereign Action Buttons Row */}
              <View style={styles.ticketActionRow}>
                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}
                  onPress={() => {
                    setActionTicket(item);
                    setActionType('resolve');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-done" size={14} color="#15803D" />
                  <Text style={[styles.smallActionBtnText, { color: '#15803D' }]}>
                    {isHindi ? 'समाधान' : 'Resolve'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                  onPress={() => {
                    setActionTicket(item);
                    setActionType('show_cause');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="alert-circle" size={14} color="#B45309" />
                  <Text style={[styles.smallActionBtnText, { color: '#B45309' }]}>
                    {isHindi ? 'नोटिस' : 'Notice'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                  onPress={() => {
                    setActionTicket(item);
                    setActionType('task_force');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield" size={14} color="#1D4ED8" />
                  <Text style={[styles.smallActionBtnText, { color: '#1D4ED8' }]}>
                    {isHindi ? 'जांच दल' : 'Task Force'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* =================================================
            9. 🏛️ SUBORDINATE BLOCK CO-ORDINATION CARD
               (MATCHING ADMIN LEADERSHIP CARD)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'प्रखंड अधिकारी (BDO) समन्वय' : 'Block Officers Coordination'}
            </Text>
          </View>
        </View>

        <View style={styles.leadershipCard}>
          <View style={styles.leadershipTopRow}>
            <View style={[styles.leadershipAvatarBadge, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="business" size={24} color="#1E3A8A" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.leadershipName}>
                {bdoOfficer?.name || (isHindi ? 'प्रखंड विकास अधिकारी' : 'Block Development Officer')}
              </Text>
              <Text style={styles.leadershipRole}>
                {isHindi ? 'प्रशासनिक स्तर 2 • ब्लॉक समन्वय' : 'Block Development Officer (Tier 2)'}
              </Text>
              <Text style={styles.leadershipVillage}>
                📍 {bdoOfficer?.block || dmProfile.district || (isHindi ? 'प्रखंड कार्यालय' : 'Block Office')}
              </Text>
            </View>
          </View>

          <View style={styles.leadershipBtnRow}>
            <TouchableOpacity
              style={[styles.leadCallBtn, { backgroundColor: '#7F1D1D' }]}
              onPress={() => Linking.openURL(`tel:${bdoOfficer?.mobile || '9876543213'}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.leadCallBtnText}>
                {isHindi ? 'BDO को कॉल करें' : 'Call Block Officer'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leadWhatsappBtn}
              onPress={() => Linking.openURL(`https://wa.me/91${bdoOfficer?.mobile || '9876543213'}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#15803D" />
              <Text style={styles.leadWhatsappBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* =================================================
          10. ACTION MODAL FOR DM ACTIONS
      ================================================= */}
      {actionTicket && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'resolve'
                  ? isHindi ? 'जिलाधिकारी द्वारा अंतिम निस्तारण' : 'Executive Resolution & Closure'
                  : actionType === 'show_cause'
                  ? isHindi ? 'अधिकारियों पर कारण बताओ नोटिस' : 'Issue Disciplinary Show-Cause Notice'
                  : isHindi ? 'उड़नदस्ता जांच दल तैनात करें' : 'Deploy Collectorate Task Force'}
              </Text>
              <TouchableOpacity onPress={() => setActionTicket(null)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>
              {actionType === 'resolve'
                ? isHindi ? 'अंतिम आदेश विवरण दर्ज करें:' : 'Enter final closure order remarks:'
                : actionType === 'show_cause'
                ? isHindi ? 'विभागीय नोटिस का कारण:' : 'Reason for show-cause notice:'
                : isHindi ? 'जांच दल के लिए दिशा-निर्देश:' : 'Task force investigation terms:'}
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder={isHindi ? 'आधिकारिक आदेश यहाँ लिखें...' : 'Enter official directive here...'}
              value={actionRemarks}
              onChangeText={setActionRemarks}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActionTicket(null)}
              >
                <Text style={styles.modalCancelBtnText}>{isHindi ? 'रद्द करें' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  actionType === 'resolve'
                    ? { backgroundColor: COLORS.success }
                    : actionType === 'show_cause'
                    ? { backgroundColor: '#DC2626' }
                    : { backgroundColor: '#1D4ED8' },
                ]}
                onPress={handlePerformAction}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    {isHindi ? 'आदेश जारी करें' : 'Execute Order'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* UNIVERSAL BOTTOM NAVIGATION BAR */}
      <DashboardBottomBar activeTab="home" role="dm" isHindi={isHindi} />
    </SafeAreaView>
  );
}

// =====================================================
// STYLES (EXACTLY MATCHING ADMIN DASHBOARD)
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: SPACING.normal,
    paddingBottom: 35,
  },

  // TRICOLOR BAR
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

  // HEADER
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },

  headerLeft: {
    flex: 1,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  appTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  headerSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
    marginLeft: 47,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  languageButton: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  languageText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },

  headerProfileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileImage: {
    borderWidth: 2,
    borderColor: '#7F1D1D',
  },

  profilePlaceholder: {
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // EMERGENCY ALERT BANNER
  emergencyAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: RADIUS.lg,
    padding: SPACING.medium,
    marginTop: SPACING.medium,
    marginBottom: SPACING.small,
    ...SHADOWS.small,
  },

  emergencyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
  },

  emergencyIconPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emergencyTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.bold,
    color: '#991B1B',
  },

  emergencySub: {
    fontSize: TYPOGRAPHY.small,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 18,
  },

  emergencySirenBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  emergencyActionBtn: {
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.medium,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.medium,
  },

  emergencyActionBtnText: {
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.bold,
    fontSize: TYPOGRAPHY.small,
  },

  // SECTION HEADER
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.large,
    marginBottom: SPACING.small,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  sectionBadge: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
  },

  // SERVICES GRID (MATCHING ADMIN DASHBOARD)
  problemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    marginBottom: SPACING.small,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  categoryText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // ACTIVE TICKETS CARD
  ticketCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    ...SHADOWS.small,
  },

  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  ticketBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  ticketBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },

  ticketDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  ticketDesc: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },

  ticketLoc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  ticketActionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },

  smallActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },

  smallActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // EMPTY & LOADING STATES
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },

  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
  },

  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },

  // LEADERSHIP CARD (MATCHING ADMIN DASHBOARD)
  leadershipCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    marginTop: 6,
    marginBottom: 20,
  },

  leadershipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.medium,
  },

  leadershipAvatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  leadershipName: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  leadershipRole: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  leadershipVillage: {
    fontSize: TYPOGRAPHY.small,
    color: '#7F1D1D',
    fontWeight: TYPOGRAPHY.semiBold,
    marginTop: 3,
  },

  leadershipBtnRow: {
    flexDirection: 'row',
    gap: SPACING.small,
    marginTop: SPACING.medium,
    paddingTop: SPACING.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  leadCallBtn: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: '#7F1D1D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  leadCallBtnText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
  },

  leadWhatsappBtn: {
    flex: 1,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: INDIA.lightGreen,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  leadWhatsappBtnText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: '#15803D',
  },

  // MODAL STYLES
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
  },

  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 20,
    ...SHADOWS.large,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },

  modalPrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: '#F8FAFC',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },

  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },

  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
