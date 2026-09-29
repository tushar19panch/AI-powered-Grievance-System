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
import { villageApi, resolvePhotoUrl } from '../services/api';

const DEFAULT_VILLAGE_IMAGE = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80';

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
  const [photos, setPhotos] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadVillagePhotos = async () => {
      try {
        const storageKey = `village_photos_gallery_${villageName || 'default'}`;
        const savedGallery = await AsyncStorage.getItem(storageKey);
        if (savedGallery && isMounted) {
          try {
            const parsed = JSON.parse(savedGallery);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPhotos(parsed);
            }
          } catch {}
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
            } else {
              setPhotos([single]);
            }
          } catch {
            setPhotos([single]);
          }
        }

        // Fetch from backend API
        try {
          const res = await villageApi.getPhoto(villageName);
          if (res?.photoUrl && res.photoUrl.trim().length > 0 && isMounted) {
            setPhotos((prev) => {
              if (prev.length === 0 || !prev.includes(res.photoUrl!)) {
                return [res.photoUrl!, ...prev.filter((p) => p !== res.photoUrl)];
              }
              return prev;
            });
            await AsyncStorage.setItem(`village_photo_${villageName}`, res.photoUrl);
          }
        } catch (apiErr) {
          console.log('Village photo sync notice:', apiErr);
        }
      } catch (e) {
        if (isMounted) setPhotos([]);
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

  const displayPhoto = photos.length > 0 ? photos[activeIdx] || photos[0] : DEFAULT_VILLAGE_IMAGE;

  useEffect(() => {
    setImageLoadError(false);
  }, [displayPhoto]);

  return (
    <View style={styles.card}>
      {/* 1. TOP GREETING & VILLAGE HEADER */}
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

      {/* 2. DYNAMIC PANCHAYAT PHOTO BANNER */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => setPreviewVisible(true)}
        style={styles.photoContainer}
      >
        {!imageLoadError ? (
          <Image
            source={{ uri: resolvePhotoUrl(displayPhoto) || displayPhoto }}
            style={styles.showcaseImage}
            resizeMode="cover"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <View style={styles.fallbackBanner}>
            <View style={styles.fallbackDecorIcon}>
              <Ionicons name="business" size={36} color="#FFFFFF" />
            </View>
            <View style={styles.fallbackTextWrap}>
              <Text style={styles.fallbackTitle} numberOfLines={1}>
                {villageName}
              </Text>
              <Text style={styles.fallbackSub} numberOfLines={1}>
                {isHindi ? '🏛️ ग्राम पंचायत भवन व सेवा केंद्र' : '🏛️ Gram Panchayat Bhavan & Center'}
              </Text>
              <View style={styles.fallbackBadge}>
                <Ionicons name="sparkles" size={11} color="#FEF3C7" />
                <Text style={styles.fallbackBadgeText}>
                  {isHindi ? 'डिजिटल ई-पंचायत' : 'Digital E-Panchayat'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {canManagePhotos && (
          <TouchableOpacity
            style={styles.manageBadgeBtn}
            onPress={(e) => {
              e.stopPropagation();
              setManagerVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={13} color="#FFFFFF" />
            <Text style={styles.manageBadgeText}>
              {isHindi ? 'फोटो बदलें' : 'Update'}
            </Text>
          </TouchableOpacity>
        )}

        {/* DOTS PAGINATION */}
        {photos.length > 1 && !imageLoadError && (
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
        imageUri={displayPhoto}
        userName={isHindi ? `ग्राम पंचायत: ${villageName}` : `Gram Panchayat: ${villageName}`}
        userRole={
          photos.length > 1
            ? (isHindi ? `फोटो ${activeIdx + 1} / ${photos.length}` : `Photo ${activeIdx + 1} of ${photos.length}`)
            : (isHindi ? 'ग्राम पंचायत भवन' : 'Panchayat Bhavan')
        }
        onClose={() => setPreviewVisible(false)}
        onChangePhoto={canManagePhotos ? () => setManagerVisible(true) : undefined}
        isHindi={isHindi}
      />

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
  /* FALLBACK BANNER WHEN REMOTE IMAGE FAILS OR LOADS */
  fallbackBanner: {
    width: '100%',
    height: 145,
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  fallbackDecorIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fallbackTextWrap: {
    flex: 1,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  fallbackSub: {
    fontSize: 11,
    color: '#E0E7FF',
    marginBottom: 6,
  },
  fallbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FEF3C7',
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
