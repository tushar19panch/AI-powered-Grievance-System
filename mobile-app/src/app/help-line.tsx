import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme';

const INDIA = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  navy: '#000080',
  lightGreen: '#EAF6EA',
};

type OfficialContact = {
  name?: string;
  mobile?: string;
  village?: string;
};

export default function HelpLine() {
  const router = useRouter();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

  const [sarpanch, setSarpanch] = useState<OfficialContact | null>(null);
  const [secretary, setSecretary] = useState<OfficialContact | null>(null);

  useEffect(() => {
    loadOfficials();
  }, []);

  const loadOfficials = async () => {
    try {
      const adminData = await AsyncStorage.getItem('admin');
      const secretaryData = await AsyncStorage.getItem('secretary');
      const sessionData = await AsyncStorage.getItem('user_session');

      if (adminData) {
        try {
          const parsed = JSON.parse(adminData);
          if (parsed && parsed.mobile) {
            setSarpanch(parsed);
          }
        } catch {}
      }

      if (secretaryData) {
        try {
          const parsed = JSON.parse(secretaryData);
          if (parsed && parsed.mobile) {
            setSecretary(parsed);
          }
        } catch {}
      }

      if (sessionData) {
        try {
          const session = JSON.parse(sessionData);
          if (session?.role === 'sarpanch' && session?.mobile) {
            setSarpanch((prev) => prev || { name: session.name, mobile: session.mobile, village: session.village });
          } else if (session?.role === 'secretary' && session?.mobile) {
            setSecretary((prev) => prev || { name: session.name, mobile: session.mobile, village: session.village });
          }
        } catch {}
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
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    number: string;
    enabled?: boolean;
  }) => (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={23} color={enabled ? INDIA.green : COLORS.textMuted} />
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
        <Ionicons name="call-outline" size={17} color={enabled ? COLORS.white : COLORS.textMuted} />
        <Text style={[styles.callText, !enabled && styles.callTextDisabled]}>
          {isHindi ? 'कॉल' : 'Call'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{isHindi ? 'हेल्प लाइन और संपर्क' : 'Help Line & Contacts'}</Text>
            <Text style={styles.subtitle}>
              {isHindi ? 'जरूरत पड़ने पर तुरंत संपर्क करें' : 'Quick access to important contacts'}
            </Text>
          </View>
        </View>

        {/* TRICOLOR STRIPE */}
        <View style={styles.tricolor}>
          <View style={styles.saffronLine} />
          <View style={styles.whiteLine}>
            <View style={styles.chakra} />
          </View>
          <View style={styles.greenLine} />
        </View>

        {/* INFO CARD */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="call-outline" size={28} color={INDIA.green} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{isHindi ? 'जरूरी संपर्क' : 'Important Contacts'}</Text>
            <Text style={styles.infoText}>
              {isHindi
                ? 'किसी भी समस्या या आपात स्थिति में संबंधित अधिकारी या सेवा से सीधे संपर्क करें।'
                : 'Contact the relevant official or emergency service directly when needed.'}
            </Text>
          </View>
        </View>

        {/* CONTACTS LIST */}
        <View style={styles.card}>
          {/* CM HELPLINE 181 (Replaced 100) */}
          <Contact
            icon="headset-outline"
            title={isHindi ? 'सीएम हेल्पलाइन' : 'CM Helpline'}
            subtitle={isHindi ? 'शिकायत एवं जनसेवा निवारण' : 'Public Grievance Redressal'}
            number="181"
            enabled={true}
          />
          <View style={styles.divider} />

          {/* NATIONAL EMERGENCY 112 */}
          <Contact
            icon="alert-circle-outline"
            title={isHindi ? 'राष्ट्रीय आपातकालीन सेवा' : 'National Emergency'}
            subtitle={isHindi ? 'पुलिस • एम्बुलेंस • फायर' : 'All-in-one Emergency'}
            number="112"
            enabled={true}
          />
          <View style={styles.divider} />

          {/* AMBULANCE 108 */}
          <Contact
            icon="medkit-outline"
            title={isHindi ? 'एम्बुलेंस सेवा' : 'Ambulance Service'}
            subtitle={isHindi ? 'स्वास्थ्य आपातकाल' : 'Medical Emergency'}
            number="108"
            enabled={true}
          />
          <View style={styles.divider} />

          {/* SARPANCH CONTACT (Auto updated from Sarpanch profile/login) */}
          <Contact
            icon="person-outline"
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
          />
          <View style={styles.divider} />

          {/* SECRETARY CONTACT (Auto updated from Secretary profile/login) */}
          <Contact
            icon="person-circle-outline"
            title={
              secretary?.name
                ? `${isHindi ? 'सचिव' : 'Secretary'} (${secretary.name})`
                : isHindi
                ? 'ग्राम पंचायत सचिव'
                : 'Panchayat Secretary'
            }
            subtitle={secretary?.village ? `${isHindi ? 'ग्राम पंचायत' : 'Panchayat'}: ${secretary.village}` : undefined}
            number={secretary?.mobile || (isHindi ? 'नंबर उपलब्ध नहीं' : 'Not added')}
            enabled={!!secretary?.mobile}
          />
          <View style={styles.divider} />

          {/* VILLAGE TOLL-FREE HELPLINE */}
          <Contact
            icon="call-outline"
            title={isHindi ? 'पंचायत टोल-फ्री हेल्पलाइन' : 'Panchayat Toll-Free Helpline'}
            subtitle={isHindi ? 'पंचायती राज सहायता' : 'Panchayati Raj Support'}
            number="1800-180-1555"
            enabled={true}
          />
        </View>

        <Text style={styles.footer}>
          VillageApp • {isHindi ? 'आपके गांव के लिए डिजिटल सेवा' : 'Digital Service For Your Village'}
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
    paddingHorizontal: SPACING.normal,
    paddingBottom: 35,
  },
  header: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: TYPOGRAPHY.extraBold,
    color: INDIA.navy,
  },
  subtitle: {
    marginTop: 3,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
  tricolor: {
    height: 9,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 17,
  },
  saffronLine: {
    flex: 1,
    backgroundColor: INDIA.saffron,
  },
  whiteLine: {
    flex: 1,
    backgroundColor: INDIA.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenLine: {
    flex: 1,
    backgroundColor: INDIA.green,
  },
  chakra: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: INDIA.navy,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: INDIA.green,
    ...SHADOWS.small,
    marginBottom: 15,
  },
  infoIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: INDIA.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    borderLeftWidth: 3,
    borderLeftColor: INDIA.saffron,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.extraBold,
    color: COLORS.textPrimary,
  },
  infoText: {
    marginTop: 4,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    ...SHADOWS.small,
  },
  contactRow: {
    minHeight: 75,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: INDIA.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: TYPOGRAPHY.medium,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  contactSubtitle: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  contactNumber: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.semiBold,
    color: COLORS.navy,
  },
  callButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: INDIA.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  callButtonDisabled: {
    backgroundColor: COLORS.borderLight,
  },
  callText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.small,
    fontWeight: TYPOGRAPHY.bold,
  },
  callTextDisabled: {
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  footer: {
    textAlign: 'center',
    marginTop: 22,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
  },
});
