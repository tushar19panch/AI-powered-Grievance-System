import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

import { complaintApi } from '../services/api';

type Complaint = {
  complaintId: string;
  citizenName?: string;
  category: string;
  ward: string;
  description: string;
  status: string;
  dateTime: string;
  photo?: string | null;
  location?: string;
};

type Secretary = {
  name?: string;
  mobile?: string;
  village?: string;
  profileImage?: string | null;
};

export default function SecretaryDashboard() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [secretary, setSecretary] = useState<Secretary | null>(null);
  const [loading, setLoading] = useState(true);

  const isHindi = language === 'hi';

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  const loadSecretaryData = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      const secData = await AsyncStorage.getItem('secretary');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const sec = secData ? JSON.parse(secData) : null;
      let parsed: any = { ...(session || {}), ...(sec || {}) };

      const currentMobile = parsed.mobile || session?.mobile || sec?.mobile;
      if (currentMobile) {
        const photo = await AsyncStorage.getItem(`profile_image_${currentMobile}`);
        parsed = { ...parsed, profileImage: photo || parsed.profileImage || null };
      }
      if (parsed.name || parsed.mobile || parsed.village) {
        setSecretary(parsed);
      }
    } catch (err) {
      console.log('Error loading secretary data:', err);
    }
  };

  const loadComplaints = async () => {
    try {
      setLoading(true);

      // Fetch directly from Backend Spring Boot Database API
      try {
        const apiComplaints = await complaintApi.getSarpanchComplaints();
        if (Array.isArray(apiComplaints)) {
          const list: Complaint[] = apiComplaints.map((c) => ({
            complaintId: String(c.id),
            category: c.category || c.problemType || 'Village Issue',
            ward: c.wardNumber ? `Ward ${c.wardNumber}` : c.location || '',
            description: c.description || '',
            status: c.status || 'SUBMITTED',
            dateTime: c.createdAt || new Date().toISOString(),
            photo: c.photo || null,
            location: c.location || '',
          }));
          list.sort(
            (a, b) =>
              new Date(b.dateTime).getTime() -
              new Date(a.dateTime).getTime()
          );
          setComplaints(list);
        } else {
          setComplaints([]);
        }
      } catch (apiErr) {
        console.log('Secretary backend complaint fetch error:', apiErr);
        setComplaints([]);
      }
    } catch (error) {
      console.log('Unable to load complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSecretaryData();
      loadComplaints();
    }, [])
  );

  const total = complaints.length;

  const pending = complaints.filter(
    (complaint) => {
      const st = String(complaint.status || '').toUpperCase();
      return st === 'SUBMITTED' || st === 'UNDER REVIEW' || st === 'UNDER_REVIEW';
    }
  ).length;

  const resolved = complaints.filter(
    (complaint) => {
      const st = String(complaint.status || '').toUpperCase();
      return st === 'RESOLVED' || st === 'CLOSED';
    }
  ).length;

  const reopened = complaints.filter(
    (complaint) => String(complaint.status || '').toUpperCase() === 'REOPENED'
  ).length;

  const getCategory = (category: string) => {
    if (!isHindi) return category;

    const categoryMap: Record<string, string> = {
      Water: 'पानी',
      Roads: 'सड़क',
      'Street Lights': 'स्ट्रीट लाइट',
      'Garbage/Sanitation': 'कचरा / स्वच्छता',
      Drainage: 'नाली',
      Electricity: 'बिजली',
      'Government Services': 'सरकारी सेवाएं',
      Other: 'अन्य समस्या',
    };

    return categoryMap[category] || category;
  };

  const getStatus = (status: string) => {
    if (!isHindi) return status;

    const statusMap: Record<string, string> = {
      SUBMITTED: 'दर्ज की गई',
      'UNDER REVIEW': 'जांच के अधीन',
      'ACTION TAKEN': 'कार्रवाई की गई',
      'IN PROGRESS': 'प्रगति में',
      RESOLVED: 'हल हो गई',
      VERIFICATION: 'सत्यापन',
      CLOSED: 'बंद',
      REOPENED: 'फिर से खोली गई',
    };

    return statusMap[status] || status;
  };

  const getDate = (dateTime: string) => {
    try {
      return new Date(dateTime).toLocaleDateString(
        isHindi ? 'hi-IN' : 'en-IN'
      );
    } catch {
      return dateTime;
    }
  };

  const openComplaint = (complaintId: string) => {
    router.push({
      pathname: '/complaint-details',
      params: {
        id: complaintId,
      },
    });
  };

  const openProfile = () => {
    router.push('/admin-profile');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={24}
                  color={COLORS.navy}
                />
              </View>

              <View style={styles.headerText}>
                <Text style={styles.title}>
                  {isHindi
                    ? 'सचिव / सुपरवाइजर'
                    : 'Secretary / Supervisor'}
                </Text>

                <Text style={styles.subtitle}>
                  {isHindi
                    ? 'शिकायतों और सरपंच के कार्यों की निगरानी'
                    : 'Monitor complaints and Sarpanch activities'}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.languageButton}
                onPress={toggleLanguage}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="language-outline"
                  size={16}
                  color={COLORS.navy}
                />

                <Text style={styles.languageText}>
                  {isHindi ? 'EN' : 'हि'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerProfile}
                onPress={openProfile}
                activeOpacity={0.8}
              >
                {secretary?.profileImage ? (
                  <Image
                    source={{ uri: secretary.profileImage }}
                    style={styles.headerProfileImage}
                  />
                ) : (
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={COLORS.navy}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* NATIONAL STRIPE */}
          <View style={styles.nationalStripe}>
            <View style={styles.saffronStripe} />
            <View style={styles.whiteStripe}>
              <View style={styles.ashokaWheel}>
                <View style={styles.wheelDot} />
              </View>
            </View>
            <View style={styles.greenStripe} />
          </View>

          {/* SECRETARY PROFILE / WELCOME CARD */}
          <TouchableOpacity
            style={styles.secretaryCard}
            onPress={openProfile}
            activeOpacity={0.85}
          >
            <View style={styles.secretaryTop}>
              <View style={styles.avatar}>
                {secretary?.profileImage ? (
                  <Image
                    source={{ uri: secretary.profileImage }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={COLORS.navy}
                  />
                )}
              </View>

              <View style={styles.secretaryInfo}>
                <Text style={styles.welcomeText}>
                  {isHindi ? 'स्वागत है' : 'Welcome'}
                </Text>

                <Text style={styles.secretaryName}>
                  {secretary?.name ||
                    (isHindi
                      ? 'ग्राम पंचायत सचिव'
                      : 'Panchayat Secretary')}
                </Text>

                <View style={styles.roleRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={13}
                    color={COLORS.accent}
                  />

                  <Text style={styles.roleText}>
                    {isHindi
                      ? 'ग्राम पंचायत सचिव / सुपरवाइजर'
                      : 'Panchayat Secretary / Supervisor'}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={20}
                color={COLORS.textMuted}
              />
            </View>
          </TouchableOpacity>

          {/* COMPLAINT OVERVIEW SECTION HEADER */}
          <View style={styles.sectionHeaderStats}>
            <View>
              <Text style={styles.sectionTitle}>
                {isHindi ? 'शिकायतों का अवलोकन' : 'Complaint Overview'}
              </Text>
              <Text style={styles.sectionSubtitleText}>
                {isHindi ? 'वर्तमान स्थिति के अनुसार शिकायतें' : 'Complaints by current status'}
              </Text>
            </View>

            <View style={styles.totalBadge}>
              <Ionicons
                name="documents-outline"
                size={14}
                color={COLORS.navy}
              />
              <Text style={styles.totalBadgeText}>
                {total}
              </Text>
            </View>
          </View>

          {/* STATS GRID (ALL CLICKABLE) */}
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'all' } })}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.primaryLight },
                ]}
              >
                <Ionicons
                  name="documents-outline"
                  size={21}
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.statNumber}>{total}</Text>

              <Text style={styles.statLabel}>
                {isHindi ? 'कुल शिकायतें' : 'Total Complaints'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'pending' } })}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.warningLight },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={21}
                  color={COLORS.warning}
                />
              </View>

              <Text style={[styles.statNumber, { color: COLORS.warning }]}>
                {pending}
              </Text>

              <Text style={styles.statLabel}>
                {isHindi ? 'लंबित' : 'Pending'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'resolved' } })}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.successLight },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={21}
                  color={COLORS.success}
                />
              </View>

              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {resolved}
              </Text>

              <Text style={styles.statLabel}>
                {isHindi ? 'हल की गई' : 'Resolved'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'reopened' } })}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: COLORS.errorLight },
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={21}
                  color={COLORS.error}
                />
              </View>

              <Text style={[styles.statNumber, { color: COLORS.error }]}>
                {reopened}
              </Text>

              <Text style={styles.statLabel}>
                {isHindi ? 'फिर से खोली गई' : 'Reopened'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* MONITORING SECTION */}
          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>
            {isHindi
              ? 'सरपंच कार्य निगरानी'
              : 'Sarpanch Work Monitoring'}
          </Text>

          <TouchableOpacity
            style={styles.monitorCard}
            onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'pending' } })}
            activeOpacity={0.8}
          >
            <View style={styles.monitorIcon}>
              <Ionicons
                name="eye-outline"
                size={22}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.monitorContent}>
              <Text style={styles.monitorTitle}>
                {isHindi
                  ? 'लंबित शिकायतों की निगरानी'
                  : 'Pending Complaint Monitoring'}
              </Text>

              <Text style={styles.monitorDescription}>
                {isHindi
                  ? `अभी ${pending} शिकायतें लंबित हैं।`
                  : `${pending} complaints are currently pending.`}
              </Text>
            </View>

            <View style={styles.monitorCount}>
              <Text style={styles.monitorCountText}>{pending}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monitorCard}
            onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'reopened' } })}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.monitorIcon,
                { backgroundColor: COLORS.errorLight },
              ]}
            >
              <Ionicons
                name="refresh-circle-outline"
                size={22}
                color={COLORS.error}
              />
            </View>

            <View style={styles.monitorContent}>
              <Text style={styles.monitorTitle}>
                {isHindi
                  ? 'फिर से खोली गई शिकायतें'
                  : 'Reopened Complaints'}
              </Text>

              <Text style={styles.monitorDescription}>
                {isHindi
                  ? `नागरिक द्वारा ${reopened} शिकायतें फिर से खोली गई हैं।`
                  : `${reopened} complaints have been reopened by citizens.`}
              </Text>
            </View>

            <View
              style={[
                styles.monitorCount,
                { backgroundColor: COLORS.errorLight },
              ]}
            >
              <Text
                style={[
                  styles.monitorCountText,
                  { color: COLORS.error },
                ]}
              >
                {reopened}
              </Text>
            </View>
          </TouchableOpacity>

          {/* RECENT COMPLAINTS */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {isHindi
                  ? 'हाल की शिकायतें'
                  : 'Recent Complaints'}
              </Text>

              <Text style={styles.sectionSubtitle}>
                {isHindi
                  ? 'नवीनतम शिकायतों की सूची'
                  : 'Latest complaint activity'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadComplaints}
            >
              <Ionicons
                name="refresh-outline"
                size={16}
                color={COLORS.navy}
              />

              <Text style={styles.refreshText}>
                {isHindi ? 'रिफ्रेश' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* LOADING */}
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator
                size="large"
                color={COLORS.navy}
              />

              <Text style={styles.loadingText}>
                {isHindi
                  ? 'शिकायतें लोड हो रही हैं...'
                  : 'Loading complaints...'}
              </Text>
            </View>
          )}

          {/* EMPTY */}
          {!loading && complaints.length === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="documents-outline"
                  size={35}
                  color={COLORS.navy}
                />
              </View>

              <Text style={styles.emptyTitle}>
                {isHindi
                  ? 'अभी कोई शिकायत नहीं'
                  : 'No complaints yet'}
              </Text>

              <Text style={styles.emptyText}>
                {isHindi
                  ? 'नई शिकायत आने पर यहां दिखाई देगी।'
                  : 'New complaints will appear here.'}
              </Text>
            </View>
          )}

          {/* COMPLAINT LIST */}
          {!loading &&
            complaints.map((complaint) => (
              <TouchableOpacity
                key={complaint.complaintId}
                style={styles.complaintCard}
                activeOpacity={0.8}
                onPress={() =>
                  openComplaint(complaint.complaintId)
                }
              >
                <View style={styles.complaintTop}>
                  <View style={styles.categoryRow}>
                    <View style={styles.categoryIcon}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={18}
                        color={COLORS.navy}
                      />
                    </View>

                    <Text style={styles.category}>
                      {getCategory(complaint.category)}
                    </Text>
                  </View>

                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {getStatus(complaint.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.complaintId}>
                  {complaint.complaintId}
                </Text>

                <Text
                  style={styles.description}
                  numberOfLines={2}
                >
                  {complaint.description}
                </Text>

                {Boolean(complaint.photo && complaint.photo !== 'null' && complaint.photo !== 'undefined' && String(complaint.photo).trim() !== '') && (
                  <View style={styles.cardPhotoWrapper}>
                    <Image
                      source={{ uri: String(complaint.photo).trim() }}
                      style={styles.cardPhotoImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.bottomRow}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.ward}>
                      {isHindi ? 'वार्ड' : 'Ward'} {complaint.ward}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={COLORS.textMuted}
                    />

                    <Text style={styles.date}>
                      {getDate(complaint.dateTime)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },

  content: {
    padding: SPACING.screen,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.normal,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SPACING.sm,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: '#FFE0C2',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: TYPOGRAPHY.lineSmall,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  languageButton: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },

  languageText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
  },

  headerProfile: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  headerProfileImage: {
    width: 38,
    height: 38,
  },

  sectionHeaderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  sectionSubtitleText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    gap: 4,
  },

  totalBadgeText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
  },

  nationalStripe: {
    height: 6,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },

  saffronStripe: {
    flex: 1,
    backgroundColor: COLORS.saffron,
  },

  whiteStripe: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  greenStripe: {
    flex: 1,
    backgroundColor: COLORS.indiaGreen,
  },

  ashokaWheel: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },

  wheelDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.white,
  },

  secretaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },

  secretaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  avatarImage: {
    width: 48,
    height: 48,
  },

  secretaryInfo: {
    flex: 1,
  },

  welcomeText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.mediumWeight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  secretaryName: {
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.navy,
    marginTop: 1,
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  roleText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.semiBold,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },

  metaText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.mediumWeight,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.section,
  },

  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.normal,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  statNumber: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.navy,
  },

  statLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  sectionSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: -8,
    marginBottom: SPACING.md,
  },

  monitorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.normal,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  monitorIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monitorContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  monitorTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  monitorDescription: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 5,
    lineHeight: TYPOGRAPHY.lineSmall,
  },

  monitorCount: {
    minWidth: 38,
    height: 38,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },

  monitorCountText: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.warning,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },

  refreshText: {
    color: COLORS.navy,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
  },

  complaintCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.normal,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  complaintTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  categoryRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },

  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },

  category: {
    flex: 1,
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  statusBadge: {
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },

  statusText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.info,
  },

  complaintId: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  description: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: TYPOGRAPHY.lineBody,
  },

  cardPhotoWrapper: {
    height: 140,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  cardPhotoImage: {
    width: '100%',
    height: '100%',
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ward: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },

  date: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },

  center: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },

  loadingText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },

  emptyText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});