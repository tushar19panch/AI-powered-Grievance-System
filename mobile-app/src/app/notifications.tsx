import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
  | 'REOPENED';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  complaintId: string;
  read: boolean;
};

const initialNotifications: NotificationItem[] = [
  {
    id: 'N001',
    title: 'New Complaint',
    message: 'A new village problem has been submitted.',
    time: '10 min ago',
    type: 'NEW',
    complaintId: 'GP-2026-00124',
    read: false,
  },
  {
    id: 'N002',
    title: 'Complaint Under Review',
    message: 'Your complaint is currently being reviewed.',
    time: '1 hour ago',
    type: 'UPDATE',
    complaintId: 'GP-2026-00120',
    read: false,
  },
  {
    id: 'N003',
    title: 'Action Required',
    message: 'This complaint has been pending for a long time.',
    time: '3 hours ago',
    type: 'ALERT',
    complaintId: 'GP-2026-00118',
    read: false,
  },
  {
    id: 'N004',
    title: 'Complaint Resolved',
    message: 'The reported problem has been marked as resolved.',
    time: 'Yesterday',
    type: 'RESOLVED',
    complaintId: 'GP-2026-00115',
    read: true,
  },
  {
    id: 'N005',
    title: 'Complaint Reopened',
    message: 'A citizen has reported that the problem is not fixed.',
    time: 'Yesterday',
    type: 'REOPENED',
    complaintId: 'GP-2026-00111',
    read: true,
  },
];

export default function Notifications() {
  const router = useRouter();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.read).length;
  }, [notifications]);

  const markAsRead = (id: string) => {
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

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      })),
    );
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'NEW':
        return 'document-text-outline';

      case 'ALERT':
        return 'warning-outline';

      case 'UPDATE':
        return 'refresh-outline';

      case 'RESOLVED':
        return 'checkmark-circle-outline';

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notifications</Text>

            <Text style={styles.headerSubtitle}>
              Complaint updates and alerts
            </Text>
          </View>

          <View style={styles.notificationIcon}>
            <Ionicons
              name="notifications-outline"
              size={23}
              color={COLORS.primary}
            />

            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* SUMMARY */}
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
              {unreadCount} Unread Notifications
            </Text>

            <Text style={styles.summarySubtitle}>
              Stay updated about village complaints
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllText}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* SECTION TITLE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />

          <Text style={styles.sectionTitle}>
            Recent Notifications
          </Text>
        </View>

        {/* NOTIFICATION LIST */}
        <View style={styles.notificationList}>
          {notifications.map((item) => {
            const iconColor = getIconColor(item.type);
            const iconBackground = getIconBackground(item.type);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => markAsRead(item.id)}
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
                    <Text style={styles.notificationTitle}>
                      {item.title}
                    </Text>

                    {!item.read && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>

                  <Text style={styles.notificationMessage}>
                    {item.message}
                  </Text>

                  <View style={styles.bottomRow}>
                    <Text style={styles.complaintId}>
                      {item.complaintId}
                    </Text>

                    <Text style={styles.notificationTime}>
                      {item.time}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ESCALATION */}
        <View style={styles.escalationCard}>
          <View style={styles.escalationIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={COLORS.saffron}
            />
          </View>

          <View style={styles.escalationContent}>
            <Text style={styles.escalationTitle}>
              Escalation Monitoring
            </Text>

            <Text style={styles.escalationText}>
              Pending complaints can trigger reminders and
              monitoring alerts for Sarpanch/Admin and
              Secretary/Supervisor.
            </Text>
          </View>
        </View>

        {/* EMPTY STATE */}
        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={45}
              color={COLORS.textMuted}
            />

            <Text style={styles.emptyTitle}>
              No Notifications
            </Text>

            <Text style={styles.emptyText}>
              You are all caught up.
            </Text>
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footerText}>
          VillageApp • Notification Center
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    padding: SPACING.screen,
    paddingBottom: SPACING.xxl + SPACING.md,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
    marginTop: SPACING.xs,
  },

  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  badge: {
    position: 'absolute',
    right: -3,
    top: -4,
    minWidth: 19,
    height: 19,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },

  badgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.extraBold,
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 3,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.section,
    ...SHADOWS.small,
  },

  summaryIcon: {
    width: 45,
    height: 45,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryText: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  summaryTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  summarySubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },

  markAllText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.primary,
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
    height: 20,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.saffron,
    marginRight: SPACING.sm,
  },

  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  notificationList: {
    gap: SPACING.sm,
  },

  /* NOTIFICATION CARD */

  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 2,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },

  unreadCard: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLight,
  },

  notificationTypeIcon: {
    width: 45,
    height: 45,
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
  },

  notificationTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.saffron,
    marginLeft: SPACING.sm,
  },

  notificationMessage: {
    fontSize: TYPOGRAPHY.small,
    lineHeight: TYPOGRAPHY.lineMedium,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
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

  /* ESCALATION */

  escalationCard: {
    marginTop: SPACING.section,
    backgroundColor: COLORS.accentLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.md + 3,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.saffron,
  },

  escalationIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  escalationContent: {
    flex: 1,
    marginLeft: SPACING.sm + 3,
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
    marginTop: SPACING.xs,
  },

  /* EMPTY */

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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
  },

  /* FOOTER */

  footerText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.xs,
    marginTop: SPACING.xl,
  },
});