import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Alert,
  Animated,
  Easing,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../i18n/LanguageContext';
import { complaintApi } from '../services/api';
import { OfflineSyncBanner } from '../components/OfflineSyncBanner';

import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

type Citizen = {
  name?: string;
  mobile?: string;
  village?: string;
  ward?: string;
  password?: string;
  profileImage?: string | null;
};

type Complaint = {
  complaintId?: string;
  citizenMobile?: string;
  status?: string;
  dateTime?: string;
};

export default function CitizenDashboard() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();

  const [user, setUser] = useState<Citizen | null>(null);

  const [totalComplaints, setTotalComplaints] = useState(0);
  const [inProgressComplaints, setInProgressComplaints] = useState(0);
  const [resolvedComplaints, setResolvedComplaints] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  const isHindi = language === 'hi';

  // =====================================================
  // LANGUAGE
  // =====================================================

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  // =====================================================
  // LOAD CURRENT LOGGED-IN CITIZEN
  // =====================================================

  const getCurrentCitizen = async (): Promise<Citizen | null> => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const storedCitizen = await AsyncStorage.getItem('citizen');
      const citizen: Citizen = storedCitizen ? JSON.parse(storedCitizen) : {};

      const currentMobile = String(session?.mobile || citizen?.mobile || '').trim();
      const photo = currentMobile
        ? await AsyncStorage.getItem(`profile_image_${currentMobile}`)
        : null;

      if (session || storedCitizen) {
        return {
          name: session?.name || citizen?.name || 'नागरिक',
          mobile: currentMobile,
          village: session?.village || citizen?.village || '',
          ward: session?.ward || citizen?.ward || '',
          profileImage: photo || null,
        };
      }

      return null;
    } catch (error) {
      console.log('Current citizen load error:', error);
      return null;
    }
  };

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  const loadDashboardData = useCallback(async () => {
    try {
      const currentCitizen =
        await getCurrentCitizen();

      setUser(currentCitizen);

      if (!currentCitizen) {
        setTotalComplaints(0);
        setInProgressComplaints(0);
        setResolvedComplaints(0);
        return;
      }

      const currentMobile = String(
        currentCitizen.mobile || ''
      ).trim();

      if (!currentMobile) {
        setTotalComplaints(0);
        setInProgressComplaints(0);
        setResolvedComplaints(0);
        return;
      }

      // Try loading live complaints from backend
      // Load live complaints directly from Backend Database API
      try {
        const liveComplaints = await complaintApi.getCitizenComplaints();
        if (liveComplaints && Array.isArray(liveComplaints)) {
          setTotalComplaints(liveComplaints.length);
          setInProgressComplaints(
            liveComplaints.filter(
              (c) =>
                c.status === 'IN_PROGRESS' ||
                c.status === 'UNDER_REVIEW' ||
                c.status === 'ACTION_TAKEN'
            ).length
          );
          setResolvedComplaints(
            liveComplaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length
          );
        } else {
          setTotalComplaints(0);
          setInProgressComplaints(0);
          setResolvedComplaints(0);
        }
      } catch (backendErr) {
        console.log('Error fetching citizen complaints from backend:', backendErr);
        setTotalComplaints(0);
        setInProgressComplaints(0);
        setResolvedComplaints(0);
      }
    } catch (error) {
      console.log(
        'Dashboard load error:',
        error
      );

      setTotalComplaints(0);
      setInProgressComplaints(0);
      setResolvedComplaints(0);
    }
  }, []);

  // =====================================================
  // ANIMATION
  // =====================================================

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // =====================================================
  // REFRESH WHEN SCREEN OPENS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // =====================================================
  // NAVIGATION
  // =====================================================

  const openReport = (category: string) => {
    router.push({
      pathname: '/report',
      params: { category },
    });
  };

  const openComplaints = (
    filter?: string
  ) => {
    router.push({
      pathname: '/(tabs)/complaints',
      params: filter
        ? { filter }
        : {},
    });
  };

  const openNotifications = () => {
    router.push('/notifications');
  };

  const openProfile = () => {
    router.push('/profile');
  };

  const openAddAccount = () => {
    router.push('/role-selection');
  };

  const openHelpLine = () => {
    router.push('/help-line');
  };

  // =====================================================
  // CALL
  // =====================================================

  const callNumber = async (
    number: string
  ) => {
    try {
      await Linking.openURL(
        `tel:${number}`
      );
    } catch {
      Alert.alert(
        isHindi
          ? 'कॉल नहीं हो सकी'
          : 'Unable to call'
      );
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = async () => {
    const doLogout = async () => {
      try {
        await AsyncStorage.removeItem('user_session');
        await AsyncStorage.removeItem('@village_jwt_token');
        await AsyncStorage.removeItem('@village_user_session');
        await AsyncStorage.removeItem('token');
        router.replace('/(tabs)');
      } catch (error) {
        console.log('Logout error:', error);
        router.replace('/(tabs)');
      }
    };

    if (Platform.OS === 'web') {
      const confirmLogout = typeof window !== 'undefined'
        ? window.confirm(
            isHindi
              ? 'क्या आप लॉग आउट करना चाहते हैं?'
              : 'Do you want to logout?'
          )
        : true;
      if (confirmLogout) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      isHindi ? 'लॉग आउट' : 'Logout',
      isHindi ? 'क्या आप लॉग आउट करना चाहते हैं?' : 'Do you want to logout?',
      [
        {
          text: isHindi ? 'रद्द करें' : 'Cancel',
          style: 'cancel',
        },
        {
          text: isHindi ? 'लॉग आउट' : 'Logout',
          style: 'destructive',
          onPress: doLogout,
        },
      ]
    );
  };

  // =====================================================
  // CATEGORY COMPONENT
  // =====================================================

  const Category = ({
    icon,
    label,
    category,
    backgroundColor,
    iconColor,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    category: string;
    backgroundColor: string;
    iconColor: string;
  }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() =>
        openReport(category)
      }
      activeOpacity={0.82}
    >
      <View
        style={[
          styles.categoryIcon,
          {
            backgroundColor,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={27}
          color={iconColor}
        />
      </View>

      <Text
        style={styles.categoryText}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // =====================================================
  // CONTACT ROW
  // =====================================================

  const ContactRow = ({
    icon,
    title,
    number,
    enabled = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    number: string;
    enabled?: boolean;
  }) => (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>
          {title}
        </Text>

        <Text style={styles.contactNumber}>
          {number}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.callButton,
          !enabled &&
            styles.callButtonDisabled,
        ]}
        onPress={() => {
          if (enabled) {
            callNumber(number);
          }
        }}
        activeOpacity={0.8}
      >
        <Ionicons
          name="call-outline"
          size={16}
          color={
            enabled
              ? COLORS.white
              : COLORS.textMuted
          }
        />

        <Text
          style={[
            styles.callButtonText,
            !enabled &&
              styles.callButtonTextDisabled,
          ]}
        >
          {isHindi
            ? 'कॉल'
            : 'Call'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // =====================================================
  // PROFILE PHOTO
  // =====================================================

  const ProfilePhoto = ({
    size = 48,
  }: {
    size?: number;
  }) => {
    if (user?.profileImage) {
      return (
        <Image
          source={{
            uri: user.profileImage,
          }}
          style={[
            styles.profileImage,
            {
              width: size,
              height: size,
              borderRadius:
                size / 2,
            },
          ]}
        />
      );
    }

    return (
      <View
        style={[
          styles.profilePlaceholder,
          {
            width: size,
            height: size,
            borderRadius:
              size / 2,
          },
        ]}
      >
        <Ionicons
          name="person-outline"
          size={size * 0.48}
          color={COLORS.primary}
        />
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >
        {/* =================================================
            TRICOLOR TOP BAR
        ================================================= */}
        <View style={styles.tricolorBar}>
          <View style={styles.saffronStripe} />
          <View style={styles.whiteStripe} />
          <View style={styles.greenStripe} />
        </View>

        {/* =================================================
            HEADER
        ================================================= */}

        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim,
                },
              ],
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={styles.logoRow}>
              <View
                style={styles.logoIcon}
              >
                <Ionicons
                  name="home-outline"
                  size={21}
                  color={COLORS.white}
                />
              </View>

              <Text
                style={styles.appTitle}
              >
                VillageApp
              </Text>
            </View>

            <Text
              style={styles.headerSubtitle}
            >
              {isHindi
                ? 'नागरिक डैशबोर्ड'
                : 'Citizen Dashboard'}
            </Text>
          </View>

          <View
            style={styles.headerActions}
          >
            {/* LANGUAGE */}

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
                size={16}
                color={COLORS.primary}
              />

              <Text
                style={
                  styles.languageText
                }
              >
                {isHindi
                  ? 'EN'
                  : 'हि'}
              </Text>
            </TouchableOpacity>

            {/* NOTIFICATION */}

            <TouchableOpacity
              style={
                styles.iconButton
              }
              onPress={
                openNotifications
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={COLORS.primary}
              />

              <View
                style={
                  styles.notificationBadge
                }
              >
                <Text
                  style={
                    styles.badgeText
                  }
                >
                  3
                </Text>
              </View>
            </TouchableOpacity>

            {/* REAL PROFILE PHOTO */}

            <TouchableOpacity
              style={
                styles.headerProfileButton
              }
              onPress={
                openProfile
              }
              activeOpacity={0.8}
            >
              <ProfilePhoto size={40} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* OFFLINE SYNC BANNER */}
        <OfflineSyncBanner isHindi={isHindi} onSyncComplete={loadDashboardData} />

        {/* =================================================
            WELCOME
        ================================================= */}

        <Animated.View
          style={[
            styles.welcomeCard,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY:
                    slideAnim,
                },
              ],
            },
          ]}
        >
          <View
            style={
              styles.welcomeMain
            }
          >
            <ProfilePhoto size={58} />

            <View
              style={
                styles.welcomeTextArea
              }
            >
              <Text
                style={
                  styles.welcomeSmall
                }
              >
                {isHindi
                  ? `नमस्ते, ${
                      user?.name ||
                      'नागरिक'
                    } 👋`
                  : `Hello, ${
                      user?.name ||
                      'Citizen'
                    } 👋`}
              </Text>

              <Text
                style={
                  styles.welcomeDescription
                }
              >
                {isHindi
                  ? 'अपने गाँव की समस्या दर्ज करें।'
                  : 'Make your village better, one report at a time.'}
              </Text>

              <Text
                style={
                  styles.welcomeTagline
                }
              >
                {isHindi
                  ? 'आपकी आवाज़ • आपका गाँव • आपका समाधान'
                  : 'Your voice • Your village • Your solution'}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.welcomeFooter
            }
          >
            <View
              style={
                styles.onlineDot
              }
            />

            <Text
              style={
                styles.welcomeFooterText
              }
            >
              {isHindi
                ? 'VillageApp से जुड़े रहें'
                : 'Stay connected with VillageApp'}
            </Text>
          </View>
        </Animated.View>

        {/* =================================================
            COMPLAINT SUMMARY
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              {isHindi
                ? 'आपकी शिकायतें'
                : 'Your Complaints'}
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {isHindi
                ? 'शिकायतों की वर्तमान स्थिति'
                : 'Current complaint status'}
            </Text>
          </View>

          <View
            style={
              styles.sectionIcon
            }
          >
            <Ionicons
              name="stats-chart-outline"
              size={21}
              color={COLORS.primary}
            />
          </View>
        </View>

        <View
          style={styles.statsRow}
        >
          {/* TOTAL */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              openComplaints()
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    COLORS.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>

            <Text
              style={
                styles.statNumber
              }
            >
              {totalComplaints}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              {t.total}
            </Text>
          </TouchableOpacity>

          {/* IN PROGRESS */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              openComplaints(
                'in-progress'
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    COLORS.warningLight,
                },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={COLORS.warning}
              />
            </View>

            <Text
              style={
                styles.statNumber
              }
            >
              {inProgressComplaints}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              {t.inProgress}
            </Text>
          </TouchableOpacity>

          {/* RESOLVED */}

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              openComplaints(
                'resolved'
              )
            }
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.statIcon,
                {
                  backgroundColor:
                    COLORS.successLight,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color={COLORS.success}
              />
            </View>

            <Text
              style={
                styles.statNumber
              }
            >
              {resolvedComplaints}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              {t.resolved}
            </Text>
          </TouchableOpacity>
        </View>

        {/* WARD TRANSPARENCY SCORECARD TILE */}
        <TouchableOpacity
          style={styles.wardScorecardBanner}
          onPress={() => router.push('/ward-scorecard' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.wardScorecardIcon}>
            <Ionicons
              name="stats-chart"
              size={22}
              color={COLORS.primary}
            />
          </View>

          <View style={styles.wardScorecardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.wardScorecardTitle}>
                {isHindi
                  ? '📊 वार्ड विकास रिपोर्ट कार्ड'
                  : '📊 Ward Performance Scorecard'}
              </Text>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>LIVE</Text>
              </View>
            </View>

            <Text style={styles.wardScorecardSubtitle}>
              {isHindi
                ? 'अपने वार्ड का विकास ग्रेड (A+/A/B/C) व समाधान दर देखें'
                : 'Check your ward ranking, grade & resolution progress'}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {/* =================================================
            REPORT PROBLEM
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              {isHindi
                ? 'समस्या दर्ज करें'
                : 'Report a Problem'}
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {isHindi
                ? 'समस्या की श्रेणी चुनें'
                : 'Choose a problem category'}
            </Text>
          </View>

          <View
            style={styles.aiBadge}
          >
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={COLORS.primary}
            />

            <Text
              style={styles.aiText}
            >
              AI
            </Text>
          </View>
        </View>

        <View
          style={styles.problemCard}
        >
          {/* EXACT 3 x 2 GRID */}

          <View
            style={styles.categoryGrid}
          >
            <Category
              icon="water-outline"
              label={t.water}
              category="Water"
              backgroundColor={
                COLORS.infoLight
              }
              iconColor={COLORS.info}
            />

            <Category
              icon="car-outline"
              label={t.roads}
              category="Roads"
              backgroundColor={
                COLORS.primaryLight
              }
              iconColor={COLORS.primary}
            />

            <Category
              icon="bulb-outline"
              label={t.streetLights}
              category="Street Lights"
              backgroundColor={
                COLORS.accentLight
              }
              iconColor={COLORS.saffron}
            />

            <Category
              icon="trash-outline"
              label={t.garbage}
              category="Garbage/Sanitation"
              backgroundColor={
                COLORS.successLight
              }
              iconColor={COLORS.success}
            />

            <Category
              icon="rainy-outline"
              label={t.drainage}
              category="Drainage"
              backgroundColor={
                COLORS.infoLight
              }
              iconColor={COLORS.info}
            />

            <Category
              icon="flash-outline"
              label={t.electricity}
              category="Electricity"
              backgroundColor={
                COLORS.warningLight
              }
              iconColor={COLORS.warning}
            />
          </View>

          {/* OTHER PROBLEM */}

          <TouchableOpacity
            style={
              styles.otherProblemButton
            }
            onPress={() =>
              openReport(
                'Other Problem'
              )
            }
            activeOpacity={0.82}
          >
            <View
              style={
                styles.otherProblemIcon
              }
            >
              <Ionicons
                name="help-circle-outline"
                size={24}
                color={COLORS.primary}
              />
            </View>

            <View
              style={
                styles.otherProblemText
              }
            >
              <Text
                style={
                  styles.otherProblemTitle
                }
              >
                {isHindi
                  ? 'अन्य समस्या'
                  : 'Other Problem'}
              </Text>

              <Text
                style={
                  styles.otherProblemSubtitle
                }
              >
                {isHindi
                  ? 'ऊपर दी गई श्रेणियों में समस्या नहीं है?'
                  : 'Problem not listed above?'}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            HELP LINE & CONTACTS
        ================================================= */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {isHindi ? 'हेल्प लाइन और संपर्क' : 'Help Line & Contacts'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {isHindi ? 'सभी जरूरी संपर्क एक जगह' : 'All important contacts in one place'}
            </Text>
          </View>

          <View style={styles.sectionIcon}>
            <Ionicons name="call-outline" size={21} color={INDIA.saffron} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.helpLineCard}
          onPress={openHelpLine}
          activeOpacity={0.85}
        >
          <View style={styles.helpLineIcon}>
            <Ionicons name="call-outline" size={26} color={INDIA.green} />
          </View>

          <View style={styles.helpLineContent}>
            <Text style={styles.helpLineTitle}>
              {isHindi ? 'सभी हेल्पलाइन और संपर्क देखें' : 'View Help Lines & Contacts'}
            </Text>
            <Text style={styles.helpLineSubtitle}>
              {isHindi
                ? 'सीएम हेल्पलाइन (181) • आपातकाल (112) • एम्बुलेंस • सरपंच • सचिव'
                : 'CM Helpline (181) • Emergency (112) • Ambulance • Sarpanch • Secretary'}
            </Text>
          </View>

          <View style={styles.helpLineArrow}>
            <Ionicons name="chevron-forward" size={21} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        {/* =================================================
            MY ACCOUNT
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              {isHindi
                ? 'खाता'
                : 'Account'}
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {isHindi
                ? 'अपने खाते को प्रबंधित करें'
                : 'Manage your account'}
            </Text>
          </View>
        </View>

        <View
          style={styles.accountCard}
        >
          {/* MY ACCOUNT */}

          <TouchableOpacity
            style={styles.accountRow}
            onPress={
              openProfile
            }
            activeOpacity={0.8}
          >
            <View
              style={styles.accountIcon}
            >
              <Ionicons
                name="person-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View
              style={
                styles.accountTextWrapper
              }
            >
              <Text
                style={
                  styles.accountTitle
                }
              >
                {isHindi
                  ? 'मेरा अकाउंट'
                  : 'My Account'}
              </Text>

              <Text
                style={
                  styles.accountSubtitle
                }
                numberOfLines={1}
              >
                {user?.name ||
                  (isHindi
                    ? 'प्रोफाइल देखें और अपडेट करें'
                    : 'View and update your profile')}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <View
            style={styles.divider}
          />

          {/* ADD ACCOUNT */}

          <TouchableOpacity
            style={styles.accountRow}
            onPress={
              openAddAccount
            }
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.accountIcon,
                {
                  backgroundColor:
                    COLORS.successLight,
                },
              ]}
            >
              <Ionicons
                name="person-add-outline"
                size={22}
                color={COLORS.success}
              />
            </View>

            <View
              style={
                styles.accountTextWrapper
              }
            >
              <Text
                style={
                  styles.accountTitle
                }
              >
                {isHindi
                  ? 'अकाउंट जोड़ें'
                  : 'Add Account'}
              </Text>

              <Text
                style={
                  styles.accountSubtitle
                }
              >
                {isHindi
                  ? 'एक और नागरिक अकाउंट बनाएं'
                  : 'Create another citizen account'}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          <View
            style={styles.divider}
          />

          {/* LOGOUT */}

          <TouchableOpacity
            style={styles.accountRow}
            onPress={logout}
            activeOpacity={0.8}
          >
            <View
              style={styles.logoutIcon}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color={COLORS.error}
              />
            </View>

            <View
              style={
                styles.accountTextWrapper
              }
            >
              <Text
                style={
                  styles.logoutTitle
                }
              >
                {isHindi
                  ? 'लॉग आउट'
                  : 'Logout'}
              </Text>

              <Text
                style={
                  styles.accountSubtitle
                }
              >
                {isHindi
                  ? 'वर्तमान अकाउंट से बाहर निकलें'
                  : 'Sign out from this account'}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={21}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <View
          style={styles.footer}
        >
          <View
            style={styles.footerLine}
          />

          <Text
            style={styles.footerText}
          >
            VillageApp •{' '}
            {isHindi
              ? 'बेहतर गांव की ओर एक कदम'
              : 'One step towards a better village'}
          </Text>

          <View
            style={styles.footerLine}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================

const INDIA = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  navy: '#000080',
  lightGreen: '#EAF6EA',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal:
      SPACING.normal,
    paddingBottom: 35,
  },

  // ===================================================
  // HEADER
  // ===================================================

  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingVertical: 10,
  },

  headerLeft: {
    flex: 1,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      INDIA.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  appTitle: {
    fontSize:
      TYPOGRAPHY.subtitle,
    fontWeight:
      TYPOGRAPHY.extraBold,
    color:
      COLORS.textPrimary,
  },

  headerSubtitle: {
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
    marginTop: 2,
    marginLeft: 47,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  languageButton: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius:
      RADIUS.md,
    backgroundColor:
      COLORS.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  languageText: {
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.primary,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },

  headerProfileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: INDIA.saffron,
  },

  notificationBadge: {
    position: 'absolute',
    right: 4,
    top: 3,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor:
      COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight:
      TYPOGRAPHY.extraBold,
  },

  // ===================================================
  // PROFILE PHOTO
  // ===================================================

  profileImage: {
    borderWidth: 2,
    borderColor:
      COLORS.white,
  },

  profilePlaceholder: {
    backgroundColor:
      COLORS.primaryLight,
    borderWidth: 2,
    borderColor:
      COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===================================================
  // WELCOME
  // ===================================================

  welcomeCard: {
    backgroundColor:
      COLORS.card,
    borderTopWidth: 4,
    borderTopColor: INDIA.saffron,
    borderRadius:
      RADIUS.xl,
    padding: 17,
    marginTop: 7,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
    ...SHADOWS.small,
  },

  welcomeMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  welcomeTextArea: {
    flex: 1,
    marginLeft: 13,
  },

  welcomeSmall: {
    fontSize: 21,
    fontWeight:
      TYPOGRAPHY.extraBold,
    color:
      COLORS.textPrimary,
  },

  welcomeDescription: {
    marginTop: 4,
    fontSize:
      TYPOGRAPHY.medium,
    lineHeight: 21,
    color:
      COLORS.textSecondary,
  },

  welcomeTagline: {
    marginTop: 8,
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.semiBold,
    color:
      INDIA.green,
  },

  welcomeFooter: {
    marginTop: 15,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor:
      COLORS.success,
    marginRight: 7,
  },

  welcomeFooterText: {
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
    fontWeight:
      TYPOGRAPHY.semiBold,
  },

  // ===================================================
  // SECTION
  // ===================================================

  sectionHeader: {
    marginTop:
      SPACING.section,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  sectionTitle: {
    fontSize:
      TYPOGRAPHY.subtitle,
    fontWeight:
      TYPOGRAPHY.extraBold,
    color:
      COLORS.textPrimary,
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
  },

  sectionIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===================================================
  // STATS
  // ===================================================

  statsRow: {
    flexDirection: 'row',
    gap: 9,
  },

  statCard: {
    flex: 1,
    backgroundColor:
      COLORS.card,
    borderRadius:
      RADIUS.xl,
    padding: 13,
    alignItems: 'center',
    ...SHADOWS.small,
  },

  statIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  statNumber: {
    fontSize: 24,
    fontWeight:
      TYPOGRAPHY.extraBold,
    color:
      COLORS.textPrimary,
  },

  statLabel: {
    marginTop: 2,
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.semiBold,
    color:
      COLORS.textMuted,
    textAlign: 'center',
  },

  // ===================================================
  // REPORT PROBLEM
  // ===================================================

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor:
      COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  aiText: {
    fontSize: 11,
    fontWeight:
      TYPOGRAPHY.extraBold,
    color:
      COLORS.primary,
  },

  problemCard: {
    backgroundColor:
      COLORS.card,
    borderRadius:
      RADIUS.xl,
    padding: 12,
    ...SHADOWS.small,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    rowGap: 10,
  },

  categoryCard: {
    width: '31.8%',
    minHeight: 106,
    backgroundColor:
      COLORS.background,
    borderRadius:
      RADIUS.lg,
    alignItems: 'center',
    justifyContent:
      'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor:
      COLORS.borderLight,
  },

  categoryIcon: {
    width: 49,
    height: 49,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },

  categoryText: {
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.textPrimary,
    textAlign: 'center',
  },

  otherProblemButton: {
    marginTop: 12,
    minHeight: 70,
    borderRadius:
      RADIUS.lg,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    backgroundColor:
      COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  otherProblemIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  otherProblemText: {
    flex: 1,
    marginLeft: 11,
  },

  otherProblemTitle: {
    fontSize:
      TYPOGRAPHY.medium,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.textPrimary,
  },

  otherProblemSubtitle: {
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  // ===================================================
  // HELP LINE & CONTACTS
  // ===================================================

  contactCard: {
    backgroundColor:
      COLORS.card,
    borderRadius:
      RADIUS.xl,
    paddingHorizontal: 13,
    ...SHADOWS.small,
  },

  contactRow: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contactIcon: {
    width: 41,
    height: 41,
    borderRadius: 12,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  contactInfo: {
    flex: 1,
  },

  contactTitle: {
    fontSize:
      TYPOGRAPHY.medium,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.textPrimary,
  },

  contactNumber: {
    marginTop: 2,
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
  },

  callButton: {
    height: 36,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor:
      COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  callButtonDisabled: {
    backgroundColor:
      COLORS.borderLight,
  },

  callButtonText: {
    color:
      COLORS.white,
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.bold,
  },

  callButtonTextDisabled: {
    color:
      COLORS.textMuted,
  },

  divider: {
    height: 1,
    backgroundColor:
      COLORS.borderLight,
  },

  // ===================================================
  // HELP LINE CARD
  // ===================================================

  helpLineCard: {
    minHeight: 82,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: INDIA.green,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  helpLineIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: INDIA.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderLeftWidth: 3,
    borderLeftColor: INDIA.saffron,
  },

  helpLineContent: {
    flex: 1,
  },

  helpLineTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },

  helpLineSubtitle: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    lineHeight: 17,
  },

  helpLineArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: INDIA.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===================================================
  // ACCOUNT
  // ===================================================

  accountCard: {
    backgroundColor:
      COLORS.card,
    borderRadius:
      RADIUS.xl,
    paddingHorizontal: 14,
    ...SHADOWS.small,
  },

  accountRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor:
      COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  logoutIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor:
      COLORS.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  accountTextWrapper: {
    flex: 1,
  },

  accountTitle: {
    fontSize:
      TYPOGRAPHY.medium,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.textPrimary,
  },

  accountSubtitle: {
    fontSize:
      TYPOGRAPHY.small,
    color:
      COLORS.textMuted,
    marginTop: 3,
  },

  logoutTitle: {
    fontSize:
      TYPOGRAPHY.medium,
    fontWeight:
      TYPOGRAPHY.bold,
    color:
      COLORS.error,
  },

  // ===================================================
  // FOOTER
  // ===================================================

  footer: {
    marginTop: 25,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor:
      COLORS.borderLight,
  },

  footerText: {
    textAlign: 'center',
    color:
      COLORS.textMuted,
    fontSize:
      TYPOGRAPHY.small,
    fontWeight:
      TYPOGRAPHY.semiBold,
  },

  /* WARD SCORECARD BANNER */
  wardScorecardBanner: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#D4E6DC',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    ...SHADOWS.small,
  },
  wardScorecardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wardScorecardContent: {
    flex: 1,
  },
  wardScorecardTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  liveTag: {
    backgroundColor: '#23845F',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  wardScorecardSubtitle: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});