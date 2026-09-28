import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface ComplaintItem {
  complaintId?: string | number;
  id?: string | number;
  status?: string;
  priority?: string;
  classification?: string;
  category?: string;
  description?: string;
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
  // GENUINE DYNAMIC PRIORITY COUNTS CALCULATION
  // =====================================================
  const countVeryHigh = complaints.filter((c) => {
    const p = String(c.priority || '').toUpperCase();
    const desc = String(c.description || '').toLowerCase();
    return (
      p === 'VERY_HIGH' ||
      p === 'VERY HIGH' ||
      p === 'CRITICAL' ||
      p === 'URGENT' ||
      desc.includes('आपातकालीन') ||
      desc.includes('खतरा') ||
      desc.includes('urgent') ||
      desc.includes('critical')
    );
  }).length;

  const countHigh = complaints.filter((c) => {
    const p = String(c.priority || '').toUpperCase();
    const desc = String(c.description || '').toLowerCase();
    const isVeryHigh =
      p === 'VERY_HIGH' ||
      p === 'VERY HIGH' ||
      p === 'CRITICAL' ||
      p === 'URGENT' ||
      desc.includes('आपातकालीन') ||
      desc.includes('खतरा') ||
      desc.includes('urgent') ||
      desc.includes('critical');
    if (isVeryHigh) return false;
    return (
      p === 'HIGH' ||
      desc.includes('गंभीर') ||
      desc.includes('भारी') ||
      desc.includes('severe')
    );
  }).length;

  const countLow = complaints.filter((c) => {
    const p = String(c.priority || '').toUpperCase();
    return p === 'LOW';
  }).length;

  const countMedium = complaints.filter((c) => {
    const p = String(c.priority || '').toUpperCase();
    const desc = String(c.description || '').toLowerCase();
    const isVeryHigh =
      p === 'VERY_HIGH' ||
      p === 'VERY HIGH' ||
      p === 'CRITICAL' ||
      p === 'URGENT' ||
      desc.includes('आपातकालीन') ||
      desc.includes('खतरा') ||
      desc.includes('urgent') ||
      desc.includes('critical');
    const isHigh =
      p === 'HIGH' ||
      desc.includes('गंभीर') ||
      desc.includes('भारी') ||
      desc.includes('severe');
    const isLow = p === 'LOW';
    return !isVeryHigh && !isHigh && !isLow;
  }).length;

  // =====================================================
  // GENUINE DYNAMIC AI CLASSIFICATION COUNTS CALCULATION
  // =====================================================
  const countDuplicate = complaints.filter((c) => {
    const cl = String(c.classification || '').toUpperCase();
    return cl === 'DUPLICATE' || cl === 'COPIED';
  }).length;

  const countFake = complaints.filter((c) => {
    const cl = String(c.classification || '').toUpperCase();
    const desc = String(c.description || '').toLowerCase();
    return (
      cl === 'FAKE' ||
      cl === 'INVALID' ||
      cl === 'SPAM' ||
      desc.includes('test complaint') ||
      desc.includes('fake') ||
      desc.includes('spam')
    );
  }).length;

  const countNeedsVerification = complaints.filter((c) => {
    const cl = String(c.classification || '').toUpperCase();
    const st = String(c.status || '').toUpperCase();
    const desc = String(c.description || '').toLowerCase();
    const isFake =
      cl === 'FAKE' ||
      cl === 'INVALID' ||
      cl === 'SPAM' ||
      desc.includes('test complaint') ||
      desc.includes('fake') ||
      desc.includes('spam');
    const isDup = cl === 'DUPLICATE' || cl === 'COPIED';
    if (isFake || isDup) return false;
    return (
      cl === 'NEEDS_VERIFICATION' ||
      cl === 'VERIFICATION' ||
      st === 'VERIFICATION' ||
      st === 'UNDER_REVIEW' ||
      st === 'UNDER REVIEW'
    );
  }).length;

  const countGenuine = complaints.filter((c) => {
    const cl = String(c.classification || '').toUpperCase();
    const st = String(c.status || '').toUpperCase();
    const desc = String(c.description || '').toLowerCase();
    const isFake =
      cl === 'FAKE' ||
      cl === 'INVALID' ||
      cl === 'SPAM' ||
      desc.includes('test complaint') ||
      desc.includes('fake') ||
      desc.includes('spam');
    const isDup = cl === 'DUPLICATE' || cl === 'COPIED';
    const isVerify =
      cl === 'NEEDS_VERIFICATION' ||
      cl === 'VERIFICATION' ||
      st === 'VERIFICATION' ||
      st === 'UNDER_REVIEW' ||
      st === 'UNDER REVIEW';
    return !isFake && !isDup && !isVerify;
  }).length;

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  const handlePress = (filterKey: string) => {
    if (onSelectFilter) {
      onSelectFilter(filterKey);
    }
  };

  // Action Tile matching Panchayat Services CategoryCard (Compact Size)
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
      onPress={() => handlePress(filterKey)}
      activeOpacity={0.82}
    >
      <View style={[styles.categoryIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.countText}>{formatNumber(count)}</Text>
      <Text style={styles.categoryText} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* =================================================
          1. PRIORITY SECTION (GENUINE PANCHAYAT DATA)
      ================================================= */}
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {isHindi ? 'प्राथमिकता स्तर (Priority)' : 'Complaint Priority'}
          </Text>
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            {isHindi ? 'गंभीरता अनुसार शिकायतों का वर्गीकरण' : 'Grievance severity breakdown'}
          </Text>
        </View>

        <View style={[styles.aiBadge, { flexShrink: 0 }]}>
          <Ionicons
            name="alert-circle-outline"
            size={12}
            color={COLORS.primary}
          />
          <Text style={styles.aiText}>
            {isHindi ? 'प्राथमिकता' : 'PRIORITY'}
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
            label={isHindi ? 'अति गंभीर' : 'Very High'}
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
          2. AI CLASSIFICATION SECTION (GENUINE PANCHAYAT DATA)
      ================================================= */}
      <View style={[styles.sectionHeader, { marginTop: 14 }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            {isHindi ? 'AI वर्गीकरण (Classification)' : 'AI Classification'}
          </Text>
          <Text style={styles.sectionSubtitle} numberOfLines={1}>
            {isHindi ? 'वास्तविक, डुप्लीकेट व सत्यापन स्थिति' : 'Genuine, duplicate & verification status'}
          </Text>
        </View>

        <View style={[styles.aiBadge, { flexShrink: 0 }]}>
          <Ionicons
            name="scan-outline"
            size={12}
            color={COLORS.primary}
          />
          <Text style={styles.aiText}>
            {isHindi ? 'AI वर्गीकरण' : 'CLASSIFICATION'}
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

  // Section Header (Compact)
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
  sectionSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: COLORS.textMuted,
  },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.primary,
  },

  // ProblemCard Container (Compact)
  problemCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  // 2-Column Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },

  // CategoryCard Tile (Smaller & Compact)
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

  // CategoryIcon (Smaller & Compact)
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
