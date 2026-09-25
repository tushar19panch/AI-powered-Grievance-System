import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
} from '../theme';

import { complaintApi } from '../services/api';

export default function ComplaintDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { language, setLanguage } = useLanguage();

  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary'>('citizen');
  const [selectedStatus, setSelectedStatus] = useState<string>('IN_PROGRESS');
  const [remarks, setRemarks] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // --------------------------------------------------
  // LANGUAGE
  // --------------------------------------------------

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  // --------------------------------------------------
  // LOAD COMPLAINT
  // --------------------------------------------------

  useEffect(() => {
    const loadComplaint = async () => {
      try {
        setLoading(true);
        setComplaint(null);

        const complaintId = Array.isArray(id) ? id[0] : id;
        if (!complaintId) return;

        const sessionData = await AsyncStorage.getItem('user_session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const role = String(session?.role || 'citizen').toLowerCase() as 'citizen' | 'sarpanch' | 'secretary';
        setUserRole(role);

        // 1. Try fetching single complaint from Backend API
        if (/^\d+$/.test(String(complaintId))) {
          try {
            const apiComplaint = await complaintApi.getSingleComplaint(Number(complaintId));
            if (apiComplaint && apiComplaint.id) {
              setComplaint({
                complaintId: String(apiComplaint.id),
                category: apiComplaint.category || apiComplaint.problemType || 'Village Issue',
                ward: apiComplaint.wardNumber ? `Ward ${apiComplaint.wardNumber}` : apiComplaint.location || '',
                priority: apiComplaint.priority || 'MEDIUM',
                department: apiComplaint.department || '',
                deadline: apiComplaint.deadline || null,
                description: apiComplaint.description || '',
                photo: apiComplaint.photo || null,
                audioUrl: apiComplaint.audioUrl || null,
                location: apiComplaint.location || (apiComplaint.villageName ? apiComplaint.villageName : ''),
                status: apiComplaint.status || 'SUBMITTED',
                dateTime: apiComplaint.createdAt || new Date().toISOString(),
                statusTimeline: [],
              });
              return;
            }
          } catch (apiErr) {
            console.log('Single complaint fetch error, falling back to local:', apiErr);
          }
        }

        // 2. Fallback: Load from local AsyncStorage
        const data = await AsyncStorage.getItem(`complaint_${complaintId}`);
        if (data) {
          const complaintData = JSON.parse(data);
          setComplaint(complaintData);
          return;
        }

        // 3. Search all local storage keys in case key format differs
        const allKeys = await AsyncStorage.getAllKeys();
        const cKey = allKeys.find((k) => k.includes(String(complaintId)));
        if (cKey) {
          const raw = await AsyncStorage.getItem(cKey);
          if (raw) {
            setComplaint(JSON.parse(raw));
          }
        }
      } catch (error) {
        console.log('Unable to load complaint:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComplaint();
  }, [id]);

  // --------------------------------------------------
  // CATEGORY LABEL
  // --------------------------------------------------

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Water':
        return language === 'hi'
          ? 'पानी'
          : 'Water';

      case 'Roads':
        return language === 'hi'
          ? 'सड़क'
          : 'Roads';

      case 'Street Lights':
        return language === 'hi'
          ? 'स्ट्रीट लाइट'
          : 'Street Lights';

      case 'Garbage/Sanitation':
        return language === 'hi'
          ? 'कचरा / स्वच्छता'
          : 'Garbage / Sanitation';

      case 'Drainage':
        return language === 'hi'
          ? 'जल निकासी'
          : 'Drainage';

      case 'Electricity':
        return language === 'hi'
          ? 'बिजली'
          : 'Electricity';

      case 'Government Services':
        return language === 'hi'
          ? 'सरकारी सेवाएं'
          : 'Government Services';

      case 'Other':
        return language === 'hi'
          ? 'अन्य'
          : 'Other';

      default:
        return (
          category ||
          (language === 'hi'
            ? 'अन्य'
            : 'Other')
        );
    }
  };

  // --------------------------------------------------
  // STATUS LABEL
  // --------------------------------------------------

  const getStatusLabel = (status: string) => {
    const normalizedStatus = String(
      status || ''
    ).toUpperCase();

    switch (normalizedStatus) {
      case 'SUBMITTED':
        return language === 'hi'
          ? 'जमा की गई'
          : 'Submitted';

      case 'UNDER REVIEW':
        return language === 'hi'
          ? 'समीक्षा में'
          : 'Under Review';

      case 'ACTION TAKEN':
        return language === 'hi'
          ? 'कार्रवाई की गई'
          : 'Action Taken';

      case 'IN PROGRESS':
        return language === 'hi'
          ? 'प्रगति में'
          : 'In Progress';

      case 'RESOLVED':
        return language === 'hi'
          ? 'समाधान किया गया'
          : 'Resolved';

      case 'VERIFICATION':
        return language === 'hi'
          ? 'सत्यापन'
          : 'Verification';

      case 'CLOSED':
        return language === 'hi'
          ? 'बंद'
          : 'Closed';

      case 'REOPENED':
        return language === 'hi'
          ? 'फिर से खोली गई'
          : 'Reopened';

      default:
        return (
          status ||
          (language === 'hi'
            ? 'अज्ञात'
            : 'Unknown')
        );
    }
  };

  // --------------------------------------------------
  // STATUS COLORS
  // --------------------------------------------------

  const getStatusColors = (status: string) => {
    const normalizedStatus = String(
      status || ''
    ).toUpperCase();

    switch (normalizedStatus) {
      case 'RESOLVED':
      case 'CLOSED':
        return {
          background: COLORS.successLight,
          text: COLORS.indiaGreen,
        };

      case 'IN PROGRESS':
      case 'ACTION TAKEN':
        return {
          background: COLORS.warningLight,
          text: COLORS.warning,
        };

      case 'VERIFICATION':
        return {
          background: COLORS.infoLight,
          text: COLORS.info,
        };

      case 'REOPENED':
        return {
          background: COLORS.errorLight,
          text: COLORS.error,
        };

      default:
        return {
          background: COLORS.primaryLight,
          text: COLORS.primary,
        };
    }
  };

  // --------------------------------------------------
  // LOCATION HELPER
  // --------------------------------------------------

  const getLocationText = () => {
    if (!complaint?.location) {
      return '';
    }

    const location = complaint.location;

    if (
      typeof location === 'object' &&
      location !== null
    ) {
      if (
        location.latitude !== undefined &&
        location.longitude !== undefined
      ) {
        return (
          `Latitude: ${location.latitude}\n` +
          `Longitude: ${location.longitude}`
        );
      }

      try {
        return JSON.stringify(location);
      } catch {
        return String(location);
      }
    }

    return String(location);
  };

  // --------------------------------------------------
  // PROBLEM FIXED
  // --------------------------------------------------

  const handleProblemFixed = async () => {
    try {
      if (!complaint?.complaintId) {
        return;
      }

      const updatedComplaint = {
        ...complaint,
        status: 'CLOSED',
      };

      await AsyncStorage.setItem(
        `complaint_${complaint.complaintId}`,
        JSON.stringify(updatedComplaint)
      );

      setComplaint(updatedComplaint);

      Alert.alert(
        language === 'hi'
          ? 'शिकायत बंद कर दी गई'
          : 'Complaint Closed',
        language === 'hi'
          ? 'यह पुष्टि करने के लिए धन्यवाद कि आपकी समस्या ठीक हो गई है।'
          : 'Thank you for confirming that your problem has been fixed.'
      );
    } catch (error) {
      console.log(
        'Unable to close complaint:',
        error
      );
    }
  };

  // --------------------------------------------------
  // PROBLEM NOT FIXED
  // --------------------------------------------------

  const handleProblemNotFixed = async () => {
    try {
      if (!complaint?.complaintId) {
        return;
      }

      const updatedComplaint = {
        ...complaint,
        status: 'REOPENED',
      };

      await AsyncStorage.setItem(
        `complaint_${complaint.complaintId}`,
        JSON.stringify(updatedComplaint)
      );

      setComplaint(updatedComplaint);

      Alert.alert(
        language === 'hi'
          ? 'शिकायत फिर से खोली गई'
          : 'Complaint Reopened',
        language === 'hi'
          ? 'आपकी शिकायत को आगे की कार्रवाई के लिए फिर से खोल दिया गया है।'
          : 'Your complaint has been reopened for further action.'
      );
    } catch (error) {
      console.log('Unable to reopen complaint:', error);
    }
  };

  // --------------------------------------------------
  // SARPANCH / SECRETARY STATUS UPDATE
  // --------------------------------------------------

  const handleOfficialStatusUpdate = async () => {
    try {
      if (!complaint?.complaintId) return;
      setUpdatingStatus(true);

      const complaintNumId = Number(complaint.complaintId);
      if (!isNaN(complaintNumId)) {
        await complaintApi.updateStatus(complaintNumId, selectedStatus, remarks);
      }

      const updatedComplaint = {
        ...complaint,
        status: selectedStatus,
      };

      await AsyncStorage.setItem(
        `complaint_${complaint.complaintId}`,
        JSON.stringify(updatedComplaint)
      );

      setComplaint(updatedComplaint);
      setRemarks('');

      Alert.alert(
        language === 'hi' ? 'सफलतापूर्वक अपडेट किया गया' : 'Status Updated',
        language === 'hi'
          ? `शिकायत की स्थिति '${getStatusLabel(selectedStatus)}' में बदल दी गई है।`
          : `Complaint status changed to '${getStatusLabel(selectedStatus)}'.`
      );
    } catch (error: any) {
      console.log('Unable to update complaint status:', error);
      Alert.alert(
        language === 'hi' ? 'अपडेट विफल' : 'Update Failed',
        error?.message ||
          (language === 'hi'
            ? 'स्थिति अपडेट करने में समस्या आई।'
            : 'Could not update complaint status.')
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  // --------------------------------------------------
  // LOADING SCREEN
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={COLORS.primary}
            style={styles.loadingIcon}
          />

          <Text style={styles.loadingText}>
            {language === 'hi'
              ? 'शिकायत लोड हो रही है...'
              : 'Loading complaint...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // NOT FOUND
  // --------------------------------------------------

  if (!complaint) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons
            name="document-text-outline"
            size={64}
            color={COLORS.textSecondary}
            style={styles.errorIcon}
          />

          <Text style={styles.errorTitle}>
            {language === 'hi'
              ? 'शिकायत नहीं मिली'
              : 'Complaint not found'}
          </Text>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() =>
              router.replace('/citizen-dashboard')
            }
            activeOpacity={0.8}
          >
            <Text style={styles.backHomeText}>
              {language === 'hi'
                ? 'डैशबोर्ड पर जाएं'
                : 'Go to Dashboard'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // STATUS
  // --------------------------------------------------

  const normalizedStatus = String(
    complaint.status || ''
  ).toUpperCase();

  const statusColors =
    getStatusColors(normalizedStatus);

  // --------------------------------------------------
  // TIMELINE
  // --------------------------------------------------

  const statuses = [
    'SUBMITTED',
    'UNDER REVIEW',
    'ACTION TAKEN',
    'IN PROGRESS',
    'RESOLVED',
    'CLOSED',
  ];

  const currentIndex =
    statuses.indexOf(normalizedStatus);

  // --------------------------------------------------
  // DATE FORMAT
  // --------------------------------------------------

  const formattedDate = complaint.dateTime
    ? new Date(
        complaint.dateTime
      ).toLocaleString(
        language === 'hi'
          ? 'hi-IN'
          : 'en-IN',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      )
    : language === 'hi'
    ? 'उपलब्ध नहीं'
    : 'Not available';

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tricolorBar}>
          <View style={styles.saffronStripe} />
          <View style={styles.whiteStripe} />
          <View style={styles.greenStripe} />
        </View>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace('/citizen-dashboard')
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <Text style={styles.title}>
            {language === 'hi'
              ? 'शिकायत विवरण'
              : 'Complaint Details'}
          </Text>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Ionicons
              name="language-outline"
              size={18}
              color={COLORS.primary}
            />

            <Text style={styles.languageText}>
              {language === 'hi'
                ? 'EN'
                : 'हि'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* COMPLAINT ID */}
        <View style={styles.idBox}>
          <View style={styles.idTopRow}>
            <View style={styles.idIcon}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={COLORS.primary}
              />
            </View>

            <View>
              <Text style={styles.idLabel}>
                {language === 'hi'
                  ? 'शिकायत आईडी'
                  : 'Complaint ID'}
              </Text>

              <Text style={styles.idText}>
                #{complaint.complaintId}
              </Text>
            </View>
          </View>
        </View>

        {/* STATUS */}
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>
            {language === 'hi'
              ? 'वर्तमान स्थिति'
              : 'Current Status'}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusColors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColors.text,
                },
              ]}
            >
              {getStatusLabel(normalizedStatus)}
            </Text>
          </View>

          <Text style={styles.statusHint}>
            {normalizedStatus === 'RESOLVED'
              ? language === 'hi'
                ? 'कृपया नीचे दिए गए विकल्प से पुष्टि करें कि समस्या ठीक हुई या नहीं।'
                : 'Please confirm below whether your problem has been fixed.'
              : normalizedStatus === 'CLOSED'
              ? language === 'hi'
                ? 'यह शिकायत बंद कर दी गई है।'
                : 'This complaint has been closed.'
              : normalizedStatus === 'REOPENED'
              ? language === 'hi'
                ? 'शिकायत को आगे की कार्रवाई के लिए फिर से खोला गया है।'
                : 'The complaint has been reopened for further action.'
              : language === 'hi'
              ? 'आपकी शिकायत की स्थिति यहां दिखाई जाएगी।'
              : 'Your complaint status is shown here.'}
          </Text>
        </View>

        {/* TIMELINE */}
        <View style={styles.timelineCard}>
          <View style={styles.cardHeadingRow}>
            <Ionicons
              name="git-branch-outline"
              size={22}
              color={COLORS.primary}
              style={styles.cardHeadingIcon}
            />

            <Text style={styles.timelineTitle}>
              {language === 'hi'
                ? 'शिकायत प्रगति'
                : 'Complaint Progress'}
            </Text>
          </View>

          {statuses.map((status, index) => {
            const completed =
              currentIndex >= 0 &&
              index <= currentIndex;

            const isCurrent =
              index === currentIndex &&
              normalizedStatus !== 'CLOSED';

            return (
              <View
                key={status}
                style={styles.timelineItem}
              >
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      completed &&
                        styles.timelineDotCompleted,
                    ]}
                  >
                    {completed && (
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color="#FFFFFF"
                      />
                    )}
                  </View>

                  {index <
                    statuses.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        completed &&
                          styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>

                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineStatus,
                      completed &&
                        styles.timelineStatusCompleted,
                    ]}
                  >
                    {getStatusLabel(status)}
                  </Text>

                  {isCurrent && (
                    <Text
                      style={styles.currentText}
                    >
                      {language === 'hi'
                        ? 'वर्तमान स्थिति'
                        : 'Current stage'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* REOPENED */}
          {normalizedStatus === 'REOPENED' && (
            <View style={styles.reopenedBox}>
              <Ionicons
                name="refresh-outline"
                size={20}
                color={COLORS.error}
              />

              <Text style={styles.reopenedText}>
                {language === 'hi'
                  ? 'यह शिकायत फिर से खोल दी गई है और आगे की कार्रवाई की आवश्यकता है।'
                  : 'This complaint has been reopened and requires further action.'}
              </Text>
            </View>
          )}
        </View>

        {/* COMPLAINT INFORMATION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {language === 'hi'
              ? 'शिकायत जानकारी'
              : 'Complaint Information'}
          </Text>

          {/* CITIZEN NAME */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>
              {language === 'hi'
                ? 'नागरिक का नाम'
                : 'Citizen Name'}
            </Text>

            <Text style={styles.value}>
              {complaint.citizenName || '-'}
            </Text>
          </View>

          {/* CATEGORY */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>
              {language === 'hi'
                ? 'श्रेणी'
                : 'Category'}
            </Text>

            <Text style={styles.value}>
              {getCategoryLabel(
                complaint.category
              )}
            </Text>
          </View>

          {/* WARD */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>
              {language === 'hi'
                ? 'वार्ड'
                : 'Ward'}
            </Text>

            <Text style={styles.value}>
              {complaint.ward || '-'}
            </Text>
          </View>

          {/* DATE */}
          <View
            style={[
              styles.detailRow,
              styles.lastDetailRow,
            ]}
          >
            <Text style={styles.label}>
              {language === 'hi'
                ? 'जमा करने की तारीख'
                : 'Submitted On'}
            </Text>

            <Text style={styles.value}>
              {formattedDate}
            </Text>
          </View>
        </View>

        {/* DESCRIPTION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {language === 'hi'
              ? 'समस्या का विवरण'
              : 'Problem Description'}
          </Text>

          <Text style={styles.description}>
            {complaint.description ||
              (language === 'hi'
                ? 'कोई विवरण उपलब्ध नहीं है।'
                : 'No description available.')}
          </Text>
        </View>

        {/* PHOTO */}
        {complaint.photo && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {language === 'hi'
                ? 'संलग्न फोटो'
                : 'Attached Photo'}
            </Text>

            <Image
              source={{
                uri: complaint.photo,
              }}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>
        )}

        {/* LOCATION */}
        {complaint.location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {language === 'hi'
                ? 'स्थान'
                : 'Location'}
            </Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={24}
                color={COLORS.primary}
              />

              <Text style={styles.locationValue}>
                {getLocationText()}
              </Text>
            </View>
          </View>
        )}

        {/* CITIZEN VERIFICATION */}
        {normalizedStatus === 'RESOLVED' && (
          <View style={styles.verificationCard}>
            <Ionicons
              name="help-circle-outline"
              size={36}
              color={COLORS.primary}
              style={styles.verificationIcon}
            />

            <Text
              style={styles.verificationTitle}
            >
              {language === 'hi'
                ? 'क्या आपकी समस्या ठीक हो गई है?'
                : 'Has your problem been fixed?'}
            </Text>

            <Text
              style={styles.verificationText}
            >
              {language === 'hi'
                ? 'कृपया पुष्टि करें ताकि हम आपकी शिकायत को बंद कर सकें या आगे की कार्रवाई कर सकें।'
                : 'Please confirm so we can close your complaint or take further action.'}
            </Text>

            {/* FIXED */}
            <TouchableOpacity
              style={styles.fixedButton}
              onPress={handleProblemFixed}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#FFFFFF"
              />

              <Text
                style={styles.fixedButtonText}
              >
                {language === 'hi'
                  ? 'हाँ, समस्या ठीक हो गई'
                  : 'Yes, Problem Fixed'}
              </Text>
            </TouchableOpacity>

            {/* NOT FIXED */}
            <TouchableOpacity
              style={styles.notFixedButton}
              onPress={handleProblemNotFixed}
              activeOpacity={0.8}
            >
              <Ionicons
                name="close-circle-outline"
                size={21}
                color={COLORS.error}
              />

              <Text
                style={styles.notFixedButtonText}
              >
                {language === 'hi'
                  ? 'नहीं, समस्या अभी भी है'
                  : 'No, Problem Not Fixed'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OFFICIAL ACTION PANEL (SARPANCH / SECRETARY) */}
        {(userRole === 'sarpanch' || userRole === 'secretary') && (
          <View style={styles.officialActionCard}>
            <View style={styles.cardHeadingRow}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={COLORS.primary}
                style={styles.cardHeadingIcon}
              />
              <Text style={styles.officialCardTitle}>
                {language === 'hi'
                  ? 'अधिकारी कार्रवाई पैनल'
                  : 'Official Action Panel'}
              </Text>
            </View>

            <Text style={styles.officialSubtitle}>
              {language === 'hi'
                ? 'शिकायत की स्थिति बदलें और अपनी टिप्पणी दर्ज करें:'
                : 'Update complaint status and add your official remarks:'}
            </Text>

            {/* Status Selection Pills */}
            <View style={styles.statusPillsContainer}>
              {[
                { id: 'IN_PROGRESS', hi: 'प्रगति में', en: 'In Progress', icon: 'time-outline' },
                { id: 'ACTION_TAKEN', hi: 'कार्रवाई की गई', en: 'Action Taken', icon: 'construct-outline' },
                { id: 'RESOLVED', hi: 'समाधान हुआ', en: 'Resolved', icon: 'checkmark-circle-outline' },
              ].map((st) => (
                <TouchableOpacity
                  key={st.id}
                  style={[
                    styles.statusSelectPill,
                    selectedStatus === st.id && styles.statusSelectPillActive,
                  ]}
                  onPress={() => setSelectedStatus(st.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={st.icon as any}
                    size={16}
                    color={selectedStatus === st.id ? '#FFFFFF' : COLORS.textPrimary}
                  />
                  <Text
                    style={[
                      styles.statusSelectPillText,
                      selectedStatus === st.id && styles.statusSelectPillTextActive,
                    ]}
                  >
                    {language === 'hi' ? st.hi : st.en}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Remarks Input */}
            <Text style={styles.remarksInputLabel}>
              {language === 'hi' ? 'टिप्पणी / विवरण (वैकल्पिक)' : 'Remarks / Note (Optional)'}
            </Text>
            <TextInput
              style={styles.remarksInputField}
              placeholder={
                language === 'hi'
                  ? 'कार्रवाई का विवरण दर्ज करें (उदा. टीम को भेजा गया है)...'
                  : 'Enter action details (e.g. repair team dispatched)...'
              }
              placeholderTextColor="#9AA4B2"
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={3}
            />

            {/* Submit Update Button */}
            <TouchableOpacity
              style={[
                styles.officialSubmitBtn,
                updatingStatus && { opacity: 0.7 },
              ]}
              onPress={handleOfficialStatusUpdate}
              disabled={updatingStatus}
              activeOpacity={0.85}
            >
              {updatingStatus ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.officialSubmitBtnText}>
                    {language === 'hi' ? 'स्थिति अपडेट करें' : 'Update Status Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },

  tricolorBar: {
    height: 5,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
  },

  saffronStripe: {
    flex: 1,
    backgroundColor: '#FF9933',
  },

  whiteStripe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E8E8E8',
  },

  greenStripe: {
    flex: 1,
    backgroundColor: '#138808',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F7F8FA',
  },

  loadingIcon: {
    marginBottom: 14,
  },

  loadingText: {
    fontSize: 15,
    color: '#667085',
    textAlign: 'center',
    fontWeight: '600',
  },

  errorIcon: {
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#172033',
    marginBottom: 20,
    textAlign: 'center',
  },

  backHomeButton: {
    backgroundColor: '#000080',
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000080',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  backHomeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EAF0',
    elevation: 3,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  title: {
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'center',
    marginHorizontal: 10,
  },

  languageButton: {
    minWidth: 54,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#FFF3E6',
    borderWidth: 1,
    borderColor: '#FFD7AE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  languageText: {
    color: '#D96B00',
    fontWeight: '900',
    fontSize: 12,
  },

  idBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    elevation: 3,
    shadowColor: '#101828',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },

  idTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  idIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EEF0FF',
    borderWidth: 1,
    borderColor: '#D9DDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  idLabel: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 3,
    fontWeight: '600',
  },

  idText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#172033',
    letterSpacing: 0.3,
  },

  statusBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    elevation: 3,
    shadowColor: '#101828',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  statusLabel: {
    fontSize: 12,
    color: '#667085',
    marginBottom: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  statusText: {
    fontSize: 14,
    fontWeight: '900',
  },

  statusHint: {
    marginTop: 13,
    fontSize: 13,
    lineHeight: 20,
    color: '#667085',
    fontWeight: '500',
  },

  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    elevation: 3,
    shadowColor: '#101828',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  cardHeadingIcon: {
    marginRight: 9,
  },

  timelineTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#172033',
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 58,
  },

  timelineLeft: {
    width: 32,
    alignItems: 'center',
  },

  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E5E7EB',
    borderWidth: 3,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  timelineDotCompleted: {
    backgroundColor: '#138808',
    borderColor: '#DDF2DD',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: -1,
  },

  timelineLineCompleted: {
    backgroundColor: '#138808',
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 15,
  },

  timelineStatus: {
    fontSize: 14,
    color: '#98A2B3',
    fontWeight: '600',
  },

  timelineStatusCompleted: {
    color: '#172033',
    fontWeight: '800',
  },

  currentText: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#EEF0FF',
    color: '#000080',
    fontSize: 11,
    fontWeight: '800',
  },

  reopenedBox: {
    marginTop: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFD5D5',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  reopenedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: '#C62828',
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EBF0',
    elevation: 3,
    shadowColor: '#101828',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#172033',
    marginBottom: 13,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    gap: 14,
  },

  lastDetailRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },

  label: {
    flex: 0.9,
    fontSize: 12,
    color: '#667085',
    fontWeight: '600',
  },

  value: {
    flex: 1.3,
    fontSize: 13,
    color: '#172033',
    fontWeight: '800',
    textAlign: 'right',
  },

  description: {
    fontSize: 14,
    color: '#344054',
    lineHeight: 23,
    backgroundColor: '#F8F9FB',
    borderRadius: 13,
    padding: 13,
  },

  photo: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    backgroundColor: '#F2F4F7',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    backgroundColor: '#F8F9FB',
    borderRadius: 13,
    padding: 13,
  },

  locationValue: {
    flex: 1,
    fontSize: 13,
    lineHeight: 21,
    color: '#344054',
    fontWeight: '600',
  },

  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCEBDD',
    elevation: 4,
    shadowColor: '#138808',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },

  verificationIcon: {
    marginBottom: 8,
  },

  verificationTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#172033',
    textAlign: 'center',
    marginBottom: 8,
  },

  verificationText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 18,
  },

  fixedButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#138808',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#138808',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
  },

  fixedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  notFixedButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  notFixedButtonText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '900',
  },

  // Official Action Card
  officialActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#00008033',
    elevation: 4,
    shadowColor: '#000080',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  officialCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000080',
  },

  officialSubtitle: {
    fontSize: 13,
    color: '#475467',
    marginTop: 4,
    marginBottom: 14,
    fontWeight: '500',
  },

  statusPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  statusSelectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },

  statusSelectPillActive: {
    backgroundColor: '#000080',
    borderColor: '#000080',
  },

  statusSelectPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#344054',
  },

  statusSelectPillTextActive: {
    color: '#FFFFFF',
  },

  remarksInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 6,
  },

  remarksInputField: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#101828',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },

  officialSubmitBtn: {
    backgroundColor: '#138808',
    borderRadius: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#138808',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  officialSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
