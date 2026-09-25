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
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);

      const allKeys = await AsyncStorage.getAllKeys();

      const complaintKeys = allKeys.filter((key) =>
        key.startsWith('complaint_')
      );

      const loadedComplaints: Complaint[] = [];

      for (const key of complaintKeys) {
        const data = await AsyncStorage.getItem(key);

        if (!data) {
          continue;
        }

        try {
          const complaint: Complaint = JSON.parse(data);
          loadedComplaints.push(complaint);
        } catch (error) {
          console.log('Invalid complaint:', key);
        }
      }

      loadedComplaints.sort((a, b) => {
        const dateA = a.dateTime
          ? new Date(a.dateTime).getTime()
          : 0;

        const dateB = b.dateTime
          ? new Date(b.dateTime).getTime()
          : 0;

        return dateB - dateA;
      });

      setComplaints(loadedComplaints);
    } catch (error) {
      console.log('Unable to load complaints:', error);

      Alert.alert(
        'Error',
        'Unable to load complaint data.'
      );
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
    return complaints.filter((complaint) => {
      const status = getStatus(complaint.status);

      return (
        status === 'RESOLVED' ||
        status === 'CLOSED'
      );
    }).length;
  };

  const getPending = () => {
    return complaints.filter((complaint) => {
      const status = getStatus(complaint.status);

      return (
        status !== 'RESOLVED' &&
        status !== 'CLOSED'
      );
    }).length;
  };

  const getInProgress = () => {
    return complaints.filter((complaint) => {
      const status = getStatus(complaint.status);

      return (
        status === 'ACTION TAKEN' ||
        status === 'IN PROGRESS' ||
        status === 'UNDER REVIEW'
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

  const generatePdf = async () => {
    if (complaints.length === 0) {
      Alert.alert(
        'No Complaints',
        'There are no complaints available for the audit report.'
      );
      return;
    }

    try {
      setGenerating(true);

      const total = getTotal();
      const resolved = getResolved();
      const pending = getPending();
      const inProgress = getInProgress();

      const complaintRows = complaints
        .map((complaint, index) => {
          return `
            <div class="complaint">
              <div class="complaint-header">
                <span class="complaint-number">
                  Complaint ${index + 1}
                </span>

                <span class="status">
                  ${escapeHtml(getStatus(complaint.status))}
                </span>
              </div>

              <table>
                <tr>
                  <td class="label">Complaint ID</td>
                  <td>${escapeHtml(complaint.complaintId)}</td>
                </tr>

                <tr>
                  <td class="label">Citizen</td>
                  <td>${escapeHtml(complaint.citizenName)}</td>
                </tr>

                <tr>
                  <td class="label">Ward</td>
                  <td>${escapeHtml(complaint.ward)}</td>
                </tr>

                <tr>
                  <td class="label">Category</td>
                  <td>${escapeHtml(complaint.category)}</td>
                </tr>

                <tr>
                  <td class="label">Priority</td>
                  <td>${escapeHtml(complaint.priority)}</td>
                </tr>

                <tr>
                  <td class="label">Department</td>
                  <td>${escapeHtml(complaint.department)}</td>
                </tr>

                <tr>
                  <td class="label">Deadline</td>
                  <td>${escapeHtml(complaint.deadline)}</td>
                </tr>

                <tr>
                  <td class="label">Date & Time</td>
                  <td>${escapeHtml(
                    formatDate(complaint.dateTime)
                  )}</td>
                </tr>

                <tr>
                  <td class="label">Location</td>
                  <td>${escapeHtml(complaint.location)}</td>
                </tr>

                <tr>
                  <td class="label">Description</td>
                  <td>${escapeHtml(complaint.description)}</td>
                </tr>
              </table>
            </div>
          `;
        })
        .join('');

      const html = `
        <!DOCTYPE html>

        <html>
        <head>

          <meta charset="UTF-8" />

          <style>

            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #17352A;
              background: #FFFFFF;
            }

            .header {
              text-align: center;
              border-bottom: 3px solid #176B4D;
              padding-bottom: 18px;
              margin-bottom: 25px;
            }

            .title {
              font-size: 26px;
              font-weight: bold;
              margin-bottom: 6px;
            }

            .subtitle {
              font-size: 14px;
              color: #7C8B84;
            }

            .generated {
              margin-top: 8px;
              font-size: 11px;
              color: #7C8B84;
            }

            .summary {
              display: flex;
              gap: 10px;
              margin-bottom: 25px;
            }

            .summary-card {
              flex: 1;
              padding: 14px;
              border: 1px solid #DCE8E2;
              border-radius: 10px;
              text-align: center;
            }

            .summary-number {
              font-size: 22px;
              font-weight: bold;
            }

            .summary-label {
              font-size: 11px;
              color: #7C8B84;
              margin-top: 4px;
            }

            .complaint {
              border: 1px solid #DCE8E2;
              border-radius: 10px;
              padding: 15px;
              margin-bottom: 18px;
              page-break-inside: avoid;
            }

            .complaint-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #DCE8E2;
            }

            .complaint-number {
              font-size: 16px;
              font-weight: bold;
            }

            .status {
              background: #EDF7F2;
              color: #176B4D;
              padding: 5px 9px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: bold;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td {
              padding: 7px;
              border-bottom: 1px solid #EEF3F0;
              font-size: 11px;
              vertical-align: top;
            }

            .label {
              width: 30%;
              font-weight: bold;
              color: #41554C;
            }

            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #DCE8E2;
              text-align: center;
              color: #7C8B84;
              font-size: 10px;
            }

          </style>

        </head>

        <body>

          <div class="header">

            <div class="title">
              VillageApp
            </div>

            <div class="subtitle">
              Grievance Audit Report
            </div>

            <div class="generated">
              Generated on:
              ${escapeHtml(formatDate(new Date().toISOString()))}
            </div>

          </div>

          <div class="summary">

            <div class="summary-card">
              <div class="summary-number">
                ${total}
              </div>

              <div class="summary-label">
                Total Complaints
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-number">
                ${pending}
              </div>

              <div class="summary-label">
                Pending
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-number">
                ${inProgress}
              </div>

              <div class="summary-label">
                In Progress
              </div>
            </div>

            <div class="summary-card">
              <div class="summary-number">
                ${resolved}
              </div>

              <div class="summary-label">
                Resolved
              </div>
            </div>

          </div>

          ${complaintRows}

          <div class="footer">
            VillageApp • Village Grievance Management System
          </div>

        </body>
        </html>
      `;

      const result = await Print.printToFileAsync({
        html,
      });

      if (!result.uri) {
        throw new Error('PDF file was not created.');
      }

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (sharingAvailable) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share VillageApp Audit Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Generated',
          'The audit report PDF has been generated successfully.'
        );
      }
    } catch (error) {
      console.log('PDF generation error:', error);

      Alert.alert(
        'PDF Error',
        'Unable to generate the audit report. Please try again.'
      );
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
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.darkText}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              PDF Audit Report
            </Text>

            <Text style={styles.subtitle}>
              Village grievance report
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="document-text-outline"
              size={23}
              color={COLORS.white}
            />
          </View>

        </View>

        {/* INFO CARD */}

        <View style={styles.infoCard}>

          <View style={styles.infoIcon}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Audit Report
            </Text>

            <Text style={styles.infoText}>
              Generate a PDF containing complaint
              summary and complaint-wise details.
            </Text>
          </View>

        </View>

        {/* SUMMARY */}

        <Text style={styles.sectionTitle}>
          Complaint Summary
        </Text>

        <View style={styles.summaryGrid}>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor: COLORS.lightGreen,
                },
              ]}
            >
              <Ionicons
                name="documents-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.summaryNumber}>
              {getTotal()}
            </Text>

            <Text style={styles.summaryLabel}>
              Total
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor: COLORS.orangeLight,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.orange}
              />
            </View>

            <Text style={styles.summaryNumber}>
              {getPending()}
            </Text>

            <Text style={styles.summaryLabel}>
              Pending
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor: COLORS.blueLight,
                },
              ]}
            >
              <Ionicons
                name="sync-outline"
                size={20}
                color={COLORS.blue}
              />
            </View>

            <Text style={styles.summaryNumber}>
              {getInProgress()}
            </Text>

            <Text style={styles.summaryLabel}>
              In Progress
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryIcon,
                {
                  backgroundColor: COLORS.lightGreen,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={COLORS.green}
              />
            </View>

            <Text style={styles.summaryNumber}>
              {getResolved()}
            </Text>

            <Text style={styles.summaryLabel}>
              Resolved
            </Text>
          </View>

        </View>

        {/* COMPLAINT COUNT */}

        <View style={styles.countCard}>

          <View>
            <Text style={styles.countTitle}>
              Available Complaints
            </Text>

            <Text style={styles.countSubtitle}>
              Data stored in VillageApp
            </Text>
          </View>

          <Text style={styles.countNumber}>
            {complaints.length}
          </Text>

        </View>

        {/* COMPLAINT PREVIEW */}

        <Text style={styles.sectionTitle}>
          Complaint Details
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
            />

            <Text style={styles.loadingText}>
              Loading complaints...
            </Text>
          </View>
        ) : complaints.length === 0 ? (
          <View style={styles.emptyBox}>

            <Ionicons
              name="document-outline"
              size={42}
              color={COLORS.muted}
            />

            <Text style={styles.emptyTitle}>
              No Complaints Found
            </Text>

            <Text style={styles.emptyText}>
              There are no complaint records available
              for the audit report.
            </Text>

          </View>
        ) : (
          complaints.map((complaint, index) => (
            <View
              key={
                complaint.complaintId ||
                `complaint-${index}`
              }
              style={styles.complaintCard}
            >

              <View style={styles.complaintTop}>

                <View style={styles.complaintIcon}>
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.complaintTitleBox}>
                  <Text style={styles.complaintId}>
                    {complaint.complaintId ||
                      `Complaint ${index + 1}`}
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
                <Text style={styles.detailLabel}>
                  Citizen
                </Text>

                <Text style={styles.detailValue}>
                  {complaint.citizenName || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Ward
                </Text>

                <Text style={styles.detailValue}>
                  {complaint.ward || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Category
                </Text>

                <Text style={styles.detailValue}>
                  {complaint.category || 'N/A'}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Description
                </Text>

                <Text
                  style={[
                    styles.detailValue,
                    styles.description,
                  ]}
                >
                  {complaint.description || 'N/A'}
                </Text>
              </View>

            </View>
          ))
        )}

        {/* GENERATE BUTTON */}

        <TouchableOpacity
          style={[
            styles.generateButton,
            generating && styles.generateButtonDisabled,
          ]}
          onPress={generatePdf}
          disabled={generating}
          activeOpacity={0.85}
        >

          {generating ? (
            <ActivityIndicator
              size="small"
              color={COLORS.white}
            />
          ) : (
            <Ionicons
              name="document-text-outline"
              size={22}
              color={COLORS.white}
            />
          )}

          <Text style={styles.generateButtonText}>
            {generating
              ? 'Generating PDF...'
              : 'Generate PDF Audit Report'}
          </Text>

        </TouchableOpacity>

        {/* REFRESH */}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadComplaints}
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh-outline"
            size={19}
            color={COLORS.primary}
          />

          <Text style={styles.refreshText}>
            Refresh Complaint Data
          </Text>
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
    marginBottom: 23,
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

  generateButton: {
    height: 56,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
  },

  generateButtonDisabled: {
    opacity: 0.7,
  },

  generateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
    marginLeft: 9,
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