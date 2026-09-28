import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
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

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

import { complaintApi } from '../services/api';
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

      // Load live complaints directly from Backend Database API
      try {
        const apiComplaints = await complaintApi.getSarpanchComplaints();
        if (Array.isArray(apiComplaints)) {
          const filtered = parsed?.village && parsed?.role !== 'SUPER_ADMIN'
            ? apiComplaints.filter((c: any) => !c.villageName || c.villageName === parsed.village)
            : apiComplaints;

          setComplaints(
            filtered.map((c: any) => ({
              complaintId: String(c.id || c.complaintNumber),
              status: c.status,
              priority: c.priority,
              classification: c.classification,
              category: c.category || c.problemType,
              description: c.description,
            }))
          );
          return;
        }
      } catch (apiErr) {
        console.log('Secretary backend complaints fetch error:', apiErr);
      }

      setComplaints([]);
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
    return st === 'RESOLVED' || st === 'CLOSED';
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
            TRICOLOR TOP BAR
        ================================================= */}
        <View style={styles.tricolorBar}>
          <View style={styles.saffronStripe} />
          <View style={styles.whiteStripe} />
          <View style={styles.greenStripe} />
        </View>

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
            COMPLAINT OVERVIEW / STATS (3 STAT CARDS)
        ================================================= */}
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {isHindi ? 'शिकायतों का अवलोकन' : 'Complaint Overview'}
            </Text>
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
            <Text style={styles.statNumber}>{complaints.length}</Text>
            <Text style={styles.statLabel}>{isHindi ? 'कुल शिकायतें' : 'Total'}</Text>
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
            <Text style={styles.statNumber}>
              {complaints.filter((c) => {
                const s = String(c.status || '').toUpperCase();
                return (
                  s === 'IN_PROGRESS' ||
                  s === 'IN PROGRESS' ||
                  s === 'ACTION_TAKEN' ||
                  s === 'ACTION TAKEN' ||
                  s === 'UNDER_REVIEW' ||
                  s === 'UNDER REVIEW'
                );
              }).length}
            </Text>
            <Text style={styles.statLabel}>{isHindi ? 'प्रगति में' : 'In Progress'}</Text>
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
            <Text style={styles.statNumber}>
              {complaints.filter((c) => {
                const s = String(c.status || '').toUpperCase();
                return s === 'RESOLVED' || s === 'CLOSED' || s === 'VERIFICATION';
              }).length}
            </Text>
            <Text style={styles.statLabel}>{isHindi ? 'निस्तारित' : 'Resolved'}</Text>
          </TouchableOpacity>
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
    marginBottom: 5,
  },

  categoryText: {
    fontSize: 11.5,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
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
});