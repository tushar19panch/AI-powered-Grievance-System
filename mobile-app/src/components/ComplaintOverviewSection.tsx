import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

import {
  isVeryHighPriority,
  isHighPriority,
  isMediumPriority,
  isLowPriority,
  isDuplicateClassification,
  isFakeClassification,
  isNeedsVerificationClassification,
  isGenuineClassification,
  ComplaintFilterItem,
} from '../services/complaintClassification';

interface ComplaintItem extends ComplaintFilterItem {
  complaintId?: string | number;
  id?: string | number;
  category?: string;
}

interface ComplaintOverviewSectionProps {
  complaints?: ComplaintItem[];
  onSelectFilter?: (filterKey: string) => void;
  isHindi?: boolean;
}

export function ComplaintOverviewSection({
  complaints = [],
  onSelectFilter,
  isHindi = false,
}: ComplaintOverviewSectionProps) {
  // =====================================================
  // DYNAMIC PRIORITY COUNTS CALCULATION (GENUINE QUEUES)
  // =====================================================
  const countVeryHigh = complaints.filter(isVeryHighPriority).length;
  const countHigh = complaints.filter(isHighPriority).length;
  const countMedium = complaints.filter(isMediumPriority).length;
  const countLow = complaints.filter(isLowPriority).length;

  // =====================================================
  // DYNAMIC CLASSIFICATION COUNTS CALCULATION
  // =====================================================
  const countGenuine = complaints.filter(isGenuineClassification).length;
  const countDuplicate = complaints.filter(isDuplicateClassification).length;
  const countFake = complaints.filter(isFakeClassification).length;
  const countNeedsVerification = complaints.filter(isNeedsVerificationClassification).length;

  const Tile = ({
    icon,
    iconColor,
    iconBg,
    count,
    label,
    filterKey,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    iconBg: string;
    count: number;
    label: string;
    filterKey: string;
  }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => onSelectFilter?.(filterKey)}
      activeOpacity={0.82}
    >
      <View style={[styles.categoryIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.countText}>{count}</Text>
      <Text style={styles.categoryText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* =================================================
          1. PRIORITY SECTION (2X2 GRID)
      ================================================= */}
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {isHindi ? 'शिकायत प्राथमिकता (Priority)' : 'Complaint Priority'}
          </Text>
        </View>
      </View>

      <View style={styles.problemCard}>
        <View style={styles.categoryGrid}>
          <Tile
            icon="alert-circle-outline"
            iconColor={COLORS.error}
            iconBg={COLORS.errorLight}
            count={countVeryHigh}
            label={isHindi ? 'अति गंभीर' : 'Critical'}
            filterKey="priority-very-high"
          />

          <Tile
            icon="flame-outline"
            iconColor={COLORS.saffron}
            iconBg={COLORS.accentLight}
            count={countHigh}
            label={isHindi ? 'उच्च' : 'High Priority'}
            filterKey="priority-high"
          />

          <Tile
            icon="time-outline"
            iconColor={COLORS.warning}
            iconBg={COLORS.warningLight}
            count={countMedium}
            label={isHindi ? 'मध्यम' : 'Medium'}
            filterKey="priority-medium"
          />

          <Tile
            icon="checkmark-circle-outline"
            iconColor={COLORS.success}
            iconBg={COLORS.successLight}
            count={countLow}
            label={isHindi ? 'सामान्य' : 'Low Priority'}
            filterKey="priority-low"
          />
        </View>
      </View>

      {/* =================================================
          2. CLASSIFICATION SECTION (2X2 GRID)
      ================================================= */}
      <View style={[styles.sectionHeader, { marginTop: 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {isHindi ? 'वर्गीकरण (Classification)' : 'Classification'}
          </Text>
        </View>
      </View>

      <View style={styles.problemCard}>
        <View style={styles.categoryGrid}>
          <Tile
            icon="shield-checkmark-outline"
            iconColor={COLORS.success}
            iconBg={COLORS.successLight}
            count={countGenuine}
            label={isHindi ? 'वास्तविक' : 'Genuine'}
            filterKey="class-genuine"
          />

          <Tile
            icon="copy-outline"
            iconColor={COLORS.info}
            iconBg={COLORS.infoLight}
            count={countDuplicate}
            label={isHindi ? 'डुप्लीकेट' : 'Duplicate'}
            filterKey="class-duplicate"
          />

          <Tile
            icon="close-circle-outline"
            iconColor={COLORS.textSecondary}
            iconBg={COLORS.primaryLight}
            count={countFake}
            label={isHindi ? 'अमान्य' : 'Fake / Invalid'}
            filterKey="class-fake"
          />

          <Tile
            icon="help-circle-outline"
            iconColor="#9333EA"
            iconBg="#F3E8FF"
            count={countNeedsVerification}
            label={isHindi ? 'सत्यापन योग्य' : 'Needs Verify'}
            filterKey="class-verification"
          />
        </View>
      </View>
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
