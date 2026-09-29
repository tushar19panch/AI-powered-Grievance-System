import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

import { complaintApi, authApi } from '../services/api';
import { playEmergencyAlertSound } from '../services/audioAlertService';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { PanchayatShowcaseCard } from '../components/PanchayatShowcaseCard';
import { DashboardBottomBar } from '../components/DashboardBottomBar';
import { VillageInfoModal } from '../components/VillageInfoModal';
import { ComplaintOverviewSection } from '../components/ComplaintOverviewSection';

const INDIA = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  navy: '#000080',
  lightGreen: '#EAF6EA',
};

type Complaint = {
  complaintId: string;
  status: string;
  priority?: string;
  classification?: string;
};

type Secretary = {
  name: string;
  mobile: string;
  village: string;
  secretaryId?: string;
  officialId?: string;
  role?: string;
  district?: string;
  block?: string;
  state?: string;
  profileImage?: string | null;
};

export default function SecretaryScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [secretary, setSecretary] = useState<Secretary | null>(null);
  const [sarpanchDetails, setSarpanchDetails] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [villageInfoVisible, setVillageInfoVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  const isHindi = language === 'hi';

  // Animation trigger on mount
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

  const loadData = async () => {
    try {
      // Load secretary details
      const secData = await AsyncStorage.getItem('secretary');
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      let parsed = secData ? JSON.parse(secData) : session;

      if (parsed) {
        const currentMobile = parsed.mobile || session?.mobile;
        const photo = currentMobile
          ? await AsyncStorage.getItem(`profile_image_${currentMobile}`)
          : null;
        parsed = { ...parsed, profileImage: photo || parsed.profileImage || null };
        setSecretary(parsed);
      }

      // Load counterpart Sarpanch details for this Gram Panchayat
      try {
        let syncedSarpanch: any = null;
        if (parsed?.village) {
          try {
            const officialsRes = await authApi.getVillageOfficials(parsed.village);
            if (officialsRes?.sarpanch?.name) {
              syncedSarpanch = {
                name: officialsRes.sarpanch.name,
                role: 'ग्राम सरपंच (Elected Sarpanch)',
                mobile: officialsRes.sarpanch.mobile || '9876543211',
                officialId: officialsRes.sarpanch.officialId,
                village: officialsRes.villageName || parsed.village,
              };
              await AsyncStorage.setItem(`sarpanch_sync_${parsed.village}`, JSON.stringify(syncedSarpanch));
            }
          } catch (apiErr) {
            console.log('API village officials fetch error in secretary:', apiErr);
          }
        }

        if (!syncedSarpanch && parsed?.village) {
          const cachedSync = await AsyncStorage.getItem(`sarpanch_sync_${parsed.village}`);
          if (cachedSync) syncedSarpanch = JSON.parse(cachedSync);
        }

        if (!syncedSarpanch) {
          const adminRaw = await AsyncStorage.getItem('admin');
          if (adminRaw) {
            const parsedAdm = JSON.parse(adminRaw);
            syncedSarpanch = {
              name: parsedAdm.name,
              role: 'ग्राम सरपंच (Elected Sarpanch)',
              mobile: parsedAdm.mobile || '9876543211',
              officialId: parsedAdm.adminId || parsedAdm.officialId,
              village: parsedAdm.village || parsed?.village || 'Gram Panchayat',
            };
          }
        }

        if (syncedSarpanch) {
          setSarpanchDetails(syncedSarpanch);
        } else {
          setSarpanchDetails({
            name: 'श्री रमेश पटेल',
            role: 'ग्राम सरपंच (Elected Sarpanch)',
            mobile: '9876543211',
            village: parsed?.village || 'मुख्य ग्राम पंचायत',
          });
        }
      } catch (aErr) {
        console.log('Error loading sarpanch details:', aErr);
      }

      // Load live complaints directly from Backend Database API
      let loadedComplaints: Complaint[] = [];
      try {
        const apiComplaints = await complaintApi.getSarpanchComplaints();
        if (Array.isArray(apiComplaints) && apiComplaints.length > 0) {
          loadedComplaints = apiComplaints.map((c: any) => ({
            complaintId: String(c.id || c.complaintNumber),
            id: c.id,
            status: c.status,
            priority: c.priority,
            classification: c.classification,
            duplicateOfId: c.duplicateOfId ? String(c.duplicateOfId) : '',
            classificationReason: c.classificationReason || '',
            category: c.category || c.problemType,
            description: c.description,
            location: c.location,
            wardNumber: c.wardNumber,
            ward: c.ward,
            createdAt: c.createdAt,
          }));
        }
      } catch (apiErr) {
        console.log('Secretary backend complaints fetch error:', apiErr);
      }

      // Include offline complaints if empty
      if (loadedComplaints.length === 0) {
        try {
          const offlineRaw = await AsyncStorage.getItem('@village_offline_complaints_queue');
          const offlineArr = offlineRaw ? JSON.parse(offlineRaw) : [];
          if (Array.isArray(offlineArr) && offlineArr.length > 0) {
            loadedComplaints = offlineArr.map((item: any) => ({
              complaintId: String(item.id),
              id: item.id,
              status: 'SUBMITTED',
              priority: item.payload?.priority || 'MEDIUM',
              classification: item.payload?.classification || 'GENUINE',
              duplicateOfId: item.payload?.duplicateOfId ? String(item.payload?.duplicateOfId) : '',
              classificationReason: item.payload?.classificationReason || '',
              category: item.payload?.category || item.payload?.problemType || 'Village Issue',
              description: item.payload?.description || '',
              location: item.payload?.location || '',
              wardNumber: item.payload?.wardNumber || '',
              ward: item.ward || 'Ward 1',
              createdAt: item.createdAt || new Date().toISOString(),
            }));
          }
        } catch (offErr) {
          console.log('Error reading offline complaints for secretary dashboard:', offErr);
        }
      }

      setComplaints(loadedComplaints);
    } catch (err) {
      console.log('Unable to load secretary dashboard data:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [language])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Statistics
  const total = complaints.length;

  const inProgress = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    return (
      st === 'ACTION TAKEN' ||
      st === 'ACTION_TAKEN' ||
      st === 'IN PROGRESS' ||
      st === 'IN_PROGRESS' ||
      st === 'UNDER REVIEW' ||
      st === 'UNDER_REVIEW'
    );
  }).length;

  const resolved = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    return st === 'RESOLVED' || st === 'CLOSED' || st === 'VERIFICATION';
  }).length;

  const pending = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    const isInProg =
      st === 'ACTION TAKEN' ||
      st === 'ACTION_TAKEN' ||
      st === 'IN PROGRESS' ||
      st === 'IN_PROGRESS' ||
      st === 'UNDER REVIEW' ||
      st === 'UNDER_REVIEW';
    const isRes = st === 'RESOLVED' || st === 'CLOSED' || st === 'VERIFICATION';
    return !isInProg && !isRes;
  }).length;

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const openProfile = () => {
    router.push('/admin-profile');
  };

  const openComplaints = (filter?: string) => {
    router.push({
      pathname: '/(tabs)/complaints',
      params: filter ? { filter } : {},
    });
  };

  const openNotifications = () => {
    router.push('/notifications');
  };

  const openHelpLine = () => {
    router.push('/help-line');
  };

  // Action Tile Component
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
            HEADER
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
                <Ionicons
                  name="home-outline"
                  size={21}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.appTitle}>VillageApp</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              {isHindi ? 'ग्राम सचिव डैशबोर्ड' : 'Gram Secretary Dashboard'}
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

            {/* PROFILE PHOTO - CLICKABLE */}
            <TouchableOpacity
              style={styles.headerProfileButton}
              onPress={openProfile}
              activeOpacity={0.8}
            >
              {secretary?.profileImage ? (
                <Image
                  source={{ uri: secretary.profileImage }}
                  style={[styles.profileImage, { width: 40, height: 40, borderRadius: 20 }]}
                />
              ) : (
                <View style={[styles.profilePlaceholder, { width: 40, height: 40, borderRadius: 20 }]}>
                  <Ionicons
                    name="person-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* OFFLINE SYNC BANNER */}
        <OfflineSyncBanner isHindi={isHindi} onSyncComplete={loadData} />

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
            userName={secretary?.name || (isHindi ? 'ग्राम सचिव जी' : 'Secretary')}
            villageName={secretary?.village || (isHindi ? 'मुख्य ग्राम' : 'Main Village')}
            isHindi={isHindi}
          />
        </Animated.View>

        {/* =================================================
            🚨 CRITICAL EMERGENCY SIREN ALERT BANNER
        ================================================= */}
        {complaints.filter(isEmergencyAlertActive).length > 0 && (
          <View style={styles.emergencyAlertBanner}>
            <View style={styles.emergencyTopRow}>
              <View style={styles.emergencyIconPulse}>
                <Ionicons name="warning" size={22} color="#FFFFFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.emergencyTitle}>
                  {isHindi ? '🚨 अति गंभीर आपातकालीन अलर्ट!' : '🚨 Critical Emergency Alert!'}
                </Text>
                <Text style={styles.emergencySub}>
                  {complaints.filter(isEmergencyAlertActive).length}{' '}
                  {isHindi
                    ? 'अति गंभीर समस्याएं तुरंत मुआयने की प्रतीक्षा में हैं'
                    : 'critical grievances require immediate field attention'}
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
                      ? 'अति गंभीर शिकायतों पर सरपंच और सचिव का त्वरित ध्यान अनिवार्य है।'
                      : 'Urgent attention required for critical village grievances.'
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
                {isHindi ? 'गंभीर शिकायतें तुरंत देखें (Take Action)' : 'Review Critical Complaints Now'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* =================================================
            COMPLAINT OVERVIEW / STATS (4 STAT CARDS)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'शिकायतों का अवलोकन' : 'Complaint Overview'}
            </Text>
          </View>
        </View>

        <View style={styles.problemCard}>
          <View style={styles.categoryGrid}>
            {/* TOTAL */}
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => openComplaints('all')}
              activeOpacity={0.82}
            >
              <View style={[styles.categoryIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.countText}>{total}</Text>
              <Text style={styles.categoryText} numberOfLines={1}>
                {isHindi ? 'कुल शिकायतें' : 'Total Grievances'}
              </Text>
            </TouchableOpacity>

            {/* PENDING */}
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => openComplaints('pending')}
              activeOpacity={0.82}
            >
              <View style={[styles.categoryIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle-outline" size={18} color="#DC2626" />
              </View>
              <Text style={styles.countText}>{pending}</Text>
              <Text style={styles.categoryText} numberOfLines={1}>
                {isHindi ? 'लंबित' : 'Pending'}
              </Text>
            </TouchableOpacity>

            {/* IN PROGRESS */}
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => openComplaints('in-progress')}
              activeOpacity={0.82}
            >
              <View style={[styles.categoryIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="time-outline" size={18} color={COLORS.warning} />
              </View>
              <Text style={styles.countText}>{inProgress}</Text>
              <Text style={styles.categoryText} numberOfLines={1}>
                {isHindi ? 'प्रगति में' : 'In Progress'}
              </Text>
            </TouchableOpacity>

            {/* RESOLVED */}
            <TouchableOpacity
              style={styles.categoryCard}
              onPress={() => openComplaints('resolved')}
              activeOpacity={0.82}
            >
              <View style={[styles.categoryIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.countText}>{resolved}</Text>
              <Text style={styles.categoryText} numberOfLines={1}>
                {isHindi ? 'निस्तारित' : 'Resolved'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* =================================================
            COMPLAINT BREAKDOWNS (PRIORITY & CLASSIFICATION)
        ================================================= */}
        <ComplaintOverviewSection
          complaints={complaints}
          onSelectFilter={openComplaints}
          isHindi={isHindi}
        />

        {/* =================================================
            PANCHAYAT MANAGEMENT & SERVICES GRID
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'पंचायत प्रबंधन व सेवाएं' : 'Panchayat Services & Controls'}
            </Text>
          </View>
        </View>

        <View style={styles.problemCard}>
          <View style={styles.categoryGrid}>
            <ActionCard
              icon="list-outline"
              label={isHindi ? 'शिकायतें प्रबंधित' : 'Manage List'}
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
              label={isHindi ? 'वार्ड स्कोरकार्ड' : 'Ward Scorecard'}
              onPress={() => router.push('/ward-scorecard' as any)}
              backgroundColor={COLORS.accentLight}
              iconColor={COLORS.saffron}
            />

            <ActionCard
              icon="call-outline"
              label={isHindi ? 'हेल्पलाइन संपर्क' : 'Helplines'}
              onPress={openHelpLine}
              backgroundColor={COLORS.infoLight}
              iconColor={COLORS.info}
            />

            <ActionCard
              icon="business-outline"
              label={isHindi ? 'ग्राम परिचय' : 'Village Info'}
              onPress={() => setVillageInfoVisible(true)}
              backgroundColor="#F3E8FF"
              iconColor="#9333EA"
            />
          </View>
        </View>

        {/* =================================================
            🏛️ ELECTED SARPANCH LEADERSHIP CARD
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'ग्राम पंचायत सरपंच संपर्क' : 'Elected Sarpanch Contact'}
            </Text>
          </View>
        </View>

        <View style={styles.leadershipCard}>
          <View style={styles.leadershipTopRow}>
            <View style={[styles.leadershipAvatarBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
              <Ionicons name="ribbon" size={24} color={COLORS.saffron} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.leadershipName}>
                {sarpanchDetails?.name || (isHindi ? 'श्री रमेश पटेल' : 'Shri Ramesh Patel')}
              </Text>
              <Text style={[styles.leadershipRole, { color: COLORS.saffron }]}>
                {isHindi ? 'ग्राम सरपंच (Elected Sarpanch)' : 'Elected Sarpanch'}
              </Text>
              <Text style={styles.leadershipVillage}>
                📍 {sarpanchDetails?.village || secretary?.village || (isHindi ? 'ग्राम पंचायत' : 'Gram Panchayat')}
              </Text>
            </View>
          </View>

          <View style={styles.leadershipBtnRow}>
            <TouchableOpacity
              style={styles.leadCallBtn}
              onPress={() => Linking.openURL(`tel:${sarpanchDetails?.mobile || '9876543211'}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.leadCallBtnText}>
                {isHindi ? 'सरपंच को कॉल करें' : 'Call Sarpanch'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leadWhatsappBtn}
              onPress={() => Linking.openURL(`https://wa.me/91${sarpanchDetails?.mobile || '9876543211'}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#15803D" />
              <Text style={styles.leadWhatsappBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* UNIVERSAL BOTTOM NAVIGATION BAR */}
      <DashboardBottomBar activeTab="home" role="secretary" isHindi={isHindi} />

      {/* VILLAGE INFO MODAL */}
      <VillageInfoModal
        visible={villageInfoVisible}
        onClose={() => setVillageInfoVisible(false)}
        villageName={secretary?.village || (isHindi ? 'ग्राम पंचायत' : 'Gram Panchayat')}
        district={secretary?.district}
        block={secretary?.block}
        state={secretary?.state || 'Madhya Pradesh'}
        secretaryName={secretary?.name}
        isHindi={isHindi}
      />

      {/* FULL ENLARGED PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={previewVisible}
        imageUri={secretary?.profileImage}
        userName={secretary?.name || (isHindi ? 'ग्राम सचिव जी' : 'Secretary')}
        userRole={isHindi ? `ग्राम सचिव • ${secretary?.village || 'ग्राम पंचायत'}` : `Gram Secretary • ${secretary?.village || 'Gram Panchayat'}`}
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

// =====================================================
// STYLES
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
    backgroundColor: INDIA.saffron,
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

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  headerProfileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: INDIA.saffron,
  },

  notificationBadge: {
    position: 'absolute',
    right: 4,
    top: 3,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  profileImage: {
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  profilePlaceholder: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarTouchable: {
    position: 'relative',
  },

  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: INDIA.saffron,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.small,
  },

  // WELCOME
  welcomeCard: {
    backgroundColor: COLORS.card,
    borderTopWidth: 4,
    borderTopColor: INDIA.saffron,
    borderRadius: RADIUS.xl,
    padding: 17,
    marginTop: 7,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  welcomeMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  welcomeTextArea: {
    flex: 1,
    marginLeft: 13,
  },

  welcomeSmall: {
    fontSize: 21,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  welcomeDescription: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.medium,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  welcomeTagline: {
    marginTop: 8,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.semiBold,
    color: INDIA.green,
  },

  welcomeMainCompact: {
    padding: 16,
  },
  welcomeGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconEmblem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeFooterCompact: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeFooter: {
    marginTop: 15,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 7,
  },

  welcomeFooterText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  // SECTIONS
  sectionHeader: {
    marginTop: SPACING.section,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },

  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // STATS
  statsRow: {
    flexDirection: 'row',
    gap: 9,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 13,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  statLabel: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.semiBold,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // WARD SCORECARD BANNER
  wardScorecardBanner: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#D4E6DC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    ...SHADOWS.small,
  },

  wardScorecardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  wardScorecardContent: {
    flex: 1,
  },

  wardScorecardTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  liveTag: {
    backgroundColor: '#23845F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  liveTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  wardScorecardSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },

  // ADMINISTRATIVE ACTIONS GRID
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  aiText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.primary,
  },

  problemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },

  categoryCard: {
    width: '48.5%',
    minHeight: 80,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  countText: {
    fontSize: 18,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    marginVertical: 1,
  },

  categoryText: {
    fontSize: 11.5,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },


  // FOOTER
  footer: {
    marginTop: 25,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  footerText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.semiBold,
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

  /* ================= EMERGENCY SIREN ALERT STYLES ================= */
  emergencyAlertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  emergencyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
  },
  emergencySub: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  emergencyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* ================= LEADERSHIP DIRECTORY STYLES ================= */
  leadershipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    ...SHADOWS.small,
  },
  leadershipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  leadershipAvatarBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  leadershipName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  leadershipRole: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 1,
  },
  leadershipVillage: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  leadershipBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  leadCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  leadCallBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  leadWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  leadWhatsappBtnText: {
    color: '#15803D',
    fontSize: 12.5,
    fontWeight: '800',
  },
});