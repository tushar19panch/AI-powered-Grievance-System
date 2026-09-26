import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface VillageInfoModalProps {
  visible: boolean;
  onClose: () => void;
  villageName?: string;
  isHindi?: boolean;
}

export function VillageInfoModal({
  visible,
  onClose,
  villageName = 'मुख्य ग्राम',
  isHindi = true,
}: VillageInfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="business-outline" size={22} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.title}>
                  {isHindi ? 'ग्राम पंचायत परिचय' : 'Gram Panchayat Overview'}
                </Text>
                <Text style={styles.subtitle}>
                  {villageName} • {isHindi ? 'बुनियादी विवरण' : 'Basic Details'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* TRICOLOR BADGE */}
            <View style={styles.villageHeroCard}>
              <Ionicons name="location" size={24} color={COLORS.saffron} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.villageHeroTitle}>{villageName}</Text>
                <Text style={styles.villageHeroSub}>
                  {isHindi ? 'डिजिटल ग्राम पंचायत • आदर्श ग्राम' : 'Digital Gram Panchayat • Model Village'}
                </Text>
              </View>
            </View>

            {/* DETAILS GRID */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeading}>
                {isHindi ? 'प्रमुख प्रशासनिक प्रतिनिधि' : 'Key Administrative Representatives'}
              </Text>

              {/* SARPANCH */}
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: COLORS.accentLight }]}>
                  <Ionicons name="shield-checkmark" size={18} color={COLORS.saffron} />
                </View>
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>
                    {isHindi ? 'ग्राम प्रधान / सरपंच' : 'Village Head / Sarpanch'}
                  </Text>
                  <Text style={styles.infoVal}>
                    {isHindi ? 'श्रीमती / श्री (सरपंच प्रतिनिधि)' : 'Sarpanch Representative'}
                  </Text>
                </View>
              </View>

              {/* SECRETARY */}
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: COLORS.infoLight }]}>
                  <Ionicons name="person" size={18} color={COLORS.info} />
                </View>
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>
                    {isHindi ? 'ग्राम पंचायत सचिव (VDO)' : 'Gram Panchayat Secretary'}
                  </Text>
                  <Text style={styles.infoVal}>
                    {isHindi ? 'ग्राम विकास अधिकारी' : 'Village Development Officer'}
                  </Text>
                </View>
              </View>
            </View>

            {/* STATS SECTION */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeading}>
                {isHindi ? 'जनसांख्यिकी एवं ढांचा' : 'Demographics & Infrastructure'}
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>~3,450</Text>
                  <Text style={styles.statLbl}>{isHindi ? 'अनुमानित जनसंख्या' : 'Population'}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNum}>10</Text>
                  <Text style={styles.statLbl}>{isHindi ? 'सक्रिय वार्ड' : 'Active Wards'}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statNum}>24x7</Text>
                  <Text style={styles.statLbl}>{isHindi ? 'नागरिक हेल्पलाइन' : 'Helpline'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* OK BUTTON */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneText}>{isHindi ? 'ठीक है' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    padding: 18,
    ...SHADOWS.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    paddingVertical: 14,
  },
  villageHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 16,
  },
  villageHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#9A3412',
  },
  villageHeroSub: {
    fontSize: 12,
    color: '#C2410C',
    marginTop: 2,
  },
  infoSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNum: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  doneText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
