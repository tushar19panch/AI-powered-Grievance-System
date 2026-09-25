import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
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

type Complaint = {
  complaintId: string;
  status: string;
};

type Admin = {
  name: string;
  mobile: string;
  village: string;
  adminId: string;
  profileImage?: string | null;
};

export default function AdminScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isHindi = language === 'hi';

  const loadData = async () => {
    try {
      // Load admin
      const adminData = await AsyncStorage.getItem('admin');
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      let parsedAdmin = adminData ? JSON.parse(adminData) : session;
      if (parsedAdmin) {
        const photo = parsedAdmin.mobile
          ? await AsyncStorage.getItem(`profile_image_${parsedAdmin.mobile}`)
          : null;
        parsedAdmin = { ...parsedAdmin, profileImage: photo || null };
        setAdmin(parsedAdmin);
      }

      // 1. Try Backend Spring Boot Database API
      try {
        const apiComplaints = await complaintApi.getSarpanchComplaints();
        if (Array.isArray(apiComplaints)) {
          setComplaints(
            apiComplaints.map((c) => ({
              complaintId: String(c.id),
              status: c.status,
            }))
          );
          return;
        }
      } catch (apiErr) {
        console.log('Admin backend complaints fetch error, using local fallback:', apiErr);
      }

      // 2. Fallback: Load complaints from local storage
      const keys = await AsyncStorage.getAllKeys();
      const complaintKeys = keys.filter((key) =>
        key.startsWith('complaint_')
      );

      const values = await AsyncStorage.multiGet(complaintKeys);
      const data: Complaint[] = values
        .map(([_, value]) => {
          if (!value) return null;
          try {
            return JSON.parse(value);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Complaint[];

      // Filter by village if specified on the logged-in admin (unless SUPER_ADMIN)
      const filteredData = parsedAdmin?.village && parsedAdmin?.role !== 'SUPER_ADMIN'
        ? data.filter((c: any) => !c.village || c.village === parsedAdmin.village)
        : data;

      setComplaints(filteredData);
    } catch {
      console.log('Unable to load dashboard data');
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

  const pending = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    return st === 'SUBMITTED' || st === 'UNDER REVIEW' || st === 'UNDER_REVIEW';
  }).length;

  const inProgress = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    return (
      st === 'ACTION TAKEN' ||
      st === 'ACTION_TAKEN' ||
      st === 'IN PROGRESS' ||
      st === 'IN_PROGRESS'
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

  const openComplaints = () => {
    router.push('/complaints');
  };

  const openAuditReport = () => {
    router.push('/audit-report');
  };

  const logout = async () => {
    const doLogout = async () => {
      try {
        await AsyncStorage.removeItem('admin');
        await AsyncStorage.removeItem('user_session');
        await AsyncStorage.removeItem('@village_jwt_token');
        await AsyncStorage.removeItem('@village_user_session');
        await AsyncStorage.removeItem('token');
        router.replace('/(tabs)');
      } catch (error) {
        console.log('Logout error:', error);
        router.replace('/(tabs)');
      }
    };

    if (Platform.OS === 'web') {
      const confirmLogout = typeof window !== 'undefined'
        ? window.confirm(
          isHindi
            ? 'क्या आप लॉग आउट करना चाहते हैं?'
            : 'Are you sure you want to logout?'
        )
        : true;
      if (confirmLogout) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      isHindi ? 'लॉग आउट' : 'Logout',
      isHindi
        ? 'क्या आप लॉग आउट करना चाहते हैं?'
        : 'Are you sure you want to logout?',
      [
        {
          text: isHindi ? 'रद्द करें' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isHindi ? 'लॉग आउट' : 'Logout',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <View style={styles.headLabel}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={COLORS.accent}
              />

              <Text style={styles.headLabelText}>
                HEAD • SARPANCH / ADMIN
              </Text>
            </View>

            <Text style={styles.title}>
              {isHindi
                ? 'एडमिन डैशबोर्ड'
                : 'Admin Dashboard'}
            </Text>

            <Text style={styles.subtitle}>
              {isHindi
                ? 'गांव की शिकायतों और समस्याओं का प्रबंधन'
                : 'Manage village complaints and problems'}
            </Text>
          </View>

          {/* Profile Image */}
          <TouchableOpacity
            style={styles.headerProfile}
            onPress={openProfile}
            activeOpacity={0.8}
          >
            {admin?.profileImage ? (
              <Image
                source={{ uri: admin.profileImage }}
                style={styles.headerProfileImage}
              />
            ) : (
              <Ionicons
                name="person-outline"
                size={23}
                color={COLORS.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Ionicons
              name="language-outline"
              size={18}
              color={COLORS.primary}
            />

            <Text style={styles.languageText}>
              {isHindi ? 'English' : 'हिंदी'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={logout}
            activeOpacity={0.8}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={COLORS.error}
            />

            <Text style={styles.logoutText}>
              {t.logout}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ADMIN PROFILE CARD */}
        <View style={styles.adminCard}>
          <View style={styles.adminTop}>
            <View style={styles.avatar}>
              {admin?.profileImage ? (
                <Image
                  source={{ uri: admin.profileImage }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons
                  name="person-outline"
                  size={32}
                  color={COLORS.primary}
                />
              )}
            </View>

            <View style={styles.adminInfo}>
              <Text style={styles.welcomeText}>
                {isHindi ? 'स्वागत है' : 'Welcome'}
              </Text>

              <Text style={styles.adminName}>
                {admin?.name ||
                  (isHindi
                    ? 'सरपंच / एडमिन'
                    : 'Sarpanch / Admin')}
              </Text>

              <View style={styles.roleRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={COLORS.accent}
                />

                <Text style={styles.roleText}>
                  {isHindi
                    ? 'सरपंच / एडमिन'
                    : 'Sarpanch / Admin'}
                </Text>
              </View>
            </View>
          </View>

          {admin?.village ? (
            <View style={styles.villageRow}>
              <Ionicons
                name="location-outline"
                size={17}
                color={COLORS.indiaGreen}
              />

              <Text style={styles.villageText}>
                {admin.village}
              </Text>
            </View>
          ) : null}
        </View>

        {/* COMPLAINT OVERVIEW */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi
                ? 'शिकायतों का अवलोकन'
                : 'Complaint Overview'}
            </Text>

            <Text style={styles.sectionSubtitle}>
              {isHindi
                ? 'वर्तमान शिकायत स्थिति'
                : 'Current complaint status'}
            </Text>
          </View>

          <View style={styles.totalBadge}>
            <Ionicons
              name="documents-outline"
              size={15}
              color={COLORS.primary}
            />

            <Text style={styles.totalBadgeText}>
              {total}
            </Text>
          </View>
        </View>

        {/* STATISTICS (CLICKABLE FILTERS) */}
        <View style={styles.statsGrid}>
          {/* Total */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'all' } })}
            activeOpacity={0.75}
          >
            <View style={styles.statIconBox}>
              <Ionicons
                name="documents-outline"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.statNumber}>
              {total}
            </Text>

            <Text style={styles.statLabel}>
              {t.total}
            </Text>
          </TouchableOpacity>

          {/* Pending */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'pending' } })}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.statIconBox,
                styles.pendingIconBox,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={23}
                color={COLORS.warning}
              />
            </View>

            <Text style={styles.statNumber}>
              {pending}
            </Text>

            <Text style={styles.statLabel}>
              {isHindi ? 'लंबित' : 'Pending'}
            </Text>
          </TouchableOpacity>

          {/* In Progress */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'in-progress' } })}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.statIconBox,
                styles.progressIconBox,
              ]}
            >
              <Ionicons
                name="sync-outline"
                size={23}
                color={COLORS.info}
              />
            </View>

            <Text style={styles.statNumber}>
              {inProgress}
            </Text>

            <Text style={styles.statLabel}>
              {t.inProgress}
            </Text>
          </TouchableOpacity>

          {/* Resolved */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push({ pathname: '/(tabs)/complaints', params: { filter: 'resolved' } })}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.statIconBox,
                styles.resolvedIconBox,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={23}
                color={COLORS.indiaGreen}
              />
            </View>

            <Text style={styles.statNumber}>
              {resolved}
            </Text>

            <Text style={styles.statLabel}>
              {t.resolved}
            </Text>
          </TouchableOpacity>
        </View>

        {/* VIEW ALL COMPLAINTS */}
        <TouchableOpacity
          style={styles.complaintsButton}
          onPress={openComplaints}
          activeOpacity={0.85}
        >
          <View style={styles.complaintsIconBox}>
            <Ionicons
              name="list-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.complaintsButtonText}>
            <Text style={styles.complaintsButtonTitle}>
              {isHindi
                ? 'सभी शिकायतें देखें'
                : 'View All Complaints'}
            </Text>

            <Text style={styles.complaintsButtonSubtitle}>
              {isHindi
                ? 'सभी शिकायतों की पूरी सूची देखें'
                : 'View the complete complaint list'}
            </Text>
          </View>

          <View style={styles.arrowBox}>
            <Ionicons
              name="arrow-forward-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>
        </TouchableOpacity>

        {/* PDF AUDIT REPORT */}
        <TouchableOpacity
          style={styles.auditButton}
          onPress={openAuditReport}
          activeOpacity={0.85}
        >
          <View style={styles.auditIconBox}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.auditButtonText}>
            <Text style={styles.auditButtonTitle}>
              {isHindi
                ? 'PDF ऑडिट रिपोर्ट'
                : 'PDF Audit Report'}
            </Text>

            <Text style={styles.auditButtonSubtitle}>
              {isHindi
                ? 'शिकायतों की ऑडिट रिपोर्ट बनाएं'
                : 'Generate complaint audit report'}
            </Text>
          </View>

          <View style={styles.auditArrowBox}>
            <Ionicons
              name="arrow-forward-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>
        </TouchableOpacity>

        {/* ADMIN RESPONSIBILITY */}
        <View style={styles.infoBox}>
          <View style={styles.infoIconBox}>
            <Ionicons
              name="information-circle-outline"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              {isHindi
                ? 'एडमिन की जिम्मेदारी'
                : 'Admin Responsibility'}
            </Text>

            <Text style={styles.infoText}>
              {isHindi
                ? 'शिकायतों की समीक्षा करें, कार्रवाई की निगरानी करें और समस्या का समाधान सुनिश्चित करें।'
                : 'Review complaints, monitor actions and ensure problems are resolved.'}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color={COLORS.textMuted}
          />

          <Text style={styles.footerText}>
            VillageApp •{' '}
            {isHindi
              ? 'बेहतर ग्राम व्यवस्था'
              : 'Better Village Governance'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.sm,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: SPACING.md,
  },

  headLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  headLabelText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.accent,
    letterSpacing: 0.7,
    marginLeft: 5,
  },

  title: {
    fontSize: TYPOGRAPHY.largeHeading,
    lineHeight: TYPOGRAPHY.lineHeading,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.navy,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.small,
    lineHeight: TYPOGRAPHY.lineSmall + 2,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  headerProfile: {
    width: 49,
    height: 49,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  headerProfileImage: {
    width: 49,
    height: 49,
  },

  /* ACTIONS */

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginBottom: SPACING.md,
  },

  languageButton: {
    height: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  languageText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
  },

  logoutButton: {
    height: 38,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  logoutText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
  },

  /* ADMIN CARD */

  adminCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.section,
    ...SHADOWS.medium,
  },

  adminTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: 68,
    height: 68,
  },

  adminInfo: {
    flex: 1,
    marginLeft: 14,
  },

  welcomeText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.mediumWeight,
  },

  adminName: {
    fontSize: TYPOGRAPHY.subtitle + 2,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.black,
    marginTop: 2,
  },

  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },

  roleText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.bold,
  },

  villageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 15,
  },

  villageText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
    marginLeft: 6,
  },

  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: 15,
    paddingTop: 13,
  },

  profileLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  profileLinkText: {
    fontSize: TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.bold,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle + 1,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.black,
  },

  sectionSubtitle: {
    fontSize: TYPOGRAPHY.xs + 1,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  totalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },

  totalBadgeText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: TYPOGRAPHY.black,
  },

  /* STATS */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },

  statCard: {
    width: '48.3%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  pendingIconBox: {
    backgroundColor: COLORS.warningLight,
  },

  progressIconBox: {
    backgroundColor: COLORS.infoLight,
  },

  resolvedIconBox: {
    backgroundColor: COLORS.successLight,
  },

  statNumber: {
    fontSize: TYPOGRAPHY.heading,
    lineHeight: TYPOGRAPHY.lineHeading,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textPrimary,
  },

  statLabel: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.mediumWeight,
    marginTop: 2,
  },

  /* VIEW ALL COMPLAINTS */

  complaintsButton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
    ...SHADOWS.small,
  },

  complaintsIconBox: {
    width: 47,
    height: 47,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  complaintsButtonText: {
    flex: 1,
    marginLeft: 12,
  },

  complaintsButtonTitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.black,
  },

  complaintsButtonSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  arrowBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* PDF AUDIT REPORT */

  auditButton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
    ...SHADOWS.small,
  },

  auditIconBox: {
    width: 47,
    height: 47,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  auditButtonText: {
    flex: 1,
    marginLeft: 12,
  },

  auditButtonTitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.black,
  },

  auditButtonSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  auditArrowBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* INFO */

  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  infoIconBox: {
    width: 28,
    alignItems: 'center',
  },

  infoContent: {
    flex: 1,
    marginLeft: 5,
  },

  infoTitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.black,
  },

  infoText: {
    fontSize: TYPOGRAPHY.xs,
    lineHeight: TYPOGRAPHY.lineSmall,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 18,
  },

  footerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.mediumWeight,
  },
});