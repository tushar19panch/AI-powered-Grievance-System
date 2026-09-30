import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

export default function DmDashboardScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [dmProfile, setDmProfile] = useState<{
    name: string;
    mobile: string;
    district: string;
    officialId: string;
  }>({
    name: 'श्रीमती नेहा शर्मा, IAS',
    mobile: '9876543214',
    district: 'इंदौर जिला (Indore District)',
    officialId: 'DM-001',
  });

  const [complaints, setComplaints] = useState<ComplaintData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'overdue' | 'resolved'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Administrative Action Modal State
  const [actionTicket, setActionTicket] = useState<ComplaintData | null>(null);
  const [actionType, setActionType] = useState<'resolve' | 'show_cause' | 'task_force' | null>(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Load DM Profile from Storage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const rawSession = await AsyncStorage.getItem('user_session');
        if (rawSession) {
          const session = JSON.parse(rawSession);
          if (session.name) {
            setDmProfile({
              name: session.name || 'श्रीमती नेहा शर्मा, IAS',
              mobile: session.mobile || '9876543214',
              district: session.district || session.village || 'इंदौर जिला (Indore District)',
              officialId: session.officialId || 'DM-001',
            });
          }
        }
      } catch (err) {
        console.log('Error loading DM profile session:', err);
      }
    };
    loadSession();
  }, []);

  // Load Complaints for Tier 3 (DM / District Level)
  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);
      let tierComplaints: ComplaintData[] = [];
      try {
        tierComplaints = await escalationApi.getByTier(3);
      } catch (e) {
        console.log('Error fetching tier 3 complaints:', e);
      }

      // If empty, also check general complaints list and filter
      if (!tierComplaints || tierComplaints.length === 0) {
        try {
          const allList = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(allList)) {
            tierComplaints = allList.filter(
              (c) => c.escalationLevel === 3 || String(c.currentAuthority || '').toUpperCase().includes('DISTRICT')
            );
          }
        } catch (allErr) {
          console.log('Fallback list fetch error:', allErr);
        }
      }

      setComplaints(tierComplaints || []);
    } catch (err) {
      console.log('Unable to load DM complaints:', err);
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
      isHindi ? 'क्या आप डीएम पोर्टल से बाहर निकलना चाहते हैं?' : 'Do you want to log out from DM portal?',
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

  // Execute Administrative Apex Orders
  const handlePerformAction = async () => {
    if (!actionTicket) return;
    const ticketId = actionTicket.id;

    try {
      setActionSubmitting(true);

      if (actionType === 'resolve') {
        const remarks = actionRemarks.trim() || 'जिलाधिकारी के प्रत्यक्ष हस्तक्षेप एवं विशेष जांच दल की संस्तुति पर अंतिम निस्तारण संपन्न।';
        await complaintApi.updateStatus(ticketId, 'CLOSED', remarks);
        Alert.alert(
          isHindi ? 'सर्वोच्च निस्तारण दर्ज' : 'Apex Resolution Complete',
          isHindi ? `शिकायत #${ticketId} का प्रत्यक्ष जिला समाधान दर्ज किया गया और टिकट क्लोज किया गया।` : `Grievance #${ticketId} resolved & closed by DM.`
        );
      } else if (actionType === 'show_cause') {
        const noticeText = actionRemarks.trim() || 'ब्लॉक एवं पंचायत स्तर पर घोर लापरवाही के संबंध में संबंधित अधिकारियों को 48 घंटे का दंडात्मक शो-कॉज नोटिस जारी।';
        await complaintApi.updateStatus(ticketId, 'IN_PROGRESS', `[DM दंडात्मक शो-कॉज नोटिस]: ${noticeText}`);
        Alert.alert(
          isHindi ? 'शो-कॉज नोटिस प्रेषित' : 'Show-Cause Sanction Issued',
          isHindi ? `संबंधित बीडीओ एवं ग्राम पंचायत को आधिकारिक शो-कॉज नोटिस जारी कर दिया गया है।` : 'Formal show-cause inquiry order dispatched.'
        );
      } else if (actionType === 'task_force') {
        const orderText = actionRemarks.trim() || 'विशेष जिला इंजीनियरिंग एवं जांच दल (District Task Force) को 24 घंटे में मौके पर जाकर कार्रवाई का आदेश।';
        await complaintApi.updateStatus(ticketId, 'IN_PROGRESS', `[DM टास्क फोर्स आदेश]: ${orderText}`);
        Alert.alert(
          isHindi ? 'टास्क फोर्स तैनात' : 'Task Force Deployed',
          isHindi ? `विशेष जांच दल को मौके पर निस्तारण का निर्देश जारी कर दिया गया है।` : 'District Task Force mobilized for field resolution.'
        );
      }

      setActionTicket(null);
      setActionType(null);
      setActionRemarks('');
      loadComplaints();
    } catch (err: any) {
      Alert.alert(isHindi ? 'आदेश त्रुटि' : 'Order Execution Error', err?.message || 'Failed to execute DM order');
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
          <View style={styles.apexSealBadge}>
            <Ionicons name="shield-checkmark" size={26} color="#7F1D1D" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.tierTag}>
              <Text style={styles.tierTagText}>
                {isHindi ? 'प्रशासनिक स्तर 3 • सर्वोच्च जिला (Apex Authority)' : 'Governance Tier 3 • District Apex'}
              </Text>
            </View>
            <Text style={styles.officeTitle}>
              {isHindi ? 'कार्यालय जिलाधिकारी एवं कलेक्टर' : 'Office of District Magistrate & Collector'}
            </Text>
            <Text style={styles.officerName}>
              {dmProfile.name} • <Text style={{ color: '#991B1B', fontWeight: '700' }}>{dmProfile.officialId}</Text>
            </Text>
            <Text style={styles.districtJurisdiction}>
              🏛️ {dmProfile.district}
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
          {/* Card 1: Apex District Tickets */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'all' && styles.metricCardActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#991B1B" />
            </View>
            <Text style={styles.metricNumber}>{totalEscalated}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'जिला एस्केलेटेड' : 'District Escalated'}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Critical Emergency */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'critical' && styles.metricCardActive]}
            onPress={() => setFilter('critical')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flame" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.metricNumber, { color: '#DC2626' }]}>{criticalCount}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'गंभीर रेड अलर्ट' : 'Critical Alerts'}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Overdue */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'overdue' && styles.metricCardActive]}
            onPress={() => setFilter('overdue')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="alert-circle" size={20} color="#EA580C" />
            </View>
            <Text style={[styles.metricNumber, { color: '#EA580C' }]}>{overdueCount}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'अति-विलंबित (Lapsed)' : 'SLA Breaches'}
            </Text>
          </TouchableOpacity>

          {/* Card 4: Resolved & Closed */}
          <TouchableOpacity
            style={[styles.metricCard, filter === 'resolved' && styles.metricCardActive]}
            onPress={() => setFilter('resolved')}
            activeOpacity={0.85}
          >
            <View style={[styles.metricIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="ribbon" size={20} color="#15803D" />
            </View>
            <Text style={[styles.metricNumber, { color: '#15803D' }]}>{resolvedCount}</Text>
            <Text style={styles.metricLabel}>
              {isHindi ? 'सर्वोच्च निस्तारित' : 'Apex Closed'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Heading & Filter Bar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isHindi ? 'सर्वोच्च जिला समीक्षा प्रकोष्ठ' : 'Apex District Review Queue'}
          </Text>
          <Text style={styles.sectionBadge}>
            {filteredList.length} {isHindi ? 'प्रकरण' : 'Cases'}
          </Text>
        </View>

        {/* Complaints List */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#7F1D1D" />
            <Text style={styles.loadingText}>
              {isHindi ? 'जिला समीक्षा प्रकरण लोड हो रहे हैं...' : 'Loading District Apex cases...'}
            </Text>
          </View>
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई सर्वोच्च एस्केलेशन लंबित नहीं है' : 'No Pending District Escalations'}
            </Text>
            <Text style={styles.emptySub}>
              {isHindi
                ? 'सभी ब्लॉक एवं ग्राम पंचायत स्तर की शिकायतें समय सीमा के भीतर हैं। जिला स्तर पर कोई लंबित गंभीर प्रकरण नहीं है।'
                : 'All lower tier grievances are redressed within SLA. No apex district escalations pending.'}
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
                    <Ionicons name={isCritical ? 'flame' : 'alert-circle'} size={12} color={isCritical ? '#DC2626' : '#991B1B'} />
                    <Text style={[styles.priorityPillText, { color: isCritical ? '#DC2626' : '#7F1D1D' }]}>
                      {item.priority || 'MEDIUM'}
                    </Text>
                  </View>

                  <View style={styles.tierPill}>
                    <Text style={styles.tierPillText}>Tier 3: DM Apex</Text>
                  </View>
                </View>

                {/* Village & Location */}
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color="#7F1D1D" />
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
                  <Ionicons name="warning" size={16} color="#B91C1C" />
                  <Text style={styles.escalationCalloutText}>
                    <Text style={{ fontWeight: '700' }}>{isHindi ? 'सर्वोच्च एस्केलेशन कारण: ' : 'Apex Escalation Reason: '}</Text>
                    {item.escalationReason || (isHindi ? 'ग्राम पंचायत एवं ब्लॉक (BDO) दोनों स्तरों पर समय सीमा का उल्लंघन। DM समीक्षा अनिवार्य।' : 'Breached SLA across both Panchayat and Block levels.')}
                  </Text>
                </View>

                {/* SLA Timer Bar */}
                <View style={[styles.slaBar, isBreached ? styles.slaBarBreached : styles.slaBarActive]}>
                  <Ionicons name={isBreached ? 'alert-circle' : 'timer'} size={14} color={isBreached ? '#DC2626' : '#7E22CE'} />
                  <Text style={[styles.slaBarText, isBreached ? { color: '#B91C1C' } : { color: '#6B21A8' }]}>
                    {isBreached
                      ? (isHindi ? '🚨 सर्वोच्च SLA उल्लंघन (Critical Apex Breach)' : '🚨 Apex SLA Deadline Breached')
                      : item.daysRemaining !== null
                      ? (isHindi ? `⏳ DM विशेष समीक्षा समय: ${item.daysRemaining} दिन शेष` : `⏳ Apex SLA: ${item.daysRemaining} days remaining`)
                      : (isHindi ? '⏳ जिलाधिकारी कार्यालय द्वारा विशेष निगरानी' : '⏳ Under DM Apex Supervision')}
                  </Text>
                </View>

                {/* Photo Preview Thumbnail if available */}
                {Boolean(item.photo) && (
                  <TouchableOpacity
                    style={styles.photoThumbRow}
                    onPress={() => setSelectedPhoto(item.photo || null)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="image-outline" size={16} color="#7F1D1D" />
                    <Text style={styles.photoThumbText}>
                      {isHindi ? 'संलग्न साक्ष्य फोटो देखें (View Evidence)' : 'View Attached Evidence'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* DM Sovereign Administrative Actions */}
                <View style={styles.actionBtnGrid}>
                  {/* Action 1: Show Cause */}
                  <TouchableOpacity
                    style={[styles.officerBtn, styles.btnShowCause]}
                    onPress={() => {
                      setActionTicket(item);
                      setActionType('show_cause');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="alert-circle" size={14} color="#FFFFFF" />
                    <Text style={styles.officerBtnText}>
                      {isHindi ? 'दंडात्मक नोटिस' : 'Show-Cause'}
                    </Text>
                  </TouchableOpacity>

                  {/* Action 2: Task Force */}
                  <TouchableOpacity
                    style={[styles.officerBtn, styles.btnTaskForce]}
                    onPress={() => {
                      setActionTicket(item);
                      setActionType('task_force');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="people" size={14} color="#FFFFFF" />
                    <Text style={styles.officerBtnText}>
                      {isHindi ? 'टास्क फोर्स' : 'Task Force'}
                    </Text>
                  </TouchableOpacity>

                  {/* Action 3: Final Resolution & Closure */}
                  <TouchableOpacity
                    style={[styles.officerBtn, styles.btnDirectResolve]}
                    onPress={() => {
                      setActionTicket(item);
                      setActionType('resolve');
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
                    <Text style={styles.officerBtnText}>
                      {isHindi ? 'अंतिम समाधान' : 'Resolve & Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* DM Administrative Action Modal */}
      {Boolean(actionTicket && actionType) && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons
                name={
                  actionType === 'resolve'
                    ? 'checkmark-done-circle'
                    : actionType === 'show_cause'
                    ? 'alert-circle'
                    : 'people'
                }
                size={24}
                color={
                  actionType === 'resolve'
                    ? '#16A34A'
                    : actionType === 'show_cause'
                    ? '#DC2626'
                    : '#2563EB'
                }
              />
              <Text style={styles.modalTitle}>
                {actionType === 'resolve'
                  ? (isHindi ? 'जिलाधिकारी द्वारा अंतिम समाधान व क्लोजर' : 'Apex Direct Resolution & Closure')
                  : actionType === 'show_cause'
                  ? (isHindi ? 'दंडात्मक शो-कॉज व विभागीय आदेश' : 'Issue Disciplinary Show-Cause Order')
                  : (isHindi ? 'जिला विशेष टास्क फोर्स तैनाती आदेश' : 'Deploy District Task Force Order')}
              </Text>
            </View>

            <Text style={styles.modalSub}>
              {isHindi
                ? `प्रकरण #${actionTicket?.id} के संदर्भ में जिलाधिकारी आदेश दर्ज करें:`
                : `Enter District Magistrate Order for Case #${actionTicket?.id}:`}
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder={
                actionType === 'resolve'
                  ? (isHindi ? 'अंतिम समाधान का विवरण एवं संतुष्टि रिपोर्ट...' : 'Enter apex resolution notes...')
                  : actionType === 'show_cause'
                  ? (isHindi ? 'लापरवाह अधिकारियों के विरुद्ध आदेशित दंडात्मक नोटिस...' : 'Show-cause inquiry instructions...')
                  : (isHindi ? 'टास्क फोर्स टीम लीडर व 24h समय सीमा निर्देश...' : 'Task force deployment instructions...')
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
                    : actionType === 'show_cause'
                    ? { backgroundColor: '#DC2626' }
                    : { backgroundColor: '#2563EB' },
                  actionSubmitting && { opacity: 0.7 },
                ]}
                onPress={handlePerformAction}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {isHindi ? 'आदेश जारी करें' : 'Issue Order'}
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
        userName={isHindi ? 'जिलाधिकारी समीक्षा साक्ष्य फोटो' : 'District Apex Evidence Photo'}
        userRole={isHindi ? 'स्तर 3 सर्वोच्च जांच' : 'Tier 3 Apex Review'}
        onClose={() => setSelectedPhoto(null)}
        isHindi={isHindi}
      />

      {/* Bottom Navigation */}
      <DashboardBottomBar activeTab="home" role="dm" isHindi={isHindi} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  apexSealBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  tierTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 2,
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
  },
  officeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  officerName: {
    fontSize: 13,
    color: '#334155',
  },
  districtJurisdiction: {
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
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7F1D1D',
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
    borderColor: '#991B1B',
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
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
    backgroundColor: '#7F1D1D',
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
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tierPill: {
    marginLeft: 'auto',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
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
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginBottom: 8,
  },
  escalationCalloutText: {
    fontSize: 11,
    color: '#991B1B',
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
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
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
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  photoThumbText: {
    fontSize: 12,
    color: '#7F1D1D',
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
  btnShowCause: {
    backgroundColor: '#DC2626',
  },
  btnTaskForce: {
    backgroundColor: '#1E3A8A',
  },
  btnDirectResolve: {
    backgroundColor: '#15803D',
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
