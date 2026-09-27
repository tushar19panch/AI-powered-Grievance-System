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
  district?: string;
  block?: string;
  state?: string;
  wardNumber?: string;
  sarpanchName?: string;
  secretaryName?: string;
  isHindi?: boolean;
}

export function VillageInfoModal({
  visible,
  onClose,
  villageName = 'ग्राम पंचायत',
  district,
  block,
  state = 'Madhya Pradesh',
  wardNumber,
  sarpanchName,
  secretaryName,
  isHindi = true,
}: VillageInfoModalProps) {
  const displayVillage = villageName && villageName !== 'मुख्य ग्राम' ? villageName : (isHindi ? 'ग्राम पंचायत' : 'Gram Panchayat');

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
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>
                  {isHindi ? 'ग्राम पंचायत परिचय' : 'Gram Panchayat Details'}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {displayVillage} • {isHindi ? 'प्रशासनिक विवरण' : 'Administrative Details'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.65}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* TRICOLOR HERO BADGE */}
            <View style={styles.villageHeroCard}>
              <Ionicons name="location" size={26} color={COLORS.saffron} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.villageHeroTitle}>{displayVillage}</Text>
                <Text style={styles.villageHeroSub}>
                  {isHindi
                    ? 'डिजिटल ग्राम पंचायत • मध्य प्रदेश शासन'
                    : 'Digital Gram Panchayat • Govt of Madhya Pradesh'}
                </Text>
              </View>
            </View>

            {/* LOCATION HIERARCHY DETAILS */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeading}>
                {isHindi ? 'भौगोलिक एवं प्रशासनिक स्थिति' : 'Administrative Hierarchy'}
              </Text>

              {/* STATE */}
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="map-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>{isHindi ? 'राज्य / State' : 'State'}</Text>
                  <Text style={styles.infoVal}>{state}</Text>
                </View>
              </View>

              {/* DISTRICT */}
              {district ? (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconBox, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="trail-sign-outline" size={18} color="#16A34A" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>{isHindi ? 'जिला / District' : 'District'}</Text>
                    <Text style={styles.infoVal}>{district}</Text>
                  </View>
                </View>
              ) : null}

              {/* BLOCK */}
              {block ? (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconBox, { backgroundColor: '#FAF5FF' }]}>
                    <Ionicons name="git-network-outline" size={18} color="#9333EA" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>{isHindi ? 'विकासखंड / Block' : 'Block'}</Text>
                    <Text style={styles.infoVal}>{block}</Text>
                  </View>
                </View>
              ) : null}

              {/* WARD */}
              {wardNumber ? (
                <View style={styles.infoRow}>
                  <View style={[styles.infoIconBox, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="home-outline" size={18} color="#EA580C" />
                  </View>
                  <View style={styles.infoTextBox}>
                    <Text style={styles.infoLabel}>{isHindi ? 'वार्ड संख्या / Ward' : 'Ward'}</Text>
                    <Text style={styles.infoVal}>{isHindi ? `वार्ड नं. ${wardNumber}` : `Ward No. ${wardNumber}`}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* ADMINISTRATIVE REPRESENTATION */}
            <View style={styles.infoSection}>
              <Text style={styles.sectionHeading}>
                {isHindi ? 'पंचायत प्रशासनिक व्यवस्था' : 'Panchayat Administration'}
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
                    {sarpanchName || (isHindi ? 'सरपंच कार्यालय (ग्राम पंचायत)' : 'Sarpanch Office')}
                  </Text>
                </View>
              </View>

              {/* SECRETARY */}
              <View style={styles.infoRow}>
                <View style={[styles.infoIconBox, { backgroundColor: COLORS.infoLight }]}>
                  <Ionicons name="person-circle-outline" size={18} color={COLORS.info} />
                </View>
                <View style={styles.infoTextBox}>
                  <Text style={styles.infoLabel}>
                    {isHindi ? 'ग्राम पंचायत सचिव (VDO)' : 'Gram Panchayat Secretary'}
                  </Text>
                  <Text style={styles.infoVal}>
                    {secretaryName || (isHindi ? 'ग्राम विकास अधिकारी कार्यालय' : 'VDO / Secretary Office')}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* CLOSE BUTTON */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.7}>
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
    fontSize: 12,
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
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 2,
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
