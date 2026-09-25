import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

import { complaintApi } from '../services/api';

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

const COLORS = {
  primary: '#176B4D',
  primaryDark: '#0F5139',
  green: '#23845F',
  lightGreen: '#DDEFE7',
  mint: '#EDF7F2',
  background: '#F5F9F7',
  white: '#FFFFFF',
  darkText: '#17352A',
  text: '#41554C',
  muted: '#7C8B84',
  border: '#DCE8E2',
  blue: '#3978B8',
  blueLight: '#EAF3FC',
  orange: '#D88A25',
  orangeLight: '#FFF4E3',
  red: '#C85C55',
  redLight: '#FDEDEC',
};

export default function AuditReportScreen() {
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [villageName, setVillageName] = useState<string>('Gram Panchayat');
  const [officerName, setOfficerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);

      const adminData = await AsyncStorage.getItem('admin');
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const admin = adminData ? JSON.parse(adminData) : session;
      const role = String(session?.role || admin?.role || 'sarpanch').toLowerCase();

      if (admin?.village) {
        setVillageName(admin.village);
      } else if (session?.village) {
        setVillageName(session.village);
      }

      if (admin?.name) {
        setOfficerName(admin.name);
      } else if (session?.name) {
        setOfficerName(session.name);
      }

      let loadedComplaints: Complaint[] = [];

      // Load complaints directly from Backend Spring Boot Database API
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
        } else {
          const apiData = await complaintApi.getCitizenComplaints();
          if (Array.isArray(apiData)) {
            loadedComplaints = apiData.map((item: any) => ({
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
      Alert.alert('Error', 'Unable to load complaint data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const getStatus = (status?: string) => {
    return String(status || 'SUBMITTED').toUpperCase();
  };

  const getTotal = () => complaints.length;

  const getResolved = () => {
    return complaints.filter((item) => {
      const st = String(item.status || '').toUpperCase();
      return st === 'RESOLVED' || st === 'CLOSED';
    }).length;
  };

  const getPending = () => {
    return complaints.filter((item) => {
      const st = String(item.status || '').toUpperCase();
      return st === 'SUBMITTED' || st === 'UNDER REVIEW' || st === 'UNDER_REVIEW';
    }).length;
  };

  const getInProgress = () => {
    return complaints.filter((item) => {
      const st = String(item.status || '').toUpperCase();
      return (
        st === 'ACTION TAKEN' ||
        st === 'ACTION_TAKEN' ||
        st === 'IN PROGRESS' ||
        st === 'IN_PROGRESS'
      );
    }).length;
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return 'N/A';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const escapeHtml = (value: unknown) => {
    return String(value ?? 'N/A')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const buildAuditHtml = () => {
    const total = getTotal();
    const resolved = getResolved();
    const pending = getPending();
    const inProgress = getInProgress();
    const currentDate = formatDate(new Date().toISOString());

    const complaintRowsHtml = complaints
      .map((complaint, index) => {
        const st = getStatus(complaint.status);
        let statusBadgeBg = '#EDF7F2';
        let statusBadgeColor = '#176B4D';
        if (st === 'PENDING' || st === 'SUBMITTED' || st === 'UNDER_REVIEW') {
          statusBadgeBg = '#FFF4E3';
          statusBadgeColor = '#D88A25';
        } else if (st.includes('PROGRESS') || st.includes('ACTION')) {
          statusBadgeBg = '#EAF3FC';
          statusBadgeColor = '#3978B8';
        }

        return `
          <div style="border: 1px solid #DCE8E2; border-radius: 8px; margin-bottom: 16px; background: #FFFFFF; overflow: hidden; page-break-inside: avoid;">
            <table style="width: 100%; border-collapse: collapse; background: #F8FAF9; border-bottom: 1px solid #DCE8E2;">
              <tr>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: bold; color: #17352A;">
                  #${index + 1} &nbsp; Complaint ID: <span style="color: #176B4D;">${escapeHtml(complaint.complaintId)}</span>
                </td>
                <td style="padding: 10px 14px; text-align: right;">
                  <span style="background: ${statusBadgeBg}; color: ${statusBadgeColor}; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                    ${escapeHtml(st)}
                  </span>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <tr>
                <td style="width: 25%; padding: 8px 14px; color: #7C8B84; font-weight: 600; border-bottom: 1px solid #F0F4F2;">Citizen Name</td>
                <td style="padding: 8px 14px; color: #17352A; font-weight: 500; border-bottom: 1px solid #F0F4F2;">${escapeHtml(complaint.citizenName)}</td>
              </tr>
              <tr>
                <td style="width: 25%; padding: 8px 14px; color: #7C8B84; font-weight: 600; border-bottom: 1px solid #F0F4F2;">Ward / Location</td>
                <td style="padding: 8px 14px; color: #17352A; font-weight: 500; border-bottom: 1px solid #F0F4F2;">${escapeHtml(complaint.ward || complaint.location)}</td>
              </tr>
              <tr>
                <td style="width: 25%; padding: 8px 14px; color: #7C8B84; font-weight: 600; border-bottom: 1px solid #F0F4F2;">Category / Department</td>
                <td style="padding: 8px 14px; color: #17352A; font-weight: 500; border-bottom: 1px solid #F0F4F2;">${escapeHtml(complaint.category || 'General')} ${complaint.department ? `(${escapeHtml(complaint.department)})` : ''}</td>
              </tr>
              <tr>
                <td style="width: 25%; padding: 8px 14px; color: #7C8B84; font-weight: 600; border-bottom: 1px solid #F0F4F2;">Date & Time</td>
                <td style="padding: 8px 14px; color: #17352A; font-weight: 500; border-bottom: 1px solid #F0F4F2;">${escapeHtml(formatDate(complaint.dateTime))}</td>
              </tr>
              <tr>
                <td style="width: 25%; padding: 8px 14px; color: #7C8B84; font-weight: 600;">Description</td>
                <td style="padding: 8px 14px; color: #17352A; line-height: 1.4;">${escapeHtml(complaint.description)}</td>
              </tr>
            </table>
          </div>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>VillageApp Audit Report</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", Arial, sans-serif;
            margin: 0;
            padding: 24px;
            color: #17352A;
            background: #FFFFFF;
          }
          .header-box {
            text-align: center;
            border-bottom: 3px solid #176B4D;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .app-title {
            font-size: 24px;
            font-weight: 900;
            color: #176B4D;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
          }
          .report-title {
            font-size: 16px;
            font-weight: 700;
            color: #41554C;
            margin: 0 0 6px 0;
          }
          .meta-info {
            font-size: 11px;
            color: #7C8B84;
          }
          .stats-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px;
            margin-bottom: 22px;
          }
          .stat-card {
            width: 25%;
            text-align: center;
            padding: 12px 6px;
            border-radius: 8px;
            border: 1px solid #DCE8E2;
          }
          .stat-val {
            font-size: 22px;
            font-weight: bold;
          }
          .stat-lbl {
            font-size: 10px;
            color: #7C8B84;
            font-weight: bold;
            margin-top: 4px;
            text-transform: uppercase;
          }
          .section-heading {
            font-size: 15px;
            font-weight: bold;
            color: #17352A;
            margin-bottom: 12px;
            border-left: 4px solid #176B4D;
            padding-left: 8px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 12px;
            border-top: 1px solid #DCE8E2;
            text-align: center;
            font-size: 10px;
            color: #7C8B84;
          }
        </style>
      </head>
      <body>

        <div class="header-box">
          <h1 class="app-title">🏛️ VillageApp - ग्राम पंचायत शिकायत निवारण प्रणाली</h1>
          <div class="report-title">Grievance Audit & Redressal Report • ${escapeHtml(villageName)}</div>
          <div class="meta-info">
            Generated on: <strong>${escapeHtml(currentDate)}</strong>
            ${officerName ? ` | Officer: <strong>${escapeHtml(officerName)}</strong>` : ''}
          </div>
        </div>

        <div class="section-heading">Executive Summary / सारांश</div>

        <table class="stats-table">
          <tr>
            <td class="stat-card" style="background: #EDF7F2;">
              <div class="stat-val" style="color: #17352A;">${total}</div>
              <div class="stat-lbl">Total / कुल</div>
            </td>
            <td class="stat-card" style="background: #FFF4E3; border-color: #FCE4C3;">
              <div class="stat-val" style="color: #D88A25;">${pending}</div>
              <div class="stat-lbl">Pending / लंबित</div>
            </td>
            <td class="stat-card" style="background: #EAF3FC; border-color: #D3E6FA;">
              <div class="stat-val" style="color: #3978B8;">${inProgress}</div>
              <div class="stat-lbl">In Progress / प्रगति</div>
            </td>
            <td class="stat-card" style="background: #EDF7F2; border-color: #DCE8E2;">
              <div class="stat-val" style="color: #23845F;">${resolved}</div>
              <div class="stat-lbl">Resolved / निराकृत</div>
            </td>
          </tr>
        </table>

        <div class="section-heading">Detailed Complaints List / शिकायत विवरण (${total})</div>

        ${complaintRowsHtml}

        <div class="footer">
          VillageApp Digital Governance System • Generated automatically for official audit and record keeping.
        </div>

      </body>
      </html>
    `;
  };

  const handlePrintOrSavePdf = async () => {
    if (complaints.length === 0) {
      Alert.alert('No Complaints', 'There are no complaints available for the audit report.');
      return;
    }

    try {
      setGenerating(true);
      const html = buildAuditHtml();

      // Native Android / iOS Print Dialog (allows Save as PDF & Printing)
      await Print.printAsync({ html });
    } catch (error: any) {
      console.log('PDF printAsync error:', error);
      Alert.alert(
        'PDF Notice',
        error?.message || 'Unable to open print preview. Please try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    if (complaints.length === 0) {
      Alert.alert('No Complaints', 'There are no complaints available for the audit report.');
      return;
    }

    try {
      setGenerating(true);
      const html = buildAuditHtml();

      // 1. Generate PDF file
      const result = await Print.printToFileAsync({ html });

      if (!result?.uri) {
        throw new Error('PDF file could not be generated.');
      }

      // 2. Share PDF via native share sheet
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'VillageApp Audit Report',
        });
      } else {
        // Fallback to print preview if sharing is not available on this device
        await Print.printAsync({ html });
      }
    } catch (error: any) {
      console.log('PDF Share error:', error);
      // If file share fails, gracefully offer direct print/save
      try {
        const html = buildAuditHtml();
        await Print.printAsync({ html });
      } catch (fallbackErr) {
        Alert.alert(
          'PDF Error',
          'Unable to generate the audit report. Please check permissions and try again.'
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/admin');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.darkText} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>PDF Audit Report</Text>
            <Text style={styles.subtitle}>
              {villageName ? `${villageName} • ` : ''}Grievance Report
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="document-text-outline" size={23} color={COLORS.white} />
          </View>
        </View>

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Audit Report Generator</Text>
            <Text style={styles.infoText}>
              Generate, print, or share an official PDF audit report containing complete complaint records.
            </Text>
          </View>
        </View>

        {/* SUMMARY */}
        <Text style={styles.sectionTitle}>Complaint Summary</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.lightGreen }]}>
              <Ionicons name="documents-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryNumber}>{getTotal()}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.orangeLight }]}>
              <Ionicons name="time-outline" size={20} color={COLORS.orange} />
            </View>
            <Text style={styles.summaryNumber}>{getPending()}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.blueLight }]}>
              <Ionicons name="sync-outline" size={20} color={COLORS.blue} />
            </View>
            <Text style={styles.summaryNumber}>{getInProgress()}</Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.lightGreen }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.green} />
            </View>
            <Text style={styles.summaryNumber}>{getResolved()}</Text>
            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
        </View>

        {/* COMPLAINT COUNT */}
        <View style={styles.countCard}>
          <View>
            <Text style={styles.countTitle}>Available Complaints</Text>
            <Text style={styles.countSubtitle}>Live data stored in VillageApp Database</Text>
          </View>
          <Text style={styles.countNumber}>{complaints.length}</Text>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, generating && styles.buttonDisabled]}
            onPress={handleSharePdf}
            disabled={generating}
            activeOpacity={0.85}
          >
            {generating ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
            )}
            <Text style={styles.primaryButtonText}>
              {generating ? 'Generating PDF...' : 'Share PDF Audit Report'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, generating && styles.buttonDisabled]}
            onPress={handlePrintOrSavePdf}
            disabled={generating}
            activeOpacity={0.85}
          >
            <Ionicons name="print-outline" size={20} color={COLORS.primary} />
            <Text style={styles.secondaryButtonText}>Print / Save as PDF</Text>
          </TouchableOpacity>
        </View>

        {/* COMPLAINT PREVIEW */}
        <Text style={styles.sectionTitle}>Complaint Details</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading complaints...</Text>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={42} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No Complaints Found</Text>
            <Text style={styles.emptyText}>
              There are no complaint records available for the audit report.
            </Text>
          </View>
        ) : (
          complaints.map((complaint, index) => (
            <View
              key={complaint.complaintId || `complaint-${index}`}
              style={styles.complaintCard}
            >
              <View style={styles.complaintTop}>
                <View style={styles.complaintIcon}>
                  <Ionicons name="document-text-outline" size={19} color={COLORS.primary} />
                </View>

                <View style={styles.complaintTitleBox}>
                  <Text style={styles.complaintId}>
                    {complaint.complaintId || `Complaint ${index + 1}`}
                  </Text>
                  <Text style={styles.complaintDate}>
                    {formatDate(complaint.dateTime)}
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {getStatus(complaint.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Citizen</Text>
                <Text style={styles.detailValue}>{complaint.citizenName || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ward</Text>
                <Text style={styles.detailValue}>{complaint.ward || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{complaint.category || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={[styles.detailValue, styles.description]}>
                  {complaint.description || 'N/A'}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* REFRESH */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadComplaints}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={19} color={COLORS.primary} />
          <Text style={styles.refreshText}>Refresh Complaint Data</Text>
        </TouchableOpacity>

        {/* FOOTER */}
        <Text style={styles.footer}>
          VillageApp • Grievance Management System
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 11,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.mint,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D5E9DF',
    marginBottom: 23,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 11,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.darkText,
    marginBottom: 11,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    elevation: 2,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.muted,
    marginTop: 3,
  },
  countCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
    elevation: 2,
  },
  countTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  countSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
  countNumber: {
    fontSize: 27,
    fontWeight: '900',
    color: COLORS.primary,
  },
  actionContainer: {
    marginBottom: 22,
    gap: 10,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.mint,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.darkText,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 5,
  },
  complaintCard: {
    backgroundColor: COLORS.white,
    borderRadius: 19,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    elevation: 2,
  },
  complaintTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  complaintIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.lightGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  complaintTitleBox: {
    flex: 1,
  },
  complaintId: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  complaintDate: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.primary,
  },
  detailRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEF3F0',
    paddingVertical: 8,
  },
  detailLabel: {
    width: 85,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
  },
  detailValue: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.text,
  },
  description: {
    lineHeight: 15,
  },
  refreshButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 11,
  },
  refreshText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 7,
  },
  footer: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: 10,
    fontWeight: '600',
    color: '#8A9892',
  },
});