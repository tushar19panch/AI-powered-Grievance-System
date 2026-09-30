import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

import {
  isVeryHighPriority,
  isHighPriority,
  isMediumPriority,
  isLowPriority,
  ComplaintFilterItem,
} from '../services/complaintClassification';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ComplaintItem extends ComplaintFilterItem {
  complaintId?: string | number;
  id?: string | number;
  category?: string;
  status?: string;
}

export type StatusKey = 'all' | 'pending' | 'in-progress' | 'resolved';

interface ComplaintOverviewSectionProps {
  complaints?: ComplaintItem[];
  onSelectFilter?: (status: string, priority?: string) => void;
  isHindi?: boolean;
}

export function ComplaintOverviewSection({
  complaints = [],
  onSelectFilter,
  isHindi = false,
}: ComplaintOverviewSectionProps) {
  // Selected status box. Can be toggled open/closed.
  const [selectedStatus, setSelectedStatus] = useState<StatusKey | null>(null);

  const handleStatusClick = (key: StatusKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (selectedStatus === key) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(key);
    }
  };

  // =====================================================
  // DYNAMIC STATUS GROUPING
  // =====================================================
  const inProgressList = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    return (
      st === 'ACTION TAKEN' ||
      st === 'ACTION_TAKEN' ||
      st === 'IN PROGRESS' ||
      st === 'IN_PROGRESS' ||
      st === 'UNDER REVIEW' ||
      st === 'UNDER_REVIEW'
    );
  });

  const resolvedList = complaints.filter((item) => {
    const st = String(item.status || '').toUpperCase();
    return st === 'RESOLVED' || st === 'CLOSED' || st === 'VERIFICATION';
  });

  const pendingList = complaints.filter((item) => {
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
  });

  // Complaints list corresponding to clicked status box
  const activeList =
    selectedStatus === 'pending'
      ? pendingList
      : selectedStatus === 'in-progress'
        ? inProgressList
        : selectedStatus === 'resolved'
          ? resolvedList
          : complaints;

  // 4 Priority counts inside the clicked status
  const countCritical = activeList.filter(isVeryHighPriority).length;
  const countHigh = activeList.filter(isHighPriority).length;
  const countMedium = activeList.filter(isMediumPriority).length;
  const countLow = activeList.filter(isLowPriority).length;

  const getStatusMeta = (key: StatusKey | null) => {
    switch (key) {
      case 'pending':
        return {
          title: isHindi ? 'लंबित' : 'Pending',
          color: '#DC2626',
          bgLight: '#FEF2F2',
          borderColor: '#DC2626',
        };
      case 'in-progress':
        return {
          title: isHindi ? 'प्रगति में' : 'In Progress',
          color: COLORS.warning,
          bgLight: '#FFFBEB',
          borderColor: COLORS.warning,
        };
      case 'resolved':
        return {
          title: isHindi ? 'निस्तारित' : 'Resolved',
          color: COLORS.success,
          bgLight: '#F0FDF4',
          borderColor: COLORS.success,
        };
      default:
        return {
          title: isHindi ? 'कुल शिकायतें' : 'Total Grievances',
          color: COLORS.primary,
          bgLight: '#EFF6FF',
          borderColor: COLORS.primary,
        };
    }
  };

  const currentMeta = getStatusMeta(selectedStatus);

  // Reusable 2x2 Box Tile matching the exact original design
  const Tile = ({
    icon,
    iconColor,
    iconBg,
    count,
    label,
    onPress,
    isSelected = false,
    selectedBorderColor = COLORS.primary,
    selectedBg = '#EFF6FF',
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    count: number;
    label: string;
    onPress: () => void;
    isSelected?: boolean;
    selectedBorderColor?: string;
    selectedBg?: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        isSelected && {
          borderColor: selectedBorderColor,
          borderWidth: 2,
          backgroundColor: selectedBg,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.categoryIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.countText}>{count}</Text>
      <Text style={styles.categoryText} numberOfLines={1}>
        {label}
      </Text>
      {isSelected && (
        <View style={[styles.activeIndicatorDot, { backgroundColor: selectedBorderColor }]} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* =================================================
          1. 2x2 MAIN STATUS BOXES
          (Total, Pending, In Progress, Resolved)
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
          {/* 1. TOTAL GRIEVANCES */}
          <Tile
            icon="document-text-outline"
            iconColor={COLORS.primary}
            iconBg={COLORS.primaryLight}
            count={complaints.length}
            label={isHindi ? 'कुल शिकायतें' : 'Total Grievances'}
            isSelected={selectedStatus === 'all'}
            selectedBorderColor={COLORS.primary}
            selectedBg="#EFF6FF"
            onPress={() => handleStatusClick('all')}
          />

          {/* 2. PENDING */}
          <Tile
            icon="alert-circle-outline"
            iconColor="#DC2626"
            iconBg="#FEE2E2"
            count={pendingList.length}
            label={isHindi ? 'लंबित' : 'Pending'}
            isSelected={selectedStatus === 'pending'}
            selectedBorderColor="#DC2626"
            selectedBg="#FEF2F2"
            onPress={() => handleStatusClick('pending')}
          />

          {/* 3. IN PROGRESS */}
          <Tile
            icon="time-outline"
            iconColor={COLORS.warning}
            iconBg={COLORS.warningLight}
            count={inProgressList.length}
            label={isHindi ? 'प्रगति में' : 'In Progress'}
            isSelected={selectedStatus === 'in-progress'}
            selectedBorderColor={COLORS.warning}
            selectedBg="#FFFBEB"
            onPress={() => handleStatusClick('in-progress')}
          />

          {/* 4. RESOLVED */}
          <Tile
            icon="checkmark-circle-outline"
            iconColor={COLORS.success}
            iconBg={COLORS.successLight}
            count={resolvedList.length}
            label={isHindi ? 'निस्तारित' : 'Resolved'}
            isSelected={selectedStatus === 'resolved'}
            selectedBorderColor={COLORS.success}
            selectedBg="#F0FDF4"
            onPress={() => handleStatusClick('resolved')}
          />
        </View>
      </View>

      {/* =================================================
          2. CLICKED BOX PRIORITY SECTION (2x2 BOXES GRID)
          When any of the 4 boxes is clicked, this 2x2 grid opens
      ================================================= */}
      {selectedStatus !== null && (
        <View style={{ marginTop: 12 }}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                {isHindi
                  ? `${currentMeta.title} - प्राथमिकता`
                  : `${currentMeta.title} - Priority`}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: currentMeta.bgLight }]}>
                <Text style={[styles.countBadgeText, { color: currentMeta.color }]}>
                  {activeList.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => onSelectFilter?.(selectedStatus)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: currentMeta.color }]}>
                {isHindi ? 'सभी देखें →' : 'View All →'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.problemCard}>
            <View style={styles.categoryGrid}>
              {/* 1. CRITICAL */}
              <Tile
                icon="alert-circle-outline"
                iconColor={COLORS.error}
                iconBg={COLORS.errorLight}
                count={countCritical}
                label={isHindi ? 'अति गंभीर' : 'Critical'}
                onPress={() => onSelectFilter?.(selectedStatus, 'priority-very-high')}
              />

              {/* 2. HIGH */}
              <Tile
                icon="flame-outline"
                iconColor={COLORS.saffron}
                iconBg={COLORS.accentLight}
                count={countHigh}
                label={isHindi ? 'उच्च' : 'High Priority'}
                onPress={() => onSelectFilter?.(selectedStatus, 'priority-high')}
              />

              {/* 3. MEDIUM */}
              <Tile
                icon="time-outline"
                iconColor={COLORS.warning}
                iconBg={COLORS.warningLight}
                count={countMedium}
                label={isHindi ? 'मध्यम' : 'Medium'}
                onPress={() => onSelectFilter?.(selectedStatus, 'priority-medium')}
              />

              {/* 4. LOW */}
              <Tile
                icon="checkmark-circle-outline"
                iconColor={COLORS.success}
                iconBg={COLORS.successLight}
                count={countLow}
                label={isHindi ? 'सामान्य' : 'Low Priority'}
                onPress={() => onSelectFilter?.(selectedStatus, 'priority-low')}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },

  // Section Header
  sectionHeader: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: TYPOGRAPHY.bold,
  },

  // ProblemCard Container (2x2 Grid wrapper)
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
    minHeight: 74,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    position: 'relative',
  },

  activeIndicatorDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },

  countText: {
    fontSize: 16,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    marginVertical: 0,
  },

  categoryText: {
    fontSize: 10.5,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
