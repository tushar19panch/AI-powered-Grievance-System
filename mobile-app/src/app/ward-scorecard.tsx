import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';

import { complaintApi } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';
import { DashboardBottomBar } from '../components/DashboardBottomBar';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

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

export default function WardScorecardScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [loading, setLoading] = useState(true);
  const [villageName, setVillageName] = useState('ग्राम पंचायत');
  const [wardScores, setWardScores] = useState<WardScore[]>([]);
  const [activeWardNum, setActiveWardNum] = useState<string>('1');
  const [searchInput, setSearchInput] = useState('');
  const [exporting, setExporting] = useState(false);
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary'>('citizen');

  const calculateScores = useCallback(async () => {
    try {
      setLoading(true);

      const sessionData = await AsyncStorage.getItem('user_session');
      const adminData = await AsyncStorage.getItem('admin');
      const secData = await AsyncStorage.getItem('secretary');

      const session = sessionData ? JSON.parse(sessionData) : null;
      const admin = adminData ? JSON.parse(adminData) : null;
      const secretary = secData ? JSON.parse(secData) : null;

      const role = String(session?.role || admin?.role || secretary?.role || 'citizen').toLowerCase() as
        | 'citizen'
        | 'sarpanch'
        | 'secretary';
      setUserRole(role);

      const vName =
        session?.village ||
        admin?.village ||
        secretary?.village ||
        (isHindi ? 'ग्राम पंचायत' : 'Gram Panchayat');
      setVillageName(vName);

      let allComplaints: any[] = [];
      try {
        if (role === 'sarpanch' || role === 'secretary') {
          const data = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(data)) {
            allComplaints = data;
          }
        } else {
          const citizenData = await complaintApi.getCitizenComplaints();
          if (Array.isArray(citizenData)) {
            allComplaints = citizenData;
          }
        }
      } catch (e) {
        console.log('Unable to load complaints for scorecard:', e);
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

            const cat = c.category || c.problemType || (isHindi ? 'ग्राम समस्या' : 'Village Issue');
            catCounts[cat] = (catCounts[cat] || 0) + 1;
          });

          // Resolution rate
          const rate = total > 0 ? Math.round((resolved / total) * 100) : 100;

          // Grade & colors using national theme
          let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'A';
          let gradeColor: string = COLORS.success;
          let gradeBg: string = COLORS.successLight;

          if (total === 0 || rate >= 90) {
            grade = 'A+';
            gradeColor = '#059669';
            gradeBg = '#D1FAE5';
          } else if (rate >= 75) {
            grade = 'A';
            gradeColor = COLORS.success;
            gradeBg = COLORS.successLight;
          } else if (rate >= 55) {
            grade = 'B';
            gradeColor = COLORS.warning;
            gradeBg = COLORS.warningLight;
          } else if (rate >= 35) {
            grade = 'C';
            gradeColor = '#EA580C';
            gradeBg = '#FFEDD5';
          } else {
            grade = 'D';
            gradeColor = COLORS.error;
            gradeBg = COLORS.errorLight;
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
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #172033; background: #FFFFFF; }
            .header { text-align: center; border-bottom: 3px solid #000080; padding-bottom: 12px; margin-bottom: 20px; }
            .tricolor { height: 4px; display: flex; margin-bottom: 12px; }
            .saffron { flex: 1; background: #FF9933; }
            .white { flex: 1; background: #F1F5F9; }
            .green { flex: 1; background: #138808; }
            .title { font-size: 22px; font-weight: 800; color: #000080; letter-spacing: 0.3px; }
            .subtitle { font-size: 14px; color: #64748B; margin-top: 4px; font-weight: 600; }
            .score-box { background: #F7F9FC; border: 1.5px solid #D9E0EA; border-radius: 14px; padding: 18px; margin-bottom: 22px; }
            .stat-grid { display: flex; justify-content: space-around; text-align: center; margin-top: 14px; }
            .stat-item { font-size: 12px; color: #4B5563; font-weight: 600; }
            .stat-num { font-size: 20px; font-weight: 800; color: #000080; margin-bottom: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #D9E0EA; padding: 10px 14px; text-align: left; font-size: 13px; }
            th { background-color: #E8E8F5; color: #000080; font-weight: 800; }
            tr:nth-child(even) { background-color: #F8FAFC; }
          </style>
        </head>
        <body>
          <div class="tricolor">
            <div class="saffron"></div>
            <div class="white"></div>
            <div class="green"></div>
          </div>
          <div class="header">
            <div class="title">ग्राम पंचायत: ${villageName}</div>
            <div class="subtitle">वार्ड प्रगति एवं विकास रिपोर्ट कार्ड • ${currentScore.wardLabel}</div>
          </div>

          <div class="score-box">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h3 style="margin: 0; color: #000080;">${currentScore.wardLabel} (ग्रेड: ${currentScore.grade})</h3>
              <div style="font-size: 14px; font-weight: 700; color: #138808;">समाधान दर: <strong>${currentScore.resolutionRate}%</strong></div>
            </div>
            <div class="stat-grid">
              <div class="stat-item"><div class="stat-num">${currentScore.total}</div>कुल शिकायतें</div>
              <div class="stat-item"><div class="stat-num" style="color:#138808">${currentScore.resolved}</div>हल की गई</div>
              <div class="stat-item"><div class="stat-num" style="color:#D97706">${currentScore.inProgress}</div>कार्रवाई में</div>
              <div class="stat-item"><div class="stat-num" style="color:#DC2626">${currentScore.pending}</div>लंबित</div>
            </div>
          </div>

          <h3 style="color: #000080;">वार्ड में दर्ज समस्याओं की सूची (${currentScore.complaints.length})</h3>
          ${
            currentScore.complaints.length === 0
              ? '<p style="color: #64748B;">इस वार्ड में कोई लंबित शिकायत नहीं है।</p>'
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
                      <td>${c.category || c.problemType || 'सामान्य समस्या'}</td>
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

  const handleBack = () => {
    if (userRole === 'sarpanch') {
      router.replace('/admin');
    } else if (userRole === 'secretary') {
      router.replace('/secretary');
    } else {
      router.replace('/citizen-dashboard');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* TRICOLOR TOP STRIPE */}
      <View style={styles.tricolorBar}>
        <View style={styles.saffronStripe} />
        <View style={styles.whiteStripe} />
        <View style={styles.greenStripe} />
      </View>

      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.navy} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'वार्ड स्कोरकार्ड' : 'Ward Scorecard'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            📍 {villageName} • {currentScore.wardLabel}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={exportWardReport}
          disabled={exporting}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={16} color={COLORS.navy} />
          <Text style={styles.exportText}>{isHindi ? 'PDF रिपोर्ट' : 'PDF'}</Text>
        </TouchableOpacity>
      </View>

      <OfflineSyncBanner isHindi={isHindi} onSyncComplete={calculateScores} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* SEARCH WARD INPUT */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              isHindi
                ? 'वार्ड नंबर खोजें (उदा. 1, 2, 3...)'
                : 'Search Ward Number (e.g. 1, 2, 3...)'
            }
            placeholderTextColor={COLORS.textMuted}
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
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
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
            <ActivityIndicator size="large" color={COLORS.navy} />
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

              {/* 4 STAT BOXES MATCHING THEME */}
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[styles.statNum, { color: COLORS.navy }]}>{currentScore.total}</Text>
                  <Text style={styles.statLbl}>{isHindi ? 'कुल दर्ज' : 'Total'}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: COLORS.successLight }]}>
                  <Text style={[styles.statNum, { color: COLORS.success }]}>
                    {currentScore.resolved}
                  </Text>
                  <Text style={styles.statLbl}>{isHindi ? 'हल हुई' : 'Resolved'}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: COLORS.warningLight }]}>
                  <Text style={[styles.statNum, { color: COLORS.warning }]}>
                    {currentScore.inProgress}
                  </Text>
                  <Text style={styles.statLbl}>{isHindi ? 'प्रगति में' : 'In Progress'}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: COLORS.errorLight }]}>
                  <Text style={[styles.statNum, { color: COLORS.error }]}>
                    {currentScore.pending}
                  </Text>
                  <Text style={styles.statLbl}>{isHindi ? 'लंबित' : 'Pending'}</Text>
                </View>
              </View>

              {/* TOP ISSUE CATEGORY */}
              <View style={styles.topCategoryRow}>
                <Ionicons name="analytics" size={16} color={COLORS.navy} />
                <Text style={styles.topCategoryText}>
                  {isHindi ? 'प्रमुख विषय: ' : 'Top Category: '}
                  <Text style={styles.topCategoryValue}>
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
                <Ionicons name="checkmark-done-circle" size={48} color={COLORS.success} />
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
                const isInProg =
                  st === 'IN PROGRESS' ||
                  st === 'IN_PROGRESS' ||
                  st === 'ACTION TAKEN' ||
                  st === 'ACTION_TAKEN';

                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.problemCard}
                    activeOpacity={0.88}
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
                        <Ionicons name="layers-outline" size={13} color={COLORS.navy} />
                        <Text style={styles.problemCategoryText}>
                          {item.category || item.problemType || (isHindi ? 'ग्राम समस्या' : 'Issue')}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.problemStatusBadge,
                          {
                            backgroundColor: isResolved
                              ? COLORS.successLight
                              : isInProg
                              ? COLORS.warningLight
                              : COLORS.primaryLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.problemStatusText,
                            {
                              color: isResolved
                                ? COLORS.success
                                : isInProg
                                ? COLORS.warning
                                : COLORS.navy,
                            },
                          ]}
                        >
                          {isResolved
                            ? isHindi
                              ? 'हल हो गई'
                              : 'Resolved'
                            : isInProg
                            ? isHindi
                              ? 'कार्रवाई जारी'
                              : 'In Progress'
                            : isHindi
                            ? 'दर्ज की गई'
                            : 'Registered'}
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
                          : isHindi
                          ? 'हाल ही में'
                          : 'Recent'}
                      </Text>

                      <View style={styles.viewDetailBtn}>
                        <Text style={styles.viewDetailText}>
                          {isHindi ? 'विवरण देखें' : 'View'}
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color={COLORS.navy} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* UNIVERSAL BOTTOM NAVIGATION BAR */}
      <DashboardBottomBar activeTab="home" role={userRole} isHindi={isHindi} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Tricolor Top Hairline
  tricolorBar: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
  },
  saffronStripe: {
    flex: 1,
    backgroundColor: COLORS.saffron,
  },
  whiteStripe: {
    flex: 1,
    backgroundColor: COLORS.borderLight,
  },
  greenStripe: {
    flex: 1,
    backgroundColor: COLORS.indiaGreen,
  },

  header: {
    paddingHorizontal: SPACING.screen,
    paddingTop: Platform.OS === 'ios' ? 8 : 10,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '800',
    color: COLORS.navy,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  exportText: {
    color: COLORS.navy,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.small,
  },

  container: {
    padding: SPACING.screen,
    paddingBottom: 40,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.normal,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '600',
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
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  activeWardTab: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  wardTabText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  activeWardTabText: {
    color: COLORS.textWhite,
  },

  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },

  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  wardTitle: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.navy,
  },
  wardSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  gradeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
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
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  progressVal: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.borderLight,
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
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statNum: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLbl: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginTop: 2,
  },

  topCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  topCategoryText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  topCategoryValue: {
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  complaintsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '800',
    color: COLORS.navy,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: '800',
    color: COLORS.navy,
  },

  emptyWardBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  emptyWardTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyWardText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  problemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
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
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  problemCategoryText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
    color: COLORS.navy,
  },
  problemStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  problemStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  problemDescription: {
    fontSize: TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 10,
    fontWeight: '500',
  },
  problemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  problemDate: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: '700',
    color: COLORS.navy,
  },
});
