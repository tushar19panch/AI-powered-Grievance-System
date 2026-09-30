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
import { complaintApi, escalationApi, ComplaintData, authApi } from '../services/api';
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

type BdoProfile = {
  name: string;
  mobile: string;
  block: string;
  district: string;
  officialId: string;
  profileImage?: string | null;
};

export default function BdoDashboardScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [bdoProfile, setBdoProfile] = useState<BdoProfile>({
    name: '',
    mobile: '',
    block: '',
    district: '',
    officialId: '',
  });

  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [districtOfficer, setDistrictOfficer] = useState<{
    name: string;
    role: string;
    mobile: string;
    district: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Administrative Action Modal State
  const [actionTicket, setActionTicket] = useState<ComplaintData | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'notice' | 'escalate_dm' | null>(null);
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

      // 1. Read Profile from Storage (strictly from user session or bdo record - NO DUMMY FALLBACKS)
      let session: any = null;
      let bdoData: any = null;

      const rawSession = await AsyncStorage.getItem('user_session');
      if (rawSession) {
        try {
          session = JSON.parse(rawSession);
        } catch {}
      }

      const rawBdo = await AsyncStorage.getItem('bdo');
      if (rawBdo) {
        try {
          bdoData = JSON.parse(rawBdo);
        } catch {}
      }

      const name = session?.name || bdoData?.name || '';
      const mobile = session?.mobile || bdoData?.mobile || '';
      const block = session?.block || bdoData?.block || session?.village || bdoData?.village || '';
      const district = session?.district || bdoData?.district || '';
      const officialId =
        session?.officialId ||
        session?.bdoId ||
        bdoData?.officialId ||
        bdoData?.bdoId ||
        '';

      const photo = mobile ? await AsyncStorage.getItem(`profile_image_${mobile}`) : null;

      setBdoProfile({
        name,
        mobile,
        block,
        district,
        officialId,
        profileImage: photo || null,
      });

      // 2. Load District Collector Counterpart Info
      const rawDm = await AsyncStorage.getItem('dm');
      if (rawDm) {
        try {
          const dmObj = JSON.parse(rawDm);
          setDistrictOfficer({
            name: dmObj.name || (isHindi ? 'जिलाधिकारी (DM)' : 'District Magistrate (DM)'),
            role: isHindi ? 'सर्वोच्च जिला प्रशासन' : 'District Administration',
            mobile: dmObj.mobile || '9876543214',
            district: dmObj.district || district,
          });
        } catch {}
      } else {
        setDistrictOfficer({
          name: isHindi ? 'जिलाधिकारी / कलेक्टर' : 'District Magistrate (DM)',
          role: isHindi ? 'सर्वोच्च जिला प्रशासन' : 'District Administration',
          mobile: '9876543214',
          district: district || (isHindi ? 'जिला मुख्यालय' : 'District HQ'),
        });
      }

      // 3. Load Complaints for Tier 2 (BDO Level)
      let tierComplaints: ComplaintData[] = [];
      try {
        tierComplaints = await escalationApi.getByTier(2);
      } catch (e) {
        console.log('Error fetching tier 2 complaints:', e);
      }

      if (!tierComplaints || tierComplaints.length === 0) {
        try {
          const allList = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(allList)) {
            tierComplaints = allList.filter(
              (c) => c.escalationLevel === 2 || String(c.currentAuthority || '').toUpperCase() === 'BDO'
            );
          }
        } catch (allErr) {
          console.log('Fallback list fetch error:', allErr);
        }
      }

      setComplaints(tierComplaints || []);
    } catch (err) {
      console.log('Unable to load BDO dashboard data:', err);
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

  // Perform Administrative Action (Resolve, Notice, Escalate to DM)
  const handlePerformAction = async () => {
    if (!actionTicket) return;
    const ticketId = actionTicket.id;

    try {
      setActionSubmitting(true);

      if (actionType === 'resolve') {
        const remarks =
          actionRemarks.trim() ||
          (isHindi
            ? 'प्रखंड विकास कार्यालय द्वारा मौके पर तकनीकी टीम भेजकर समस्या का निस्तारण किया गया।'
            : 'Resolved on site by Block Development technical team inspection.');
        await complaintApi.updateStatus(ticketId, 'RESOLVED', remarks);
        Alert.alert(
          isHindi ? 'सफल निस्तारण' : 'Resolution Saved',
          isHindi ? 'शिकायत का ब्लॉक स्तर पर सफलतापूर्वक समाधान कर दिया गया है।' : 'Complaint marked as resolved at Block level.'
        );
      } else if (actionType === 'notice') {
        const noticeText =
          actionRemarks.trim() ||
          (isHindi
            ? 'ग्राम पंचायत सचिव एवं सरपंच को कार्य में लापरवाही हेतु 24 घंटे का कारण बताओ नोटिस जारी किया गया।'
            : '24-hour show cause directive issued to Gram Panchayat authorities.');
        await complaintApi.updateStatus(ticketId, 'UNDER_REVIEW', `[BDO Notice to Panchayat] ${noticeText}`);
        Alert.alert(
          isHindi ? 'नोटिस प्रेषित' : 'Notice Dispatched',
          isHindi ? 'संबंधित ग्राम पंचायत को आधिकारिक प्रशासनिक नोटिस प्रेषित कर दिया गया है।' : 'Administrative directive dispatched to Panchayat.'
        );
      } else if (actionType === 'escalate_dm') {
        const reason =
          actionRemarks.trim() ||
          (isHindi
            ? 'प्रखंड स्तर से परे उच्च तकनीकी एवं बजटीय स्वीकृति हेतु जिलाधिकारी (DM) को अग्रसारित।'
            : 'Escalated to District Magistrate (DM) for budgetary authorization.');
        await escalationApi.escalateComplaint(ticketId, reason);
        Alert.alert(
          isHindi ? 'जिला स्तर पर प्रेषित' : 'Escalated to DM',
          isHindi ? 'शिकायत को स्तर 3 (जिलाधिकारी / कलेक्ट्रेट) को अग्रसारित कर दिया गया है।' : 'Complaint escalated to Tier 3 District Magistrate.'
        );
      }

      setActionTicket(null);
      setActionType(null);
      setActionRemarks('');
      await loadData();
    } catch (err: any) {
      console.log('Action execution error:', err);
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
  const displayOfficerName = bdoProfile.name || (isHindi ? 'प्रखंड विकास अधिकारी' : 'Block Development Officer');
  const displayJurisdiction = bdoProfile.block
    ? `${bdoProfile.block}${bdoProfile.district ? ` • ${bdoProfile.district}` : ''}`
    : bdoProfile.district
    ? `${bdoProfile.district} ${isHindi ? 'जिला' : 'District'}`
    : isHindi ? 'प्रखंड क्षेत्राधिकार' : 'Block Jurisdiction';

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
              <View style={[styles.logoIcon, { backgroundColor: '#1E3A8A' }]}>
                <Ionicons
                  name="business"
                  size={21}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.appTitle}>VillageApp</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isHindi ? 'प्रखंड विकास अधिकारी (BDO) डैशबोर्ड' : 'Block Officer (BDO) Dashboard'}
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
              {bdoProfile?.profileImage ? (
                <Image
                  source={{ uri: bdoProfile.profileImage }}
                  style={[styles.profileImage, { width: 40, height: 40, borderRadius: 20 }]}
                />
              ) : (
                <View style={[styles.profilePlaceholder, { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF' }]}>
                  <Ionicons
                    name="business-outline"
                    size={19}
                    color="#1E40AF"
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
            4. WELCOME & JURISDICTION SHOWCASE BANNER
        ================================================= */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <PanchayatShowcaseCard
            userName={displayOfficerName}
            villageName={bdoProfile.block || (isHindi ? 'विकासखंड' : 'Block')}
            role="bdo"
            isHindi={isHindi}
            canManagePhotos={true}
            jurisdictionLabel={isHindi ? 'प्रखंड / उप-प्रभाग: ' : 'Sub-Division / Block: '}
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
                  {isHindi ? '🚨 ब्लॉक स्तर अति-गंभीर अलर्ट!' : '🚨 Critical Escalation Alert!'}
                </Text>
                <Text style={styles.emergencySub}>
                  {complaints.filter((c: any) => isEmergencyAlertActive(c)).length}{' '}
                  {isHindi
                    ? 'अति-गंभीर शिकायतें समय सीमा समाप्त होने के कारण BDO हस्तक्षेप की प्रतीक्षा में हैं'
                    : 'critical escalated grievances require immediate BDO field action'}
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
                      ? 'ब्लॉक स्तर पर शिकायतों की समय-सीमा पार होने पर BDO का त्वरित निरीक्षण अनिवार्य है।'
                      : 'Immediate field inspection mandated for escalated block grievances.'
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
            7. BLOCK ADMINISTRATIVE CONTROLS & SERVICES GRID
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'प्रखंड प्रशासनिक नियंत्रण व सेवाएं' : 'Block Controls & Administrative Services'}
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
              label={isHindi ? 'ब्लॉक स्कोरकार्ड' : 'Block Scorecard'}
              onPress={() => router.push('/ward-scorecard' as any)}
              backgroundColor={COLORS.accentLight}
              iconColor={COLORS.saffron}
            />

            <ActionCard
              icon="shield-checkmark-outline"
              label={isHindi ? 'जिला समन्वय' : 'District Sync'}
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
            8. BDO ADMINISTRATIVE ACTION DRAWER (ACTIVE CASES)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'प्रखंड स्तर 2 सक्रिय शिकायतें' : 'Tier 2 Active Escalations'}
            </Text>
          </View>
          <Text style={styles.sectionBadge}>
            {complaints.length} {isHindi ? 'प्रकरण' : 'Cases'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'प्रखंड शिकायतें लोड हो रही हैं...' : 'Loading block grievances...'}
            </Text>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई लंबित एस्केलेशन नहीं है' : 'No Pending Escalations'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'आपके प्रखंड में सभी शिकायतों का समय पर समाधान हो रहा है।'
                : 'All grievances in your block jurisdiction are resolved on schedule.'}
            </Text>
          </View>
        ) : (
          complaints.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketBadge}>
                  <Text style={styles.ticketBadgeText}>#{item.id}</Text>
                </View>
                <Text style={styles.ticketDate}>{item.category || item.problemType}</Text>
              </View>

              <Text style={styles.ticketDesc} numberOfLines={2}>
                {item.description}
              </Text>

              <Text style={styles.ticketLoc}>
                📍 {item.location || (isHindi ? 'ग्राम पंचायत' : 'Gram Panchayat')}
              </Text>

              {/* Action Buttons Row */}
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
                    {isHindi ? 'समाधान करें' : 'Resolve'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                  onPress={() => {
                    setActionTicket(item);
                    setActionType('notice');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mail-unread" size={14} color="#B45309" />
                  <Text style={[styles.smallActionBtnText, { color: '#B45309' }]}>
                    {isHindi ? 'नोटिस दें' : 'Notice'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                  onPress={() => {
                    setActionTicket(item);
                    setActionType('escalate_dm');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up-circle" size={14} color="#B91C1C" />
                  <Text style={[styles.smallActionBtnText, { color: '#B91C1C' }]}>
                    {isHindi ? 'DM को भेजें' : 'Escalate DM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* =================================================
            9. 🏛️ DISTRICT MAGISTRATE (DM) COORDINATION CARD
               (MATCHING ADMIN LEADERSHIP CARD)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'जिला कलेक्ट्रेट समन्वय' : 'District Administration Coordination'}
            </Text>
          </View>
        </View>

        <View style={styles.leadershipCard}>
          <View style={styles.leadershipTopRow}>
            <View style={[styles.leadershipAvatarBadge, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="ribbon" size={24} color="#1E40AF" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.leadershipName}>
                {districtOfficer?.name || (isHindi ? 'जिलाधिकारी (DM / कलेक्टर)' : 'District Magistrate (DM)')}
              </Text>
              <Text style={styles.leadershipRole}>
                {isHindi ? 'सर्वोच्च जिला प्रशासन (District Magistrate)' : 'District Magistrate (Tier 3 Apex)'}
              </Text>
              <Text style={styles.leadershipVillage}>
                📍 {districtOfficer?.district || bdoProfile.district || (isHindi ? 'जिला कलेक्ट्रेट मुख्यालय' : 'District Collectorate')}
              </Text>
            </View>
          </View>

          <View style={styles.leadershipBtnRow}>
            <TouchableOpacity
              style={[styles.leadCallBtn, { backgroundColor: '#1E3A8A' }]}
              onPress={() => Linking.openURL(`tel:${districtOfficer?.mobile || '9876543214'}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.leadCallBtnText}>
                {isHindi ? 'कलेक्ट्रेट कॉल करें' : 'Call Collectorate'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leadWhatsappBtn}
              onPress={() => Linking.openURL(`https://wa.me/91${districtOfficer?.mobile || '9876543214'}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#15803D" />
              <Text style={styles.leadWhatsappBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* =================================================
          10. ACTION MODAL FOR BDO ACTIONS
      ================================================= */}
      {actionTicket && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'resolve'
                  ? isHindi ? 'शिकायत का प्रत्यक्ष समाधान' : 'Resolve Grievance Directly'
                  : actionType === 'notice'
                  ? isHindi ? 'ग्राम पंचायत को प्रशासनिक नोटिस' : 'Issue Notice to Gram Panchayat'
                  : isHindi ? 'जिलाधिकारी (DM) को अग्रसारित करें' : 'Escalate to District Magistrate'}
              </Text>
              <TouchableOpacity onPress={() => setActionTicket(null)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalPrompt}>
              {actionType === 'resolve'
                ? isHindi ? 'निस्तारण टिप्पणी दर्ज करें:' : 'Enter resolution inspection remarks:'
                : actionType === 'notice'
                ? isHindi ? 'नोटिस कारण / दिशा-निर्देश:' : 'Show-cause notice reason:'
                : isHindi ? 'DM को भेजने का कारण:' : 'Reason for escalating to District:'}
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder={isHindi ? 'आधिकारिक टिप्पणी यहाँ लिखें...' : 'Enter official remarks here...'}
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
                    : actionType === 'notice'
                    ? { backgroundColor: COLORS.saffron }
                    : { backgroundColor: '#DC2626' },
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
      <DashboardBottomBar activeTab="home" role="bdo" isHindi={isHindi} />
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
    borderColor: '#1E40AF',
  },

  profilePlaceholder: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    backgroundColor: COLORS.primaryLight,
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
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
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
