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
import { PanchayatPhotoManagerModal } from './PanchayatPhotoManagerModal';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

import { villageApi } from '../services/api';

import { Platform } from 'react-native';

interface PanchayatShowcaseCardProps {
  userName?: string;
  villageName?: string;
  isHindi?: boolean;
  canManagePhotos?: boolean;
}

// High-quality representative Gram Panchayat Bhavan image
const DEFAULT_VILLAGE_IMAGES = [
  'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=1200&auto=format&fit=crop',
];

export function PanchayatShowcaseCard({
  userName = 'नागरिक',
  villageName = 'मुख्य ग्राम',
  isHindi = true,
  canManagePhotos = true,
}: PanchayatShowcaseCardProps) {
  const [photos, setPhotos] = useState<string[]>(DEFAULT_VILLAGE_IMAGES);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);

  useEffect(() => {
    loadVillagePhotos();
    const interval = setInterval(loadVillagePhotos, 4000);
    return () => clearInterval(interval);
  }, [villageName]);

  // Dynamic automatic slideshow cycling
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % photos.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [photos.length]);

  const loadVillagePhotos = async () => {
    try {
      const storageKey = `village_photos_gallery_${villageName || 'default'}`;
      const savedGallery = await AsyncStorage.getItem(storageKey);
      if (savedGallery) {
        const parsed = JSON.parse(savedGallery);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPhotos(parsed);
          return;
        }
      }

      // Single photo fallback check
      const single = await AsyncStorage.getItem(`village_photo_${villageName}`) || await AsyncStorage.getItem('village_cover_photo');
      if (single) {
        setPhotos([single, ...DEFAULT_VILLAGE_IMAGES.slice(1)]);
      }
    } catch (e) {
      console.log('Error loading village gallery photos:', e);
    }
  };

  const currentPhoto = photos[activeIdx] || photos[0] || DEFAULT_VILLAGE_IMAGES[0];

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

      {/* 2. DYNAMIC ROTATING PANCHAYAT PHOTO BANNER */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => setPreviewVisible(true)}
        style={styles.photoContainer}
      >
        <Image
          source={{ uri: currentPhoto }}
          style={styles.showcaseImage}
          resizeMode="cover"
        />

        {/* CLEAN PHOTO DISPLAY - NO TEXT OVERLAYS */}

        {/* BOTTOM DOTS PAGINATION */}
        {photos.length > 1 && (
          <View style={styles.dotsContainer}>
            {photos.map((_, idx) => (
              <TouchableOpacity
                key={`dot-${idx}`}
                onPress={(e) => {
                  e.stopPropagation();
                  setActiveIdx(idx);
                }}
                style={[
                  styles.dot,
                  activeIdx === idx && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* FULL SCREEN PHOTO PREVIEW MODAL */}
      <PhotoPreviewModal
        visible={previewVisible}
        imageUri={currentPhoto}
        userName={isHindi ? `ग्राम पंचायत: ${villageName}` : `Gram Panchayat: ${villageName}`}
        userRole={isHindi ? `फोटो ${activeIdx + 1} / ${photos.length}` : `Photo ${activeIdx + 1} of ${photos.length}`}
        onClose={() => setPreviewVisible(false)}
        isHindi={isHindi}
      />

      {/* PHOTO MANAGER & CROP/ROTATE MODAL */}
      <PanchayatPhotoManagerModal
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        villageName={villageName}
        photos={photos}
        onPhotosUpdated={(updated) => {
          setPhotos(updated);
          setActiveIdx(0);
        }}
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
  imageTopOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    width: 18,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.saffron,
  },
});
