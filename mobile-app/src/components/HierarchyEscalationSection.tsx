import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';
import { escalationApi } from '../services/api';

export interface HierarchyEscalationProps {
  complaint: {
    complaintId: string;
    rawId?: number | string;
    priority?: string;
    status?: string;
    deadline?: string | null;
    escalationLevel?: number;
    currentAuthority?: string;
    escalatedAt?: string;
    escalationReason?: string;
    daysRemaining?: number | null;
  };
  userRole?: 'citizen' | 'sarpanch' | 'secretary' | 'bdo' | 'dm' | string;
  isHindi: boolean;
  onEscalateSuccess?: () => void;
}

export function HierarchyEscalationSection({
  complaint,
  userRole = 'citizen',
  isHindi,
  onEscalateSuccess,
}: HierarchyEscalationProps) {
  const [escalating, setEscalating] = useState(false);

  const escalationLevel = Number(complaint.escalationLevel || 1);
  const priority = String(complaint.priority || 'MEDIUM').toUpperCase();
  const status = String(complaint.status || '').toUpperCase();
  const isResolvedOrClosed = status === 'RESOLVED' || status === 'CLOSED';

  // Calculate days remaining fallback if not provided by backend
  let remainingDays: number | null = complaint.daysRemaining !== undefined && complaint.daysRemaining !== null
    ? complaint.daysRemaining
    : null;

  if (remainingDays === null && complaint.deadline) {
    try {
      const deadlineDate = new Date(complaint.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      deadlineDate.setHours(0, 0, 0, 0);
      const diffMs = deadlineDate.getTime() - today.getTime();
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      remainingDays = null;
    }
  }

  const isOverdue = remainingDays !== null && remainingDays < 0 && !isResolvedOrClosed;
  const isToday = remainingDays === 0 && !isResolvedOrClosed;
  const isUrgent = (remainingDays !== null && remainingDays <= 1) || priority === 'CRITICAL' || priority === 'VERY_HIGH';

  // SLA standards
  const getSlaStandardText = () => {
    if (priority === 'CRITICAL' || priority === 'VERY_HIGH') {
      return isHindi ? '24 घंटे (अति गंभीर - तत्काल समाधान)' : '24 Hours (Critical Emergency SLA)';
    }
    if (priority === 'HIGH') {
      return isHindi ? '48 घंटे (उच्च प्राथमिकता)' : '48 Hours (High Priority SLA)';
    }
    if (priority === 'LOW') {
      return isHindi ? '7 दिन (सामान्य प्राथमिकता)' : '7 Days (Standard SLA)';
    }
    return isHindi ? '4 दिन (मध्यम प्राथमिकता)' : '4 Days (Medium Priority SLA)';
  };

  // Next level determination
  const nextTierName = escalationLevel === 1
    ? (isHindi ? 'प्रखंड विकास पदाधिकारी (BDO)' : 'Block Development Officer (BDO)')
    : (isHindi ? 'जिला प्रशासन (DM / कलेक्टर)' : 'District Magistrate (DM / Collector)');

  const handleManualEscalation = () => {
    const rawId = complaint.rawId || complaint.complaintId;
    if (!rawId) return;

    Alert.alert(
      isHindi ? 'उच्च स्तर पर एस्केलेट करें?' : 'Escalate to Higher Authority?',
      isHindi
        ? `क्या आप इस शिकायत को ${nextTierName} के समक्ष त्वरित प्रशासनिक कार्रवाई हेतु अग्रेषित करना चाहते हैं?`
        : `Do you want to escalate this grievance to ${nextTierName} for expedited action?`,
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'हाँ, एस्केलेट करें' : 'Yes, Escalate',
          style: 'destructive',
          onPress: async () => {
            try {
              setEscalating(true);
              const reason = isHindi
                ? (isOverdue ? 'नागरिक द्वारा SLA समय सीमा बीतने पर एस्केलेशन' : 'नागरिक द्वारा त्वरित समाधान हेतु एस्केलेशन')
                : (isOverdue ? 'Citizen escalation due to SLA deadline breach' : 'Citizen manual escalation request');

              await escalationApi.escalateComplaint(Number(rawId), reason);

              Alert.alert(
                isHindi ? 'सफलतापूर्वक एस्केलेट किया गया' : 'Escalation Successful',
                isHindi
                  ? `शिकायत अब स्तर ${escalationLevel + 1} (${nextTierName}) को प्रेषित हो गई है। संबंधित अधिकारी को अधिसूचना भेज दी गई है।`
                  : `Complaint has been successfully transferred to Tier ${escalationLevel + 1} (${nextTierName}). Notification dispatched.`
              );

              if (onEscalateSuccess) {
                onEscalateSuccess();
              }
            } catch (err: any) {
              Alert.alert(
                isHindi ? 'एस्केलेशन त्रुटि' : 'Escalation Error',
                err?.message || (isHindi ? 'एस्केलेशन असफल रहा। कृपया पुनः प्रयास करें।' : 'Failed to escalate grievance.')
              );
            } finally {
              setEscalating(false);
            }
          },
        },
      ]
    );
  };

  const tiers = [
    {
      level: 1,
      titleHi: 'स्तर 1: ग्राम पंचायत',
      titleEn: 'Tier 1: Gram Panchayat',
      officerHi: 'सरपंच एवं ग्राम सचिव',
      officerEn: 'Sarpanch & Secretary',
      slaHi: priority === 'CRITICAL' ? '24 घंटे' : priority === 'HIGH' ? '2 दिन' : '4-7 दिन',
      slaEn: priority === 'CRITICAL' ? '24h' : priority === 'HIGH' ? '2 days' : '4-7 days',
      icon: 'business-outline' as const,
    },
    {
      level: 2,
      titleHi: 'स्तर 2: प्रखंड (ब्लॉक)',
      titleEn: 'Tier 2: Block (Taluka)',
      officerHi: 'प्रखंड विकास पदाधिकारी (BDO)',
      officerEn: 'Block Development Officer (BDO)',
      slaHi: '+24h से 3 दिन अतिरिक्त',
      slaEn: '+24h to 3 days ext.',
      icon: 'layers-outline' as const,
    },
    {
      level: 3,
      titleHi: 'स्तर 3: जिला प्रशासन',
      titleEn: 'Tier 3: District Apex',
      officerHi: 'जिला अधिकारी (DM / ZP)',
      officerEn: 'District Magistrate (DM / ZP)',
      slaHi: 'सर्वोच्च निगरानी (5 दिन)',
      slaEn: 'Apex Review (5 days)',
      icon: 'shield-checkmark-outline' as const,
    },
  ];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerIconBadge}>
          <Ionicons name="git-network-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {isHindi ? 'त्रिस्तरीय प्रशासनिक निवारण प्रणाली' : '3-Tier Governance Hierarchy'}
          </Text>
          <Text style={styles.cardSubTitle}>
            {isHindi ? 'सख्त नागरिक अधिकार पत्र (Citizen Charter SLA)' : 'Strict Citizen Charter SLA & Auto-Transfer'}
          </Text>
        </View>
      </View>

      {/* 3-Tier Visual Stepper */}
      <View style={styles.stepperContainer}>
        {tiers.map((tier, idx) => {
          const isCurrent = escalationLevel === tier.level;
          const isCompleted = escalationLevel > tier.level;
          const isPending = escalationLevel < tier.level;

          return (
            <View key={tier.level} style={styles.tierStepWrapper}>
              <View style={styles.stepIndicatorRow}>
                {/* Node Circle */}
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCompleted,
                    isCurrent && styles.nodeCurrent,
                    isPending && styles.nodePending,
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : isCurrent ? (
                    <Ionicons name="radio-button-on" size={16} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.nodeNumber}>{tier.level}</Text>
                  )}
                </View>

                {/* Connecting Line (for all except last) */}
                {idx < tiers.length - 1 && (
                  <View
                    style={[
                      styles.connectingLine,
                      isCompleted && styles.connectingLineActive,
                    ]}
                  />
                )}
              </View>

              {/* Step Info */}
              <View
                style={[
                  styles.tierCard,
                  isCurrent && styles.tierCardActive,
                  isCompleted && styles.tierCardCompleted,
                ]}
              >
                <View style={styles.tierTopRow}>
                  <Text
                    style={[
                      styles.tierTitle,
                      isCurrent && styles.tierTitleActive,
                      isCompleted && styles.tierTitleCompleted,
                    ]}
                  >
                    {isHindi ? tier.titleHi : tier.titleEn}
                  </Text>

                  {isCurrent && (
                    <View style={styles.activePill}>
                      <View style={styles.pulsingDot} />
                      <Text style={styles.activePillText}>
                        {isHindi ? 'वर्तमान प्राधिकारी' : 'Active Authority'}
                      </Text>
                    </View>
                  )}

                  {isCompleted && (
                    <View style={styles.completedPill}>
                      <Ionicons name="checkmark-done" size={12} color="#15803D" />
                      <Text style={styles.completedPillText}>
                        {isHindi ? 'उच्च स्तर पर प्रेषित' : 'Transferred'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.tierDetailRow}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={isCurrent ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.tierOfficer, isCurrent && { fontWeight: '700', color: COLORS.textPrimary }]}>
                    {isHindi ? tier.officerHi : tier.officerEn}
                  </Text>
                </View>

                <View style={styles.tierSlaRow}>
                  <Ionicons name="timer-outline" size={13} color="#64748B" />
                  <Text style={styles.tierSlaText}>
                    {isHindi ? `समय सीमा: ${tier.slaHi}` : `SLA Limit: ${tier.slaEn}`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* SLA Live Timer & Status Countdown Box */}
      <View
        style={[
          styles.slaCountdownBox,
          isOverdue
            ? styles.slaBoxOverdue
            : isUrgent
            ? styles.slaBoxUrgent
            : styles.slaBoxNormal,
        ]}
      >
        <View style={styles.slaTopLine}>
          <View
            style={[
              styles.slaIconBadge,
              isOverdue
                ? { backgroundColor: '#FEE2E2' }
                : isUrgent
                ? { backgroundColor: '#FFEDD5' }
                : { backgroundColor: '#E0F2FE' },
            ]}
          >
            <Ionicons
              name={isOverdue ? 'alert-circle' : isUrgent ? 'time' : 'hourglass-outline'}
              size={18}
              color={isOverdue ? '#DC2626' : isUrgent ? '#EA580C' : '#0284C7'}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.slaStatusTitle,
                isOverdue
                  ? { color: '#B91C1C' }
                  : isUrgent
                  ? { color: '#C2410C' }
                  : { color: '#0369A1' },
              ]}
            >
              {isResolvedOrClosed
                ? (isHindi ? 'समाधान पूर्ण (SLA Redressal Completed)' : 'SLA Redressal Completed')
                : isOverdue
                ? (isHindi ? '🚨 समय सीमा समाप्त (Overdue)' : '🚨 SLA Time Limit Breached (Overdue)')
                : isToday
                ? (isHindi ? '⚠️ आज अंतिम दिन (Deadline Today)' : '⚠️ Action Required Today')
                : priority === 'CRITICAL'
                ? (isHindi ? '⚡ 24 घंटे आपातकालीन समय सीमा' : '⚡ 24 Hours Emergency SLA')
                : (isHindi ? `⏳ निवारण हेतु शेष: ${remainingDays} दिन` : `⏳ Time Remaining: ${remainingDays} days`)}
            </Text>

            <Text style={styles.slaStandardNote}>
              {isHindi ? `मानक समय सीमा: ${getSlaStandardText()}` : `Charter SLA: ${getSlaStandardText()}`}
            </Text>
          </View>
        </View>

        {/* Informative SLA Context for Citizens and Officials */}
        {!isResolvedOrClosed && (
          <View style={styles.slaDescRow}>
            <Text style={styles.slaDescText}>
              {escalationLevel === 1
                ? isOverdue
                  ? (isHindi
                      ? 'ग्राम पंचायत स्तर पर निर्धारित समय सीमा पार हो चुकी है। यह शिकायत अब प्रखंड (BDO) के अधिकार क्षेत्र में जाने योग्य है।'
                      : 'Gram Panchayat deadline has lapsed. This grievance is now eligible for Block (BDO) intervention.')
                  : (isHindi
                      ? 'वर्तमान में यह समस्या सरपंच एवं सचिव की निगरानी में है। समय सीमा बीतने पर यह स्वतः BDO को ट्रांसफर हो जाएगी।'
                      : 'Currently with Sarpanch & Secretary. If not resolved in time, it auto-transfers to BDO.')
                : escalationLevel === 2
                ? (isHindi
                    ? 'यह मामला ग्राम स्तर से एस्केलेट होकर प्रखंड विकास पदाधिकारी (BDO) के पास विचाराधीन है।'
                    : 'Escalated from Panchayat; currently under Block Development Officer (BDO) review.')
                : (isHindi
                    ? 'सर्वोच्च स्तर: यह शिकायत जिला दंडाधिकारी (DM) एवं जिला पंचायत की उच्च स्तरीय समीक्षा में है।'
                    : 'Apex Level: Under District Magistrate (DM) supreme administrative supervision.')}
            </Text>
          </View>
        )}

        {/* Escalation History Note */}
        {Boolean(complaint.escalationReason) && (
          <View style={styles.escalationHistoryBox}>
            <Ionicons name="information-circle" size={15} color="#D97706" />
            <Text style={styles.escalationHistoryText}>
              <Text style={{ fontWeight: '700' }}>
                {isHindi ? 'एस्केलेशन विवरण: ' : 'Escalation Note: '}
              </Text>
              {complaint.escalationReason}
            </Text>
          </View>
        )}
      </View>

      {/* Warning for Sarpanch / Secretary on nearing deadline */}
      {(userRole === 'sarpanch' || userRole === 'secretary') && !isResolvedOrClosed && escalationLevel === 1 && isUrgent && (
        <View style={styles.officialWarningBox}>
          <Ionicons name="warning" size={20} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.officialWarningTitle}>
              {isHindi ? '⚠️ पंचायत स्तर पर कार्रवाई आवश्यक' : '⚠️ Immediate Panchayat Action Required'}
            </Text>
            <Text style={styles.officialWarningSub}>
              {isHindi
                ? 'यदि इस शिकायत का निवारण 24 घंटे में नहीं हुआ, तो यह सीधे प्रखंड विकास पदाधिकारी (BDO) को एस्केलेट हो जाएगी।'
                : 'If not redressed within 24h, this grievance will automatically escalate to the Block Development Officer (BDO).'}
            </Text>
          </View>
        </View>
      )}

      {/* Manual Escalation CTA Button for Citizen */}
      {userRole === 'citizen' && !isResolvedOrClosed && escalationLevel < 3 && (
        <TouchableOpacity
          style={[
            styles.escalateBtn,
            isOverdue ? styles.escalateBtnUrgent : styles.escalateBtnNormal,
            escalating && { opacity: 0.7 },
          ]}
          onPress={handleManualEscalation}
          disabled={escalating}
          activeOpacity={0.85}
        >
          {escalating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={isOverdue ? 'rocket' : 'trending-up'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.escalateBtnText}>
                {isHindi
                  ? `${nextTierName} को एस्केलेट करें`
                  : `Escalate to ${escalationLevel === 1 ? 'BDO (Block Officer)' : 'District Magistrate (DM)'}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.normal,
    marginBottom: SPACING.normal,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardSubTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  /* Stepper */
  stepperContainer: {
    marginVertical: 4,
  },
  tierStepWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: 10,
  },
  stepIndicatorRow: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: '#16A34A',
  },
  nodeCurrent: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#93C5FD',
  },
  nodePending: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  nodeNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  connectingLine: {
    width: 2,
    height: 64,
    backgroundColor: '#E2E8F0',
    position: 'absolute',
    top: 28,
    zIndex: 1,
  },
  connectingLineActive: {
    backgroundColor: '#86EFAC',
  },

  /* Tier Step Card */
  tierCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tierCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1.5,
  },
  tierCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  tierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tierTitleActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  tierTitleCompleted: {
    color: '#15803D',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  completedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  tierDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tierOfficer: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tierSlaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  tierSlaText: {
    fontSize: 11,
    color: '#64748B',
  },

  /* SLA Countdown Box */
  slaCountdownBox: {
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  slaBoxNormal: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  slaBoxUrgent: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  slaBoxOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  slaTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slaIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slaStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  slaStandardNote: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  slaDescRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  slaDescText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  escalationHistoryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  escalationHistoryText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },

  /* Official Warning */
  officialWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 8,
  },
  officialWarningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  officialWarningSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },

  /* Escalate Button */
  escalateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
    ...SHADOWS.small,
  },
  escalateBtnNormal: {
    backgroundColor: COLORS.primary,
  },
  escalateBtnUrgent: {
    backgroundColor: '#DC2626',
  },
  escalateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
