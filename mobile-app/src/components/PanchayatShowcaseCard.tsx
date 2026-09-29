import React, { useEffect, useState } from 'react';
import {
  Image,
  Platform,
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
import { resolvePhotoUrl } from '../services/api';
import { localizeName, localizeVillageName } from '../utils/hindiTransliteration';

const DEFAULT_VILLAGE_IMAGE =
  'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80';

interface PanchayatShowcaseCardProps {
  userName?: string;
  villageName?: string;
  isHindi?: boolean;
  canManagePhotos?: boolean;
}

export function PanchayatShowcaseCard({
  userName = 'नागरिक',
  villageName = 'मुख्य ग्राम',
  isHindi = true,
  canManagePhotos = true,
}: PanchayatShowcaseCardProps) {
  const [photos, setPhotos] = useState<string[]>([DEFAULT_VILLAGE_IMAGE]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);

  const displayUserName = localizeName(userName, isHindi);
  const displayVillageName = localizeVillageName(villageName, isHindi);

  useEffect(() => {
    let isMounted = true;
    const loadVillagePhotos = async () => {
      try {
        const storageKey = `village_photos_gallery_${villageName || 'default'}`;
        const savedGallery = await AsyncStorage.getItem(storageKey);
        if (savedGallery && isMounted) {
          const parsed = JSON.parse(savedGallery);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPhotos(parsed);
            return;
          }
        }

        // Single photo check
        const single =
          (await AsyncStorage.getItem(`village_photo_${villageName}`)) ||
          (await AsyncStorage.getItem('village_cover_photo')) ||
          (await AsyncStorage.getItem('village_photos_gallery_default'));
        if (single && single.trim().length > 0 && isMounted) {
          try {
            const parsed = JSON.parse(single);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPhotos(parsed);
              return;
            }
          } catch { }
          setPhotos([single]);
          return;
        }

        if (isMounted) {
          setPhotos([DEFAULT_VILLAGE_IMAGE]);
        }
      } catch (e) {
        if (isMounted) setPhotos([DEFAULT_VILLAGE_IMAGE]);
      }
    };

    loadVillagePhotos();

    const handleWebPhotoChange = () => {
      loadVillagePhotos();
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).addEventListener === 'function') {
      (window as any).addEventListener('village_photo_changed', handleWebPhotoChange);
    }

    return () => {
      isMounted = false;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).removeEventListener === 'function') {
        (window as any).removeEventListener('village_photo_changed', handleWebPhotoChange);
      }
    };
  }, [villageName]);

  // Slideshow cycle only when multiple photos are added by Admin
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % photos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  const currentPhoto = photos.length > 0 ? photos[activeIdx] || photos[0] : DEFAULT_VILLAGE_IMAGE;

  return (
    <View style={styles.card}>
      {/* 1. TOP GREETING & VILLAGE HEADER */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTextWrap}>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {isHindi ? `नमस्ते, ${displayUserName} 👋` : `Hello, ${displayUserName} 👋`}
          </Text>
          <View style={styles.villageLocationRow}>
            <Ionicons name="location" size={13} color={COLORS.primary} />
            <Text style={styles.villageLocationText} numberOfLines={1}>
              {isHindi ? 'ग्राम पंचायत: ' : 'Panchayat: '}
              <Text style={{ fontWeight: '800', color: COLORS.navy }}>
                {displayVillageName}
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

      {/* 2. DYNAMIC PANCHAYAT PHOTO BANNER OR CLEAN EMPTY STATE */}
      {currentPhoto ? (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => setPreviewVisible(true)}
          style={styles.photoContainer}
        >
          <Image
            source={{ uri: resolvePhotoUrl(currentPhoto) || currentPhoto }}
            style={styles.showcaseImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : (
        /* CLEAN EMPTY PROFILE STATE (NO RANDOM STOCK IMAGES) */
        <TouchableOpacity
          style={styles.emptyContainer}
          activeOpacity={canManagePhotos ? 0.85 : 1}
          onPress={() => canManagePhotos && setManagerVisible(true)}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="business-outline" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {isHindi ? 'ग्राम पंचायत प्रोफाइल' : 'Gram Panchayat Profile'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isHindi
              ? canManagePhotos
                ? 'पंचायत भवन की फोटो जोड़ने हेतु यहां टैप करें'
                : 'पंचायत फोटो एडमिन द्वारा अपडेट की जाएगी'
              : canManagePhotos
                ? 'Tap to add Panchayat Bhavan photos'
                : 'Panchayat photo will be updated by Admin'}
          </Text>
          {canManagePhotos && (
            <View style={styles.emptyAddBtn}>
              <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>
                {isHindi ? 'फोटो जोड़ें' : 'Add Photo'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* FULL SCREEN PHOTO PREVIEW MODAL */}
      {currentPhoto && (
        <PhotoPreviewModal
          visible={previewVisible}
          imageUri={currentPhoto}
          userName={isHindi ? `ग्राम पंचायत: ${displayVillageName}` : `Gram Panchayat: ${displayVillageName}`}
          userRole={isHindi ? `फोटो ${activeIdx + 1} / ${photos.length}` : `Photo ${activeIdx + 1} of ${photos.length}`}
          onClose={() => setPreviewVisible(false)}
          onChangePhoto={canManagePhotos ? () => setManagerVisible(true) : undefined}
          isHindi={isHindi}
        />
      )}

      {/* PHOTO MANAGER & CROP/ROTATE MODAL */}
      {canManagePhotos && (
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
      )}
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
    marginBottom: 12,
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
    backgroundColor: '#F1F5F9',
    marginBottom: 4,
  },
  showcaseImage: {
    width: '100%',
    height: 145,
  },
  manageBadgeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
  },
  manageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 14,
    borderRadius: 4,
  },

  /* EMPTY PROFILE STATE */
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 3,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FF9933',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PanchayatShowcaseCard;
