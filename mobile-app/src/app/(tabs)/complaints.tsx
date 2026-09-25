import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { complaintApi, ComplaintData } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../theme';

type Complaint = {
  complaintId?: string;
  citizenName?: string;
  citizenMobile?: string;
  ward?: string;
  category?: string;
  priority?: string;
  department?: string;
  deadline?: string | null;
  description?: string;
  photo?: string | null;
  audioUrl?: string | null;
  location?: string | null;
  status?: string;
  dateTime?: string;
};

export default function ComplaintsScreen() {
  const router = useRouter();

  const { filter } =
    useLocalSearchParams<{
      filter?: string;
    }>();

  const {
    language,
    setLanguage,
    t,
  } = useLanguage();

  const [complaints, setComplaints] =
    useState<Complaint[]>([]);

  const [loading, setLoading] =
    useState(false);
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary'>('citizen');

  // =====================================================
  // LANGUAGE
  // =====================================================

  const toggleLanguage = () => {
    setLanguage(
      language === 'hi'
        ? 'en'
        : 'hi'
    );
  };

  // =====================================================
  // MAP BACKEND DATA TO LOCAL COMPLAINT FORMAT
  // =====================================================
  const mapBackendComplaint = (item: ComplaintData): Complaint => ({
    complaintId: String(item.id),
    category: item.category || item.problemType || 'Village Issue',
    ward: item.wardNumber ? `Ward ${item.wardNumber}` : item.location || '',
    priority: item.priority || 'MEDIUM',
    department: item.department || '',
    deadline: item.deadline || null,
    description: item.description || '',
    photo: item.photo || null,
    audioUrl: item.audioUrl || null,
    location: item.location || (item.villageName ? item.villageName : ''),
    status: item.status || 'SUBMITTED',
    dateTime: item.createdAt || new Date().toISOString(),
  });

  // =====================================================
  // LOAD COMPLAINTS (API + STORAGE FALLBACK)
  // =====================================================

  const loadComplaints = async () => {
    try {
      setLoading(true);

      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const role = String(session?.role || 'citizen').toLowerCase() as 'citizen' | 'sarpanch' | 'secretary';
      setUserRole(role);

      let fetchedList: Complaint[] = [];

      let apiSuccess = false;
      // 1. Try fetching from Backend Spring Boot Database API
      try {
        if (role === 'sarpanch' || role === 'secretary' || (role as string) === 'admin') {
          const apiData = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(apiData)) {
            fetchedList = apiData.map(mapBackendComplaint);
            apiSuccess = true;
          }
        } else {
          const apiData = await complaintApi.getCitizenComplaints();
          if (Array.isArray(apiData)) {
            fetchedList = apiData.map(mapBackendComplaint);
            apiSuccess = true;
          }
        }
      } catch (apiErr) {
        console.log('Backend complaint fetch error, falling back to local:', apiErr);
      }

      // 2. If API responded, use Database data!
      if (apiSuccess) {
        fetchedList.sort(
          (a, b) =>
            new Date(b.dateTime || 0).getTime() -
            new Date(a.dateTime || 0).getTime()
        );
        setComplaints(fetchedList);
        return;
      }

      // 3. Fallback: Load from local AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      const complaintKeys = allKeys.filter((key) =>
        key.startsWith('complaint_')
      );

      const localList: Complaint[] = [];

      let currentMobile = '';
      if (role === 'citizen') {
        const citizenData = await AsyncStorage.getItem('citizen');
        if (citizenData) {
          const c = JSON.parse(citizenData);
          currentMobile = String(c.mobile || '').trim();
        }
      }

      for (const key of complaintKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (!data) continue;

          const complaint: Complaint = JSON.parse(data);
          const complaintMobile = String(complaint.citizenMobile || '').trim();

          // For Sarpanch/Secretary, show all complaints. For Citizen, show own complaints.
          if (role !== 'citizen' || !currentMobile || complaintMobile === currentMobile) {
            localList.push(complaint);
          }
        } catch (error) {
          console.log('Invalid complaint data:', key);
        }
      }

      localList.sort(
        (a, b) =>
          new Date(b.dateTime || 0).getTime() -
          new Date(a.dateTime || 0).getTime()
      );

      setComplaints(localList);
    } catch (error) {
      console.log('Unable to load complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REFRESH WHEN SCREEN OPENS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [])
  );

  // =====================================================
  // SELECTED FILTER
  // =====================================================

  const selectedFilter =
    typeof filter === 'string'
      ? filter
      : '';

  // =====================================================
  // FILTER COMPLAINTS
  // =====================================================

  const filteredComplaints =
    selectedFilter ===
      'in-progress'
      ? complaints.filter(
        (complaint) => {
          const status =
            String(
              complaint.status ||
              ''
            ).toUpperCase();

          return (
            status ===
            'IN PROGRESS' ||
            status ===
            'ACTION TAKEN'
          );
        }
      )
      : selectedFilter ===
        'resolved'
        ? complaints.filter(
          (complaint) => {
            const status =
              String(
                complaint.status ||
                ''
              ).toUpperCase();

            return (
              status ===
              'RESOLVED' ||
              status === 'CLOSED'
            );
          }
        )
        : complaints;

  // =====================================================
  // TITLE
  // =====================================================

  const getTitle = () => {
    if (
      selectedFilter ===
      'in-progress'
    ) {
      return t.inProgress;
    }

    if (
      selectedFilter ===
      'resolved'
    ) {
      return t.resolved;
    }

    return language === 'hi'
      ? 'सभी शिकायतें'
      : 'All Complaints';
  };

  // =====================================================
  // CATEGORY LABEL
  // =====================================================

  const getCategoryLabel = (
    category: string
  ) => {
    const categoryMap: Record<
      string,
      string
    > = {
      Water: t.water,
      Roads: t.roads,
      'Street Lights':
        t.streetLights,
      'Garbage/Sanitation':
        t.garbage,
      Drainage: t.drainage,
      Electricity:
        t.electricity,
      'Government Services':
        t.governmentServices,
      Other: t.otherProblem,
    };

    return (
      categoryMap[category] ||
      category
    );
  };

  // =====================================================
  // STATUS LABEL
  // =====================================================

  const getStatusLabel = (
    status: string
  ) => {
    const statusMap: Record<
      string,
      string
    > = {
      SUBMITTED: t.submitted,
      'UNDER REVIEW':
        t.underReview,
      'ACTION TAKEN':
        t.actionTaken,
      'IN PROGRESS':
        t.inProgress,
      RESOLVED: t.resolved,
      VERIFICATION:
        t.verification,
      CLOSED: t.closed,
    };

    return (
      statusMap[status] ||
      status
    );
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const getStatusStyle = (
    status: string
  ) => {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return {
          backgroundColor:
            COLORS.successLight,
          color:
            COLORS.indiaGreen,
        };

      case 'IN PROGRESS':
      case 'ACTION TAKEN':
        return {
          backgroundColor:
            COLORS.warningLight,
          color:
            COLORS.warning,
        };

      case 'VERIFICATION':
        return {
          backgroundColor:
            COLORS.infoLight,
          color:
            COLORS.info,
        };

      default:
        return {
          backgroundColor:
            COLORS.primaryLight,
          color:
            COLORS.primary,
        };
    }
  };

  // =====================================================
  // OPEN COMPLAINT DETAILS
  // =====================================================

  const openComplaint = (
    complaintId?: string
  ) => {
    if (!complaintId) {
      return;
    }

    router.push({
      pathname:
        '/complaint-details',
      params: {
        id: complaintId,
      },
    });
  };

  // =====================================================
  // REPORT NEW COMPLAINT
  // =====================================================

  const reportNewComplaint = () => {
    router.push({
      pathname: '/report',
      params: {
        category: '',
      },
    });
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (userRole === 'sarpanch') {
                router.replace('/admin');
              } else if (userRole === 'secretary') {
                router.replace('/secretary');
              } else {
                router.replace('/citizen-dashboard');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back-outline"
              size={22}
              color={COLORS.primary}
            />
          </TouchableOpacity>

          <Text
            style={styles.title}
          >
            {getTitle()}
          </Text>

          <TouchableOpacity
            style={
              styles.languageButton
            }
            onPress={
              toggleLanguage
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="language-outline"
              size={17}
              color={COLORS.textWhite}
            />

            <Text
              style={
                styles.languageText
              }
            >
              {language === 'hi'
                ? 'EN'
                : 'हि'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* =================================================
            COUNT
        ================================================= */}

        <View
          style={styles.countRow}
        >
          <View
            style={
              styles.countIcon
            }
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={COLORS.primary}
            />
          </View>

          <Text
            style={styles.countText}
          >
            {filteredComplaints.length}{' '}
            {language === 'hi'
              ? filteredComplaints.length ===
                1
                ? 'शिकायत'
                : 'शिकायतें'
              : filteredComplaints.length ===
                1
                ? 'complaint'
                : 'complaints'}
          </Text>
        </View>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.emptyIconCircle
              }
            >
              <Ionicons
                name="refresh-outline"
                size={42}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {language === 'hi'
                ? 'शिकायतें लोड हो रही हैं'
                : 'Loading complaints'}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {language === 'hi'
                ? 'कृपया प्रतीक्षा करें...'
                : 'Please wait...'}
            </Text>
          </View>
        ) : filteredComplaints.length ===
          0 ? (

          /* =================================================
             EMPTY STATE
          ================================================= */

          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.emptyIconCircle
              }
            >
              <Ionicons
                name="document-text-outline"
                size={42}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {selectedFilter ===
                'in-progress'
                ? language === 'hi'
                  ? 'कोई शिकायत प्रगति में नहीं है'
                  : 'No complaints in progress'
                : selectedFilter ===
                  'resolved'
                  ? language === 'hi'
                    ? 'कोई हल की गई शिकायत नहीं है'
                    : 'No resolved complaints'
                  : language === 'hi'
                    ? 'कोई शिकायत नहीं मिली'
                    : 'No Complaints Found'}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {selectedFilter ===
                'in-progress'
                ? language === 'hi'
                  ? 'अभी कोई शिकायत कार्रवाई में नहीं है।'
                  : 'You currently have no complaints in progress.'
                : selectedFilter ===
                  'resolved'
                  ? language === 'hi'
                    ? 'अभी कोई शिकायत हल नहीं हुई है।'
                    : 'You currently have no resolved complaints.'
                  : language === 'hi'
                    ? 'अभी कोई शिकायत उपलब्ध नहीं है।'
                    : 'There are no complaints available right now.'}
            </Text>

            <TouchableOpacity
              style={
                styles.reportButton
              }
              onPress={
                reportNewComplaint
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={19}
                color={
                  COLORS.textWhite
                }
              />

              <Text
                style={
                  styles.reportButtonText
                }
              >
                {t.reportProblem}
              </Text>
            </TouchableOpacity>
          </View>

        ) : (

          /* =================================================
             COMPLAINT LIST
          ================================================= */

          filteredComplaints.map(
            (complaint, index) => {
              const status =
                String(
                  complaint.status ||
                  'SUBMITTED'
                ).toUpperCase();

              const statusStyle =
                getStatusStyle(
                  status
                );

              return (
                <TouchableOpacity
                  key={
                    complaint.complaintId ||
                    `complaint-${index}`
                  }
                  style={
                    styles.complaintCard
                  }
                  activeOpacity={0.82}
                  onPress={() =>
                    openComplaint(
                      complaint.complaintId
                    )
                  }
                >

                  {/* ================= COMPLAINT HEADER ================= */}

                  <View
                    style={
                      styles.complaintHeader
                    }
                  >
                    <View
                      style={
                        styles.idWrapper
                      }
                    >
                      <View
                        style={
                          styles.idIcon
                        }
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={17}
                          color={
                            COLORS.primary
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.complaintId
                        }
                      >
                        {complaint.complaintId ||
                          'No ID'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            statusStyle.backgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              statusStyle.color,
                          },
                        ]}
                      >
                        {getStatusLabel(
                          status
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* ================= CATEGORY ================= */}

                  <View
                    style={
                      styles.categoryRow
                    }
                  >
                    <Ionicons
                      name="layers-outline"
                      size={17}
                      color={
                        COLORS.accent
                      }
                    />

                    <Text
                      style={
                        styles.category
                      }
                    >
                      {getCategoryLabel(
                        complaint.category ||
                        'Other'
                      )}
                    </Text>
                  </View>

                  {/* ================= WARD ================= */}

                  <View
                    style={
                      styles.detailRow
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.detail
                      }
                    >
                      {language === 'hi'
                        ? 'वार्ड'
                        : 'Ward'}
                      :{' '}
                      {complaint.ward ||
                        (language === 'hi'
                          ? 'उपलब्ध नहीं'
                          : 'Not provided')}
                    </Text>
                  </View>

                  {/* ================= DESCRIPTION ================= */}

                  <Text
                    style={
                      styles.description
                    }
                    numberOfLines={2}
                  >
                    {complaint.description ||
                      (language === 'hi'
                        ? 'विवरण उपलब्ध नहीं है'
                        : 'No description available')}
                  </Text>

                  {/* ================= DATE ================= */}

                  <View
                    style={
                      styles.dateRow
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={
                        COLORS.textMuted
                      }
                    />

                    <Text
                      style={
                        styles.date
                      }
                    >
                      {complaint.dateTime
                        ? new Date(
                          complaint.dateTime
                        ).toLocaleString()
                        : language ===
                          'hi'
                          ? 'दिनांक उपलब्ध नहीं'
                          : 'Date not available'}
                    </Text>
                  </View>

                  {/* ================= VIEW DETAILS ================= */}

                  <View
                    style={
                      styles.viewDetailsRow
                    }
                  >
                    <Text
                      style={
                        styles.viewDetails
                      }
                    >
                      {language ===
                        'hi'
                        ? 'विवरण देखें'
                        : 'View Details'}
                    </Text>

                    <Ionicons
                      name="arrow-forward-outline"
                      size={17}
                      color={
                        COLORS.primary
                      }
                    />
                  </View>

                </TouchableOpacity>
              );
            }
          )
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal:
      SPACING.screen,
    paddingBottom: 40,
  },

  /* ================= HEADER ================= */

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom:
      SPACING.md,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor:
      COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    fontSize:
      TYPOGRAPHY.title,
    lineHeight:
      TYPOGRAPHY.lineTitle,
    fontWeight:
      TYPOGRAPHY.bold,
    color: COLORS.navy,
  },

  languageButton: {
    minWidth: 58,
    height: 40,
    paddingHorizontal:
      SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor:
      COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  languageText: {
    color:
      COLORS.textWhite,
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.bold,
  },

  /* ================= COUNT ================= */

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom:
      SPACING.normal,
  },

  countIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor:
      COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight:
      SPACING.sm,
  },

  countText: {
    fontSize:
      TYPOGRAPHY.body,
    color:
      COLORS.textSecondary,
    fontWeight:
      TYPOGRAPHY.mediumWeight,
  },

  /* ================= COMPLAINT CARD ================= */

  complaintCard: {
    backgroundColor:
      COLORS.card,
    borderRadius:
      RADIUS.lg,
    padding:
      SPACING.lg,
    marginBottom:
      SPACING.md,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    ...SHADOWS.small,
  },

  complaintHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom:
      SPACING.md,
  },

  idWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight:
      SPACING.sm,
  },

  idIcon: {
    width: 32,
    height: 32,
    borderRadius:
      RADIUS.sm,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight:
      SPACING.sm,
  },

  complaintId: {
    fontSize:
      TYPOGRAPHY.medium,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.primary,
    flexShrink: 1,
  },

  statusBadge: {
    borderRadius:
      RADIUS.round,
    paddingHorizontal:
      SPACING.md,
    paddingVertical: 6,
  },

  statusText: {
    fontSize:
      TYPOGRAPHY.xs,
    fontWeight:
      TYPOGRAPHY.bold,
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom:
      SPACING.sm,
    gap: 7,
  },

  category: {
    fontSize:
      TYPOGRAPHY.large,
    fontWeight:
      TYPOGRAPHY.semiBold,
    color:
      COLORS.textPrimary,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom:
      SPACING.sm,
    gap: 6,
  },

  detail: {
    fontSize:
      TYPOGRAPHY.bodySmall,
    color:
      COLORS.textSecondary,
  },

  description: {
    fontSize:
      TYPOGRAPHY.body,
    color:
      COLORS.textSecondary,
    lineHeight:
      TYPOGRAPHY.lineBody,
    marginBottom:
      SPACING.md,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  date: {
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
  },

  viewDetailsRow: {
    marginTop:
      SPACING.md,
    paddingTop:
      SPACING.md,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  viewDetails: {
    fontSize:
      TYPOGRAPHY.bodySmall,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.primary,
  },

  /* ================= EMPTY ================= */

  emptyCard: {
    backgroundColor:
      COLORS.card,
    borderRadius:
      RADIUS.xl,
    padding: 30,
    alignItems: 'center',
    marginTop:
      SPACING.normal,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    ...SHADOWS.small,
  },

  emptyIconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom:
      SPACING.md,
  },

  emptyTitle: {
    fontSize:
      TYPOGRAPHY.subtitle,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.textPrimary,
    marginBottom:
      SPACING.sm,
    textAlign: 'center',
  },

  emptyText: {
    fontSize:
      TYPOGRAPHY.body,
    color:
      COLORS.textSecondary,
    textAlign: 'center',
    lineHeight:
      TYPOGRAPHY.lineBody,
    marginBottom:
      SPACING.lg,
  },

  reportButton: {
    backgroundColor:
      COLORS.primary,
    borderRadius:
      RADIUS.md,
    paddingHorizontal:
      SPACING.xl,
    paddingVertical:
      SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 7,
  },

  reportButtonText: {
    color:
      COLORS.textWhite,
    fontSize:
      TYPOGRAPHY.body,
    fontWeight:
      TYPOGRAPHY.bold,
  },
});