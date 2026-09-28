import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationApi, authApi, getAuthToken, setAuthToken, isValidJwt } from '../services/api';
import { DashboardBottomBar } from '../components/DashboardBottomBar';
import { useLanguage } from '../i18n/LanguageContext';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type NotificationType =
  | 'NEW'
  | 'ALERT'
  | 'UPDATE'
  | 'RESOLVED'
  | 'REOPENED'
  | 'IN_PROGRESS';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  complaintId?: string | null;
  statusBadge?: string;
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: 'N001',
    title: 'New Complaint Registered',
    message: 'A new village problem #101 has been submitted and registered.',
    time: 'Just now',
    type: 'NEW',
    complaintId: '101',
    statusBadge: 'SUBMITTED',
    read: false,
  },
];

export default function Notifications() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const isHindi = language === 'hi';

  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNREAD' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary'>('citizen');

  // Load user role from session
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const sessionData = await AsyncStorage.getItem('user_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const role = String(session?.role || 'citizen').toLowerCase() as 'citizen' | 'sarpanch' | 'secretary';
          setUserRole(role);
        }
      } catch (e) {
        console.log('Error reading role for notifications:', e);
      }
    };
    fetchUserRole();
  }, []);

  // Helper to extract Complaint ID from text or payload
  const extractComplaintId = (
    cId?: number | string | null,
    msg?: string,
    title?: string
  ): string | null => {
    if (cId !== undefined && cId !== null && String(cId).trim() !== '' && !String(cId).startsWith('N00')) {
      return String(cId).trim();
    }
    const combined = `${title || ''} ${msg || ''}`;
    const hashMatch = combined.match(/#(\d+)/i);
    if (hashMatch) return hashMatch[1];

    const compMatch = combined.match(/(?:complaint|शिकायत|id|संख्या)[\s\-:]*#?(\d+)/i);
    if (compMatch) return compMatch[1];

    const gpMatch = combined.match(/(?:GP|COMP)[\-_]?(\d+)/i);
    if (gpMatch) return gpMatch[1];

    return null;
  };

  const loadLiveNotifications = async () => {
    try {
      let token = await getAuthToken();
      if (!token || !isValidJwt(token)) {
        try {
          const sessionData = await AsyncStorage.getItem('user_session');
          const session = sessionData ? JSON.parse(sessionData) : null;
          const savedPass = session?.password;
          const savedMobile = session?.mobile || session?.adminId || session?.secretaryId;
          if (savedPass && savedMobile) {
            const loginRes = await authApi.login({
              mobileNumber: savedMobile,
              identifier: savedMobile,
              password: savedPass,
            });
            if (loginRes?.token && isValidJwt(loginRes.token)) {
              await setAuthToken(loginRes.token);
            }
          }
        } catch {}
      }

      let data: any[] = [];
      try {
        data = await notificationApi.getNotifications();
      } catch (apiErr: any) {
        if (apiErr?.message?.includes('Access Denied')) {
          try {
            const sessionData = await AsyncStorage.getItem('user_session');
            const session = sessionData ? JSON.parse(sessionData) : null;
            const savedPass = session?.password;
            const savedMobile = session?.mobile || session?.adminId || session?.secretaryId;
            if (savedPass && savedMobile) {
              const retryRes = await authApi.login({
                mobileNumber: savedMobile,
                identifier: savedMobile,
                password: savedPass,
              });
              if (retryRes?.token && isValidJwt(retryRes.token)) {
                await setAuthToken(retryRes.token);
                data = await notificationApi.getNotifications();
              }
            }
          } catch {}
        }
        if (!data || data.length === 0) {
          console.log('Unable to load live notifications:', apiErr?.message || apiErr);
        }
      }

      if (Array.isArray(data) && data.length > 0) {
        const mapped: NotificationItem[] = data.map((n) => {
          let type: NotificationType = 'NEW';
          const msg = (n.message || '').toUpperCase();
          let statusBadge = 'SUBMITTED';

          if (msg.includes('RESOLVED') || msg.includes('CLOSED') || msg.includes('समाधान')) {
            type = 'RESOLVED';
            statusBadge = 'RESOLVED';
          } else if (msg.includes('REOPEN') || msg.includes('फिर से')) {
            type = 'REOPENED';
            statusBadge = 'REOPENED';
          } else if (
            msg.includes('ACTION_TAKEN') ||
            msg.includes('ACTION TAKEN') ||
            msg.includes('IN_PROGRESS') ||
            msg.includes('IN PROGRESS') ||
            msg.includes('कार्रवाई') ||
            msg.includes('प्रगति')
          ) {
            type = 'IN_PROGRESS';
            statusBadge = 'IN_PROGRESS';
          } else if (msg.includes('UNDER_REVIEW') || msg.includes('UNDER REVIEW') || msg.includes('VERIFICATION') || msg.includes('समीक्षा')) {
            type = 'ALERT';
            statusBadge = 'UNDER_REVIEW';
          } else if (msg.includes('NEW') || msg.includes('SUBMITTED') || msg.includes('दर्ज')) {
            type = 'NEW';
            statusBadge = 'SUBMITTED';
          } else {
            type = 'ALERT';
            statusBadge = 'UPDATE';
          }

          let formattedTime = isHindi ? 'हाल ही में' : 'Recently';
          if (n.createdAt) {
            try {
              const dt = new Date(n.createdAt);
              if (!isNaN(dt.getTime())) {
                formattedTime =
                  dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
                  ' ' +
                  dt.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { day: '2-digit', month: 'short' });
              }
            } catch {}
          }

          const extractedId = extractComplaintId(n.complaintId, n.message);

          let notificationTitle = '';
          if (type === 'IN_PROGRESS') {
            notificationTitle = isHindi ? 'कार्रवाई जारी • प्रगति में' : 'Action Taken • In Progress';
          } else if (type === 'RESOLVED') {
            notificationTitle = isHindi ? 'शिकायत समाधान पूर्ण' : 'Complaint Resolved';
          } else if (type === 'REOPENED') {
            notificationTitle = isHindi ? 'शिकायत फिर से खोली गई' : 'Complaint Reopened';
          } else if (type === 'ALERT') {
            notificationTitle = isHindi ? 'समीक्षा व सत्यापन अलर्ट' : 'Review & Audit Alert';
          } else {
            notificationTitle = isHindi ? 'नई शिकायत सूचना' : 'New Complaint Alert';
          }

          return {
            id: String(n.id),
            title: notificationTitle,
            message: n.message,
            time: formattedTime,
            type,
            statusBadge,
            complaintId: extractedId,
            read: n.read,
          };
        });
        setNotifications(mapped);
      }
    } catch (e) {
      console.log('Unable to load live notifications:', e);
    }
  };

  useEffect(() => {
    loadLiveNotifications();
  }, [language]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLiveNotifications();
    setRefreshing(false);
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.read).length;
  }, [notifications]);

  const inProgressCount = useMemo(() => {
    return notifications.filter((item) => item.type === 'IN_PROGRESS' || item.statusBadge === 'IN_PROGRESS').length;
  }, [notifications]);

  const resolvedCount = useMemo(() => {
    return notifications.filter((item) => item.type === 'RESOLVED').length;
  }, [notifications]);

  const markAsRead = async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await notificationApi.markAsRead(numId);
      }
    } catch {}
    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              read: true,
            }
          : item,
      ),
    );
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // 1. Mark as read
    if (!item.read) {
      await markAsRead(item.id);
    }

    // 2. Navigate to complaint details if complaintId exists or is extractable
    const targetId = item.complaintId || extractComplaintId(undefined, item.message, item.title);
    if (targetId) {
      router.push({
        pathname: '/complaint-details',
        params: { id: targetId },
      });
    } else {
      // If no specific complaint is linked, open all complaints tab
      router.push('/(tabs)/complaints');
    }
  };

  const markAllAsRead = async () => {
    for (const item of notifications) {
      if (!item.read) {
        try {
          const numId = parseInt(item.id, 10);
          if (!isNaN(numId)) {
            await notificationApi.markAsRead(numId);
          }
        } catch {}
      }
    }
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      })),
    );
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'UNREAD') {
      return notifications.filter((n) => !n.read);
    }
    if (activeFilter === 'IN_PROGRESS') {
      return notifications.filter((n) => n.type === 'IN_PROGRESS' || n.statusBadge === 'IN_PROGRESS');
    }
    if (activeFilter === 'RESOLVED') {
      return notifications.filter((n) => n.type === 'RESOLVED');
    }
    return notifications;
  }, [notifications, activeFilter]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'NEW':
        return 'document-text-outline';
      case 'ALERT':
        return 'warning-outline';
      case 'IN_PROGRESS':
      case 'UPDATE':
        return 'construct-outline';
      case 'RESOLVED':
        return 'checkmark-done-circle-outline';
      case 'REOPENED':
        return 'return-up-back-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getIconColor = (type: NotificationType) => {
    switch (type) {
      case 'NEW':
        return COLORS.primary;
      case 'ALERT':
        return COLORS.warning;
      case 'IN_PROGRESS':
      case 'UPDATE':
        return COLORS.saffron;
      case 'RESOLVED':
        return COLORS.success;
      case 'REOPENED':
        return COLORS.error;
      default:
        return COLORS.primary;
    }
  };

  const getIconBackground = (type: NotificationType) => {
    switch (type) {
      case 'NEW':
        return COLORS.primaryLight;
      case 'ALERT':
        return COLORS.warningLight;
      case 'IN_PROGRESS':
      case 'UPDATE':
        return COLORS.accentLight;
      case 'RESOLVED':
        return COLORS.successLight;
      case 'REOPENED':
        return COLORS.errorLight;
      default:
        return COLORS.primaryLight;
    }
  };

  const getStatusBadgeStyle = (type: NotificationType, badge?: string) => {
    if (type === 'IN_PROGRESS' || badge === 'IN_PROGRESS') {
      return {
        label: isHindi ? '⏳ कार्रवाई जारी (प्रगति में)' : '⏳ In Progress',
        bg: '#FEF3C7',
        textColor: '#B45309',
        border: '#FDE68A',
      };
    }
    if (type === 'RESOLVED' || badge === 'RESOLVED') {
      return {
        label: isHindi ? '✅ समाधान पूर्ण' : '✅ Resolved',
        bg: '#DCFCE7',
        textColor: '#15803D',
        border: '#86EFAC',
      };
    }
    if (type === 'REOPENED' || badge === 'REOPENED') {
      return {
        label: isHindi ? '🔄 पुनः खोली गई' : '🔄 Reopened',
        bg: '#FEE2E2',
        textColor: '#B91C1C',
        border: '#FCA5A5',
      };
    }
    if (badge === 'UNDER_REVIEW' || type === 'ALERT') {
      return {
        label: isHindi ? '🔍 समीक्षा में' : '🔍 Under Review',
        bg: '#E0F2FE',
        textColor: '#0369A1',
        border: '#BAE6FD',
      };
    }
    return {
      label: isHindi ? '📋 नई शिकायत' : '📋 Registered',
      bg: '#EFF6FF',
      textColor: '#1D4ED8',
      border: '#BFDBFE',
    };
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (userRole === 'sarpanch' || userRole === 'secretary') {
      router.replace('/admin');
    } else {
      router.replace('/citizen-dashboard');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      {/* TRICOLOR TOP STRIPE */}
      <View style={styles.tricolorBar}>
        <View style={styles.saffronStripe} />
        <View style={styles.whiteStripe} />
        <View style={styles.greenStripe} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {isHindi ? 'सूचनाएं एवं अलर्ट' : 'Notifications'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isHindi ? 'शिकायत अपडेट और त्वरित कार्रवाई' : 'Complaint updates & action tracking'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setLanguage(isHindi ? 'en' : 'hi')}
            activeOpacity={0.8}
          >
            <Ionicons name="language-outline" size={16} color={COLORS.primary} />
            <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY CARD */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="notifications"
              size={24}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {unreadCount > 0
                ? isHindi
                  ? `${unreadCount} नई अपठित सूचनाएं`
                  : `${unreadCount} Unread Notifications`
                : isHindi
                  ? 'सभी सूचनाएं अद्यतित हैं'
                  : 'All notifications caught up'}
            </Text>
            <Text style={styles.summarySubtitle}>
              {isHindi
                ? 'शिकायत की स्थिति देखने हेतु कार्ड पर क्लिक करें'
                : 'Tap any notification to view complaint progress'}
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              activeOpacity={0.7}
              style={styles.markAllButton}
            >
              <Text style={styles.markAllText}>
                {isHindi ? 'सभी पढ़ें' : 'Mark all read'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FILTER PILLS */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setActiveFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>
              {isHindi ? 'सभी' : 'All'} ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'UNREAD' && styles.filterPillActive]}
            onPress={() => setActiveFilter('UNREAD')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'UNREAD' && styles.filterPillTextActive]}>
              {isHindi ? 'अपठित' : 'Unread'} ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'IN_PROGRESS' && styles.filterPillActive]}
            onPress={() => setActiveFilter('IN_PROGRESS')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'IN_PROGRESS' && styles.filterPillTextActive]}>
              {isHindi ? '⏳ प्रगति में' : '⏳ In Progress'} ({inProgressCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'RESOLVED' && styles.filterPillActive]}
            onPress={() => setActiveFilter('RESOLVED')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, activeFilter === 'RESOLVED' && styles.filterPillTextActive]}>
              {isHindi ? '✅ समाधान' : '✅ Resolved'} ({resolvedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION TITLE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>
            {activeFilter === 'IN_PROGRESS'
              ? isHindi ? 'कार्रवाई व प्रगति में सूचनाएं' : 'In-Progress & Action Taken'
              : activeFilter === 'UNREAD'
                ? isHindi ? 'अपठित सूचनाएं' : 'Unread Notifications'
                : activeFilter === 'RESOLVED'
                  ? isHindi ? 'हल की गई सूचनाएं' : 'Resolved Complaints'
                  : isHindi ? 'हालिया सूचनाएं' : 'Recent Notifications'}
          </Text>
          <Text style={styles.sectionBadgeCount}>
            {filteredNotifications.length}
          </Text>
        </View>

        {/* NOTIFICATION LIST (CLICKABLE) */}
        <View style={styles.notificationList}>
          {filteredNotifications.map((item) => {
            const iconColor = getIconColor(item.type);
            const iconBackground = getIconBackground(item.type);
            const badgeInfo = getStatusBadgeStyle(item.type, item.statusBadge);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.72}
                onPress={() => handleNotificationPress(item)}
                style={[
                  styles.notificationCard,
                  !item.read && styles.unreadCard,
                ]}
              >
                {/* TYPE ICON */}
                <View
                  style={[
                    styles.notificationTypeIcon,
                    {
                      backgroundColor: iconBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name={getIcon(item.type) as any}
                    size={22}
                    color={iconColor}
                  />
                </View>

                {/* CONTENT */}
                <View style={styles.notificationContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>
                      {item.title}
                    </Text>

                    {!item.read && (
                      <View style={styles.unreadBadgePill}>
                        <View style={styles.unreadDot} />
                        <Text style={styles.unreadBadgeText}>
                          {isHindi ? 'नया' : 'NEW'}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.notificationMessage}>
                    {item.message}
                  </Text>

                  {/* STATUS BADGE & TIMING */}
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusTag,
                        {
                          backgroundColor: badgeInfo.bg,
                          borderColor: badgeInfo.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusTagText,
                          { color: badgeInfo.textColor },
                        ]}
                      >
                        {badgeInfo.label}
                      </Text>
                    </View>

                    <Text style={styles.notificationTime}>
                      {item.time}
                    </Text>
                  </View>

                  {/* CLICKABLE ACTION FOOTER */}
                  <View style={styles.bottomRow}>
                    {Boolean(item.complaintId) && (
                      <View style={styles.complaintIdBadge}>
                        <Ionicons name="document-text" size={11} color={COLORS.primary} />
                        <Text style={styles.complaintId}>
                          #{item.complaintId}
                        </Text>
                      </View>
                    )}

                    <View style={styles.viewActionPill}>
                      <Text style={styles.viewActionText}>
                        {isHindi ? 'विवरण देखें' : 'View Progress'}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color={COLORS.primary}
                        style={{ marginLeft: 3 }}
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* EMPTY STATE */}
        {filteredNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={50}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई सूचना नहीं मिली' : 'No Notifications'}
            </Text>
            <Text style={styles.emptyText}>
              {isHindi
                ? 'वर्तमान फिल्टर में कोई सूचना उपलब्ध नहीं है।'
                : 'You have no notifications matching this category.'}
            </Text>
          </View>
        )}

        {/* ESCALATION MONITORING CARD */}
        <View style={styles.escalationCard}>
          <View style={styles.escalationIcon}>
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={COLORS.saffron}
            />
          </View>

          <View style={styles.escalationContent}>
            <Text style={styles.escalationTitle}>
              {isHindi ? 'पारदर्शी निवारण प्रणाली' : 'Transparent Grievance Tracking'}
            </Text>
            <Text style={styles.escalationText}>
              {isHindi
                ? 'कार्रवाई (Action Taken) शुरू होते ही स्थिति प्रगति में (In Progress) प्रदर्शित होती है ताकि नागरिक व अधिकारी रियल-टाइम प्रगति जान सकें।'
                : 'When official action is initiated, complaints are marked In Progress with real-time status updates and escalation monitoring.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <DashboardBottomBar activeTab="notices" role={userRole} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  tricolorBar: {
    height: 4,
    width: '100%',
    flexDirection: 'row',
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

  container: {
    padding: SPACING.screen,
    paddingBottom: SPACING.xxl + SPACING.xl,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  headerSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    ...SHADOWS.small,
  },

  languageText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.primary,
  },

  /* SUMMARY */
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryText: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.xs,
  },

  summaryTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  summarySubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  markAllButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
  },

  markAllText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  /* FILTER PILLS */
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },

  filterPill: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  filterPillText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
  },

  filterPillTextActive: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  /* SECTION */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },

  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.saffron,
    marginRight: SPACING.sm,
  },

  sectionTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  sectionBadgeCount: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },

  notificationList: {
    gap: SPACING.sm,
  },

  /* NOTIFICATION CARD (CLICKABLE) */
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  unreadCard: {
    borderColor: '#93C5FD',
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },

  notificationTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  notificationTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  unreadBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginLeft: SPACING.xs,
  },

  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.error,
    marginRight: 4,
  },

  unreadBadgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.error,
  },

  notificationMessage: {
    fontSize: TYPOGRAPHY.small,
    lineHeight: TYPOGRAPHY.lineMedium,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs + 2,
  },

  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },

  statusTagText: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  complaintIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    gap: 3,
  },

  complaintId: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.bold,
  },

  notificationTime: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
  },

  viewActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  viewActionText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  /* ESCALATION */
  escalationCard: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.saffron,
  },

  escalationIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  escalationContent: {
    flex: 1,
    marginLeft: SPACING.sm + 2,
  },

  escalationTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  escalationText: {
    fontSize: TYPOGRAPHY.xs,
    lineHeight: TYPOGRAPHY.lineMedium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* EMPTY */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  emptyTitle: {
    fontSize: TYPOGRAPHY.large,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },

  emptyText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});