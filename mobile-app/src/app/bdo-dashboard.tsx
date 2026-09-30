import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';
import { complaintApi, escalationApi, ComplaintData, authApi } from '../services/api';
import { DashboardBottomBar } from '../components/DashboardBottomBar';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';

export default function BdoDashboardScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [bdoProfile, setBdoProfile] = useState<{
    name: string;
    mobile: string;
    block: string;
    officialId: string;
  }>({
    name: 'श्री आलोक वर्मा',
    mobile: '9876543213',
    block: 'शाहपुर प्रखंड (Shahpur Block)',
    officialId: 'BDO-001',
  });

  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'overdue' | 'resolved'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Action Modal State
  const [actionTicket, setActionTicket] = useState<ComplaintData | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'notice' | 'escalate_dm' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Load BDO Profile from Storage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const rawSession = await AsyncStorage.getItem('user_session');
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session.name) {
            setBdoProfile({
              name: session.name || 'श्री आलोक वर्मा',
              mobile: session.mobile || '9876543213',
              block: session.block || session.village || 'शाहपुर प्रखंड (Shahpur Block)',
              officialId: session.officialId || 'BDO-001',
            });
          }
        }
      } catch (err) {
        console.log('Error loading BDO profile session:', err);
      }
    };
    loadSession();
  }, []);

  // Load Complaints for Tier 2 (BDO Level)
  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);
      // Try to fetch complaints explicitly escalated to Tier 2
      let tierComplaints: ComplaintData[] = [];
      try {
        tierComplaints = await escalationApi.getByTier(2);
      } catch (e) {
        console.log('Error fetching tier 2 complaints:', e);
      }

      // If empty, also check general sarpanch/official complaints list and filter
      if (!tierComplaints || tierComplaints.length === 0) {
        try {
          const allList = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(allList)) {
            tierComplaints = allList.filter(
              (c) => c.escalationLevel === 2 || String(c.currentAuthority || '').toUpperCase() === 'BDO'
            );
          }
        } catch (allErr) {
          console.log('Fallback list fetch error:', allErr);
        }
      }

      setComplaints(tierComplaints || []);
    } catch (err) {
      console.log('Unable to load BDO complaints:', err);
      setComplaints([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadComplaints();
  };

  const handleLogout = async () => {
    Alert.alert(
      isHindi ? 'लॉग आउट' : 'Logout',
      isHindi ? 'क्या आप BDO पोर्टल से बाहर निकलना चाहते हैं?' : 'Do you want to log out from BDO portal?',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'लॉग आउट' : 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authApi.logout();
            await AsyncStorage.clear();
            router.replace('/role-selection');
          },
        },
      ]
    );
  };

  // Actions
  const handlePerformAction = async () => {
    if (!actionTicket) return;
    const ticketId = actionTicket.id;

    try {
      setActionSubmitting(true);

      if (actionType === 'resolve') {
        const remarks = actionRemarks.trim() || 'प्रखंड विकास कार्यालय द्वारा मौके पर तकनीकी टीम भेजकर समस्या का निस्तारण किया गया।';
        await complaintApi.updateStatus(ticketId, 'RESOLVED', remarks);
        Alert.alert(
          isHindi ? 'सफल निस्तारण' : 'Resolution Saved',
          isHindi ? `शिकायत #${ticketId} का निस्तारण BDO स्तर पर दर्ज कर दिया गया है।` : `Grievance #${ticketId} resolved successfully.`
        );
      } else if (actionType === 'notice') {
        const noticeText = actionRemarks.trim() || 'ग्राम पंचायत स्तर पर समय पर कार्रवाई न किए जाने के संबंध में स्पष्टीकरण नोटिस जारी किया गया।';
        await complaintApi.updateStatus(ticketId, 'IN_PROGRESS', `[BDO नोटिस]: ${noticeText}`);
        Alert.alert(
          isHindi ? 'नोटिस प्रेषित' : 'Notice Issued',
          isHindi ? `ग्राम पंचायत (सरपंच/सचिव) को औपचारिक नोटिस प्रेषित कर दिया गया है।` : 'Formal inquiry notice issued to Gram Panchayat.'
        );
      } else if (actionType === 'escalate_dm') {
        const reason = actionRemarks.trim() || 'प्रखंड स्तर से ऊपर का नीतिगत/अंतर-विभागीय मामला। जिलाधिकारी के समक्ष प्रेषित।';
        await escalationApi.escalateComplaint(ticketId, reason);
        Alert.alert(
          isHindi ? 'जिलाधिकारी (DM) को प्रेषित' : 'Escalated to DM',
          isHindi ? `शिकायत #${ticketId} सर्वोच्च जिला समीक्षा (Tier 3) हेतु DM कार्यालय को प्रेषित कर दी गई है।` : `Transferred to DM Apex Office (Tier 3).`
        );
      }

      setActionTicket(null);
      setActionType(null);
      setActionRemarks('');
      loadComplaints();
    } catch (err: any) {
      Alert.alert(isHindi ? 'कार्रवाई त्रुटि' : 'Action Error', err?.message || 'Failed to complete action');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Metrics
  const totalEscalated = complaints.length;
  const criticalCount = complaints.filter(
    (c) => String(c.priority || '').toUpperCase().includes('CRITICAL') || String(c.priority || '').toUpperCase().includes('VERY')
  ).length;
  const overdueCount = complaints.filter(
    (c) => c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining <= 0
  ).length;
  const resolvedCount = complaints.filter(
    (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
  ).length;

  // Filtered List
  const filteredList = complaints.filter((c) => {
    if (filter === 'critical') {
      return String(c.priority || '').toUpperCase().includes('CRITICAL') || String(c.priority || '').toUpperCase().includes('VERY');
    }
    if (filter === 'overdue') {
      return c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining <= 0;
    }
    if (filter === 'resolved') {
      return c.status === 'RESOLVED' || c.status === 'CLOSED';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Tricolor Strip */}
      <View style={styles.tricolorBar}>
        <View style={styles.saffronStripe} />
        <View style={styles.whiteStripe} />
        <View style={styles.greenStripe} />
      </View>

      {/* Main Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.govtSealBadge}>
            <Ionicons name="business" size={24} color="#1E3A8A" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.tierTag}>
              <Text style={styles.tierTagText}>
                {isHindi ? 'प्रशासनिक स्तर 2 • प्रखंड (Block)' : 'Governance Tier 2 • Block Level'}
              </Text>
            </View>
            <Text style={styles.officeTitle}>
              {isHindi ? 'प्रखंड विकास कार्यालय' : 'Block Development Office'}
            </Text>
            <Text style={styles.officerName}>
              {bdoProfile.name} • <Text style={{ color: '#2563EB', fontWeight: '700' }}>{bdoProfile.officialId}</Text>
            </Text>
            <Text style={styles.blockJurisdiction}>
              📍 {bdoProfile.block}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setLanguage(isHindi ? 'en' : 'hi')}
              activeOpacity={0.8}
            >
              <Text style={styles.langBtnText}>{isHindi ? 'EN' : 'हि'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 2x2 Overview Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Total Escalated */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'all' && styles.metricCardActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="layers" size={20} color="#1D4ED8" />
            </View>
            <Text style={styles.metricNumber}>{totalEscalated}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'ब्लॉक एस्केलेटेड' : 'Block Escalated'}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Critical Emergency */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'critical' && styles.metricCardActive]}
            onPress={() => setFilter('critical')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="flame" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.metricNumber, { color: '#DC2626' }]}>{criticalCount}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? '24h आपातकाल' : 'Critical 24h'}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Overdue */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'overdue' && styles.metricCardActive]}
            onPress={() => setFilter('overdue')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="time" size={20} color="#EA580C" />
            </View>
            <Text style={[styles.metricNumber, { color: '#EA580C' }]}>{overdueCount}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'समय सीमा समाप्त' : 'Overdue SLA'}
            </Text>
          </TouchableOpacity>

          {/* Card 4: Resolved */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'resolved' && styles.metricCardActive]}
            onPress={() => setFilter('resolved')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-done" size={20} color="#15803D" />
            </View>
            <Text style={[styles.metricNumber, { color: '#15803D' }]}>{resolvedCount}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'ब्लॉक निस्तारित' : 'BDO Resolved'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading & Filter Bar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isHindi ? 'प्रखंड क्षेत्राधिकार शिकायतें' : 'Escalated Complaints Queue'}
          </Text>
          <Text style={styles.sectionBadge}>
            {filteredList.length} {isHindi ? 'प्रकरण' : 'Cases'}
          </Text>
        </View>

        {/* Complaints List */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>
              {isHindi ? 'प्रखंड शिकायतें लोड हो रही हैं...' : 'Loading Block cases...'}
            </Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="shield-checkmark" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई लंबित प्रकरण नहीं है' : 'No Pending Block Cases'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'वर्तमान में ग्राम पंचायतों से प्रखंड स्तर पर कोई भी लंबित एस्केलेशन नहीं है।'
                : 'No pending escalated grievances requiring BDO intervention.'}
            </Text>
          </View>
        ) : (
          filteredList.map((item) => {
            const isCritical = String(item.priority || '').toUpperCase().includes('CRITICAL');
            const isBreached = item.daysRemaining !== null && item.daysRemaining !== undefined && item.daysRemaining <= 0;

            return (
              <View key={item.id} style={styles.ticketCard}>
                {/* Header Strip */}
                <View style={styles.ticketHeaderRow}>
                  <View style={styles.ticketIdBadge}>
                    <Text style={styles.ticketIdText}>#{item.id}</Text>
                  </View>

                  <View style={[styles.priorityPill, isCritical ? styles.priorityPillCritical : styles.priorityPillNormal]}>
                    <Ionicons name={isCritical ? 'flame' : 'alert-circle'} size={12} color={isCritical ? '#DC2626' : '#D97706'} />
                    <Text style={[styles.priorityPillText, { color: isCritical ? '#DC2626' : '#B45309' }]}>
                      {item.priority || 'MEDIUM'}
                    </Text>
                  </View>

                  <View style={styles.tierPill}>
                    <Text style={styles.tierPillText}>Tier 2: BDO</Text>
                  </View>
                </View>

                {/* Village & Location */}
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color="#1E3A8A" />
                  <Text style={styles.locationText}>
                    {item.villageName ? `${item.villageName}` : ''} {item.wardNumber ? `(Ward ${item.wardNumber})` : ''} - {item.location}
                  </Text>
                </View>

                {/* Problem Description */}
                <Text style={styles.problemTitle}>{item.category || item.problemType}</Text>
                <Text style={styles.problemDesc} numberOfLines={3}>
                  {item.description}
                </Text>

                {/* Escalation Reason Callout */}
                <View style={styles.escalationCallout}>
                  <Ionicons name="information-circle" size={16} color="#B45309" />
                  <Text style={styles.escalationCalloutText}>
                    <Text style={{ fontWeight: '700' }}>{isHindi ? 'एस्केलेशन कारण: ' : 'Escalation Reason: '}</Text>
                    {item.escalationReason || (isHindi ? 'ग्राम पंचायत स्तर पर समय सीमा बीतने के कारण स्वतः प्रखंड कार्यालय को प्रेषित।' : 'Auto-escalated due to Gram Panchayat deadline breach.')}
                  </Text>
                </View>

                {/* SLA Timer Bar */}
                <View style={[styles.slaBar, isBreached ? styles.slaBarBreached : styles.slaBarActive]}>
                  <Ionicons name={isBreached ? 'alert-circle' : 'timer'} size={14} color={isBreached ? '#DC2626' : '#0284C7'} />
                  <Text style={[styles.slaBarText, isBreached ? { color: '#B91C1C' } : { color: '#0369A1' }]}>
                    {isBreached
                      ? (isHindi ? '🚨 प्रखंड SLA समय सीमा समाप्त (Overdue)' : '🚨 Block SLA Deadline Breached')
                      : item.daysRemaining !== null
                      ? (isHindi ? `⏳ BDO निवारण समय: ${item.daysRemaining} दिन शेष` : `⏳ Block SLA: ${item.daysRemaining} days remaining`)
                      : (isHindi ? '⏳ प्रखंड स्तर पर कार्रवाई जारी' : '⏳ Action in progress at Block level')}
                  </Text>
                </View>

                {/* Photo Preview Thumbnail if available */}
                {Boolean(item.photo) && (
                  <TouchableOpacity
                    style={styles.photoThumbRow}
                    onPress={() => setSelectedPhoto(item.photo || null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={16} color="#1E3A8A" />
                    <Text style={styles.photoThumbText}>
                      {isHindi ? 'संलग्न फोटो देखें (View Evidence)' : 'View Attached Photo'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Officer Action Buttons */}
                <View style={styles.actionBtnGrid}>
                  {/* Action 1: Resolve */}
                  <TouchableOpacity
                    style={[styles.officerBtn, styles.btnResolve]}
                    onPress={() => {
                      setActionTicket(item);
                      setActionType('resolve');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                    <Text style={styles.officerBtnText}>
                      {isHindi ? 'निस्तारण करें' : 'Resolve'}
                    </Text>
                  </TouchableOpacity>

                  {/* Action 2: Notice to Panchayat */}
                  <TouchableOpacity
                    style={[styles.officerBtn, styles.btnNotice]}
                    onPress={() => {
                      setActionTicket(item);
                      setActionType('notice');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="document-text" size={15} color="#FFFFFF" />
                    <Text style={styles.officerBtnText}>
                      {isHindi ? 'नोटिस भेजें' : 'Issue Notice'}
                    </Text>
                  </TouchableOpacity>

                  {/* Action 3: Escalate to DM */}
                  <TouchableOpacity
                    style={[styles.officerBtn, styles.btnEscalateDm]}
                    onPress={() => {
                      setActionTicket(item);
                      setActionType('escalate_dm');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" />
                    <Text style={styles.officerBtnText}>
                      {isHindi ? 'DM को भेजें' : 'Escalate DM'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Action Modal */}
      {Boolean(actionTicket && actionType) && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons
                name={
                  actionType === 'resolve'
                    ? 'checkmark-circle'
                    : actionType === 'notice'
                    ? 'document-text'
                    : 'shield-checkmark'
                }
                size={24}
                color={
                  actionType === 'resolve'
                    ? '#16A34A'
                    : actionType === 'notice'
                    ? '#D97706'
                    : '#7E22CE'
                }
              />
              <Text style={styles.modalTitle}>
                {actionType === 'resolve'
                  ? (isHindi ? 'प्रखंड स्तरीय निस्तारण दर्ज करें' : 'Record Block Resolution')
                  : actionType === 'notice'
                  ? (isHindi ? 'ग्राम पंचायत को स्पष्टीकरण नोटिस' : 'Issue Show-Cause Notice')
                  : (isHindi ? 'जिलाधिकारी (DM) को अग्रिम एस्केलेशन' : 'Escalate to District Magistrate (DM)')}
              </Text>
            </View>

            <Text style={styles.modalSub}>
              {isHindi
                ? `शिकायत #${actionTicket?.id} के संदर्भ में आधिकारिक प्रशासनिक टिप्पणी दर्ज करें:`
                : `Enter official administrative remarks for Grievance #${actionTicket?.id}:`}
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder={
                actionType === 'resolve'
                  ? (isHindi ? 'निस्तारण विवरण एवं मौके पर की गई कार्रवाई दर्ज करें...' : 'Enter resolution details...')
                  : actionType === 'notice'
                  ? (isHindi ? 'कारण बताओ नोटिस एवं समय सीमा का विवरण दर्ज करें...' : 'Enter notice details...')
                  : (isHindi ? 'DM को एस्केलेट करने का प्रशासनिक कारण लिखें...' : 'Reason for escalating to DM...')
              }
              value={actionRemarks}
              onChangeText={setActionRemarks}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setActionTicket(null);
                  setActionType(null);
                  setActionRemarks('');
                }}
                disabled={actionSubmitting}
              >
                <Text style={styles.modalCancelText}>{isHindi ? 'रद्द करें' : 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  actionType === 'resolve'
                    ? { backgroundColor: '#15803D' }
                    : actionType === 'notice'
                    ? { backgroundColor: '#D97706' }
                    : { backgroundColor: '#7E22CE' },
                  actionSubmitting && { opacity: 0.7 },
                ]}
                onPress={handlePerformAction}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {isHindi ? 'पुष्टि व निष्पादन' : 'Confirm Action'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        visible={Boolean(selectedPhoto)}
        imageUri={selectedPhoto}
        userName={isHindi ? 'प्रखंड शिकायत साक्ष्य फोटो' : 'Block Evidence Photo'}
        userRole={isHindi ? 'स्तर 2 जांच' : 'Tier 2 Inspection'}
        onClose={() => setSelectedPhoto(null)}
        isHindi={isHindi}
      />

      {/* Bottom Navigation */}
      <DashboardBottomBar activeTab="home" role="bdo" isHindi={isHindi} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  tricolorBar: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  saffronStripe: { flex: 1, backgroundColor: '#FF9933' },
  whiteStripe: { flex: 1, backgroundColor: '#FFFFFF' },
  greenStripe: { flex: 1, backgroundColor: '#138808' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  govtSealBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  tierTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  officeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  officerName: {
    fontSize: 13,
    color: '#334155',
  },
  blockJurisdiction: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },

  /* 2x2 Overview Metrics */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  metricCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#E2E8F0',
    color: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },

  /* Ticket Card */
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ticketIdBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketIdText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  priorityPillCritical: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  priorityPillNormal: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tierPill: {
    marginLeft: 'auto',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  problemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  problemDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },

  escalationCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginBottom: 8,
  },
  escalationCalloutText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },

  slaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 10,
  },
  slaBarActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
  },
  slaBarBreached: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  slaBarText: {
    fontSize: 11,
    fontWeight: '700',
  },

  photoThumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  photoThumbText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '700',
  },

  actionBtnGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  officerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
    ...SHADOWS.small,
  },
  btnResolve: {
    backgroundColor: '#15803D',
  },
  btnNotice: {
    backgroundColor: '#D97706',
  },
  btnEscalateDm: {
    backgroundColor: '#7E22CE',
  },
  officerBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* Action Modal */
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
