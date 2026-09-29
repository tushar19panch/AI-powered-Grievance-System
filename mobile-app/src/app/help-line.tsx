import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { villageApi, authApi } from '../services/api';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme';

type OfficialContact = {
  name?: string;
  mobile?: string;
  village?: string;
};

export default function HelpLine() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const isHindi = language === 'hi';

  const [sarpanch, setSarpanch] = useState<OfficialContact | null>(null);
  const [secretary, setSecretary] = useState<OfficialContact | null>(null);
  const [userRole, setUserRole] = useState<'citizen' | 'sarpanch' | 'secretary' | 'admin'>('citizen');

  const toggleLanguage = () => {
    setLanguage(isHindi ? 'en' : 'hi');
  };

  useEffect(() => {
    loadOfficials();
  }, []);

  const loadOfficials = async () => {
    try {
      const adminData = await AsyncStorage.getItem('admin');
      const secretaryData = await AsyncStorage.getItem('secretary');
      const citizenData = await AsyncStorage.getItem('citizen');
      const sessionData = await AsyncStorage.getItem('user_session');

      let currentRole: 'citizen' | 'sarpanch' | 'secretary' | 'admin' = 'citizen';
      let userVillage = '';

      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session?.role) {
            currentRole = String(session.role).toLowerCase() as any;
          }
          if (session?.village) {
            userVillage = session.village;
          }
          if (session?.role === 'sarpanch' && session?.mobile) {
            setSarpanch({ name: session.name, mobile: session.mobile, village: session.village });
          } else if (session?.role === 'secretary' && session?.mobile) {
            setSecretary({ name: session.name, mobile: session.mobile, village: session.village });
          }
        } catch {}
      }

      if (citizenData && !userVillage) {
        try {
          const parsed = JSON.parse(citizenData);
          if (parsed?.village) userVillage = parsed.village;
        } catch {}
      }

      if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          if (parsed && parsed.mobile) {
            setSarpanch(parsed);
            if (!userVillage && parsed.village) userVillage = parsed.village;
          }
        } catch {}
      }

      if (secretaryData) {
        try {
          const parsed = JSON.parse(secretaryData);
          if (parsed && parsed.mobile) {
            setSecretary(parsed);
            if (!userVillage && parsed.village) userVillage = parsed.village;
          }
        } catch {}
      }

      if (userVillage) {
        const cachedSarpanch = await AsyncStorage.getItem(`sarpanch_sync_${userVillage}`);
        if (cachedSarpanch) {
          try {
            const parsedS = JSON.parse(cachedSarpanch);
            if (parsedS?.name) setSarpanch(parsedS);
          } catch {}
        }
        const cachedSecretary = await AsyncStorage.getItem(`secretary_sync_${userVillage}`);
        if (cachedSecretary) {
          try {
            const parsedSec = JSON.parse(cachedSecretary);
            if (parsedSec?.name) setSecretary(parsedSec);
          } catch {}
        }
      }

      setUserRole(currentRole);

      // Fetch official contacts from Backend for this village
      try {
        let fetchedSarpanch: any = null;
        let fetchedSecretary: any = null;

        try {
          const officials = await authApi.getVillageOfficials(userVillage);
          if (officials?.sarpanch?.name) fetchedSarpanch = officials.sarpanch;
          if (officials?.secretary?.name) fetchedSecretary = officials.secretary;
        } catch (e) {
          console.log('authApi error in helpline:', e);
        }

        if (!fetchedSarpanch || !fetchedSecretary) {
          try {
            const vOfficials = await villageApi.getOfficials(userVillage);
            if (!fetchedSarpanch && vOfficials?.sarpanch?.name) fetchedSarpanch = vOfficials.sarpanch;
            if (!fetchedSecretary && vOfficials?.secretary?.name) fetchedSecretary = vOfficials.secretary;
          } catch (e) {
            console.log('villageApi error in helpline:', e);
          }
        }

        if (fetchedSarpanch?.name) {
          setSarpanch({
            name: fetchedSarpanch.name,
            mobile: fetchedSarpanch.mobile || '',
            village: fetchedSarpanch.village || userVillage,
          });
          if (userVillage) {
            await AsyncStorage.setItem(`sarpanch_sync_${userVillage}`, JSON.stringify(fetchedSarpanch));
          }
        }

        if (fetchedSecretary?.name) {
          setSecretary({
            name: fetchedSecretary.name,
            mobile: fetchedSecretary.mobile || '',
            village: fetchedSecretary.village || userVillage,
          });
          if (userVillage) {
            await AsyncStorage.setItem(`secretary_sync_${userVillage}`, JSON.stringify(fetchedSecretary));
          }
        }
      } catch (backendErr) {
        console.log('Error fetching backend village officials in helpline:', backendErr);
      }
    } catch (err) {
      console.log('Error loading official helpline contacts:', err);
    }
  };

  const callNumber = async (number: string, enabled: boolean) => {
    if (!enabled) {
      Alert.alert(
        isHindi ? 'नंबर उपलब्ध नहीं' : 'Number not available',
        isHindi ? 'यह संपर्क नंबर अभी जोड़ा नहीं गया है।' : 'This contact number has not been added yet.'
      );
      return;
    }
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      Alert.alert(
        isHindi ? 'कॉल नहीं हो सकी' : 'Unable to call',
        isHindi ? 'कॉल शुरू नहीं हो सकी।' : 'The call could not be started.'
      );
    }
  };

  const Contact = ({
    icon,
    title,
    subtitle,
    number,
    enabled = true,
    badgeColor = COLORS.primary,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    number: string;
    enabled?: boolean;
    badgeColor?: string;
  }) => (
    <View style={styles.contactRow}>
      <View style={[styles.contactIcon, { backgroundColor: `${badgeColor}15` }]}>
        <Ionicons name={icon} size={22} color={badgeColor} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{title}</Text>
        {subtitle ? <Text style={styles.contactSubtitle}>{subtitle}</Text> : null}
        <Text style={styles.contactNumber}>{number}</Text>
      </View>
      <TouchableOpacity
        style={[styles.callButton, !enabled && styles.callButtonDisabled]}
        onPress={() => callNumber(number, enabled)}
        activeOpacity={0.82}
      >
        <Ionicons name="call" size={15} color="#FFFFFF" />
        <Text style={styles.callText}>
          {isHindi ? 'कॉल करें' : 'Call'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const showSarpanch = userRole !== 'sarpanch' && userRole !== 'admin';
  const showSecretary = userRole !== 'secretary';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{isHindi ? 'हेल्पलाइन व संपर्क' : 'Helplines & Contacts'}</Text>
          <Text style={styles.headerSubtitle}>
            {isHindi ? 'जरूरत पड़ने पर तुरंत सहायता' : 'Emergency & official assistance'}
          </Text>
        </View>
        <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage} activeOpacity={0.8}>
          <Ionicons name="language" size={16} color="#FFFFFF" />
          <Text style={styles.languageText}>{isHindi ? 'EN' : 'हि'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* SECTION 1: PANCHAYAT OFFICIALS (FILTERED PER USER ROLE) */}
        {(showSarpanch || showSecretary) && (
          <>
            <Text style={styles.sectionHeader}>{isHindi ? 'ग्राम पंचायत जनप्रतिनिधि' : 'Panchayat Officials'}</Text>
            <View style={styles.card}>
              {/* SARPANCH (Hidden if Sarpanch is viewing) */}
              {showSarpanch && (
                <>
                  <Contact
                    icon="ribbon"
                    title={
                      sarpanch?.name
                        ? `${isHindi ? 'सरपंच' : 'Sarpanch'} (${sarpanch.name})`
                        : isHindi
                        ? 'ग्राम प्रधान / सरपंच'
                        : 'Gram Pradhan / Sarpanch'
                    }
                    subtitle={sarpanch?.village ? `${isHindi ? 'ग्राम पंचायत' : 'Panchayat'}: ${sarpanch.village}` : undefined}
                    number={sarpanch?.mobile || (isHindi ? 'नंबर उपलब्ध नहीं' : 'Not added')}
                    enabled={!!sarpanch?.mobile}
                    badgeColor="#176B4D"
                  />
                  {showSecretary && <View style={styles.divider} />}
                </>
              )}

              {/* SECRETARY (Hidden if Secretary is viewing) */}
              {showSecretary && (
                <Contact
                  icon="briefcase"
                  title={
                    secretary?.name
                      ? `${isHindi ? 'ग्राम सचिव' : 'Secretary'} (${secretary.name})`
                      : isHindi
                      ? 'ग्राम पंचायत सचिव'
                      : 'Panchayat Secretary'
                  }
                  subtitle={secretary?.village ? `${isHindi ? 'ग्राम पंचायत' : 'Panchayat'}: ${secretary.village}` : undefined}
                  number={secretary?.mobile || (isHindi ? 'नंबर उपलब्ध नहीं' : 'Not added')}
                  enabled={!!secretary?.mobile}
                  badgeColor="#000080"
                />
              )}
            </View>
          </>
        )}

        {/* SECTION 2: EMERGENCY & HELPLINES */}
        <Text style={styles.sectionHeader}>{isHindi ? 'आपातकालीन व सरकारी सेवाएं' : 'Emergency & Public Helplines'}</Text>
        <View style={styles.card}>
          {/* CM HELPLINE 181 */}
          <Contact
            icon="headset"
            title={isHindi ? 'सीएम हेल्पलाइन' : 'CM Helpline'}
            subtitle={isHindi ? 'शिकायत एवं जनसेवा निवारण' : 'Public Grievance Redressal'}
            number="181"
            enabled={true}
            badgeColor="#FF9933"
          />
          <View style={styles.divider} />

          {/* NATIONAL EMERGENCY 112 */}
          <Contact
            icon="alert-circle"
            title={isHindi ? 'राष्ट्रीय आपातकालीन सेवा (Emergency)' : 'National Emergency (112)'}
            subtitle={isHindi ? 'पुलिस • एम्बुलेंस • फायर' : 'All-in-one Emergency'}
            number="112"
            enabled={true}
            badgeColor="#DC2626"
          />
          <View style={styles.divider} />

          {/* AMBULANCE 108 */}
          <Contact
            icon="medkit"
            title={isHindi ? 'एम्बुलेंस सेवा' : 'Ambulance Service'}
            subtitle={isHindi ? 'स्वास्थ्य आपातकाल' : 'Medical Emergency'}
            number="108"
            enabled={true}
            badgeColor="#16A34A"
          />
          <View style={styles.divider} />

          {/* VILLAGE TOLL-FREE HELPLINE */}
          <Contact
            icon="call"
            title={isHindi ? 'पंचायती राज टोल-फ्री' : 'Panchayati Raj Toll-Free'}
            subtitle={isHindi ? 'राष्ट्रीय ग्रामीण विकास सहायता' : 'National Rural Development Support'}
            number="1800-180-1555"
            enabled={true}
            badgeColor="#2563EB"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    ...SHADOWS.small,
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
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  languageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.small,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.navy,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
    marginRight: 8,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  contactSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  contactNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 3,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  callButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  callText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
});
