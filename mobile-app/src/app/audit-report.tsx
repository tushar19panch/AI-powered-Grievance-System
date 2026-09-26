import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { complaintApi } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

type Complaint = {
  complaintId?: string;
  citizenName?: string;
  ward?: string;
  category?: string | null;
  priority?: string | null;
  department?: string | null;
  deadline?: string | null;
  description?: string;
  photo?: string | null;
  location?: string | null;
  status?: string;
  dateTime?: string;
};

export default function AuditReportScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [villageName, setVillageName] = useState<string>('Gram Panchayat');
  const [officerName, setOfficerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);

      const adminData = await AsyncStorage.getItem('admin');
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const admin = adminData ? JSON.parse(adminData) : session;
      const role = String(session?.role || admin?.role || 'sarpanch').toLowerCase();

      if (admin?.village || session?.village) {
        setVillageName(admin?.village || session?.village);
      }

      if (admin?.name || session?.name) {
        setOfficerName(admin?.name || session?.name);
      }

      let loadedComplaints: Complaint[] = [];

      try {
        if (role === 'sarpanch' || role === 'secretary' || role === 'admin') {
          const apiData = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(apiData)) {
            const filtered = admin?.village && admin?.role !== 'SUPER_ADMIN'
              ? apiData.filter((c: any) => !c.villageName || c.villageName === admin.village)
              : apiData;

            loadedComplaints = filtered.map((item: any) => ({
              complaintId: item.complaintNumber || String(item.id),
              citizenName: item.citizenName || 'Citizen',
              ward: item.wardNumber ? `Ward ${item.wardNumber}` : item.location || '',
              category: item.category || item.problemType || 'Village Issue',
              priority: item.priority || 'MEDIUM',
              department: item.department || '',
              deadline: item.deadline || null,
              description: item.description || '',
              photo: item.photo || null,
              location: item.location || (item.villageName ? item.villageName : ''),
              status: item.status || 'SUBMITTED',
              dateTime: item.createdAt || new Date().toISOString(),
            }));
          }
        }
      } catch (apiErr) {
        console.log('Backend audit complaints fetch error:', apiErr);
      }

      loadedComplaints.sort((a, b) => {
        const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
        const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
        return dateB - dateA;
      });

      setComplaints(loadedComplaints);
    } catch (error) {
      console.log('Unable to load complaints:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const getTotal = () => complaints.length;
  const getResolved = () =>
    complaints.filter((i) => {
      const s = String(i.status || '').toUpperCase();
      return s === 'RESOLVED' || s === 'CLOSED';
    }).length;
  const getPending = () =>
    complaints.filter((i) => {
      const s = String(i.status || '').toUpperCase();
      return s === 'SUBMITTED' || s === 'UNDER REVIEW' || s === 'UNDER_REVIEW';
    }).length;
  const getInProgress = () =>
    complaints.filter((i) => {
      const s = String(i.status || '').toUpperCase();
      return (
        s === 'ACTION TAKEN' ||
        s === 'ACTION_TAKEN' ||
        s === 'IN PROGRESS' ||
        s === 'IN_PROGRESS'
      );
    }).length;

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  const escapeHtml = (val: unknown) =>
    String(val ?? 'N/A')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const buildAuditHtml = () => {
    const total = getTotal();
    const resolved = getResolved();
    const pending = getPending();
    const inProgress = getInProgress();
    const currentDate = formatDate(new Date().toISOString());

    const complaintRowsHtml = complaints
      .map(
        (c, idx) => `
        <tr>
          <td>#${escapeHtml(c.complaintId || idx + 1)}</td>
          <td>${escapeHtml(c.category || 'सामान्य')}</td>
          <td>${escapeHtml(c.ward || 'वार्ड 1')}</td>
          <td>${escapeHtml(c.description || '-')}</td>
          <td><strong>${escapeHtml(c.status || 'SUBMITTED')}</strong></td>
          <td>${escapeHtml(formatDate(c.dateTime))}</td>
        </tr>`
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Audit Report - ${escapeHtml(villageName)}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #1E293B; }
          .header { text-align: center; border-bottom: 2px solid #176B4D; padding-bottom: 12px; margin-bottom: 20px; }
          .app-title { font-size: 22px; font-weight: bold; color: #176B4D; margin: 0; }
          .report-title { font-size: 15px; color: #475569; margin-top: 5px; }
          .meta { font-size: 12px; color: #64748B; margin-top: 6px; }
          .stat-grid { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
          .stat-card { flex: 1; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #E2E8F0; }
          .stat-num { font-size: 20px; font-weight: bold; color: #0F172A; }
          .stat-lbl { font-size: 11px; color: #64748B; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #CBD5E1; padding: 8px 10px; text-align: left; }
          th { background: #EDF7F2; color: #176B4D; font-weight: bold; }
          .footer { margin-top: 25px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="app-title">🏛️ VillageApp • ग्राम पंचायत ऑडिट रिपोर्ट</div>
          <div class="report-title">Grievance Audit & Redressal Report • ${escapeHtml(villageName)}</div>
          <div class="meta">दिनांक: <strong>${escapeHtml(currentDate)}</strong> | प्राधिकृत: <strong>${escapeHtml(officerName || 'सरपंच / सचिव')}</strong></div>
        </div>

        <div class="stat-grid">
          <div class="stat-card" style="background:#F1F5F9;"><div class="stat-num">${total}</div><div class="stat-lbl">कुल शिकायतें</div></div>
          <div class="stat-card" style="background:#DCFCE7;"><div class="stat-num" style="color:#16A34A">${resolved}</div><div class="stat-lbl">हल की गई</div></div>
          <div class="stat-card" style="background:#FEF3C7;"><div class="stat-num" style="color:#D97706">${inProgress}</div><div class="stat-lbl">कार्रवाई में</div></div>
          <div class="stat-card" style="background:#FEE2E2;"><div class="stat-num" style="color:#DC2626">${pending}</div><div class="stat-lbl">लंबित</div></div>
        </div>

        <h3>शिकायत विवरण सूची (${total})</h3>
        ${
          complaints.length === 0
            ? '<p>कोई शिकायत उपलब्ध नहीं है।</p>'
            : `<table>
                <tr>
                  <th>आईडी</th>
                  <th>श्रेणी</th>
                  <th>वार्ड</th>
                  <th>विवरण</th>
                  <th>स्थिति</th>
                  <th>दिनांक</th>
                </tr>
                ${complaintRowsHtml}
              </table>`
        }

        <div class="footer">
          VillageApp Digital Governance System • आधिकारिक ग्राम पंचायत रिकॉर्ड हेतु स्वतः जनरेटेड
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintPdf = async () => {
    if (complaints.length === 0) {
      Alert.alert(isHindi ? 'कोई शिकायत नहीं' : 'No Complaints', isHindi ? 'रिपोर्ट हेतु कोई शिकायत उपलब्ध नहीं है।' : 'No complaints to generate report.');
      return;
    }
    try {
      setGenerating(true);
      const html = buildAuditHtml();
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Notice', e?.message || 'Print preview error.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    if (complaints.length === 0) {
      Alert.alert(isHindi ? 'कोई शिकायत नहीं' : 'No Complaints', isHindi ? 'रिपोर्ट हेतु कोई शिकायत उपलब्ध नहीं है।' : 'No complaints to generate report.');
      return;
    }
    try {
      setGenerating(true);
      const html = buildAuditHtml();
      const res = await Print.printToFileAsync({ html });
      if (res?.uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(res.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'VillageApp Audit Report',
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e: any) {
      console.log('Share error:', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'PDF ऑडिट रिपोर्ट' : 'PDF Audit Report'}
          </Text>
          <Text style={styles.headerSubtitle}>
            📍 {villageName} • {isHindi ? 'मासिक प्रगति समीक्षा' : 'Monthly Grievance Audit'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.languageButton}
          onPress={toggleLanguage}
          activeOpacity={0.8}
        >
          <Ionicons name="language" size={16} color="#FFFFFF" />
          <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SUMMARY STATS GRID */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="documents-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryNum}>{getTotal()}</Text>
            <Text style={styles.summaryLbl}>{isHindi ? 'कुल शिकायतें' : 'Total'}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.summaryNum, { color: '#16A34A' }]}>{getResolved()}</Text>
            <Text style={styles.summaryLbl}>{isHindi ? 'हल हुई' : 'Resolved'}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="sync-outline" size={20} color="#D97706" />
            </View>
            <Text style={[styles.summaryNum, { color: '#D97706' }]}>{getInProgress()}</Text>
            <Text style={styles.summaryLbl}>{isHindi ? 'कार्रवाई में' : 'In Progress'}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="time-outline" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.summaryNum, { color: '#DC2626' }]}>{getPending()}</Text>
            <Text style={styles.summaryLbl}>{isHindi ? 'लंबित' : 'Pending'}</Text>
          </View>
        </View>

        {/* PDF ACTION BUTTONS */}
        <View style={styles.actionCard}>
          <Text style={styles.actionCardTitle}>
            {isHindi ? 'आधिकारिक ऑडिट रिपोर्ट निर्यात करें' : 'Export Official Audit Report'}
          </Text>
          <Text style={styles.actionCardDesc}>
            {isHindi
              ? 'ग्राम पंचायत की शिकायतों का पूर्ण विवरण PDF रूप में डाउनलोड या शेयर करें।'
              : 'Download or share full grievance audit report with official Panchayat stamp format.'}
          </Text>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, generating && styles.btnDisabled]}
              onPress={handlePrintPdf}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>{isHindi ? 'PDF डाउनलोड करें' : 'Download PDF'}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, generating && styles.btnDisabled]}
              onPress={handleSharePdf}
              disabled={generating}
              activeOpacity={0.85}
            >
              <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>{isHindi ? 'शेयर करें' : 'Share PDF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RECENT COMPLAINTS PREVIEW */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {isHindi ? 'ऑडिट में शामिल शिकायतें' : 'Included Grievances'} ({complaints.length})
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'डेटा लोड हो रहा है...' : 'Loading data...'}
            </Text>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={44} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'कोई शिकायत रिकॉर्ड नहीं है' : 'No Grievance Records'}
            </Text>
          </View>
        ) : (
          complaints.slice(0, 15).map((c, i) => {
            const st = String(c.status || 'SUBMITTED').toUpperCase();
            const isResolved = st === 'RESOLVED' || st === 'CLOSED';
            const isInProg = st === 'IN PROGRESS' || st === 'IN_PROGRESS';

            return (
              <View key={c.complaintId || i} style={styles.complaintRow}>
                <View style={styles.complaintTop}>
                  <View style={styles.idBadge}>
                    <Text style={styles.idText}>#{c.complaintId}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isResolved
                          ? '#DCFCE7'
                          : isInProg
                          ? '#FEF3C7'
                          : '#EFF6FF',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: isResolved
                            ? '#16A34A'
                            : isInProg
                            ? '#D97706'
                            : '#2563EB',
                        },
                      ]}
                    >
                      {isResolved
                        ? isHindi ? 'हल हुई' : 'Resolved'
                        : isInProg
                        ? isHindi ? 'प्रगति में' : 'In Progress'
                        : isHindi ? 'दर्ज' : 'Submitted'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.catText}>{c.category || 'सामान्य समस्या'}</Text>
                <Text style={styles.descText} numberOfLines={2}>
                  {c.description || '-'}
                </Text>

                <View style={styles.dateRow}>
                  <Ionicons name="time-outline" size={13} color="#64748B" />
                  <Text style={styles.dateText}>{formatDate(c.dateTime)}</Text>
                  {c.ward ? <Text style={styles.wardTag}>• {c.ward}</Text> : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  languageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  /* SUMMARY */
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  /* ACTION CARD */
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    ...SHADOWS.small,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionCardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },

  /* LIST */
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  complaintRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  complaintTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  catText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  wardTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});