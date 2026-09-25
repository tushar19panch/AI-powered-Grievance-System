import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useLanguage } from '../i18n/LanguageContext';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';

interface WardScore {
  wardNumber: string;
  wardLabel: string;
  total: number;
  resolved: number;
  inProgress: number;
  pending: number;
  resolutionRate: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  gradeColor: string;
  gradeBg: string;
  topCategory: string;
  categoryCounts: Record<string, number>;
}

const COLORS = {
  primary: '#176B4D',
  primaryDark: '#0F5139',
  primaryLight: '#EDF7F2',
  mint: '#DDEFE7',
  background: '#F5F9F7',
  white: '#FFFFFF',
  darkText: '#17352A',
  text: '#41554C',
  muted: '#7C8B84',
  border: '#DCE8E2',
  blue: '#2B70B8',
  blueLight: '#EAF3FC',
  orange: '#D88A25',
  orangeLight: '#FFF4E3',
  red: '#C85C55',
  redLight: '#FDEDEC',
  gold: '#B8860B',
  goldLight: '#FFF9E6',
  green: '#23845F',
};

export default function WardScorecardScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [villageName, setVillageName] = useState('ग्राम पंचायत');
  const [wardScores, setWardScores] = useState<WardScore[]>([]);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const calculateScores = useCallback(async () => {
    try {
      setLoading(true);

      const sessionData = await AsyncStorage.getItem('user_session');
      const adminData = await AsyncStorage.getItem('admin');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const admin = adminData ? JSON.parse(adminData) : session;

      if (admin?.village || session?.village) {
        setVillageName(admin?.village || session?.village);
      }

      let allComplaints: any[] = [];
      try {
        const data = await complaintApi.getSarpanchComplaints();
        if (Array.isArray(data)) {
          allComplaints = data;
        }
      } catch {
        try {
          const citizenData = await complaintApi.getCitizenComplaints();
          if (Array.isArray(citizenData)) {
            allComplaints = citizenData;
          }
        } catch (e) {
          console.log('Unable to load complaints for scorecard:', e);
        }
      }

      // Initialize default wards (Ward 1 to Ward 10, plus any extra found in complaints)
      const wardMap: Record<string, any[]> = {};
      for (let i = 1; i <= 10; i++) {
        wardMap[`Ward ${i}`] = [];
      }

      const extractWardNumber = (wardStr?: string | null, locStr?: string | null): string | null => {
        const w = String(wardStr || '').trim();
        const l = String(locStr || '').trim();
        const wMatch = w.match(/(?:ward|वार्ड|w)[\s\-:]*(\d+)/i);
        if (wMatch) return wMatch[1];
        if (/^\d+$/.test(w)) return w;
        const lMatch = l.match(/(?:ward|वार्ड|w)[\s\-:]*(\d+)/i);
        if (lMatch) return lMatch[1];
        return null;
      };

      allComplaints.forEach((c) => {
        const extractedNum = extractWardNumber(c.ward || c.wardNumber, c.location);
        const w = extractedNum ? `Ward ${extractedNum}` : 'Ward 1';
        if (!wardMap[w]) {
          wardMap[w] = [];
        }
        wardMap[w].push(c);
      });

      const scores: WardScore[] = Object.keys(wardMap).map((wKey) => {
        const list = wardMap[wKey];
        const total = list.length;
        const resolved = list.filter((item) => {
          const st = String(item.status || '').toUpperCase();
          return st === 'RESOLVED' || st === 'CLOSED';
        }).length;

        const inProgress = list.filter((item) => {
          const st = String(item.status || '').toUpperCase();
          return (
            st === 'ACTION TAKEN' ||
            st === 'ACTION_TAKEN' ||
            st === 'IN PROGRESS' ||
            st === 'IN_PROGRESS'
          );
        }).length;

        const pending = list.filter((item) => {
          const st = String(item.status || '').toUpperCase();
          return (
            st === 'SUBMITTED' ||
            st === 'UNDER REVIEW' ||
            st === 'UNDER_REVIEW' ||
            st === 'REOPENED'
          );
        }).length;

        const categoryCounts: Record<string, number> = {};
        list.forEach((item) => {
          const cat = item.category || item.problemType || 'General';
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        let topCategory = 'No Issues';
        let maxCount = 0;
        Object.entries(categoryCounts).forEach(([cat, count]) => {
          if (count > maxCount) {
            maxCount = count;
            topCategory = cat;
          }
        });

        // Resolution rate
        let rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

        let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'A+';
        let gradeColor = COLORS.green;
        let gradeBg = COLORS.primaryLight;

        if (total === 0) {
          grade = 'A+';
          gradeColor = COLORS.green;
          gradeBg = COLORS.primaryLight;
        } else if (rate >= 90) {
          grade = 'A+';
          gradeColor = COLORS.green;
          gradeBg = COLORS.primaryLight;
        } else if (rate >= 75) {
          grade = 'A';
          gradeColor = '#2B70B8';
          gradeBg = '#EAF3FC';
        } else if (rate >= 50) {
          grade = 'B';
          gradeColor = COLORS.orange;
          gradeBg = COLORS.orangeLight;
        } else if (rate >= 30) {
          grade = 'C';
          gradeColor = '#D9534F';
          gradeBg = '#FDEDEC';
        } else {
          grade = 'D';
          gradeColor = '#C82333';
          gradeBg = '#F8D7DA';
        }

        const matchNum = wKey.match(/\d+/);
        const wardNumStr = matchNum ? matchNum[0] : wKey;

        return {
          wardNumber: wardNumStr,
          wardLabel: isHindi ? `वार्ड क्रमांक ${wardNumStr}` : `Ward #${wardNumStr}`,
          total,
          resolved,
          inProgress,
          pending,
          resolutionRate: rate,
          grade,
          gradeColor,
          gradeBg,
          topCategory,
          categoryCounts,
        };
      });

      // Sort by resolution rate (descending), then by total issues
      scores.sort((a, b) => {
        if (b.resolutionRate !== a.resolutionRate) {
          return b.resolutionRate - a.resolutionRate;
        }
        return b.total - a.total;
      });

      setWardScores(scores);
    } catch (err) {
      console.log('Error calculating ward scores:', err);
    } finally {
      setLoading(false);
    }
  }, [isHindi]);

  useEffect(() => {
    calculateScores();
  }, [calculateScores]);

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  // Overall village metrics
  const totalVillageComplaints = wardScores.reduce((acc, curr) => acc + curr.total, 0);
  const totalVillageResolved = wardScores.reduce((acc, curr) => acc + curr.resolved, 0);
  const overallRate =
    totalVillageComplaints > 0
      ? Math.round((totalVillageResolved / totalVillageComplaints) * 100)
      : 100;

  const bestWard = wardScores.find((w) => w.total > 0) || wardScores[0];
  const urgentWard = [...wardScores]
    .filter((w) => w.total > 0)
    .sort((a, b) => a.resolutionRate - b.resolutionRate)[0];

  const handleExportScorecardPdf = async () => {
    try {
      setExporting(true);

      const rowsHtml = wardScores
        .map(
          (w, idx) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; font-weight: bold; text-align: center;">#${idx + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; font-weight: bold;">${w.wardLabel}</td>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; text-align: center;">${w.total}</td>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; text-align: center; color: #23845F; font-weight: bold;">${w.resolved}</td>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; text-align: center; color: #D88A25;">${w.pending}</td>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; text-align: center; font-weight: bold;">${w.resolutionRate}%</td>
            <td style="padding: 10px; border-bottom: 1px solid #DCE8E2; text-align: center;">
              <span style="background: ${w.gradeBg}; color: ${w.gradeColor}; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Grade ${w.grade}</span>
            </td>
          </tr>
        `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif; padding: 24px; color: #17352A; }
            .header { text-align: center; border-bottom: 3px solid #176B4D; padding-bottom: 14px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #176B4D; }
            .subtitle { font-size: 14px; color: #41554C; margin-top: 4px; }
            .summary { margin-bottom: 20px; background: #EDF7F2; padding: 12px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #176B4D; color: #FFFFFF; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">📊 Ward Development & Performance Scorecard</div>
            <div class="subtitle">${villageName} • Gram Panchayat Performance Evaluation</div>
          </div>
          <div class="summary">
            <strong>Overall Village Redressal Rate:</strong> ${overallRate}% | <strong>Total Complaints:</strong> ${totalVillageComplaints} | <strong>Resolved:</strong> ${totalVillageResolved}
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Rank</th>
                <th>Ward Name</th>
                <th style="text-align: center;">Total</th>
                <th style="text-align: center;">Resolved</th>
                <th style="text-align: center;">Pending</th>
                <th style="text-align: center;">Success %</th>
                <th style="text-align: center;">Grade</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (err: any) {
      console.log('Error printing scorecard:', err);
      Alert.alert('PDF Notice', err?.message || 'Unable to print scorecard.');
    } finally {
      setExporting(false);
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
              if (router.canGoBack()) router.back();
              else router.replace('/admin');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.darkText} />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isHindi ? 'वार्ड विकास रिपोर्ट कार्ड' : 'Ward Scorecard'}
            </Text>
            <Text style={styles.subtitle}>
              {villageName} • {isHindi ? 'पारदर्शिता एवं प्रदर्शन' : 'Performance Ranking'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.langBtn}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Text style={styles.langBtnText}>{isHindi ? 'EN' : 'हिं'}</Text>
          </TouchableOpacity>
        </View>

        {/* OFFLINE SYNC BANNER */}
        <OfflineSyncBanner isHindi={isHindi} onSyncComplete={calculateScores} />

        {/* VILLAGE OVERALL HEALTH CARD */}
        <View style={styles.healthCard}>
          <View style={styles.healthHeader}>
            <View style={styles.healthBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.healthBadgeText}>
                {isHindi ? 'ग्राम पंचायत प्रदर्शन' : 'Village Health Index'}
              </Text>
            </View>
            <Text style={styles.overallRateText}>{overallRate}%</Text>
          </View>

          <Text style={styles.healthSub}>
            {isHindi
              ? `${totalVillageComplaints} कुल शिकायतों में से ${totalVillageResolved} समस्याओं का समाधान पूरा हुआ।`
              : `${totalVillageResolved} of ${totalVillageComplaints} total complaints resolved successfully.`}
          </Text>

          {/* PROGRESS BAR */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(overallRate, 100)}%` },
              ]}
            />
          </View>

          {/* LEADERBOARD HIGHLIGHTS */}
          <View style={styles.highlightsRow}>
            {bestWard ? (
              <View style={styles.highlightItem}>
                <Ionicons name="trophy" size={16} color={COLORS.gold} />
                <View style={styles.highlightTextContainer}>
                  <Text style={styles.highlightLabel}>
                    {isHindi ? 'सर्वश्रेष्ठ वार्ड' : 'Top Performing'}
                  </Text>
                  <Text style={styles.highlightVal}>
                    {bestWard.wardLabel} ({bestWard.resolutionRate}%)
                  </Text>
                </View>
              </View>
            ) : null}

            {urgentWard && urgentWard.resolutionRate < 70 ? (
              <View style={[styles.highlightItem, { backgroundColor: COLORS.redLight }]}>
                <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                <View style={styles.highlightTextContainer}>
                  <Text style={[styles.highlightLabel, { color: COLORS.red }]}>
                    {isHindi ? 'ध्यान देने योग्य' : 'Needs Attention'}
                  </Text>
                  <Text style={[styles.highlightVal, { color: COLORS.red }]}>
                    {urgentWard.wardLabel} ({urgentWard.resolutionRate}%)
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* ACTION BAR */}
        <View style={styles.actionBar}>
          <Text style={styles.sectionHeading}>
            {isHindi ? 'वार्डवार रैंकिंग एवं रिपोर्ट' : 'Ward Leaderboard & Grades'}
          </Text>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportScorecardPdf}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="document-text-outline" size={15} color={COLORS.primary} />
            )}
            <Text style={styles.exportBtnText}>
              {isHindi ? 'PDF रिपोर्ट' : 'Export PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LOADING INDICATOR */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'वार्ड डेटा संकलित किया जा रहा है...' : 'Calculating ward metrics...'}
            </Text>
          </View>
        ) : (
          wardScores.map((score, index) => {
            const isSelected = selectedWard === score.wardNumber;

            return (
              <TouchableOpacity
                key={score.wardNumber}
                style={[
                  styles.wardCard,
                  isSelected && styles.wardCardActive,
                ]}
                onPress={() =>
                  setSelectedWard(isSelected ? null : score.wardNumber)
                }
                activeOpacity={0.85}
              >
                {/* WARD TOP ROW */}
                <View style={styles.wardCardTop}>
                  <View style={styles.rankCircle}>
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  </View>

                  <View style={styles.wardTitleBox}>
                    <Text style={styles.wardName}>{score.wardLabel}</Text>
                    <Text style={styles.wardMeta}>
                      {isHindi
                        ? `कुल ${score.total} शिकायतें • मुख्य: ${score.topCategory}`
                        : `${score.total} issues • Top: ${score.topCategory}`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: score.gradeBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gradeText,
                        { color: score.gradeColor },
                      ]}
                    >
                      {isHindi ? `ग्रेड ${score.grade}` : `Grade ${score.grade}`}
                    </Text>
                  </View>
                </View>

                {/* RESOLUTION PROGRESS BAR */}
                <View style={styles.wardProgressContainer}>
                  <View style={styles.wardProgressLabels}>
                    <Text style={styles.wardRateLabel}>
                      {isHindi ? 'निराकरण दर (Resolution Rate)' : 'Resolution Rate'}
                    </Text>
                    <Text style={[styles.wardRateVal, { color: score.gradeColor }]}>
                      {score.resolutionRate}%
                    </Text>
                  </View>

                  <View style={styles.miniTrack}>
                    <View
                      style={[
                        styles.miniFill,
                        {
                          width: `${Math.min(score.resolutionRate, 100)}%`,
                          backgroundColor: score.gradeColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* STATS CHIPS */}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.green} />
                    <Text style={styles.statPillText}>
                      {score.resolved} {isHindi ? 'हल' : 'Resolved'}
                    </Text>
                  </View>

                  <View style={[styles.statPill, { backgroundColor: COLORS.orangeLight }]}>
                    <Ionicons name="time" size={13} color={COLORS.orange} />
                    <Text style={[styles.statPillText, { color: COLORS.orange }]}>
                      {score.pending} {isHindi ? 'लंबित' : 'Pending'}
                    </Text>
                  </View>

                  <View style={[styles.statPill, { backgroundColor: COLORS.blueLight }]}>
                    <Ionicons name="sync" size={13} color={COLORS.blue} />
                    <Text style={[styles.statPillText, { color: COLORS.blue }]}>
                      {score.inProgress} {isHindi ? 'प्रगति' : 'In Progress'}
                    </Text>
                  </View>
                </View>

                {/* EXPANDED DETAILS */}
                {isSelected ? (
                  <View style={styles.expandedBox}>
                    <Text style={styles.expandedTitle}>
                      {isHindi ? 'समस्याओं का वर्गीकरण:' : 'Category Breakdown:'}
                    </Text>
                    <View style={styles.categoryTagsRow}>
                      {Object.entries(score.categoryCounts).map(([cat, count]) => (
                        <View key={cat} style={styles.categoryTag}>
                          <Text style={styles.categoryTagText}>
                            {cat}: <strong>{count}</strong>
                          </Text>
                        </View>
                      ))}
                      {Object.keys(score.categoryCounts).length === 0 && (
                        <Text style={styles.noIssuesText}>
                          {isHindi ? 'इस वार्ड में कोई सक्रिय शिकायत नहीं है।' : 'No active complaints in this ward.'}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.viewWardComplaintsBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/complaints',
                          params: { ward: score.wardNumber },
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="list-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.viewWardComplaintsText}>
                        {isHindi
                          ? `वार्ड ${score.wardNumber} की सभी शिकायतें देखें`
                          : `View Ward ${score.wardNumber} Complaints`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          VillageApp • {isHindi ? 'डिजिटल ग्राम पंचायत विकास सूचकांक' : 'Digital Panchayat Transparency Index'}
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
    marginBottom: 16,
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
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  healthCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  healthBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  overallRateText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
  },
  healthSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6EE7B7',
    borderRadius: 4,
  },
  highlightsRow: {
    gap: 8,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  highlightTextContainer: {
    flex: 1,
  },
  highlightLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
  },
  highlightVal: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.darkText,
    marginTop: 1,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.muted,
  },
  wardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    elevation: 2,
  },
  wardCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  wardCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  wardTitleBox: {
    flex: 1,
  },
  wardName: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.darkText,
  },
  wardMeta: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  wardProgressContainer: {
    marginBottom: 10,
  },
  wardProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wardRateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  wardRateVal: {
    fontSize: 11,
    fontWeight: '900',
  },
  miniTrack: {
    height: 6,
    backgroundColor: '#F0F4F2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.green,
  },
  expandedBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
  },
  expandedTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.darkText,
    marginBottom: 6,
  },
  categoryTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  categoryTag: {
    backgroundColor: '#F5F9F7',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 10,
    color: COLORS.text,
  },
  noIssuesText: {
    fontSize: 11,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  viewWardComplaintsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  viewWardComplaintsText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  footer: {
    textAlign: 'center',
    marginTop: 18,
    fontSize: 10,
    color: '#8A9892',
    fontWeight: '600',
  },
});
