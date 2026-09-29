import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

import { complaintApi, authApi, getAuthToken, setAuthToken, isValidJwt, resolvePhotoUrl } from '../services/api';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import {
  isNeedsVerificationClassification,
  isDuplicateClassification,
  isFakeClassification,
} from '../services/complaintClassification';

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
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [photoPreviewVisible, setPhotoPreviewVisible] = useState<boolean>(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [citizenRating, setCitizenRating] = useState<number>(0);
  const [citizenReview, setCitizenReview] = useState<string>('');
  const [savedRatingData, setSavedRatingData] = useState<{ rating: number; review?: string; submittedAt?: string } | null>(null);

  const webAudioRef = useRef<any>(null);
  const nativePlayerRef = useRef<any>(null);

  const handleToggleAudio = async () => {
    if (!audioUri) return;

    if (Platform.OS === 'web') {
      try {
        if (!webAudioRef.current) {
          const audio = new (window as any).Audio(audioUri);
          audio.onended = () => setIsPlayingAudio(false);
          audio.onerror = (e: any) => {
            console.log('Web audio error:', e);
            setIsPlayingAudio(false);
          };
          webAudioRef.current = audio;
        }

        if (isPlayingAudio) {
          webAudioRef.current.pause();
          setIsPlayingAudio(false);
        } else {
          await webAudioRef.current.play();
          setIsPlayingAudio(true);
        }
      } catch (err) {
        console.log('Audio playback error on web:', err);
        setIsPlayingAudio(false);
      }
    } else {
      try {
        const { createAudioPlayer } = require('expo-audio');
        if (!nativePlayerRef.current) {
          nativePlayerRef.current = createAudioPlayer(audioUri);
          if (nativePlayerRef.current.addListener) {
            nativePlayerRef.current.addListener('playbackStatusUpdate', (status: any) => {
              if (status && status.didJustFinish) {
                setIsPlayingAudio(false);
              }
            });
          }
        }
        if (isPlayingAudio) {
          nativePlayerRef.current.pause();
          setIsPlayingAudio(false);
        } else {
          nativePlayerRef.current.play();
          setIsPlayingAudio(true);
        }
      } catch (err) {
        console.log('Native audio play error:', err);
        setIsPlayingAudio(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      if (nativePlayerRef.current) {
        try {
          nativePlayerRef.current.pause();
          if (nativePlayerRef.current.release) {
            nativePlayerRef.current.release();
          }
        } catch (e) {}
      }
    };
  }, [audioUri]);

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
        setImageError(false);

        const complaintId = Array.isArray(id) ? id[0] : id;
        if (!complaintId) return;

        const sessionData = await AsyncStorage.getItem('user_session');
        const session = sessionData ? JSON.parse(sessionData) : null;
        const role = String(session?.role || 'citizen').toLowerCase() as 'citizen' | 'sarpanch' | 'secretary';
        setUserRole(role);

        let token = await getAuthToken();
        if (!token || !isValidJwt(token)) {
          const savedPass = session?.password;
          const savedMobile = session?.mobile || session?.adminId || session?.secretaryId;
          if (savedPass && savedMobile) {
            try {
              const loginRes = await authApi.login({
                mobileNumber: savedMobile,
                identifier: savedMobile,
                password: savedPass,
              });
              if (loginRes?.token && isValidJwt(loginRes.token)) {
                await setAuthToken(loginRes.token);
              }
            } catch {}
          }
        }

        // 1. Fetch complaint from Backend Database API
        let foundComplaint: any = null;
        const cleanId = String(complaintId).replace(/^[^\d]*/, '');
        if (/^\d+$/.test(cleanId)) {
          try {
            const apiComplaint = await complaintApi.getSingleComplaint(Number(cleanId));
            if (apiComplaint && (apiComplaint.id || (apiComplaint as any).complaintNumber)) {
              foundComplaint = apiComplaint;
            }
          } catch (apiErr: any) {
            // Quiet fallback to list endpoints
          }
        }

        // If not found by direct ID, check role-specific complaints list from backend DB
        if (!foundComplaint) {
          try {
            const list = role === 'citizen' 
              ? await complaintApi.getCitizenComplaints()
              : await complaintApi.getSarpanchComplaints();
            if (Array.isArray(list)) {
              foundComplaint = list.find((c: any) => 
                String(c.id) === String(complaintId) || 
                String(c.id) === String(cleanId) ||
                String(c.complaintNumber) === String(complaintId) ||
                String(c.complaintNumber) === String(cleanId)
              );
            }
          } catch (listErr: any) {
            // Handled gracefully
          }
        }

        if (foundComplaint) {
          const complaintKey = foundComplaint.id || foundComplaint.complaintNumber || complaintId;
          const soundUri = foundComplaint.audioUrl || (await AsyncStorage.getItem(`complaint_audio_${complaintKey}`)) || null;
          if (soundUri) {
            setAudioUri(soundUri);
          }

          const photoUri =
            foundComplaint.photo ||
            foundComplaint.payload?.photo ||
            (await AsyncStorage.getItem(`complaint_photo_${complaintKey}`)) ||
            (await AsyncStorage.getItem(`complaint_photo_${cleanId}`)) ||
            null;

          setComplaint({
            complaintId: String(complaintKey),
            citizenName: foundComplaint.citizenName || 'Citizen',
            citizenMobile: foundComplaint.citizenMobile || '',
            category: foundComplaint.category || foundComplaint.problemType || 'Village Issue',
            ward: foundComplaint.wardNumber ? `Ward ${foundComplaint.wardNumber}` : foundComplaint.location || '',
            priority: foundComplaint.priority || 'MEDIUM',
            department: foundComplaint.department || '',
            deadline: foundComplaint.deadline || null,
            description: foundComplaint.description || '',
            photo: photoUri,
            audioUrl: soundUri,
            location: foundComplaint.location || (foundComplaint.villageName ? foundComplaint.villageName : ''),
            status: foundComplaint.status || 'SUBMITTED',
            classification: foundComplaint.classification || null,
            classificationReason: foundComplaint.classificationReason || foundComplaint.reason || null,
            duplicateOfId: foundComplaint.duplicateOfId || foundComplaint.duplicate_of_id || null,
            dateTime: foundComplaint.createdAt || new Date().toISOString(),
            statusTimeline: [],
          });

          // Check if citizen already rated this complaint
          try {
            const rawRating = await AsyncStorage.getItem(`rating_complaint_${foundComplaint.id || foundComplaint.complaintNumber || complaintId}`);
            if (rawRating) {
              setSavedRatingData(JSON.parse(rawRating));
            }
          } catch (rErr) {
            console.log('Error reading saved rating:', rErr);
          }
        }
      } catch (error) {
        console.log('Unable to load complaint from database:', error);
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
    const normalized = String(status || '').replace(/\s+/g, '_').toUpperCase();

    switch (normalized) {
      case 'SUBMITTED':
        return language === 'hi'
          ? 'जमा की गई'
          : 'Submitted';

      case 'UNDER_REVIEW':
        return language === 'hi'
          ? 'समीक्षा में'
          : 'Under Review';

      case 'ACTION_TAKEN':
        return language === 'hi'
          ? 'कार्रवाई जारी (प्रगति में)'
          : 'Action Taken (In Progress)';

      case 'IN_PROGRESS':
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
          ? 'सत्यापित बंद'
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
    const normalized = String(status || '').replace(/\s+/g, '_').toUpperCase();

    switch (normalized) {
      case 'RESOLVED':
      case 'CLOSED':
        return {
          background: COLORS.successLight,
          text: COLORS.indiaGreen,
        };

      case 'IN_PROGRESS':
      case 'ACTION_TAKEN':
        return {
          background: COLORS.warningLight,
          text: COLORS.warning,
        };

      case 'VERIFICATION':
      case 'UNDER_REVIEW':
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

  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // --------------------------------------------------
  // VERIFICATION REASON LOGIC
  // --------------------------------------------------
  const getVerificationDetails = () => {
    const desc = String(complaint?.description || '').toLowerCase();
    const cat = String(complaint?.category || '').toLowerCase();
    const cl = String(complaint?.classification || '').toUpperCase();

    const isWaterInRoad = (cat.includes('road') || cat.includes('सड़क')) &&
      (desc.includes('pipe') || desc.includes('water') || desc.includes('पाइप') || desc.includes('पानी') || desc.includes('लीक'));

    const isRoadInWater = (cat.includes('water') || cat.includes('पानी')) &&
      (desc.includes('road') || desc.includes('सड़क') || desc.includes('गड्ढा') || desc.includes('डामर'));

    const isDuplicate = cl === 'DUPLICATE' || desc.includes('duplicate');

    if (isWaterInRoad) {
      return {
        badge: language === 'hi' ? 'विवरण/फोटो विसंगति' : 'Photo & Category Mismatch',
        icon: 'alert-circle' as const,
        color: '#D97706',
        bg: '#FFFBEB',
        borderColor: '#FDE68A',
        title: language === 'hi' ? 'सत्यापन आवश्यक: विवरण व श्रेणी में अंतर' : 'Verification Needed: Category Mismatch',
        reason: language === 'hi'
          ? 'शिकायत श्रेणी "सड़क" है किंतु फोटो या विवरण में "पाइप/पानी" के संकेत मिले हैं। सही विभाग आवंटन हेतु स्थल सत्यापन आवश्यक है।'
          : 'Complaint category is "Road" but details/photo indicate pipeline/water supply. Verification needed for correct routing.',
        action: language === 'hi' ? 'पंचायत सचिव/वार्ड सदस्य द्वारा भौतिक सत्यापन प्रक्रियाधीन है।' : 'Physical inspection in progress by Panchayat team.'
      };
    }

    if (isRoadInWater) {
      return {
        badge: language === 'hi' ? 'श्रेणी विसंगति' : 'Category Mismatch',
        icon: 'alert-circle' as const,
        color: '#D97706',
        bg: '#FFFBEB',
        borderColor: '#FDE68A',
        title: language === 'hi' ? 'सत्यापन आवश्यक: श्रेणी की जांच' : 'Verification Needed: Category Mismatch',
        reason: language === 'hi'
          ? 'शिकायत "पानी" में दर्ज है किंतु विवरण में सड़क क्षति का उल्लेख है। विभाग निर्धारण हेतु मुआयना आवश्यक है।'
          : 'Complaint is filed under "Water" but details reference road damage. On-site verification needed.',
        action: language === 'hi' ? 'वार्ड प्रतिनिधि द्वारा स्थल सत्यापन लंबित है।' : 'Ward representative site inspection scheduled.'
      };
    }

    if (isDuplicate) {
      return {
        badge: language === 'hi' ? 'संभावित डुप्लिकेट' : 'Potential Duplicate',
        icon: 'copy-outline' as const,
        color: '#D97706',
        bg: '#FFFBEB',
        borderColor: '#FDE68A',
        title: language === 'hi' ? 'सत्यापन आवश्यक: पूर्व शिकायत से मिलान' : 'Verification Needed: Duplicate Check',
        reason: language === 'hi'
          ? 'समान वार्ड में इसी समस्या या समान फोटो के साथ पूर्व शिकायत पाई गई है। डुप्लिकेट मिलान जांच जारी है।'
          : 'A similar issue with matching photo or location exists in this ward. Cross-checking active.',
        action: language === 'hi' ? 'अधिकारियों द्वारा पूर्व शिकायतों से सत्यापन किया जा रहा है।' : 'Official cross-verification with existing records in progress.'
      };
    }

    return {
      badge: language === 'hi' ? 'स्थल भौतिक सत्यापन' : 'On-Site Field Verification',
      icon: 'shield-checkmark-outline' as const,
      color: '#2563EB',
      bg: '#EFF6FF',
      borderColor: '#BFDBFE',
      title: language === 'hi' ? 'सत्यापन का कारण: स्थल निरीक्षण व कार्य प्राक्कलन' : 'Verification Reason: On-Site Inspection',
      reason: language === 'hi'
        ? 'कार्य प्रारंभ करने से पहले ग्राम पंचायत सचिव एवं वार्ड सदस्य द्वारा समस्या स्थल का भौतिक निरीक्षण आवश्यक है ताकि सही संसाधन व बजट आवंटित किया जा सके।'
        : 'Physical site verification by Panchayat Secretary / Ward Member is required to assess ground conditions and assign field workers.',
      action: language === 'hi' ? 'वार्ड पंच / सचिव द्वारा स्थलीय मुआयना निर्धारित है।' : 'Field site visit scheduled by Panchayat officials.'
    };
  };

  // --------------------------------------------------
  // PROBLEM FIXED (Citizen confirmation)
  // --------------------------------------------------

  const handleProblemFixed = async () => {
    if (isVerifying) return;
    try {
      if (!complaint?.complaintId) return;
      setIsVerifying(true);

      const complaintNumId = Number(complaint.complaintId);
      if (!isNaN(complaintNumId)) {
        try {
          await complaintApi.updateStatus(
            complaintNumId,
            'CLOSED',
            'नागरिक द्वारा पुष्टि की गई कि समस्या ठीक हो गई है (Citizen confirmed problem is resolved and closed)'
          );
        } catch (apiErr) {
          console.log('Backend close error, trying verify endpoint:', apiErr);
          try {
            await complaintApi.updateStatus(
              complaintNumId,
              'VERIFICATION',
              'नागरिक द्वारा समाधान सत्यापित किया गया'
            );
          } catch (vErr) {
            console.log('Fallback verify error:', vErr);
          }
        }
      }

      const updatedComplaint = {
        ...complaint,
        status: 'CLOSED',
      };

      setComplaint(updatedComplaint);

      Alert.alert(
        language === 'hi'
          ? 'पुष्टि सफल • समाधान पूर्ण'
          : 'Confirmed Successfully',
        language === 'hi'
          ? 'शिकायत बंद हो गई है। कृपया नीचे दिए गए 5-स्टार रेटिंग कार्ड पर अपनी प्रतिक्रिया और अनुभव अवश्य साझा करें!'
          : 'Complaint marked Closed. Please rate the redressal quality below to help improve village governance!'
      );
    } catch (error) {
      console.log('Unable to resolve complaint in backend:', error);
      const updatedComplaint = {
        ...complaint,
        status: 'CLOSED',
      };
      setComplaint(updatedComplaint);
      Alert.alert(
        language === 'hi' ? 'पुष्टि दर्ज हुई' : 'Confirmed',
        language === 'hi'
          ? 'आपकी पुष्टि दर्ज कर ली गई है।'
          : 'Your confirmation has been recorded.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // --------------------------------------------------
  // PROBLEM NOT FIXED (Citizen reopening)
  // --------------------------------------------------

  const handleProblemNotFixed = async () => {
    if (isVerifying) return;
    try {
      if (!complaint?.complaintId) return;
      setIsVerifying(true);

      const complaintNumId = Number(complaint.complaintId);
      if (!isNaN(complaintNumId)) {
        await complaintApi.updateStatus(
          complaintNumId,
          'REOPENED',
          'नागरिक द्वारा सूचित किया गया कि समस्या अभी भी है (Citizen reported problem not fixed)'
        );
      }

      const updatedComplaint = {
        ...complaint,
        status: 'REOPENED',
      };

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
      console.log('Unable to reopen complaint in backend:', error);
      const updatedComplaint = {
        ...complaint,
        status: 'REOPENED',
      };
      setComplaint(updatedComplaint);
      Alert.alert(
        language === 'hi' ? 'शिकायत फिर से खोली गई' : 'Complaint Reopened',
        language === 'hi'
          ? 'आपकी शिकायत को पुनः कार्रवाई के लिए भेज दिया गया है।'
          : 'Your complaint has been marked as reopened.'
      );
    } finally {
      setIsVerifying(false);
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

      setComplaint(updatedComplaint);
      setRemarks('');

      Alert.alert(
        language === 'hi' ? 'सफलतापूर्वक अपडेट किया गया' : 'Status Updated',
        language === 'hi'
          ? `शिकायत की स्थिति '${getStatusLabel(selectedStatus)}' में बदल दी गई है।`
          : `Complaint status changed to '${getStatusLabel(selectedStatus)}'.`
      );
    } catch (error: any) {
      console.log('Unable to update complaint status in backend:', error);
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

  const verificationDetails = getVerificationDetails();

  // --------------------------------------------------
  // TIMELINE
  // --------------------------------------------------

  const timelineStages = [
    { key: 'SUBMITTED', labelHi: 'जमा की गई', labelEn: 'Submitted' },
    { key: 'UNDER_REVIEW', labelHi: 'समीक्षा व सत्यापन', labelEn: 'Under Review' },
    { key: 'IN_PROGRESS', labelHi: 'कार्रवाई जारी (प्रगति में)', labelEn: 'Action Taken (In Progress)' },
    { key: 'RESOLVED', labelHi: 'समाधान पूर्ण', labelEn: 'Resolved' },
    { key: 'CLOSED', labelHi: 'सत्यापित बंद', labelEn: 'Closed' },
  ];

  const getStageIndex = (status: string) => {
    const s = String(status || '').replace(/\s+/g, '_').toUpperCase();
    if (s === 'CLOSED') return 4;
    if (s === 'RESOLVED') return 3;
    if (s === 'IN_PROGRESS' || s === 'ACTION_TAKEN') return 2;
    if (s === 'UNDER_REVIEW' || s === 'VERIFICATION') return 1;
    if (s === 'SUBMITTED') return 0;
    return 0;
  };

  const currentIndex = getStageIndex(normalizedStatus);

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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else if (userRole === 'sarpanch' || userRole === 'secretary') {
                router.replace('/admin');
              } else {
                router.replace('/citizen-dashboard');
              }
            }}
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

        {/* STATUS BANNER CARD */}
        <View style={styles.statusBox}>
          <View style={styles.statusTopRow}>
            <View style={[styles.statusIconBadge, { backgroundColor: statusColors.background }]}>
              <Ionicons
                name={
                  normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED'
                    ? 'checkmark-circle'
                    : normalizedStatus === 'ACTION_TAKEN'
                      ? 'construct'
                      : normalizedStatus === 'IN_PROGRESS' || normalizedStatus === 'UNDER_REVIEW'
                        ? 'time'
                        : 'document-text'
                }
                size={20}
                color={statusColors.text}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>
                {language === 'hi' ? 'वर्तमान स्थिति' : 'Current Status'}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: statusColors.background,
                    borderColor: statusColors.text + '33',
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
            </View>
          </View>

          <Text style={styles.statusHint}>
            {normalizedStatus === 'RESOLVED'
              ? userRole === 'citizen'
                ? language === 'hi'
                  ? 'कृपया नीचे दिए गए विकल्प से पुष्टि करें कि समस्या ठीक हुई या नहीं।'
                  : 'Please confirm below whether your problem has been fixed.'
                : language === 'hi'
                  ? 'समाधान दर्ज हो चुका है, नागरिक द्वारा पुष्टि/सत्यापन की प्रतीक्षा है।'
                  : 'Resolved by official, awaiting citizen confirmation and closure.'
              : normalizedStatus === 'CLOSED'
                ? language === 'hi'
                  ? 'यह शिकायत सफलतापूर्वक बंद कर दी गई है।'
                  : 'This complaint has been successfully closed.'
                : normalizedStatus === 'REOPENED'
                  ? language === 'hi'
                    ? 'शिकायत को आगे की कार्रवाई के लिए फिर से खोला गया है।'
                    : 'The complaint has been reopened for further action.'
                  : language === 'hi'
                    ? 'आपकी शिकायत संबंधित पंचायत अधिकारी की निगरानी में है।'
                    : 'Your complaint is actively monitored by the Panchayat team.'}
          </Text>
        </View>

        {/* VERIFICATION REASON CARD (FOR UNDER REVIEW / VERIFICATION) */}
        {(normalizedStatus === 'VERIFICATION' ||
          normalizedStatus === 'UNDER REVIEW' ||
          normalizedStatus === 'UNDER_REVIEW' ||
          complaint?.classification === 'NEEDS_VERIFICATION') && (
          <View
            style={[
              styles.verificationReasonCard,
              {
                backgroundColor: verificationDetails.bg,
                borderColor: verificationDetails.borderColor,
              },
            ]}
          >
            <View style={styles.verificationReasonHeader}>
              <View
                style={[
                  styles.reasonBadge,
                  { backgroundColor: verificationDetails.color + '18' },
                ]}
              >
                <Ionicons
                  name={verificationDetails.icon}
                  size={14}
                  color={verificationDetails.color}
                />
                <Text
                  style={[
                    styles.reasonBadgeText,
                    { color: verificationDetails.color },
                  ]}
                >
                  {verificationDetails.badge}
                </Text>
              </View>
              <View style={styles.aiTagBadge}>
                <Ionicons name="sparkles" size={11} color="#000080" />
                <Text style={styles.aiTagText}>AI Audit</Text>
              </View>
            </View>

            <Text style={styles.verificationReasonTitle}>
              {verificationDetails.title}
            </Text>

            <Text style={styles.verificationReasonBody}>
              {verificationDetails.reason}
            </Text>

            <View style={styles.verificationActionRow}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={styles.verificationActionText}>
                {verificationDetails.action}
              </Text>
            </View>
          </View>
        )}

        {/* TIMELINE */}
        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <View style={styles.cardHeadingBadge}>
              <Ionicons
                name="git-branch-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.cardTitle}>
              {language === 'hi'
                ? 'शिकायत प्रगति'
                : 'Complaint Progress'}
            </Text>
          </View>

          {timelineStages.map((stage, index) => {
            const completed =
              currentIndex >= 0 &&
              index <= currentIndex;

            const isCurrent =
              index === currentIndex &&
              normalizedStatus !== 'CLOSED';

            return (
              <View
                key={stage.key}
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
                    timelineStages.length - 1 && (
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
                    {language === 'hi' ? stage.labelHi : stage.labelEn}
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
                size={18}
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

        {/* ========================================================= */}
        {/* AI CLASSIFICATION & CITIZEN ACTION BANNER                 */}
        {/* ========================================================= */}
        {Boolean(
          isNeedsVerificationClassification(complaint) ||
          isDuplicateClassification(complaint) ||
          isFakeClassification(complaint)
        ) && (
          <View
            style={[
              styles.aiBannerCard,
              isNeedsVerificationClassification(complaint)
                ? styles.aiBannerNeedsVerify
                : isDuplicateClassification(complaint)
                  ? styles.aiBannerDuplicate
                  : styles.aiBannerFake,
            ]}
          >
            {/* Header / Badge */}
            <View style={styles.aiBannerHeaderRow}>
              <View
                style={[
                  styles.aiBannerIconCircle,
                  isNeedsVerificationClassification(complaint)
                    ? { backgroundColor: '#FEF3C7' }
                    : isDuplicateClassification(complaint)
                      ? { backgroundColor: '#DBEAFE' }
                      : { backgroundColor: '#FEE2E2' },
                ]}
              >
                <Ionicons
                  name={
                    isNeedsVerificationClassification(complaint)
                      ? 'warning'
                      : isDuplicateClassification(complaint)
                        ? 'copy'
                        : 'shield-outline'
                  }
                  size={20}
                  color={
                    isNeedsVerificationClassification(complaint)
                      ? '#D97706'
                      : isDuplicateClassification(complaint)
                        ? '#2563EB'
                        : '#DC2626'
                  }
                />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.aiBadgeInline}>
                  <Text
                    style={[
                      styles.aiBadgeInlineText,
                      {
                        color: isNeedsVerificationClassification(complaint)
                          ? '#92400E'
                          : isDuplicateClassification(complaint)
                            ? '#1E40AF'
                            : '#991B1B',
                      },
                    ]}
                  >
                    {isNeedsVerificationClassification(complaint)
                      ? (language === 'hi' ? 'सत्यापन आवश्यक' : 'Verification Needed')
                      : isDuplicateClassification(complaint)
                        ? (language === 'hi' ? 'संभावित डुप्लिकेट' : 'Potential Duplicate')
                        : (language === 'hi' ? 'अमान्य / मिसमैच फोटो' : 'Flagged Mismatch')}
                  </Text>
                </View>
                <Text style={styles.aiBannerTitle}>
                  {isNeedsVerificationClassification(complaint)
                    ? (language === 'hi' ? 'स्पष्ट फोटो / मुआयना अपेक्षित' : 'Clear Photo / Inspection Needed')
                    : isDuplicateClassification(complaint)
                      ? (language === 'hi' ? 'पूर्व में दर्ज शिकायत से मिलान' : 'Matching Previous Complaint')
                      : (language === 'hi' ? 'असंगत या अमान्य विवरण' : 'Irrelevant Image Attachment')}
                </Text>
              </View>
            </View>

            {/* AI Explanation Text */}
            <View style={styles.aiReasonBox}>
              <Text style={styles.aiReasonText}>
                {complaint.classificationReason || (
                  isNeedsVerificationClassification(complaint)
                    ? (language === 'hi'
                        ? 'अपलोड की गई फोटो में अत्यधिक धुंधलापन, अंधेरा या लेंस ढका होना पाया गया है। सटीक समाधान हेतु स्पष्ट फोटो की आवश्यकता है।'
                        : 'Uploaded photo is blurry, dark, or lens is obstructed. Clear on-site photo recommended.')
                    : isDuplicateClassification(complaint)
                      ? (language === 'hi'
                          ? `समान वार्ड/लोकेशन में पूर्व शिकायत ${complaint.duplicateOfId ? '#' + complaint.duplicateOfId : ''} पहले से सक्रिय है।`
                          : `A matching complaint ${complaint.duplicateOfId ? '#' + complaint.duplicateOfId : ''} already exists for this issue.`)
                      : (language === 'hi'
                          ? 'अपलोड की गई फोटो शिकायत की श्रेणी से मेल नहीं खाती (उदा. सड़क/पानी की जगह सेल्फी या स्क्रीनशॉट)। कृपया वास्तविक समस्या की फोटो लगाएं।'
                          : 'Attached photo does not correlate with the civic category. Please attach an authentic on-site photograph.')
                )}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.aiActionBtnRow}>
              {/* If Duplicate, provide direct button to view original ticket */}
              {isDuplicateClassification(complaint) && Boolean(complaint.duplicateOfId) && (
                <TouchableOpacity
                  style={styles.aiActionPrimaryBtn}
                  onPress={() => {
                    router.push({
                      pathname: '/complaint-details' as any,
                      params: { id: String(complaint.duplicateOfId) },
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="eye-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.aiActionPrimaryBtnText}>
                    {language === 'hi'
                      ? `मूल शिकायत #${complaint.duplicateOfId} देखें`
                      : `View Original #${complaint.duplicateOfId}`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Re-submit / Re-report CTA for Citizen */}
              {userRole === 'citizen' && (
                <TouchableOpacity
                  style={[
                    styles.aiActionSecondaryBtn,
                    !isDuplicateClassification(complaint) && styles.aiActionPrimaryBtn,
                  ]}
                  onPress={() => {
                    router.push({
                      pathname: '/report' as any,
                      params: {
                        prefillCategory: complaint.category,
                        prefillWard: complaint.ward,
                        prefillDesc: complaint.description,
                      },
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={isNeedsVerificationClassification(complaint) ? 'camera-outline' : 'refresh-outline'}
                    size={17}
                    color={!isDuplicateClassification(complaint) ? '#FFFFFF' : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.aiActionSecondaryBtnText,
                      !isDuplicateClassification(complaint) && styles.aiActionPrimaryBtnText,
                    ]}
                  >
                    {isNeedsVerificationClassification(complaint)
                      ? (language === 'hi' ? '📷 स्पष्ट फोटो के साथ पुनः दर्ज करें' : '📷 Re-submit Clear Photo')
                      : isDuplicateClassification(complaint)
                        ? (language === 'hi' ? '✍️ यदि यह अलग समस्या है तो पुनः दर्ज करें' : '✍️ Report as Distinct Issue')
                        : (language === 'hi' ? '✍️ सही फोटो के साथ पुनः दर्ज करें' : '✍️ Re-report with Valid Photo')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* COMPLAINT INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <View style={styles.cardHeadingBadge}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.cardTitle}>
              {language === 'hi'
                ? 'शिकायत जानकारी'
                : 'Complaint Information'}
            </Text>
          </View>

          {/* COMPLAINT ID */}
          <View style={styles.detailRow}>
            <Text style={styles.label}>
              {language === 'hi'
                ? 'शिकायत आईडी'
                : 'Complaint ID'}
            </Text>

            <View style={styles.idBadgeSmall}>
              <Text style={styles.idBadgeSmallText}>
                #{complaint.complaintId}
              </Text>
            </View>
          </View>

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

          {/* CITIZEN MOBILE */}
          {Boolean(complaint.citizenMobile) && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>
                {language === 'hi'
                  ? 'मोबाइल नंबर'
                  : 'Citizen Mobile'}
              </Text>

              <Text style={styles.value}>
                {complaint.citizenMobile}
              </Text>
            </View>
          )}

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

          {/* PRIORITY */}
          {Boolean(complaint.priority) && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>
                {language === 'hi'
                  ? 'प्राथमिकता'
                  : 'Priority'}
              </Text>

              <View
                style={[
                  styles.priorityPill,
                  (complaint.priority === 'CRITICAL' || complaint.priority === 'VERY_HIGH' || complaint.priority === 'VERY HIGH')
                    ? styles.priorityVeryHigh
                    : complaint.priority === 'HIGH'
                      ? styles.priorityHigh
                      : complaint.priority === 'LOW'
                        ? styles.priorityLow
                        : styles.priorityMedium,
                ]}
              >
                <Text
                  style={[
                    styles.priorityPillText,
                    (complaint.priority === 'CRITICAL' || complaint.priority === 'VERY_HIGH' || complaint.priority === 'VERY HIGH')
                      ? styles.priorityVeryHighText
                      : complaint.priority === 'HIGH'
                        ? styles.priorityHighText
                        : complaint.priority === 'LOW'
                          ? styles.priorityLowText
                          : styles.priorityMediumText,
                  ]}
                >
                  {complaint.priority === 'CRITICAL' || complaint.priority === 'VERY_HIGH'
                    ? (language === 'hi' ? 'अति गंभीर (CRITICAL)' : 'CRITICAL')
                    : complaint.priority === 'HIGH'
                      ? (language === 'hi' ? 'उच्च (HIGH)' : 'HIGH')
                      : complaint.priority === 'LOW'
                        ? (language === 'hi' ? 'सामान्य (LOW)' : 'LOW')
                        : (language === 'hi' ? 'मध्यम (MEDIUM)' : 'MEDIUM')}
                </Text>
              </View>
            </View>
          )}

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
          <View style={styles.cardHeadingRow}>
            <View style={styles.cardHeadingBadge}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.cardTitle}>
              {language === 'hi'
                ? 'समस्या का विवरण'
                : 'Problem Description'}
            </Text>
          </View>

          <Text style={styles.description}>
            {complaint.description ||
              (language === 'hi'
                ? 'कोई विवरण उपलब्ध नहीं है।'
                : 'No description available.')}
          </Text>
        </View>

        {/* PHOTO */}
        {Boolean(complaint.photo && complaint.photo !== 'null' && complaint.photo !== 'undefined' && String(complaint.photo).trim() !== '') && (
          <View style={styles.card}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingBadge}>
                <Ionicons
                  name="image-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.cardTitle}>
                {language === 'hi'
                  ? 'संलग्न फोटो'
                  : 'Attached Photo'}
              </Text>
            </View>

            {Boolean(!imageError && resolvePhotoUrl(complaint.photo)) ? (
              <TouchableOpacity
                style={styles.photoTouchable}
                activeOpacity={0.9}
                onPress={() => setPhotoPreviewVisible(true)}
              >
                {imageLoading && (
                  <View style={styles.photoLoadingOverlay}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.photoLoadingText}>
                      {language === 'hi' ? 'फोटो लोड हो रही है...' : 'Loading photo...'}
                    </Text>
                  </View>
                )}
                <Image
                  source={{
                    uri: resolvePhotoUrl(complaint.photo)!,
                  }}
                  style={styles.photo}
                  resizeMode="cover"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                <View style={styles.photoZoomOverlayBadge}>
                  <Ionicons name="search" size={14} color="#FFFFFF" />
                  <Text style={styles.photoZoomOverlayText}>
                    {language === 'hi' ? 'बड़ा करके देखें (Zoom)' : 'Tap to Zoom'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.photoFallbackBox}>
                <Ionicons name="image-outline" size={38} color={COLORS.primary} />
                <Text style={styles.photoFallbackTitle}>
                  {language === 'hi' ? 'फोटो संलग्न है' : 'Photo Attached'}
                </Text>
                <Text style={styles.photoFallbackSub}>
                  {language === 'hi'
                    ? 'स्थानीय डिवाइस फोटो (सुरक्षित रूप से संलग्न)'
                    : 'Local photo attachment saved with complaint'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* COMPACT VOICE RECORDING PLAYER */}
        {Boolean(audioUri || (complaint.audioUrl && complaint.audioUrl !== 'null')) && (
          <View style={styles.compactAudioCard}>
            <TouchableOpacity
              style={[styles.compactPlayBtn, isPlayingAudio && styles.compactPlayBtnActive]}
              onPress={handleToggleAudio}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isPlayingAudio ? 'pause' : 'play'}
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: isPlayingAudio ? 0 : 2 }}
              />
            </TouchableOpacity>

            <View style={styles.compactAudioInfo}>
              <View style={styles.compactAudioTitleRow}>
                <Text style={styles.compactAudioTitle}>
                  {language === 'hi' ? 'नागरिक वॉइस रिकॉर्डिंग' : 'Citizen Voice Note'}
                </Text>
                <Text style={styles.compactAudioStatus}>
                  {isPlayingAudio
                    ? (language === 'hi' ? 'चल रहा है...' : 'Playing...')
                    : (language === 'hi' ? 'सुनने के लिए टैप करें' : 'Tap to listen')}
                </Text>
              </View>

              <View style={styles.compactWaveform}>
                <View style={[styles.compactWaveBar, { height: 7 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 14 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 19 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 10 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 16 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 9 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 18 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 12 }, isPlayingAudio && styles.compactWaveBarActive]} />
                <View style={[styles.compactWaveBar, { height: 7 }, isPlayingAudio && styles.compactWaveBarActive]} />
              </View>
            </View>

            <View style={styles.compactMicBadge}>
              <Ionicons name="mic" size={16} color="#D97706" />
            </View>
          </View>
        )}

        {/* LOCATION */}
        {complaint.location && (
          <View style={styles.card}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingBadge}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.cardTitle}>
                {language === 'hi'
                  ? 'स्थान विवरण'
                  : 'Location Details'}
              </Text>
            </View>

            <View style={styles.locationRow}>
              <Ionicons
                name="pin"
                size={18}
                color={COLORS.primary}
              />

              <Text style={styles.locationValue}>
                {getLocationText()}
              </Text>
            </View>
          </View>
        )}

        {/* CITIZEN VERIFICATION (ONLY FOR CITIZEN) */}
        {userRole === 'citizen' && normalizedStatus === 'RESOLVED' && (
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

            {/* FIXED */}
            <TouchableOpacity
              style={[styles.fixedButton, isVerifying && { opacity: 0.7 }]}
              onPress={handleProblemFixed}
              disabled={isVerifying}
              activeOpacity={0.7}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={styles.fixedButtonText}
                  >
                    {language === 'hi'
                      ? 'हाँ, समस्या ठीक हो गई'
                      : 'Yes, Problem Fixed'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* NOT FIXED */}
            <TouchableOpacity
              style={[styles.notFixedButton, isVerifying && { opacity: 0.7 }]}
              onPress={handleProblemNotFixed}
              disabled={isVerifying}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
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

        {/* OFFICIAL NOTICE: AWAITING CITIZEN CONFIRMATION */}
        {(userRole === 'sarpanch' || userRole === 'secretary') && normalizedStatus === 'RESOLVED' && (
          <View style={styles.officialNoticeCard}>
            <Ionicons
              name="hourglass-outline"
              size={22}
              color={COLORS.warning}
            />
            <View style={styles.officialNoticeContent}>
              <Text style={styles.officialNoticeTitle}>
                {language === 'hi'
                  ? 'समाधान दर्ज - नागरिक सत्यापन प्रतीक्षित'
                  : 'Resolved - Awaiting Citizen Confirmation'}
              </Text>
              <Text style={styles.officialNoticeText}>
                {language === 'hi'
                  ? 'आपने इस समस्या का समाधान दर्ज कर दिया है। नागरिक द्वारा पुष्टि किए जाने पर यह शिकायत बंद (Closed) हो जाएगी।'
                  : 'Status is marked as Resolved. Once the citizen verifies satisfaction, this complaint will be marked as Closed.'}
              </Text>
            </View>
          </View>
        )}

        {/* CITIZEN RATING & FEEDBACK CARD (FOR RESOLVED & CLOSED COMPLAINTS) */}
        {(normalizedStatus === 'RESOLVED' || normalizedStatus === 'CLOSED') && (
          <View style={styles.ratingSectionCard}>
            <View style={styles.cardHeadingRow}>
              <View style={[styles.cardHeadingBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="star" size={18} color="#D97706" />
              </View>
              <Text style={styles.cardTitle}>
                {language === 'hi' ? 'नागरिक संतुष्टि रेटिंग व फीडबैक' : 'Citizen Rating & Feedback'}
              </Text>
            </View>

            {savedRatingData ? (
              /* ALREADY RATED BADGE */
              <View style={styles.savedRatingBox}>
                <View style={styles.savedStarRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= savedRatingData.rating ? 'star' : 'star-outline'}
                      size={24}
                      color="#F59E0B"
                    />
                  ))}
                  <Text style={styles.savedRatingScore}>{savedRatingData.rating}/5</Text>
                </View>

                <Text style={styles.savedRatingLabel}>
                  {savedRatingData.rating === 5
                    ? (language === 'hi' ? '🌟 उत्कृष्ट समाधान (Excellent)' : '🌟 Excellent')
                    : savedRatingData.rating === 4
                      ? (language === 'hi' ? '😊 बहुत अच्छा काम (Very Good)' : '😊 Very Good')
                      : savedRatingData.rating === 3
                        ? (language === 'hi' ? '🙂 अच्छा काम (Good)' : '🙂 Good')
                        : (language === 'hi' ? '😐 साधारण (Fair)' : '😐 Fair')}
                </Text>

                {Boolean(savedRatingData.review) && (
                  <View style={styles.savedReviewBox}>
                    <Text style={styles.savedReviewText}>
                      "{savedRatingData.review}"
                    </Text>
                  </View>
                )}

                <View style={styles.ratingVerifiedPill}>
                  <Ionicons name="shield-checkmark" size={13} color="#16A34A" />
                  <Text style={styles.ratingVerifiedText}>
                    {language === 'hi' ? 'नागरिक द्वारा सत्यापित प्रतिक्रिया' : 'Citizen Verified Review'}
                  </Text>
                </View>
              </View>
            ) : userRole === 'citizen' ? (
              /* INTERACTIVE RATING INPUT FOR CITIZEN */
              <View style={styles.ratingInputContainer}>
                <Text style={styles.ratingPromptText}>
                  {language === 'hi'
                    ? 'ग्राम पंचायत (सरपंच/सचिव) द्वारा किए गए कार्य को रेट करें:'
                    : 'Rate the quality of redressal done by Panchayat:'}
                </Text>

                {/* 5 Star Buttons */}
                <View style={styles.interactiveStarRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setCitizenRating(star)}
                      style={styles.starTouchBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={star <= citizenRating ? 'star' : 'star-outline'}
                        size={32}
                        color={star <= citizenRating ? '#F59E0B' : '#CBD5E1'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {citizenRating > 0 && (
                  <Text style={styles.activeRatingLabel}>
                    {citizenRating === 5
                      ? (language === 'hi' ? '🌟 5/5 - उत्कृष्ट समाधान' : '🌟 5/5 - Excellent')
                      : citizenRating === 4
                        ? (language === 'hi' ? '😊 4/5 - बहुत अच्छा' : '😊 4/5 - Very Good')
                        : citizenRating === 3
                          ? (language === 'hi' ? '🙂 3/5 - अच्छा काम' : '🙂 3/5 - Good')
                          : citizenRating === 2
                            ? (language === 'hi' ? '😐 2/5 - संतोषजनक' : '😐 2/5 - Fair')
                            : (language === 'hi' ? '😞 1/5 - असंतुष्ट' : '😞 1/5 - Dissatisfied')}
                  </Text>
                )}

                {/* Review Text Input */}
                <TextInput
                  style={styles.reviewTextInput}
                  placeholder={
                    language === 'hi'
                      ? 'अपनी टिप्पणी या सुझाव लिखें (उदा. समय पर ठीक हुआ)...'
                      : 'Write your comments/feedback (optional)...'
                  }
                  placeholderTextColor="#94A3B8"
                  value={citizenReview}
                  onChangeText={setCitizenReview}
                  multiline
                  numberOfLines={2}
                />

                {/* Submit Rating Button */}
                <TouchableOpacity
                  style={[
                    styles.submitRatingBtn,
                    citizenRating === 0 && { opacity: 0.5 },
                  ]}
                  disabled={citizenRating === 0}
                  onPress={async () => {
                    if (citizenRating === 0 || !complaint?.complaintId) return;
                    const ratingObj = {
                      rating: citizenRating,
                      review: citizenReview.trim(),
                      submittedAt: new Date().toISOString(),
                    };
                    await AsyncStorage.setItem(
                      `rating_complaint_${complaint.complaintId}`,
                      JSON.stringify(ratingObj)
                    );
                    setSavedRatingData(ratingObj);
                    Alert.alert(
                      language === 'hi' ? '⭐ रेटिंग दर्ज हुई' : '⭐ Rating Submitted',
                      language === 'hi'
                        ? `आपने इस कार्य को ${citizenRating} स्टार दिए हैं। आपकी प्रतिक्रिया के लिए धन्यवाद!`
                        : `Thank you for rating this complaint with ${citizenRating} stars!`
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                  <Text style={styles.submitRatingBtnText}>
                    {language === 'hi' ? 'रेटिंग व फीडबैक सबमिट करें' : 'Submit Rating & Feedback'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* OFFICIAL VIEW IF CITIZEN HAS NOT RATED YET */
              <View style={styles.awaitingRatingBox}>
                <Ionicons name="time-outline" size={18} color="#94A3B8" />
                <Text style={styles.awaitingRatingText}>
                  {language === 'hi'
                    ? 'नागरिक द्वारा संतुष्टि रेटिंग अभी लंबित है।'
                    : 'Citizen rating is pending.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* NOTICE: COMPLAINT CLOSED */}
        {normalizedStatus === 'CLOSED' && (
          <View style={[styles.officialNoticeCard, styles.closedNoticeCard]}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={22}
              color={COLORS.indiaGreen}
            />
            <View style={styles.officialNoticeContent}>
              <Text style={[styles.officialNoticeTitle, { color: COLORS.indiaGreen }]}>
                {language === 'hi'
                  ? 'शिकायत सफलतापूर्वक बंद (Closed)'
                  : 'Complaint Successfully Closed'}
              </Text>
              <Text style={styles.officialNoticeText}>
                {language === 'hi'
                  ? 'नागरिक द्वारा समस्या समाधान की पुष्टि के बाद यह शिकायत बंद कर दी गई है।'
                  : 'This complaint has been verified and officially closed by the citizen.'}
              </Text>
            </View>
          </View>
        )}

        {/* OFFICIAL ACTION PANEL (SARPANCH / SECRETARY) */}
        {(userRole === 'sarpanch' || userRole === 'secretary') && (
          <View style={styles.officialActionCard}>
            <View style={styles.cardHeadingRow}>
              <View style={[styles.cardHeadingBadge, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color="#000080"
                />
              </View>
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
                    size={15}
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
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
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

      {/* FULL ENLARGED PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={photoPreviewVisible}
        imageUri={complaint?.photo}
        userName={complaint ? `#${complaint.complaintId} • ${getCategoryLabel(complaint.category)}` : (language === 'hi' ? 'शिकायत फोटो' : 'Complaint Photo')}
        userRole={complaint?.ward || (language === 'hi' ? 'ग्राम पंचायत' : 'Gram Panchayat')}
        onClose={() => setPhotoPreviewVisible(false)}
        isHindi={language === 'hi'}
      />
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
    fontSize: 20,
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

  statusBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAECEF',
    ...SHADOWS.small,
  },

  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  statusIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusLabel: {
    fontSize: 11,
    color: '#667085',
    marginBottom: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },

  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },

  statusHint: {
    marginTop: 12,
    fontSize: 12.5,
    lineHeight: 19,
    color: '#475467',
    fontWeight: '500',
  },

  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  cardHeadingBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  cardTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#172033',
  },

  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAECEF',
    ...SHADOWS.small,
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

  photoTouchable: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F2F4F7',
  },

  photo: {
    width: '100%',
    height: 230,
    borderRadius: 16,
    backgroundColor: '#F2F4F7',
  },

  photoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    gap: 8,
  },

  photoLoadingText: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '600',
  },

  photoZoomOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },

  photoZoomOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  photoFallbackBox: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F8F9FB',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  photoFallbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#344054',
    marginTop: 8,
  },

  photoFallbackSub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
    textAlign: 'center',
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
    marginBottom: 16,
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

  // Verification Reason Card
  verificationReasonCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  verificationReasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reasonBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  aiTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8E8F5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000080',
  },
  verificationReasonTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  verificationReasonBody: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#334155',
    marginBottom: 10,
    fontWeight: '500',
  },
  verificationActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  verificationActionText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    flex: 1,
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

  officialNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD700',
    gap: 12,
  },

  closedNoticeCard: {
    backgroundColor: '#EDF7F2',
    borderColor: '#23845F',
  },

  officialNoticeContent: {
    flex: 1,
  },

  officialNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B78103',
  },

  officialNoticeText: {
    fontSize: 12.5,
    color: '#475467',
    marginTop: 3,
    lineHeight: 18,
  },

  photoContainer: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#F9FAFB',
  },

  compactAudioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...SHADOWS.small,
  },

  compactPlayBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#D97706',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  compactPlayBtnActive: {
    backgroundColor: '#B45309',
  },

  compactAudioInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  compactAudioTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  compactAudioTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#172033',
  },

  compactAudioStatus: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },

  compactWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
  },

  compactWaveBar: {
    width: 3.5,
    borderRadius: 2,
    backgroundColor: '#FDE68A',
  },

  compactWaveBarActive: {
    backgroundColor: '#D97706',
  },

  compactMicBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },

  idBadgeSmall: {
    backgroundColor: '#EBF4FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C2DCFD',
  },

  idBadgeSmallText: {
    color: '#000080',
    fontSize: 13,
    fontWeight: '800',
  },

  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },

  priorityPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  priorityVeryHigh: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },

  priorityVeryHighText: {
    color: '#DC2626',
  },

  priorityHigh: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },

  priorityHighText: {
    color: '#EA580C',
  },

  priorityMedium: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },

  priorityMediumText: {
    color: '#D97706',
  },

  priorityLow: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },

  priorityLowText: {
    color: '#16A34A',
  },

  /* ================= AI CLASSIFICATION BANNER STYLES ================= */
  aiBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    ...SHADOWS.small,
  },

  aiBannerNeedsVerify: {
    backgroundColor: '#FFFDF5',
    borderColor: '#FDE68A',
  },

  aiBannerDuplicate: {
    backgroundColor: '#F8FAFF',
    borderColor: '#BFDBFE',
  },

  aiBannerFake: {
    backgroundColor: '#FFF8F8',
    borderColor: '#FECACA',
  },

  aiBannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  aiBannerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiBadgeInline: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 3,
  },

  aiBadgeInlineText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  aiBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  aiReasonBox: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
  },

  aiReasonText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontWeight: '500',
  },

  aiActionBtnRow: {
    flexDirection: 'column',
    gap: 8,
  },

  aiActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    ...SHADOWS.small,
  },

  aiActionPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  aiActionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },

  aiActionSecondaryBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  /* ================= CITIZEN RATING STYLES ================= */
  ratingSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    ...SHADOWS.small,
  },
  savedRatingBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  savedStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  savedRatingScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
    marginLeft: 6,
  },
  savedRatingLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 8,
  },
  savedReviewBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  savedReviewText: {
    fontSize: 12.5,
    color: '#78350F',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ratingVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  ratingVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  ratingInputContainer: {
    marginTop: 4,
  },
  ratingPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 10,
  },
  interactiveStarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  starTouchBtn: {
    padding: 4,
  },
  activeRatingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 10,
  },
  reviewTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
    minHeight: 45,
  },
  submitRatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    ...SHADOWS.small,
  },
  submitRatingBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  awaitingRatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  awaitingRatingText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
});
