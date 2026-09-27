import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

interface ComplaintItem {
  complaintId?: string | number;
  id?: string | number;
  status?: string;
  priority?: string;
  classification?: string;
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
  const hasComplaints = complaints.length > 0;

  // Calculate Priority Counts (with fallback to mockup demo values)
  const countVeryHigh = hasComplaints
    ? complaints.filter((c) => {
        const p = String(c.priority || '').toUpperCase();
        return p === 'VERY_HIGH' || p === 'VERY HIGH' || p === 'CRITICAL' || p === 'URGENT';
      }).length
    : 3;

  const countHigh = hasComplaints
    ? complaints.filter((c) => String(c.priority || '').toUpperCase() === 'HIGH').length
    : 9;

  const countMedium = hasComplaints
    ? complaints.filter((c) => {
        const p = String(c.priority || '').toUpperCase();
        return p === 'MEDIUM' || p === 'NORMAL' || (!c.priority && c.status !== 'RESOLVED');
      }).length
    : 21;

  const countLow = hasComplaints
    ? complaints.filter((c) => String(c.priority || '').toUpperCase() === 'LOW').length
    : 10;

  // Calculate Classification Counts (with fallback to mockup demo values)
  const countGenuine = hasComplaints
    ? complaints.filter((c) => {
        const cl = String(c.classification || '').toUpperCase();
        return cl === 'GENUINE' || cl === 'REAL' || (!cl && String(c.status || '').toUpperCase() !== 'CLOSED');
      }).length
    : 32;

  const countDuplicate = hasComplaints
    ? complaints.filter((c) => {
        const cl = String(c.classification || '').toUpperCase();
        return cl === 'DUPLICATE' || cl === 'COPIED';
      }).length
    : 8;

  const countFake = hasComplaints
    ? complaints.filter((c) => {
        const cl = String(c.classification || '').toUpperCase();
        return cl === 'FAKE' || cl === 'INVALID' || cl === 'SPAM';
      }).length
    : 2;

  const countNeedsVerification = hasComplaints
    ? complaints.filter((c) => {
        const cl = String(c.classification || '').toUpperCase();
        const st = String(c.status || '').toUpperCase();
        return cl === 'NEEDS_VERIFICATION' || cl === 'VERIFICATION' || st === 'VERIFICATION' || st === 'UNDER_REVIEW';
      }).length
    : 5;

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  const handlePress = (filterKey: string) => {
    if (onSelectFilter) {
      onSelectFilter(filterKey);
    }
  };

  return (
    <View style={styles.container}>
      {/* =================================================
          MAIN SECTION TITLE: COMPLAINT OVERVIEW / शिकायतों का अवलोकन
      ================================================= */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.mainTitle}>
            {isHindi ? 'शिकायतों का अवलोकन' : 'COMPLAINT OVERVIEW'}
          </Text>
          <Text style={styles.subTitle}>
            {isHindi ? 'गाँव की शिकायतों का प्राथमिकता व AI वर्गीकरण' : 'Priority & AI Classification Breakdown'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="pie-chart" size={18} color={COLORS.primary} />
        </View>
      </View>

      {/* =================================================
          SUBSECTION 1: 🚨 PRIORITY
      ================================================= */}
      <View style={styles.subSectionHeader}>
        <View style={styles.subSectionTitleRow}>
          <Text style={styles.subSectionEmoji}>🚨</Text>
          <Text style={styles.subSectionTitle}>
            {isHindi ? 'प्राथमिकता (PRIORITY)' : 'PRIORITY'}
          </Text>
        </View>
        <View style={styles.subSectionLine} />
      </View>

      {/* 2x2 Grid for PRIORITY */}
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          {/* 🔴 VERY HIGH */}
          <TouchableOpacity
            style={[styles.card, styles.cardVeryHigh]}
            onPress={() => handlePress('priority-very-high')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.cardLabel, { color: '#B91C1C' }]}>
                {isHindi ? '🔴 अति गंभीर' : '🔴 VERY HIGH'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#991B1B' }]}>
              {formatNumber(countVeryHigh)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'तत्काल कार्रवाई' : 'Immediate'}
            </Text>
          </TouchableOpacity>

          {/* 🟠 HIGH */}
          <TouchableOpacity
            style={[styles.card, styles.cardHigh]}
            onPress={() => handlePress('priority-high')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
              <Text style={[styles.cardLabel, { color: '#C2410C' }]}>
                {isHindi ? '🟠 उच्च' : '🟠 HIGH'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#9A3412' }]}>
              {formatNumber(countHigh)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'उच्च प्राथमिकता' : 'High Priority'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          {/* 🟡 MEDIUM */}
          <TouchableOpacity
            style={[styles.card, styles.cardMedium]}
            onPress={() => handlePress('priority-medium')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#EAB308' }]} />
              <Text style={[styles.cardLabel, { color: '#A16207' }]}>
                {isHindi ? '🟡 मध्यम' : '🟡 MEDIUM'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#854D0E' }]}>
              {formatNumber(countMedium)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'मानक समय' : 'Standard'}
            </Text>
          </TouchableOpacity>

          {/* 🟢 LOW */}
          <TouchableOpacity
            style={[styles.card, styles.cardLow]}
            onPress={() => handlePress('priority-low')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.cardLabel, { color: '#15803D' }]}>
                {isHindi ? '🟢 सामान्य' : '🟢 LOW'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#166534' }]}>
              {formatNumber(countLow)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'नियमित' : 'Routine'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================
          SUBSECTION 2: 🔎 CLASSIFICATION
      ================================================= */}
      <View style={[styles.subSectionHeader, { marginTop: 18 }]}>
        <View style={styles.subSectionTitleRow}>
          <Text style={styles.subSectionEmoji}>🔎</Text>
          <Text style={styles.subSectionTitle}>
            {isHindi ? 'वर्गीकरण (CLASSIFICATION)' : 'CLASSIFICATION'}
          </Text>
        </View>
        <View style={styles.subSectionLine} />
      </View>

      {/* 2x2 Grid for CLASSIFICATION */}
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.gridRow}>
          {/* 🟢 GENUINE */}
          <TouchableOpacity
            style={[styles.card, styles.cardGenuine]}
            onPress={() => handlePress('class-genuine')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.cardLabel, { color: '#047857' }]}>
                {isHindi ? '🟢 वास्तविक' : '🟢 GENUINE'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#065F46' }]}>
              {formatNumber(countGenuine)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'सत्यापित' : 'Verified'}
            </Text>
          </TouchableOpacity>

          {/* 🔵 DUPLICATE */}
          <TouchableOpacity
            style={[styles.card, styles.cardDuplicate]}
            onPress={() => handlePress('class-duplicate')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.cardLabel, { color: '#1D4ED8' }]}>
                {isHindi ? '🔵 डुप्लीकेट' : '🔵 DUPLICATE'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#1E40AF' }]}>
              {formatNumber(countDuplicate)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'समान समस्या' : 'Linked Copies'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          {/* ⚫ FAKE / INVALID */}
          <TouchableOpacity
            style={[styles.card, styles.cardFake]}
            onPress={() => handlePress('class-fake')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#475569' }]} />
              <Text style={[styles.cardLabel, { color: '#334155' }]}>
                {isHindi ? '⚫ अमान्य / फर्जी' : '⚫ FAKE / INVALID'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#1E293B' }]}>
              {formatNumber(countFake)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'अस्वीकृत' : 'Rejected'}
            </Text>
          </TouchableOpacity>

          {/* 🟣 NEEDS VERIFICATION */}
          <TouchableOpacity
            style={[styles.card, styles.cardVerification]}
            onPress={() => handlePress('class-verification')}
            activeOpacity={0.8}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={[styles.cardLabel, { color: '#6D28D9' }]}>
                {isHindi ? '🟣 सत्यापन' : '🟣 NEEDS VERIFICATION'}
              </Text>
            </View>
            <Text style={[styles.cardCount, { color: '#5B21B6' }]}>
              {formatNumber(countNeedsVerification)}
            </Text>
            <Text style={styles.cardFootnote}>
              {isHindi ? 'जाँच लंबित' : 'Pending AI Check'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 8,
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTextGroup: {
    flex: 1,
  },
  mainTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  subTitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  // Subsection Header
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  subSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSectionEmoji: {
    fontSize: 14,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  subSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 4,
  },

  // Grid
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Card Base
  card: {
    flex: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    ...SHADOWS.small,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardCount: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginVertical: 2,
  },
  cardFootnote: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // Priority Card Color Themes
  cardVeryHigh: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cardHigh: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  cardMedium: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },
  cardLow: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },

  // Classification Card Color Themes
  cardGenuine: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cardDuplicate: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  cardFake: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardVerification: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
});
