import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
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
  complaints: any[];
}

const COLORS = {
  primary: '#176B4D',
  primaryDark: '#0F5139',
  primaryLight: '#EDF7F2',
  mint: '#DDEFE7',
  background: '#F8FAFC',
  white: '#FFFFFF',
  darkText: '#0F172A',
  text: '#334155',
  muted: '#64748B',
  border: '#E2E8F0',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  orange: '#D97706',
  orangeLight: '#FFFBEB',
  red: '#DC2626',
  redLight: '#FEF2F2',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  saffron: '#FF9933',
  navy: '#000080',
};

export default function WardScorecardScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [villageName, setVillageName] = useState('ग्राम पंचायत');
  const [wardScores, setWardScores] = useState<WardScore[]>([]);
  const [activeWardNum, setActiveWardNum] = useState<string>('1');
  const [searchInput, setSearchInput] = useState('');
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

      // Initialize default wards 1 to 10
      const wardMap: Record<string, any[]> = {};
      for (let i = 1; i <= 10; i++) {
        wardMap[String(i)] = [];
      }

      // Helper to extract ward number
      const extractWard = (w?: any, l?: any): string => {
        const str = `${w || ''} ${l || ''}`.trim();
        const match = str.match(/(?:ward|वार्ड|w)[\s\-:]*(\d+)/i);
        if (match) return match[1];
        const numOnly = str.match(/\b\d+\b/);
        if (numOnly) return numOnly[0];
        return '1';
      };

      allComplaints.forEach((c) => {
        const wNum = extractWard(c.wardNumber || c.ward, c.location);
        if (!wardMap[wNum]) {
          wardMap[wNum] = [];
        }
        wardMap[wNum].push(c);
      });

      // Calculate score per ward
      const scores: WardScore[] = Object.keys(wardMap)
        .map((num) => {
          const cList = wardMap[num];
          const total = cList.length;
          let resolved = 0;
          let inProgress = 0;
          let pending = 0;
          const catCounts: Record<string, number> = {};

          cList.forEach((c) => {
            const st = String(c.status || '').toUpperCase();
            if (st === 'RESOLVED' || st === 'CLOSED') {
              resolved++;
            } else if (
              st === 'IN PROGRESS' ||
              st === 'IN_PROGRESS' ||
              st === 'ACTION TAKEN' ||
              st === 'ACTION_TAKEN'
            ) {
              inProgress++;
            } else {
              pending++;
            }

            const cat = c.category || c.problemType || 'Village Issue';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
          });

          // Rate
          const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

          // Grade
          let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'A';
          let gradeColor = COLORS.green;
          let gradeBg = COLORS.greenLight;

          if (total === 0 || rate >= 90) {
            grade = 'A+';
            gradeColor = '#059669';
            gradeBg = '#D1FAE5';
          } else if (rate >= 75) {
            grade = 'A';
            gradeColor = '#16A34A';
            gradeBg = '#DCFCE7';
          } else if (rate >= 55) {
            grade = 'B';
            gradeColor = '#D97706';
            gradeBg = '#FEF3C7';
          } else if (rate >= 35) {
            grade = 'C';
            gradeColor = '#EA580C';
            gradeBg = '#FFEDD5';
          } else {
            grade = 'D';
            gradeColor = '#DC2626';
            gradeBg = '#FEE2E2';
          }

          let topCat = isHindi ? 'कोई शिकायत नहीं' : 'No Issues';
          let maxCatCount = 0;
          Object.entries(catCounts).forEach(([cat, count]) => {
            if (count > maxCatCount) {
              maxCatCount = count;
              topCat = cat;
            }
          });

          return {
            wardNumber: num,
            wardLabel: isHindi ? `वार्ड संख्या: ${num}` : `Ward No. ${num}`,
            total,
            resolved,
            inProgress,
            pending,
            resolutionRate: rate,
            grade,
            gradeColor,
            gradeBg,
            topCategory: topCat,
            categoryCounts: catCounts,
            complaints: cList,
          };
        })
        .sort((a, b) => parseInt(a.wardNumber, 10) - parseInt(b.wardNumber, 10));

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

  const handleSearchSubmit = () => {
    const clean = searchInput.trim().replace(/\D/g, '');
    if (clean) {
      setActiveWardNum(clean);
    }
  };

  const currentScore: WardScore = wardScores.find(
    (w) => w.wardNumber === activeWardNum
  ) || {
    wardNumber: activeWardNum,
    wardLabel: isHindi ? `वार्ड संख्या: ${activeWardNum}` : `Ward No. ${activeWardNum}`,
    total: 0,
    resolved: 0,
    inProgress: 0,
    pending: 0,
    resolutionRate: 100,
    grade: 'A+',
    gradeColor: '#059669',
    gradeBg: '#D1FAE5',
    topCategory: isHindi ? 'कोई शिकायत नहीं' : 'No Issues',
    categoryCounts: {},
    complaints: [],
  };

  const exportWardReport = async () => {
    try {
      setExporting(true);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Ward Performance Report - ${currentScore.wardLabel}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #1E293B; }
            .header { text-align: center; border-bottom: 2px solid #176B4D; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: bold; color: #176B4D; }
            .subtitle { font-size: 14px; color: #64748B; margin-top: 4px; }
            .score-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 15px; margin-bottom: 20px; }
            .stat-grid { display: flex; justify-content: space-around; text-align: center; margin-top: 10px; }
            .stat-item { font-size: 13px; color: #475569; }
            .stat-num { font-size: 18px; font-weight: bold; color: #0F172A; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background-color: #EDF7F2; color: #176B4D; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ग्राम पंचायत: ${villageName}</div>
            <div class="subtitle">वार्ड प्रगति एवं विकास रिपोर्ट कार्ड • ${currentScore.wardLabel}</div>
          </div>

          <div class="score-box">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3>${currentScore.wardLabel} (ग्रेड: ${currentScore.grade})</h3>
              <div>समाधान दर: <strong>${currentScore.resolutionRate}%</strong></div>
            </div>
            <div class="stat-grid">
              <div class="stat-item"><div class="stat-num">${currentScore.total}</div>कुल शिकायतें</div>
              <div class="stat-item"><div class="stat-num" style="color:#16A34A">${currentScore.resolved}</div>हल की गई</div>
              <div class="stat-item"><div class="stat-num" style="color:#D97706">${currentScore.inProgress}</div>कार्रवाई में</div>
              <div class="stat-item"><div class="stat-num" style="color:#DC2626">${currentScore.pending}</div>लंबित</div>
            </div>
          </div>

          <h3>वार्ड में दर्ज समस्याओं की सूची (${currentScore.complaints.length})</h3>
          ${
            currentScore.complaints.length === 0
              ? '<p>इस वार्ड में कोई लंबित शिकायत नहीं है।</p>'
              : `<table>
                  <tr>
                    <th>क्र.</th>
                    <th>श्रेणी</th>
                    <th>विवरण</th>
                    <th>स्थिति</th>
                  </tr>
                  ${currentScore.complaints
                    .map(
                      (c, i) => `
                    <tr>
                      <td>#${c.id || i + 1}</td>
                      <td>${c.category || c.problemType || 'सामान्य'}</td>
                      <td>${c.description || '-'}</td>
                      <td>${c.status || 'SUBMITTED'}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </table>`
          }
        </body>
        </html>
      `;

      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        err?.message || (isHindi ? 'PDF तैयार नहीं हो सका।' : 'Could not generate PDF.')
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TOP HEADER */}
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
            {isHindi ? 'वार्ड स्कोरकार्ड' : 'Ward Scorecard'}
          </Text>
          <Text style={styles.headerSubtitle}>
            📍 {villageName} • {currentScore.wardLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={exportWardReport}
          disabled={exporting}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={17} color={COLORS.primary} />
          <Text style={styles.exportText}>{isHindi ? 'PDF' : 'PDF'}</Text>
        </TouchableOpacity>
      </View>

      <OfflineSyncBanner isHindi={isHindi} onSyncComplete={calculateScores} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* SEARCH WARD INPUT */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isHindi
                ? 'वार्ड नंबर दर्ज करें (उदा. 1, 2, 3...)'
                : 'Enter Ward Number (e.g. 1, 2, 3...)'
            }
            placeholderTextColor={COLORS.muted}
            value={searchInput}
            onChangeText={(text) => {
              setSearchInput(text);
              const num = text.replace(/\D/g, '');
              if (num) setActiveWardNum(num);
            }}
            keyboardType="number-pad"
            maxLength={3}
            onSubmitEditing={handleSearchSubmit}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchInput('');
              }}
              style={{ padding: 4 }}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* HORIZONTAL WARD SELECTOR TABS (Ward 1 to 10) */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((num) => {
              const isActive = activeWardNum === num;
              return (
                <TouchableOpacity
                  key={num}
                  style={[styles.wardTab, isActive && styles.activeWardTab]}
                  onPress={() => {
                    setActiveWardNum(num);
                    setSearchInput('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.wardTabText, isActive && styles.activeWardTabText]}>
                    {isHindi ? `वार्ड ${num}` : `Ward ${num}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'वार्ड डेटा लोड हो रहा है...' : 'Loading ward scorecard...'}
            </Text>
          </View>
        ) : (
          <>
            {/* SELECTED WARD SCORECARD CARD */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wardTitle}>{currentScore.wardLabel}</Text>
                  <Text style={styles.wardSubtitle}>
                    {isHindi ? 'ग्राम पंचायत विकास व समस्या रिपोर्ट' : 'Panchayat Grievance Overview'}
                  </Text>
                </View>

                {/* GRADE BADGE */}
                <View style={[styles.gradeBadge, { backgroundColor: currentScore.gradeBg }]}>
                  <Text style={[styles.gradeText, { color: currentScore.gradeColor }]}>
                    {currentScore.grade}
                  </Text>
                  <Text style={[styles.gradeLabel, { color: currentScore.gradeColor }]}>
                    {isHindi ? 'ग्रेड' : 'Grade'}
                  </Text>
                </View>
              </View>

              {/* RESOLUTION PROGRESS BAR */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    {isHindi ? 'समाधान दर (Resolution Rate)' : 'Resolution Rate'}
                  </Text>
                  <Text style={[styles.progressVal, { color: currentScore.gradeColor }]}>
                    {currentScore.resolutionRate}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(currentScore.resolutionRate, 100)}%`,
                        backgroundColor: currentScore.gradeColor,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* 4 STAT BOXES */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{currentScore.total}</Text>
                  <Text style={styles.statLbl}>{isHindi ? 'कुल दर्ज' : 'Total'}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.statNum, { color: '#16A34A' }]}>
                    {currentScore.resolved}
                  </Text>
                  <Text style={styles.statLbl}>{isHindi ? 'हल हुई' : 'Resolved'}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.statNum, { color: '#D97706' }]}>
                    {currentScore.inProgress}
                  </Text>
                  <Text style={styles.statLbl}>{isHindi ? 'प्रगति में' : 'In Progress'}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.statNum, { color: '#DC2626' }]}>
                    {currentScore.pending}
                  </Text>
                  <Text style={styles.statLbl}>{isHindi ? 'लंबित' : 'Pending'}</Text>
                </View>
              </View>

              {/* TOP ISSUE CATEGORY */}
              <View style={styles.topCategoryRow}>
                <Ionicons name="analytics" size={16} color={COLORS.primary} />
                <Text style={styles.topCategoryText}>
                  {isHindi ? 'प्रमुख विषय: ' : 'Top Category: '}
                  <Text style={{ fontWeight: '700', color: COLORS.darkText }}>
                    {currentScore.topCategory}
                  </Text>
                </Text>
              </View>
            </View>

            {/* LIST OF COMPLAINTS FOR THIS SELECTED WARD */}
            <View style={styles.complaintsSectionHeader}>
              <Text style={styles.sectionTitle}>
                {isHindi
                  ? `${currentScore.wardLabel} की समस्याएं (${currentScore.complaints.length})`
                  : `${currentScore.wardLabel} Problems (${currentScore.complaints.length})`}
              </Text>

              {currentScore.complaints.length > 0 && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/complaints',
                      params: { ward: currentScore.wardNumber },
                    } as any)
                  }
                >
                  <Text style={styles.viewAllText}>
                    {isHindi ? 'सभी देखें ➔' : 'View All ➔'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {currentScore.complaints.length === 0 ? (
              <View style={styles.emptyWardBox}>
                <Ionicons name="checkmark-done-circle" size={48} color="#16A34A" />
                <Text style={styles.emptyWardTitle}>
                  {isHindi ? 'कोई लंबित समस्या नहीं है' : 'No Pending Problems'}
                </Text>
                <Text style={styles.emptyWardText}>
                  {isHindi
                    ? `${currentScore.wardLabel} में वर्तमान में सभी कार्य सुचारु रूप से चल रहे हैं।`
                    : `All public services are currently running smoothly in ${currentScore.wardLabel}.`}
                </Text>
              </View>
            ) : (
              currentScore.complaints.map((item, idx) => {
                const st = String(item.status || 'SUBMITTED').toUpperCase();
                const isResolved = st === 'RESOLVED' || st === 'CLOSED';
                const isInProg = st === 'IN PROGRESS' || st === 'IN_PROGRESS';

                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.problemCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (item.id) {
                        router.push({
                          pathname: '/complaint-details',
                          params: { id: String(item.id) },
                        });
                      }
                    }}
                  >
                    <View style={styles.problemHeader}>
                      <View style={styles.problemCategoryPill}>
                        <Ionicons name="layers-outline" size={13} color={COLORS.primary} />
                        <Text style={styles.problemCategoryText}>
                          {item.category || item.problemType || (isHindi ? 'ग्राम समस्या' : 'Issue')}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.problemStatusBadge,
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
                            styles.problemStatusText,
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
                            ? isHindi ? 'हल हो गई' : 'Resolved'
                            : isInProg
                            ? isHindi ? 'कार्रवाई जारी' : 'In Progress'
                            : isHindi ? 'दर्ज की गई' : 'Registered'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.problemDescription} numberOfLines={2}>
                      {item.description || (isHindi ? 'विवरण उपलब्ध नहीं है' : 'No description provided')}
                    </Text>

                    <View style={styles.problemFooter}>
                      <Text style={styles.problemDate}>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString(
                              isHindi ? 'hi-IN' : 'en-US',
                              { day: '2-digit', month: 'short', year: 'numeric' }
                            )
                          : isHindi ? 'हाल ही में' : 'Recent'}
                      </Text>

                      <View style={styles.viewDetailBtn}>
                        <Text style={styles.viewDetailText}>
                          {isHindi ? 'विवरण देखें' : 'View'}
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  container: {
    padding: 16,
    paddingBottom: 40,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },

  tabsWrapper: {
    marginBottom: 16,
  },
  tabsContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  wardTab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeWardTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  wardTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activeWardTabText: {
    color: '#FFFFFF',
  },

  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  wardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  wardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gradeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  gradeText: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
  gradeLabel: {
    fontSize: 10,
    fontWeight: '800',
  },

  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  progressVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLbl: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },

  topCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  topCategoryText: {
    fontSize: 13,
    color: '#475569',
  },

  complaintsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  emptyWardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyWardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyWardText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  problemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  problemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  problemCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  problemCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  problemStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  problemStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  problemDescription: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 10,
  },
  problemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  problemDate: {
    fontSize: 11,
    color: '#64748B',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
