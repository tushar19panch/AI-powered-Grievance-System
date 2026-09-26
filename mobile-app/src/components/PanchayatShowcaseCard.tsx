import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PhotoPreviewModal } from './PhotoPreviewModal';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface PanchayatShowcaseCardProps {
  userName?: string;
  villageName?: string;
  isHindi?: boolean;
}

// High-quality representative Gram Panchayat Bhavan image
const DEFAULT_VILLAGE_IMAGE =
  'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=1200&auto=format&fit=crop';

export function PanchayatShowcaseCard({
  userName = 'नागरिक',
  villageName = 'मुख्य ग्राम',
  isHindi = true,
}: PanchayatShowcaseCardProps) {
  const [villagePhoto, setVillagePhoto] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    loadVillagePhoto();
  }, [villageName]);

  const loadVillagePhoto = async () => {
    try {
      const saved = await AsyncStorage.getItem(`village_photo_${villageName}`);
      if (saved) {
        setVillagePhoto(saved);
        return;
      }
      const genericSaved = await AsyncStorage.getItem('village_cover_photo');
      if (genericSaved) {
        setVillagePhoto(genericSaved);
      }
    } catch (e) {
      console.log('Error loading village photo:', e);
    }
  };

  const currentImageUri = villagePhoto || DEFAULT_VILLAGE_IMAGE;

  return (
    <View style={styles.card}>
      {/* 1. TOP GREETING & VILLAGE IN ONE CLEAN HEADER */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTextWrap}>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {isHindi ? `नमस्ते, ${userName} 👋` : `Hello, ${userName} 👋`}
          </Text>
          <View style={styles.villageLocationRow}>
            <Ionicons name="location" size={13} color={COLORS.primary} />
            <Text style={styles.villageLocationText} numberOfLines={1}>
              {isHindi ? 'ग्राम पंचायत: ' : 'Panchayat: '}
              <Text style={{ fontWeight: '800', color: COLORS.navy }}>
                {villageName}
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.activePill}>
          <View style={styles.liveDot} />
          <Text style={styles.activePillText}>
            {isHindi ? 'सक्रिय' : 'Active'}
          </Text>
        </View>
      </View>

      {/* 2. VILLAGE / PANCHAYAT BHAVAN SHOWCASE PHOTO (100% CLEAN - NO TEXT OVERLAY) */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => setPreviewVisible(true)}
        style={styles.photoContainer}
      >
        <Image
          source={{ uri: currentImageUri }}
          style={styles.showcaseImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* FULL SCREEN PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={previewVisible}
        imageUri={currentImageUri}
        userName={isHindi ? `ग्राम पंचायत: ${villageName}` : `Gram Panchayat: ${villageName}`}
        userRole={isHindi ? 'ग्राम पंचायत भवन' : 'Gram Panchayat Bhavan'}
        onClose={() => setPreviewVisible(false)}
        isHindi={isHindi}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...SHADOWS.small,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  greetingTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  villageLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  villageLocationText: {
    fontSize: 12,
    color: '#475569',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },

  /* SHOWCASE PHOTO */
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: 8,
  },
  showcaseImage: {
    width: '100%',
    height: 145,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    justifyContent: 'space-between',
    padding: 8,
  },
  panchayatBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  panchayatBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  zoomHintBadge: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },

  /* FOOTER */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  tricolorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9933',
  },
  footerTagline: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
});
