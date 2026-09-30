import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { complaintApi, ComplaintData, authApi, getAuthToken, setAuthToken, isValidJwt, resolvePhotoUrl } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { PhotoPreviewModal } from '../../components/PhotoPreviewModal';
import { GramMitraModal } from '../../components/GramMitraModal';
import {
  COLORS,
  RADIUS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../theme';

import {
  isVeryHighPriority,
  isHighPriority,
  isMediumPriority,
  isLowPriority,
  isDuplicateClassification,
  isFakeClassification,
  isNeedsVerificationClassification,
  isGenuineClassification,
} from '../../services/complaintClassification';

type Complaint = {
  complaintId?: string;
  citizenName?: string;
  citizenMobile?: string;
  ward?: string;
  category?: string;
  priority?: string;
  department?: string;
  classification?: string;
  classificationReason?: string;
  duplicateOfId?: string;
  supportCount?: number;
  isMerged?: boolean;
  parentComplaintId?: number;
  deadline?: string | null;
  escalationLevel?: number;
  currentAuthority?: string;
  daysRemaining?: number | null;
  escalatedAt?: string;
  escalationReason?: string;
  description?: string;
  photo?: string | null;
  audioUrl?: string | null;
  location?: string | null;
  status?: string;
  dateTime?: string;
};

const ComplaintCardPhoto = ({
  photo,
  formattedId,
  categoryName,
  isHindi,
  onPress,
}: {
  photo: string;
  formattedId: string;
  categoryName: string;
  isHindi: boolean;
  onPress: (url: string) => void;
}) => {
  const [loadError, setLoadError] = useState(false);
  const resolved = resolvePhotoUrl(photo);

  useEffect(() => {
    setLoadError(false);
  }, [photo]);

  if (!resolved) return null;

  if (loadError) {
    return (
      <View style={styles.cardPhotoFallbackBox}>
        <Ionicons name="image-outline" size={20} color={COLORS.primary} />
        <Text style={styles.cardPhotoFallbackText}>
          {isHindi ? '📷 फोटो संलग्न है (सुरक्षित रिकॉर्ड)' : '📷 Photo Attached (Saved in Record)'}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.photoContainer}
      activeOpacity={0.9}
      onPress={() => onPress(resolved)}
    >
      <Image
        source={{ uri: resolved }}
        style={styles.thumbnailImage}
        resizeMode="cover"
        onError={() => setLoadError(true)}
      />
      <View style={styles.photoZoomBadge}>
        <Ionicons name="search" size={13} color="#FFFFFF" />
        <Text style={styles.photoZoomText}>
          {isHindi ? 'फोटो देखें' : 'View Photo'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ComplaintsScreen() {
  const router = useRouter();

  const { filter, status, priority, ward } = useLocalSearchParams<{
    filter?: string;
    status?: string;
    priority?: string;
    ward?: string;
  }>();

  const { language, setLanguage, t } = useLanguage();
  const isHindi = language === 'hi';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary'>('citizen');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [gramMitraVisible, setGramMitraVisible] = useState(false);

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  // =====================================================
  // MAP BACKEND DATA TO LOCAL COMPLAINT FORMAT
  // =====================================================
  const mapBackendComplaint = (item: any): Complaint => ({
    complaintId: String(item.id || item.complaintNumber || item.complaintId),
    category: item.category || item.problemType || 'Village Issue',
    ward: item.wardNumber ? `Ward ${item.wardNumber}` : item.location || item.ward || '',
    priority: item.priority || 'MEDIUM',
    department: item.department || '',
    classification: item.classification || item.imageClassification || item.aiClassification || '',
    classificationReason: item.classificationReason || '',
    duplicateOfId: item.duplicateOfId ? String(item.duplicateOfId) : '',
    supportCount: item.supportCount || 1,
    isMerged: item.isMerged || false,
    parentComplaintId: item.parentComplaintId || undefined,
    deadline: item.deadline || null,
    escalationLevel: item.escalationLevel || 1,
    currentAuthority: item.currentAuthority || 'SARPANCH',
    daysRemaining: item.daysRemaining !== undefined ? item.daysRemaining : null,
    escalatedAt: item.escalatedAt || null,
    escalationReason: item.escalationReason || null,
    description: item.description || '',
    photo: item.photo || item.payload?.photo || null,
    audioUrl: item.audioUrl || item.payload?.audioUrl || null,
    location: item.location || (item.villageName ? item.villageName : ''),
    status: item.status || 'SUBMITTED',
    dateTime: item.createdAt || item.dateTime || new Date().toISOString(),
  });

  // =====================================================
  // LOAD COMPLAINTS (MULTI-ROLE ROBUST FALLBACK)
  // =====================================================
  const loadComplaints = async () => {
    try {
      setLoading(true);

      const sessionData = await AsyncStorage.getItem('user_session');
      const fallbackData = await AsyncStorage.getItem('@village_user_session');
      const adminData = await AsyncStorage.getItem('admin');
      const secretaryData = await AsyncStorage.getItem('secretary');

      const session = sessionData ? JSON.parse(sessionData) : (fallbackData ? JSON.parse(fallbackData) : null);
      const rawRole = String(session?.role || (adminData ? 'sarpanch' : secretaryData ? 'secretary' : 'citizen')).toLowerCase();
      const isOfficial = rawRole === 'sarpanch' || rawRole === 'secretary' || rawRole === 'admin' || Boolean(adminData) || Boolean(secretaryData);
      const role = isOfficial ? (rawRole === 'secretary' ? 'secretary' : 'sarpanch') : 'citizen';
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

      let fetchedList: Complaint[] = [];

      // 1. Fetch complaints strictly based on user role
      if (isOfficial) {
        try {
          const apiData = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(apiData) && apiData.length > 0) {
            fetchedList = apiData.map(mapBackendComplaint);
          }
        } catch (apiErr) {
          console.log('Sarpanch complaints fetch error:', apiErr);
        }
      } else {
        try {
          const apiData = await complaintApi.getCitizenComplaints();
          if (Array.isArray(apiData) && apiData.length > 0) {
            fetchedList = apiData.map(mapBackendComplaint);
          }
        } catch (apiErr) {
          console.log('Citizen complaints fetch error:', apiErr);
        }
      }

      // 4. Include Offline Queue if Backend returned empty
      if (fetchedList.length === 0) {
        try {
          const offlineRaw = await AsyncStorage.getItem('@village_offline_complaints_queue');
          const offlineArr = offlineRaw ? JSON.parse(offlineRaw) : [];
          if (Array.isArray(offlineArr) && offlineArr.length > 0) {
            const mappedOffline = offlineArr.map((item: any) => ({
              complaintId: String(item.id),
              category: item.payload?.category || item.payload?.problemType || 'Village Issue',
              ward: item.ward || item.payload?.location || 'Ward 1',
              priority: item.payload?.priority || 'MEDIUM',
              classification: item.payload?.classification || 'GENUINE',
              classificationReason: item.payload?.classificationReason || '',
              duplicateOfId: item.payload?.duplicateOfId ? String(item.payload?.duplicateOfId) : '',
              department: item.payload?.department || '',
              deadline: item.payload?.deadline || null,
              description: item.payload?.description || '',
              photo: item.payload?.photo || null,
              audioUrl: item.payload?.audioUrl || null,
              location: item.payload?.location || '',
              status: 'SUBMITTED',
              dateTime: item.createdAt || new Date().toISOString(),
            }));
            fetchedList = [...mappedOffline, ...fetchedList];
          }
        } catch (offErr) {
          console.log('Error reading offline complaints for list:', offErr);
        }
      // 5. Check legacy offline complaints key
      if (fetchedList.length === 0) {
        try {
          const offline = await AsyncStorage.getItem('offline_complaints');
          const offlineArr = offline ? JSON.parse(offline) : [];
          if (Array.isArray(offlineArr) && offlineArr.length > 0) {
            fetchedList = offlineArr.map(mapBackendComplaint);
          }
        } catch {}
      }
      }

      fetchedList.sort(
        (a, b) =>
          new Date(b.dateTime || 0).getTime() -
          new Date(a.dateTime || 0).getTime()
      );
      setComplaints(fetchedList);
    } catch (error) {
      console.log('Unable to load complaints:', error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [])
  );

  const rawFilter = typeof filter === 'string' ? filter.trim() : '';
  const rawStatus = typeof status === 'string' ? status.trim() : '';
  const rawPriority = typeof priority === 'string' ? priority.trim() : '';

  const selectedStatus =
    rawStatus ||
    (['pending', 'in-progress', 'resolved', 'all', 'rejected', 'reopened'].includes(rawFilter)
      ? rawFilter
      : '');

  const selectedPriority =
    rawPriority ||
    (rawFilter.startsWith('priority-') ? rawFilter : '');

  const selectedWard = typeof ward === 'string' ? ward.trim() : '';

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

  const filteredComplaints = complaints.filter((c) => {
    // 1. Status Filter
    if (selectedStatus === 'pending') {
      const s = String(c.status || '').toUpperCase();
      const isInProg =
        s === 'IN PROGRESS' ||
        s === 'IN_PROGRESS' ||
        s === 'ACTION TAKEN' ||
        s === 'ACTION_TAKEN' ||
        s === 'UNDER REVIEW' ||
        s === 'UNDER_REVIEW';
      const isRes = s === 'RESOLVED' || s === 'CLOSED' || s === 'VERIFICATION';
      const isRej = s === 'REJECTED' || s === 'REJECT';
      if (isInProg || isRes || isRej) return false;
    } else if (selectedStatus === 'in-progress') {
      const s = String(c.status || '').toUpperCase();
      if (
        s !== 'IN PROGRESS' &&
        s !== 'IN_PROGRESS' &&
        s !== 'ACTION TAKEN' &&
        s !== 'ACTION_TAKEN' &&
        s !== 'UNDER REVIEW' &&
        s !== 'UNDER_REVIEW'
      ) return false;
    } else if (selectedStatus === 'resolved') {
      const s = String(c.status || '').toUpperCase();
      if (s !== 'RESOLVED' && s !== 'CLOSED' && s !== 'VERIFICATION') return false;
    } else if (selectedStatus === 'rejected') {
      const s = String(c.status || '').toUpperCase();
      if (s !== 'REJECTED' && s !== 'REJECT') return false;
    } else if (selectedStatus === 'reopened') {
      const s = String(c.status || '').toUpperCase();
      if (s !== 'REOPENED') return false;
    }

    // 2. Priority Filter (can combine with Status!)
    if (selectedPriority === 'priority-very-high' || selectedPriority === 'CRITICAL') {
      if (!isVeryHighPriority(c)) return false;
    } else if (selectedPriority === 'priority-high' || selectedPriority === 'HIGH') {
      if (!isHighPriority(c)) return false;
    } else if (selectedPriority === 'priority-medium' || selectedPriority === 'MEDIUM') {
      if (!isMediumPriority(c)) return false;
    } else if (selectedPriority === 'priority-low' || selectedPriority === 'LOW') {
      if (!isLowPriority(c)) return false;
    }

    if (selectedWard) {
      const targetNum = selectedWard.replace(/\D/g, '');
      const complaintWardNum = extractWardNumber(c.ward, c.location);

      if (targetNum) {
        if (complaintWardNum) {
          if (parseInt(complaintWardNum, 10) !== parseInt(targetNum, 10)) {
            return false;
          }
        } else {
          const combined = `${String(c.ward || '')} ${String(c.location || '')}`.toLowerCase();
          const hasExplicitWard =
            combined.includes(`ward ${targetNum}`) ||
            combined.includes(`ward${targetNum}`) ||
            combined.includes(`वार्ड ${targetNum}`) ||
            combined.includes(`वार्ड${targetNum}`);
          if (!hasExplicitWard) return false;
        }
      } else {
        const combined = `${String(c.ward || '')} ${String(c.location || '')}`.toLowerCase();
        if (!combined.includes(selectedWard.toLowerCase())) return false;
      }
    }

    return true;
  });

  const getFilterInfo = () => {
    if (selectedWard) {
      return {
        title: isHindi ? `वार्ड ${selectedWard} की शिकायतें` : `Ward ${selectedWard} Complaints`,
        badgeText: isHindi ? `वार्ड ${selectedWard}` : `Ward ${selectedWard}`,
        icon: 'location-outline' as const,
        iconColor: COLORS.primary,
        iconBg: COLORS.primaryLight,
        emptyTitle: isHindi ? `वार्ड ${selectedWard} में कोई शिकायत नहीं है` : `No Complaints in Ward ${selectedWard}`,
        emptyDesc: isHindi ? `वार्ड ${selectedWard} में वर्तमान में कोई समस्या दर्ज नहीं है।` : `There are currently no complaints recorded in Ward ${selectedWard}.`,
      };
    }
    const statusLabel =
      selectedStatus === 'pending'
        ? (isHindi ? 'लंबित' : 'Pending')
        : selectedStatus === 'in-progress'
          ? (isHindi ? 'प्रगति में' : 'In Progress')
          : selectedStatus === 'resolved'
            ? (isHindi ? 'निस्तारित' : 'Resolved')
            : '';

    const priorityLabel =
      selectedPriority === 'priority-very-high' || selectedPriority === 'CRITICAL'
        ? (isHindi ? 'अति गंभीर (Critical)' : 'Critical')
        : selectedPriority === 'priority-high' || selectedPriority === 'HIGH'
          ? (isHindi ? 'उच्च (High)' : 'High Priority')
          : selectedPriority === 'priority-medium' || selectedPriority === 'MEDIUM'
            ? (isHindi ? 'मध्यम (Medium)' : 'Medium')
            : selectedPriority === 'priority-low' || selectedPriority === 'LOW'
              ? (isHindi ? 'सामान्य (Low)' : 'Low Priority')
              : '';

    if (statusLabel && priorityLabel) {
      return {
        title: `${statusLabel} • ${priorityLabel}`,
        badgeText: `${statusLabel} • ${priorityLabel}`,
        icon: 'funnel-outline' as const,
        iconColor: COLORS.primary,
        iconBg: COLORS.primaryLight,
        emptyTitle: isHindi ? `इस प्राथमिकता में कोई शिकायत नहीं है` : `No Complaints in this view`,
        emptyDesc: isHindi ? `"${statusLabel}" में कोई "${priorityLabel}" शिकायत दर्ज नहीं है।` : `No ${priorityLabel} complaints found under ${statusLabel}.`,
      };
    }

    if (priorityLabel) {
      return {
        title: isHindi ? `${priorityLabel} शिकायतें` : `${priorityLabel} Complaints`,
        badgeText: priorityLabel,
        icon: 'alert-circle-outline' as const,
        iconColor: COLORS.error,
        iconBg: COLORS.errorLight,
        emptyTitle: isHindi ? 'कोई शिकायत नहीं है' : 'No Complaints',
        emptyDesc: isHindi ? `${priorityLabel} श्रेणी में कोई शिकायत नहीं है।` : `No complaints found in this priority category.`,
      };
    }

    if (selectedStatus === 'pending') {
      return {
        title: isHindi ? 'लंबित शिकायतें' : 'Pending Complaints',
        badgeText: isHindi ? '🕒 लंबित' : '🕒 Pending',
        icon: 'time-outline' as const,
        iconColor: '#DC2626',
        iconBg: '#FEE2E2',
        emptyTitle: isHindi ? 'कोई लंबित शिकायत नहीं है' : 'No Pending Complaints',
        emptyDesc: isHindi ? 'वर्तमान में कोई लंबित शिकायत नहीं है।' : 'No complaints are currently pending.',
      };
    }

    if (selectedStatus === 'in-progress') {
      return {
        title: isHindi ? 'प्रगति में शिकायतें' : 'In Progress Complaints',
        badgeText: isHindi ? '⏳ प्रगति में' : '⏳ In Progress',
        icon: 'construct-outline' as const,
        iconColor: COLORS.warning,
        iconBg: COLORS.warningLight,
        emptyTitle: isHindi ? 'कोई शिकायत प्रगति में नहीं है' : 'No In-Progress Complaints',
        emptyDesc: isHindi ? 'वर्तमान में किसी शिकायत पर काम जारी नहीं है।' : 'No complaints currently in progress.',
      };
    }

    if (selectedStatus === 'resolved') {
      return {
        title: isHindi ? 'निस्तारित शिकायतें' : 'Resolved Complaints',
        badgeText: isHindi ? '✅ निस्तारित' : '✅ Resolved',
        icon: 'checkmark-circle-outline' as const,
        iconColor: COLORS.success,
        iconBg: COLORS.successLight,
        emptyTitle: isHindi ? 'कोई निस्तारित शिकायत नहीं है' : 'No Resolved Complaints',
        emptyDesc: isHindi ? 'अभी कोई निस्तारित शिकायत दर्ज नहीं है।' : 'No resolved complaints found.',
      };
    }

    return {
      title: isHindi ? 'सभी शिकायतें' : 'All Complaints',
      badgeText: isHindi ? '📋 सभी शिकायतें' : '📋 All Complaints',
      icon: 'list-outline' as const,
      iconColor: COLORS.primary,
      iconBg: COLORS.primaryLight,
      emptyTitle: isHindi ? 'कोई शिकायत नहीं मिली' : 'No Complaints Found',
      emptyDesc: isHindi ? 'गाँव में अभी कोई शिकायत दर्ज नहीं है।' : 'No complaints have been registered yet.',
    };
  };

  const formatComplaintId = (id?: string) => {
    if (!id) return '#GRV-001';
    const num = parseInt(id, 10);
    if (!isNaN(num)) {
      return `#GRV-${String(num).padStart(3, '0')}`;
    }
    return `#${id}`;
  };

  const getCategoryDetails = (category?: string, description?: string) => {
    const cat = (category || '').toLowerCase();
    const desc = (description || '').toLowerCase();

    if (cat.includes('fire') || cat.includes('emergency') || desc.includes('fire') || desc.includes('आग') || desc.includes('इमरजेंसी') || desc.includes('दुर्घटना') || desc.includes('धुआं')) {
      return {
        name: isHindi ? 'अग्नि व आपातकालीन सेवा' : 'Fire & Emergency',
        icon: 'flame-outline' as const,
        color: '#DC2626',
        bg: '#FEE2E2',
      };
    }
    if (cat.includes('water') || desc.includes('पानी') || desc.includes('नल') || desc.includes('जल') || desc.includes('पाइप') || desc.includes('wateer') || desc.includes('suply')) {
      return {
        name: isHindi ? 'पेयजल एवं नल समस्या' : 'Drinking Water Supply',
        icon: 'water-outline' as const,
        color: '#0284C7',
        bg: '#E0F2FE',
      };
    }
    if (cat.includes('road') || desc.includes('सड़क') || desc.includes('मार्ग') || desc.includes('रास्ता') || desc.includes('खडंजा') || desc.includes('गड्ढा')) {
      return {
        name: isHindi ? 'सड़क व मार्ग निर्माण' : 'Road & Street Work',
        icon: 'trail-sign-outline' as const,
        color: '#D97706',
        bg: '#FEF3C7',
      };
    }
    if (cat.includes('light') || desc.includes('लाइट') || desc.includes('बिजली') || desc.includes('पोल') || desc.includes('अंधेरा')) {
      return {
        name: isHindi ? 'स्ट्रीट लाइट एवं प्रकाश' : 'Street Lighting',
        icon: 'bulb-outline' as const,
        color: '#F59E0B',
        bg: '#FFFBEB',
      };
    }
    if (cat.includes('garbage') || cat.includes('sanitation') || desc.includes('कचरा') || desc.includes('सफाई') || desc.includes('कूड़ा') || desc.includes('गंदगी')) {
      return {
        name: isHindi ? 'स्वच्छता एवं कचरा प्रबंधन' : 'Cleanliness & Waste',
        icon: 'trash-outline' as const,
        color: '#059669',
        bg: '#DCFCE7',
      };
    }
    if (cat.includes('drain') || desc.includes('नाली') || desc.includes('जल निकासी')) {
      return {
        name: isHindi ? 'नाली एवं जल-निकासी' : 'Drainage System',
        icon: 'git-merge-outline' as const,
        color: '#0891B2',
        bg: '#CFFAFE',
      };
    }
    if (cat.includes('elect') || desc.includes('विद्युत') || desc.includes('ट्रांसफार्मर') || desc.includes('तार')) {
      return {
        name: isHindi ? 'बिजली व ट्रांसफार्मर' : 'Electricity Grid',
        icon: 'flash-outline' as const,
        color: '#EA580C',
        bg: '#FFEDD5',
      };
    }
    return {
      name: category && category !== 'Village Issue' ? category : (isHindi ? 'ग्राम विकास समस्या' : 'Village Issue'),
      icon: 'layers-outline' as const,
      color: COLORS.primary,
      bg: '#EBF4FF',
    };
  };

  const getStatusInfo = (status?: string) => {
    const st = String(status || 'SUBMITTED').toUpperCase();
    switch (st) {
      case 'RESOLVED':
      case 'CLOSED':
        return {
          label: st === 'CLOSED'
            ? (isHindi ? 'सत्यापित बंद (Closed)' : 'Verified Closed')
            : (isHindi ? 'समाधान हुआ (Resolved)' : 'Resolved'),
          bg: '#DCFCE7',
          color: '#15803D',
          dot: '#16A34A',
          border: '#86EFAC',
        };
      case 'IN PROGRESS':
      case 'IN_PROGRESS':
      case 'ACTION TAKEN':
      case 'ACTION_TAKEN':
        return {
          label: isHindi ? 'कार्रवाई जारी है' : 'In Progress',
          bg: '#FEF3C7',
          color: '#B45309',
          dot: '#F59E0B',
          border: '#FDE68A',
        };
      case 'VERIFICATION':
      case 'UNDER REVIEW':
      case 'UNDER_REVIEW':
        return {
          label: isHindi ? 'सत्यापन प्रक्रिया' : 'Under Review',
          bg: '#E0F2FE',
          color: '#0369A1',
          dot: '#0284C7',
          border: '#BAE6FD',
        };
      default:
        return {
          label: isHindi ? 'दर्ज की गई' : 'Registered',
          bg: '#EFF6FF',
          color: '#1D4ED8',
          dot: '#3B82F6',
          border: '#BFDBFE',
        };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return isHindi ? 'दिनांक उपलब्ध नहीं' : 'Date not available';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleDateString(isHindi ? 'hi-IN' : 'en-US', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${day} ${month} ${year}, ${time}`;
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadgeInfo = (priority?: string, description?: string) => {
    const item = { priority, description };
    if (isVeryHighPriority(item)) {
      return { label: isHindi ? 'अति गंभीर' : 'Critical', color: COLORS.error, bg: '#FEE2E2', icon: 'alert-circle' as const };
    }
    if (isHighPriority(item)) {
      return { label: isHindi ? 'उच्च प्राथमिकता' : 'High Priority', color: COLORS.saffron, bg: '#FFEDD5', icon: 'flame' as const };
    }
    if (isLowPriority(item)) {
      return { label: isHindi ? 'सामान्य' : 'Low Priority', color: COLORS.success, bg: '#DCFCE7', icon: 'checkmark-circle' as const };
    }
    return { label: isHindi ? 'मध्यम' : 'Medium Priority', color: COLORS.warning, bg: '#FEF3C7', icon: 'time' as const };
  };

  const formatWardLabel = (ward?: string, location?: string | null) => {
    const raw = (ward || location || '').trim();
    if (!raw) return isHindi ? 'वार्ड: मुख्य क्षेत्र' : 'Ward: Main Area';
    const num = extractWardNumber(ward, location);
    if (num) {
      return isHindi ? `वार्ड संख्या: ${num}` : `Ward No. ${num}`;
    }
    return raw;
  };

  const openComplaint = (complaintId?: string) => {
    if (!complaintId) return;
    router.push({
      pathname: '/complaint-details',
      params: { id: complaintId },
    });
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

  const filterInfo = getFilterInfo();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {filterInfo.title}
          </Text>
          <Text style={styles.headerSubtitle}>
            {filteredComplaints.length}{' '}
            {isHindi
              ? filteredComplaints.length === 1 ? 'शिकायत' : 'शिकायतें उपलब्ध'
              : filteredComplaints.length === 1 ? 'Complaint' : 'Complaints Total'}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerMitraBtn}
            onPress={() => setGramMitraVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles" size={15} color="#4F46E5" />
            <Text style={styles.headerMitraText}>{isHindi ? 'ग्राम मित्र' : 'Mitra'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Ionicons name="language-outline" size={15} color={COLORS.primary} />
            <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIVE FILTER BADGE CARD */}
        {(selectedWard || selectedPriority || (selectedStatus && selectedStatus !== 'all')) ? (
          <View style={styles.activeFilterCard}>
            <View style={styles.activeFilterLeft}>
              <View style={[styles.filterIconBadge, { backgroundColor: filterInfo.iconBg }]}>
                <Ionicons name={filterInfo.icon} size={17} color={filterInfo.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeFilterTitle} numberOfLines={1}>
                  {filterInfo.badgeText}
                </Text>
                <Text style={styles.activeFilterSub}>
                  {filteredComplaints.length}{' '}
                  {isHindi
                    ? filteredComplaints.length === 1 ? 'शिकायत मिली' : 'शिकायतें मिलीं'
                    : filteredComplaints.length === 1 ? 'matching issue' : 'matching issues'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => {
                router.setParams({ filter: undefined, status: undefined, priority: undefined, ward: undefined });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={15} color={COLORS.primary} />
              <Text style={styles.clearFilterText}>
                {isHindi ? 'सभी देखें' : 'View All'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* LOADING STATE */}
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>
              {isHindi ? 'शिकायतें लोड हो रही हैं...' : 'Loading complaints...'}
            </Text>
            <Text style={styles.emptyText}>
              {isHindi ? 'कृपया प्रतीक्षा करें' : 'Please wait a moment'}
            </Text>
          </View>
        ) : filteredComplaints.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIconCircle, { backgroundColor: filterInfo.iconBg }]}>
              <Ionicons name={filterInfo.icon} size={38} color={filterInfo.iconColor} />
            </View>
            <Text style={styles.emptyTitle}>
              {filterInfo.emptyTitle}
            </Text>
            <Text style={styles.emptyText}>
              {filterInfo.emptyDesc}
            </Text>

            {(selectedWard || (selectedStatus && selectedStatus !== 'all') || selectedPriority) && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.setParams({ filter: undefined, status: undefined, priority: undefined, ward: undefined })}
                activeOpacity={0.85}
              >
                <Ionicons name="list-outline" size={17} color="#FFFFFF" />
                <Text style={styles.viewAllBtnText}>
                  {isHindi ? 'सभी शिकायतें देखें' : 'View All Complaints'}
                </Text>
              </TouchableOpacity>
            )}

            {userRole === 'citizen' && (
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => router.push('/report' as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={19} color="#FFFFFF" />
                <Text style={styles.reportButtonText}>
                  {isHindi ? 'नई शिकायत दर्ज करें' : 'Register New Complaint'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* ================= COMPLAINT LIST ================= */
          filteredComplaints.map((complaint, index) => {
            const statusInfo = getStatusInfo(complaint.status);
            const categoryInfo = getCategoryDetails(complaint.category, complaint.description);
            const priorityInfo = getPriorityBadgeInfo(complaint.priority, complaint.description);
            const formattedId = formatComplaintId(complaint.complaintId);
            const hasPhoto = Boolean(
              complaint.photo &&
              complaint.photo !== 'null' &&
              complaint.photo !== 'undefined' &&
              String(complaint.photo).trim() !== ''
            );

            return (
              <TouchableOpacity
                key={complaint.complaintId || `complaint-${index}`}
                style={styles.complaintCard}
                activeOpacity={0.88}
                onPress={() => openComplaint(complaint.complaintId)}
              >
                {/* 1. TOP HEADER: ID BADGE + STATUS PILL */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.idBadge}>
                    <Ionicons name="document-text" size={14} color={COLORS.primary} />
                    <Text style={styles.idBadgeText}>{formattedId}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusInfo.bg, borderColor: statusInfo.border },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: statusInfo.dot }]} />
                    <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {/* 1B. PRIORITY & SUPPORT BADGES ROW */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: priorityInfo.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                    <Ionicons name={priorityInfo.icon} size={12} color={priorityInfo.color} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: priorityInfo.color }}>{priorityInfo.label}</Text>
                  </View>

                  {/* Collective Support Count Badge */}
                  {Boolean(complaint.supportCount && complaint.supportCount > 1) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="people" size={12} color="#DC2626" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                        {complaint.supportCount} {isHindi ? 'ग्रामीण समर्थित' : 'Supporters'}
                      </Text>
                    </View>
                  )}

                  {/* Merged Link Badge */}
                  {Boolean(complaint.isMerged || complaint.parentComplaintId) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="git-merge-outline" size={12} color="#2563EB" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#2563EB' }}>
                        {isHindi ? `मुख्य #${complaint.parentComplaintId || complaint.duplicateOfId}` : `Merged into #${complaint.parentComplaintId || complaint.duplicateOfId}`}
                      </Text>
                    </View>
                  )}

                  {Boolean(complaint.duplicateOfId && !complaint.isMerged && !complaint.parentComplaintId) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="link-outline" size={12} color={COLORS.primary} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.primary }}>#{complaint.duplicateOfId}</Text>
                    </View>
                  )}

                  {/* Escalation Level Tier Badges */}
                  {complaint.escalationLevel === 2 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="layers" size={12} color="#D97706" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#B45309' }}>
                        {isHindi ? '🏢 स्तर 2: BDO' : '🏢 Tier 2: BDO'}
                      </Text>
                    </View>
                  )}

                  {complaint.escalationLevel === 3 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', borderColor: '#E9D5FF', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="shield-checkmark" size={12} color="#7E22CE" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B21A8' }}>
                        {isHindi ? '🏛️ स्तर 3: DM' : '🏛️ Tier 3: DM'}
                      </Text>
                    </View>
                  )}

                  {/* SLA Overdue or Imminent Deadline Badges */}
                  {Boolean(
                    String(complaint.status || '').toUpperCase() !== 'RESOLVED' &&
                    String(complaint.status || '').toUpperCase() !== 'CLOSED' &&
                    complaint.daysRemaining !== null &&
                    complaint.daysRemaining !== undefined &&
                    complaint.daysRemaining <= 0
                  ) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', borderColor: '#FECACA', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                      <Ionicons name="alert-circle" size={12} color="#DC2626" />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#DC2626' }}>
                        {isHindi ? '🚨 समय सीमा समाप्त (Overdue)' : '🚨 Overdue'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* 2. CATEGORY & LOCATION ROW */}
                <View style={styles.categoryWardRow}>
                  <View style={[styles.categoryPill, { backgroundColor: categoryInfo.bg }]}>
                    <Ionicons name={categoryInfo.icon} size={15} color={categoryInfo.color} />
                    <Text style={[styles.categoryPillText, { color: categoryInfo.color }]}>
                      {categoryInfo.name}
                    </Text>
                  </View>

                  <View style={styles.wardPill}>
                    <Ionicons name="location" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.wardPillText}>
                      {formatWardLabel(complaint.ward, complaint.location)}
                    </Text>
                  </View>
                </View>

                {/* 3. DESCRIPTION BOX */}
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {complaint.description || (isHindi ? 'शिकायत का विवरण उपलब्ध नहीं है' : 'No description provided')}
                  </Text>
                </View>

                {/* 4. ATTACHED PHOTO PREVIEW */}
                {hasPhoto && (
                  <ComplaintCardPhoto
                    photo={complaint.photo!}
                    formattedId={formattedId}
                    categoryName={categoryInfo.name}
                    isHindi={isHindi}
                    onPress={(url) => {
                      setPreviewPhoto(url);
                      setPreviewTitle(`${formattedId} • ${categoryInfo.name}`);
                    }}
                  />
                )}

                {/* 5. CARD FOOTER: DATE & ACTION CTA */}
                <View style={styles.cardFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.dateText}>{formatDate(complaint.dateTime)}</Text>
                  </View>

                  <View style={styles.actionCta}>
                    <Text style={styles.actionCtaText}>
                      {userRole === 'citizen'
                        ? (isHindi ? 'विवरण देखें' : 'View Details')
                        : (isHindi ? 'विवरण व स्थिति' : 'Review & Action')}
                    </Text>
                    <Ionicons name="arrow-forward" size={15} color={COLORS.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FULL SCREEN PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={Boolean(previewPhoto)}
        imageUri={previewPhoto}
        userName={previewTitle || (isHindi ? 'शिकायत संलग्नक' : 'Complaint Attachment')}
        userRole={isHindi ? 'शिकायत फोटो' : 'Attachment Preview'}
        onClose={() => setPreviewPhoto(null)}
        isHindi={isHindi}
      />

      {/* GRAM MITRA ASSISTANT MODAL */}
      <GramMitraModal
        visible={gramMitraVisible}
        onClose={() => setGramMitraVisible(false)}
        initialLanguage={isHindi ? 'hi' : 'en'}
      />
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* ================= HEADER ================= */
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMitraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  headerMitraText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* ================= ACTIVE FILTER CARD ================= */
  activeFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.small,
  },
  activeFilterLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginRight: 8,
  },
  filterIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeFilterSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* ================= EMPTY STATE ================= */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    ...SHADOWS.small,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  viewAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 4,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ================= COMPLAINT CARD ================= */
  complaintCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* CATEGORY & WARD */
  categoryWardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  wardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wardPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* DESCRIPTION */
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  descriptionText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
    fontWeight: '500',
  },

  /* PHOTO PREVIEW */
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#E2E8F0',
  },
  thumbnailImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  cardPhotoFallbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  cardPhotoFallbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  photoZoomBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  photoZoomText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* FOOTER */
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  actionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});