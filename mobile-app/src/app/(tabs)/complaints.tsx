import React, { useCallback, useState } from 'react';
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

import { complaintApi, ComplaintData } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { PhotoPreviewModal } from '../../components/PhotoPreviewModal';
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

  const { filter, ward } = useLocalSearchParams<{
    filter?: string;
    ward?: string;
  }>();

  const { language, setLanguage, t } = useLanguage();
  const isHindi = language === 'hi';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary'>('citizen');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
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
  // LOAD COMPLAINTS
  // =====================================================
  const loadComplaints = async () => {
    try {
      setLoading(true);

      const sessionData = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : null;
      const role = String(session?.role || 'citizen').toLowerCase() as 'citizen' | 'sarpanch' | 'secretary';
      setUserRole(role);

      let fetchedList: Complaint[] = [];

      try {
        if (role === 'sarpanch' || role === 'secretary') {
          const apiData = await complaintApi.getSarpanchComplaints();
          if (Array.isArray(apiData)) {
            fetchedList = apiData.map(mapBackendComplaint);
          }
        } else {
          const apiData = await complaintApi.getCitizenComplaints();
          if (Array.isArray(apiData)) {
            fetchedList = apiData.map(mapBackendComplaint);
          }
        }
      } catch (apiErr) {
        console.log('Backend complaint fetch error:', apiErr);
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

  const selectedFilter = typeof filter === 'string' ? filter.trim() : '';
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
    if (selectedFilter === 'pending') {
      const s = String(c.status || '').toUpperCase();
      if (s !== 'SUBMITTED' && s !== 'UNDER REVIEW' && s !== 'UNDER_REVIEW') return false;
    } else if (selectedFilter === 'in-progress') {
      const s = String(c.status || '').toUpperCase();
      if (
        s !== 'IN PROGRESS' &&
        s !== 'IN_PROGRESS' &&
        s !== 'ACTION TAKEN' &&
        s !== 'ACTION_TAKEN'
      ) return false;
    } else if (selectedFilter === 'resolved') {
      const s = String(c.status || '').toUpperCase();
      if (s !== 'RESOLVED' && s !== 'CLOSED') return false;
    } else if (selectedFilter === 'reopened') {
      const s = String(c.status || '').toUpperCase();
      if (s !== 'REOPENED') return false;
    } else if (selectedFilter === 'priority-very-high') {
      const p = String(c.priority || '').toUpperCase();
      if (p !== 'VERY_HIGH' && p !== 'VERY HIGH' && p !== 'CRITICAL' && p !== 'URGENT') return false;
    } else if (selectedFilter === 'priority-high') {
      const p = String(c.priority || '').toUpperCase();
      if (p !== 'HIGH') return false;
    } else if (selectedFilter === 'priority-medium') {
      const p = String(c.priority || '').toUpperCase();
      if (p !== 'MEDIUM' && p !== 'NORMAL' && (p !== '' && c.priority)) return false;
    } else if (selectedFilter === 'priority-low') {
      const p = String(c.priority || '').toUpperCase();
      if (p !== 'LOW') return false;
    } else if (selectedFilter === 'class-duplicate') {
      const cl = String((c as any).classification || '').toUpperCase();
      if (cl !== 'DUPLICATE' && cl !== 'COPIED') return false;
    } else if (selectedFilter === 'class-fake') {
      const cl = String((c as any).classification || '').toUpperCase();
      if (cl !== 'FAKE' && cl !== 'INVALID' && cl !== 'SPAM') return false;
    } else if (selectedFilter === 'class-verification') {
      const cl = String((c as any).classification || '').toUpperCase();
      const st = String(c.status || '').toUpperCase();
      if (cl !== 'NEEDS_VERIFICATION' && cl !== 'VERIFICATION' && st !== 'VERIFICATION' && st !== 'UNDER_REVIEW') return false;
    } else if (selectedFilter === 'class-genuine') {
      const cl = String((c as any).classification || '').toUpperCase();
      if (cl === 'FAKE' || cl === 'INVALID' || cl === 'DUPLICATE') return false;
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
    switch (selectedFilter) {
      case 'priority-very-high':
        return {
          title: isHindi ? 'अति गंभीर शिकायतें' : 'Very High Priority Complaints',
          badgeText: isHindi ? '🔴 अति गंभीर (Very High)' : '🔴 Very High Priority',
          icon: 'alert-circle-outline' as const,
          iconColor: COLORS.error,
          iconBg: COLORS.errorLight,
          emptyTitle: isHindi ? 'कोई अति गंभीर शिकायत नहीं है' : 'No Very High Priority Complaints',
          emptyDesc: isHindi ? 'ग्राम पंचायत में कोई अति गंभीर या आपातकालीन समस्या लंबित नहीं है।' : 'No urgent or critical complaints are currently pending in this category.',
        };
      case 'priority-high':
        return {
          title: isHindi ? 'उच्च प्राथमिकता शिकायतें' : 'High Priority Complaints',
          badgeText: isHindi ? '🟠 उच्च (High Priority)' : '🟠 High Priority',
          icon: 'flame-outline' as const,
          iconColor: COLORS.saffron,
          iconBg: COLORS.accentLight,
          emptyTitle: isHindi ? 'कोई उच्च प्राथमिकता शिकायत नहीं है' : 'No High Priority Complaints',
          emptyDesc: isHindi ? 'वर्तमान में उच्च प्राथमिकता वाली कोई शिकायत लंबित नहीं है।' : 'No high priority issues are currently pending in the system.',
        };
      case 'priority-medium':
        return {
          title: isHindi ? 'मध्यम प्राथमिकता शिकायतें' : 'Medium Priority Complaints',
          badgeText: isHindi ? '🟡 मध्यम (Medium)' : '🟡 Medium Priority',
          icon: 'time-outline' as const,
          iconColor: COLORS.warning,
          iconBg: COLORS.warningLight,
          emptyTitle: isHindi ? 'कोई मध्यम प्राथमिकता शिकायत नहीं है' : 'No Medium Priority Complaints',
          emptyDesc: isHindi ? 'मध्यम प्राथमिकता श्रेणी में कोई शिकायत दर्ज नहीं है।' : 'No medium priority issues recorded.',
        };
      case 'priority-low':
        return {
          title: isHindi ? 'सामान्य प्राथमिकता शिकायतें' : 'Low Priority Complaints',
          badgeText: isHindi ? '🟢 सामान्य (Low)' : '🟢 Low Priority',
          icon: 'checkmark-circle-outline' as const,
          iconColor: COLORS.success,
          iconBg: COLORS.successLight,
          emptyTitle: isHindi ? 'कोई सामान्य प्राथमिकता शिकायत नहीं है' : 'No Low Priority Complaints',
          emptyDesc: isHindi ? 'सामान्य प्राथमिकता श्रेणी में कोई शिकायत नहीं है।' : 'No routine or low priority complaints found.',
        };
      case 'class-genuine':
        return {
          title: isHindi ? 'वास्तविक शिकायतें' : 'Genuine Complaints',
          badgeText: isHindi ? '🟢 वास्तविक (Genuine)' : '🟢 Genuine Verified',
          icon: 'shield-checkmark-outline' as const,
          iconColor: COLORS.success,
          iconBg: COLORS.successLight,
          emptyTitle: isHindi ? 'कोई वास्तविक शिकायत नहीं है' : 'No Genuine Complaints',
          emptyDesc: isHindi ? 'सत्यापित वास्तविक श्रेणी में कोई शिकायत नहीं है।' : 'No verified real complaints found in this view.',
        };
      case 'class-duplicate':
        return {
          title: isHindi ? 'डुप्लीकेट शिकायतें' : 'Duplicate Complaints',
          badgeText: isHindi ? '🔵 डुप्लीकेट (Duplicate)' : '🔵 Linked Duplicates',
          icon: 'copy-outline' as const,
          iconColor: COLORS.info,
          iconBg: COLORS.infoLight,
          emptyTitle: isHindi ? 'कोई डुप्लीकेट शिकायत नहीं है' : 'No Duplicate Complaints',
          emptyDesc: isHindi ? 'ग्राम पंचायत में कोई समान या डुप्लीकेट शिकायत नहीं पाई गई है।' : 'No linked duplicate complaints detected by AI.',
        };
      case 'class-fake':
        return {
          title: isHindi ? 'अमान्य / फर्जी शिकायतें' : 'Fake / Invalid Complaints',
          badgeText: isHindi ? '⚫ अमान्य (Invalid)' : '⚫ Invalid / Rejected',
          icon: 'close-circle-outline' as const,
          iconColor: COLORS.textSecondary,
          iconBg: COLORS.primaryLight,
          emptyTitle: isHindi ? 'कोई अमान्य शिकायत नहीं है' : 'No Invalid Complaints',
          emptyDesc: isHindi ? 'कोई भी फर्जी या अमान्य शिकायत दर्ज नहीं है।' : 'No spam or invalid complaints found.',
        };
      case 'class-verification':
        return {
          title: isHindi ? 'सत्यापन योग्य शिकायतें' : 'Needs Verification Complaints',
          badgeText: isHindi ? '🟣 सत्यापन (Verification)' : '🟣 Needs Verification',
          icon: 'help-circle-outline' as const,
          iconColor: '#9333EA',
          iconBg: '#F3E8FF',
          emptyTitle: isHindi ? 'सत्यापन हेतु कोई शिकायत लंबित नहीं है' : 'No Complaints Needing Verification',
          emptyDesc: isHindi ? 'सभी शिकायतों का AI व प्राथमिक सत्यापन पूरा हो चुका है।' : 'All complaints have completed verification checks.',
        };
      case 'in-progress':
        return {
          title: isHindi ? 'प्रगति में शिकायतें' : 'In-Progress Complaints',
          badgeText: isHindi ? '⏳ प्रगति में' : '⏳ In Progress',
          icon: 'construct-outline' as const,
          iconColor: COLORS.warning,
          iconBg: COLORS.warningLight,
          emptyTitle: isHindi ? 'कोई शिकायत प्रगति में नहीं है' : 'No In-Progress Complaints',
          emptyDesc: isHindi ? 'वर्तमान में किसी शिकायत पर कार्रवाई लंबित नहीं है।' : 'No complaints are currently under progress.',
        };
      case 'resolved':
        return {
          title: isHindi ? 'हल की गई शिकायतें' : 'Resolved Complaints',
          badgeText: isHindi ? '✅ हल की गई' : '✅ Resolved',
          icon: 'checkmark-done-circle-outline' as const,
          iconColor: COLORS.success,
          iconBg: COLORS.successLight,
          emptyTitle: isHindi ? 'कोई हल की गई शिकायत नहीं है' : 'No Resolved Complaints',
          emptyDesc: isHindi ? 'अभी तक कोई शिकायत हल के रूप में चिन्हित नहीं है।' : 'No complaints marked as resolved yet.',
        };
      case 'pending':
        return {
          title: isHindi ? 'लंबित शिकायतें' : 'Pending Complaints',
          badgeText: isHindi ? '🕒 लंबित' : '🕒 Pending',
          icon: 'time-outline' as const,
          iconColor: COLORS.primary,
          iconBg: COLORS.primaryLight,
          emptyTitle: isHindi ? 'कोई लंबित शिकायत नहीं है' : 'No Pending Complaints',
          emptyDesc: isHindi ? 'सभी शिकायतों पर संज्ञान लिया जा चुका है।' : 'All complaints have been reviewed.',
        };
      case 'reopened':
        return {
          title: isHindi ? 'पुनः खोली गई शिकायतें' : 'Reopened Complaints',
          badgeText: isHindi ? '🔄 पुनः खोली गई' : '🔄 Reopened',
          icon: 'refresh-outline' as const,
          iconColor: COLORS.error,
          iconBg: COLORS.errorLight,
          emptyTitle: isHindi ? 'कोई पुनः खोली गई शिकायत नहीं है' : 'No Reopened Complaints',
          emptyDesc: isHindi ? 'वर्तमान में कोई भी शिकायत दोबारा नहीं खोली गई है।' : 'No reopened complaints found.',
        };
      default:
        return {
          title: isHindi ? 'सभी शिकायतें' : 'All Complaints',
          badgeText: isHindi ? '📋 सभी शिकायतें' : '📋 All Complaints',
          icon: 'list-outline' as const,
          iconColor: COLORS.primary,
          iconBg: COLORS.primaryLight,
          emptyTitle: isHindi ? 'कोई शिकायत नहीं मिली' : 'No Complaints Found',
          emptyDesc: isHindi ? 'गाँव में अभी कोई शिकायत दर्ज नहीं है।' : 'No complaints have been registered yet.',
        };
    }
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

    if (cat.includes('water') || desc.includes('पानी') || desc.includes('नल') || desc.includes('जल') || desc.includes('पाइप')) {
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
          label: isHindi ? 'हल हो गई' : 'Resolved',
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

        <TouchableOpacity
          style={styles.languageButton}
          onPress={toggleLanguage}
          activeOpacity={0.8}
        >
          <Ionicons name="language-outline" size={15} color={COLORS.primary} />
          <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ACTIVE FILTER BADGE CARD */}
        {(selectedWard || (selectedFilter && selectedFilter !== 'all')) ? (
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
                router.setParams({ filter: undefined, ward: undefined });
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

            {(selectedWard || (selectedFilter && selectedFilter !== 'all')) && (
              <TouchableOpacity
                style={styles.viewAllBtn}
                onPress={() => router.setParams({ filter: undefined, ward: undefined })}
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
                  <TouchableOpacity
                    style={styles.photoContainer}
                    activeOpacity={0.9}
                    onPress={() => {
                      setPreviewPhoto(String(complaint.photo).trim());
                      setPreviewTitle(`${formattedId} • ${categoryInfo.name}`);
                    }}
                  >
                    <Image
                      source={{ uri: String(complaint.photo).trim() }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoZoomBadge}>
                      <Ionicons name="search" size={13} color="#FFFFFF" />
                      <Text style={styles.photoZoomText}>
                        {isHindi ? 'फोटो देखें' : 'View Photo'}
                      </Text>
                    </View>
                  </TouchableOpacity>
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
    backgroundColor: '#0F172A',
  },
  thumbnailImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
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