import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';

const COLORS = {
  orange: '#FF9933',
  orangeDark: '#E88722',
  orangeLight: '#FFF1E3',
  navy: '#000080',
  navyLight: '#EEEEFA',
  white: '#FFFFFF',
  background: '#F7F9F8',
  dark: '#17251E',
  text: '#596760',
  muted: '#7C8882',
  border: '#E1E5E3',
  green: '#138808',
  greenLight: '#EAF5E8',
};

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { language } = useLanguage();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

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
  }, []);

  const openCitizen = () => {
    router.push('/register');
  };

  const openAdmin = () => {
    router.push('/admin-register');
  };

  const openSecretary = () => {
    router.push('/secretary-register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.navy}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {language === 'hi'
                ? 'अपनी भूमिका चुनें'
                : 'Choose Your Role'}
            </Text>

            <Text style={styles.headerSubtitle}>
              {language === 'hi'
                ? 'शुरू करने के लिए अपनी भूमिका चुनें'
                : 'Select your role to get started'}
            </Text>
          </View>
        </Animated.View>

        {/* TOP STRIPE */}

        <View style={styles.stripe}>
          <View
            style={[
              styles.stripePart,
              { backgroundColor: COLORS.orange },
            ]}
          />

          <View
            style={[
              styles.stripePart,
              {
                backgroundColor: COLORS.white,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: '#E8E8E8',
              },
            ]}
          />

          <View
            style={[
              styles.stripePart,
              { backgroundColor: COLORS.navy },
            ]}
          />
        </View>

        {/* INTRO CARD */}

        <Animated.View
          style={[
            styles.introCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.introIcon}>
            <Ionicons
              name="people-outline"
              size={32}
              color={COLORS.white}
            />
          </View>

          <View style={styles.introText}>
            <Text style={styles.introTitle}>
              {language === 'hi'
                ? 'VillageApp में आपका स्वागत है'
                : 'Welcome to VillageApp'}
            </Text>

            <Text style={styles.introDescription}>
              {language === 'hi'
                ? 'आप अपनी भूमिका के अनुसार अलग-अलग सुविधाओं का उपयोग कर सकते हैं।'
                : 'Access features designed for your role in the village service system.'}
            </Text>
          </View>
        </Animated.View>

        {/* ROLE TITLE */}

        <Text style={styles.sectionTitle}>
          {language === 'hi'
            ? 'भूमिका चुनें'
            : 'Select Role'}
        </Text>

        {/* ================= ADMIN ================= */}

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.roleCard}
            onPress={openAdmin}
            activeOpacity={0.88}
          >
            <View
              style={[
                styles.roleIcon,
                {
                  backgroundColor: COLORS.orangeLight,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={34}
                color={COLORS.orange}
              />
            </View>

            <View style={styles.roleContent}>
              <View style={styles.roleTitleRow}>
                <Text style={styles.roleTitle}>
                  {language === 'hi'
                    ? 'सरपंच / एडमिन'
                    : 'Sarpanch / Admin'}
                </Text>

                <View style={styles.headBadge}>
                  <Text style={styles.headBadgeText}>
                    HEAD
                  </Text>
                </View>
              </View>

              <Text style={styles.roleDescription}>
                {language === 'hi'
                  ? 'शिकायतों की निगरानी करें और कार्रवाई को प्रबंधित करें'
                  : 'Monitor complaints and manage village-level actions'}
              </Text>
            </View>

            <View style={styles.arrow}>
              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.white}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ================= CITIZEN ================= */}

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.roleCard}
            onPress={openCitizen}
            activeOpacity={0.88}
          >
            <View
              style={[
                styles.roleIcon,
                {
                  backgroundColor: COLORS.navyLight,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={34}
                color={COLORS.navy}
              />
            </View>

            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>
                {language === 'hi'
                  ? 'नागरिक'
                  : 'Citizen'}
              </Text>

              <Text style={styles.roleDescription}>
                {language === 'hi'
                  ? 'गांव की समस्या दर्ज करें और शिकायत की स्थिति देखें'
                  : 'Report village problems and track complaint status'}
              </Text>
            </View>

            <View
              style={[
                styles.arrow,
                { backgroundColor: COLORS.navy },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.white}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ================= SECRETARY ================= */}

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.roleCard}
            onPress={openSecretary}
            activeOpacity={0.88}
          >
            <View
              style={[
                styles.roleIcon,
                {
                  backgroundColor: COLORS.greenLight,
                },
              ]}
            >
              <Ionicons
                name="clipboard-outline"
                size={34}
                color={COLORS.green}
              />
            </View>

            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>
                {language === 'hi'
                  ? 'सचिव / सुपरवाइजर'
                  : 'Secretary / Supervisor'}
              </Text>

              <Text style={styles.roleDescription}>
                {language === 'hi'
                  ? 'शिकायतों की निगरानी और एस्केलेशन को संभालें'
                  : 'Monitor complaints and handle escalation'}
              </Text>
            </View>

            <View
              style={[
                styles.arrow,
                { backgroundColor: COLORS.green },
              ]}
            >
              <Ionicons
                name="chevron-forward"
                size={21}
                color={COLORS.white}
              />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* FOOTER */}

        <View style={styles.footer}>
          <Ionicons
            name="lock-closed-outline"
            size={14}
            color={COLORS.muted}
          />

          <Text style={styles.footerText}>
            {language === 'hi'
              ? 'आपकी जानकारी सुरक्षित रखी जाएगी'
              : 'Your information will be kept secure'}
          </Text>
        </View>
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 35,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  headerText: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: COLORS.dark,
  },

  headerSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  /* STRIPE */

  stripe: {
    height: 5,
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'column',
    marginBottom: 20,
  },

  stripePart: {
    flex: 1,
  },

  /* INTRO */

  introCard: {
    backgroundColor: COLORS.orange,
    borderRadius: 23,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    elevation: 5,
  },

  introIcon: {
    width: 61,
    height: 61,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  introText: {
    flex: 1,
    marginLeft: 13,
  },

  introTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.white,
  },

  introDescription: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.white,
    opacity: 0.92,
    marginTop: 5,
  },

  /* SECTION */

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.dark,
    marginBottom: 11,
  },

  /* ROLE CARD */

  roleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 21,
    minHeight: 112,
    padding: 14,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
  },

  roleIcon: {
    width: 65,
    height: 65,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  roleContent: {
    flex: 1,
    paddingHorizontal: 12,
  },

  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  roleTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.dark,
  },

  roleDescription: {
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.muted,
    marginTop: 5,
  },

  headBadge: {
    marginLeft: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: COLORS.orangeLight,
  },

  headBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: COLORS.orangeDark,
  },

  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* FOOTER */

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 5,
  },

  footerText: {
    fontSize: 9,
    color: COLORS.muted,
  },
});