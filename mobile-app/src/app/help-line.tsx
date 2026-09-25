import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../theme';

const INDIA = {
  saffron: '#FF9933',
  white: '#FFFFFF',
  green: '#138808',
  navy: '#000080',
  lightGreen: '#EAF6EA',
};

export default function HelpLine() {
  const router = useRouter();
  const { language } = useLanguage();
  const isHindi = language === 'hi';

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
    icon, title, number, enabled = true,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    number: string;
    enabled?: boolean;
  }) => (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>
        <Ionicons name={icon} size={23} color={enabled ? INDIA.green : COLORS.textMuted} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{title}</Text>
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{isHindi ? 'हेल्प लाइन और संपर्क' : 'Help Line & Contacts'}</Text>
            <Text style={styles.subtitle}>{isHindi ? 'जरूरत पड़ने पर तुरंत संपर्क करें' : 'Quick access to important contacts'}</Text>
          </View>
        </View>

        <View style={styles.tricolor}>
          <View style={styles.saffronLine} />
          <View style={styles.whiteLine}><View style={styles.chakra} /></View>
          <View style={styles.greenLine} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="call-outline" size={28} color={INDIA.green} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{isHindi ? 'जरूरी संपर्क' : 'Important Contacts'}</Text>
            <Text style={styles.infoText}>
              {isHindi ? 'किसी आपात स्थिति में संबंधित सेवा से सीधे संपर्क करें।' : 'Contact the relevant service directly when needed.'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Contact icon="shield-outline" title={isHindi ? 'पुलिस' : 'Police'} number="100" />
          <View style={styles.divider} />
          <Contact icon="medkit-outline" title={isHindi ? 'एम्बुलेंस' : 'Ambulance'} number="108" />
          <View style={styles.divider} />
          <Contact icon="alert-circle-outline" title={isHindi ? 'आपातकाल' : 'Emergency'} number="112" />
          <View style={styles.divider} />
          <Contact icon="person-outline" title={isHindi ? 'सरपंच' : 'Sarpanch'} number={isHindi ? 'नंबर उपलब्ध नहीं' : 'Not added'} enabled={false} />
          <View style={styles.divider} />
          <Contact icon="person-circle-outline" title={isHindi ? 'सचिव' : 'Secretary'} number={isHindi ? 'नंबर उपलब्ध नहीं' : 'Not added'} enabled={false} />
          <View style={styles.divider} />
          <Contact icon="call-outline" title={isHindi ? 'ग्राम हेल्पलाइन' : 'Village Helpline'} number={isHindi ? 'नंबर उपलब्ध नहीं' : 'Not added'} enabled={false} />
        </View>

        <Text style={styles.footer}>VillageApp • {isHindi ? 'आपके गांव के लिए' : 'For your village'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.normal, paddingBottom: 35 },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  headerText: { flex: 1 },
  title: { fontSize: TYPOGRAPHY.heading, fontWeight: TYPOGRAPHY.extraBold, color: INDIA.navy },
  subtitle: { marginTop: 3, fontSize: TYPOGRAPHY.small, color: COLORS.textMuted },
  tricolor: { height: 9, borderRadius: 5, overflow: 'hidden', marginBottom: 17 },
  saffronLine: { flex: 1, backgroundColor: INDIA.saffron },
  whiteLine: { flex: 1, backgroundColor: INDIA.white, alignItems: 'center', justifyContent: 'center' },
  greenLine: { flex: 1, backgroundColor: INDIA.green },
  chakra: { width: 5, height: 5, borderRadius: 3, backgroundColor: INDIA.navy },
  infoCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: INDIA.green, ...SHADOWS.small, marginBottom: 15 },
  infoIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: INDIA.lightGreen, alignItems: 'center', justifyContent: 'center', marginRight: 13, borderLeftWidth: 3, borderLeftColor: INDIA.saffron },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: TYPOGRAPHY.medium, fontWeight: TYPOGRAPHY.extraBold, color: COLORS.textPrimary },
  infoText: { marginTop: 4, fontSize: TYPOGRAPHY.small, lineHeight: 18, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, paddingHorizontal: 14, ...SHADOWS.small },
  contactRow: { minHeight: 75, flexDirection: 'row', alignItems: 'center' },
  contactIcon: { width: 45, height: 45, borderRadius: 14, backgroundColor: INDIA.lightGreen, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: TYPOGRAPHY.medium, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  contactNumber: { marginTop: 3, fontSize: TYPOGRAPHY.small, color: COLORS.textMuted },
  callButton: { height: 38, paddingHorizontal: 12, borderRadius: 11, backgroundColor: INDIA.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  callButtonDisabled: { backgroundColor: COLORS.borderLight },
  callText: { color: COLORS.white, fontSize: TYPOGRAPHY.small, fontWeight: TYPOGRAPHY.bold },
  callTextDisabled: { color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.borderLight },
  footer: { textAlign: 'center', marginTop: 22, fontSize: TYPOGRAPHY.small, color: COLORS.textMuted },
});
