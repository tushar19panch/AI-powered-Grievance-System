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
import { resolvePhotoUrl, villageApi } from '../services/api';
import { localizeName, localizeVillageName } from '../utils/hindiTransliteration';

const DEFAULT_VILLAGE_IMAGE =
  'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&auto=format&fit=crop&q=80';

interface PanchayatShowcaseCardProps {
  userName?: string;
  villageName?: string;
  isHindi?: boolean;
  canManagePhotos?: boolean;
  role?: 'citizen' | 'sarpanch' | 'secretary' | 'admin' | 'bdo' | 'dm';
  jurisdictionLabel?: string;
}

export function PanchayatShowcaseCard({
  userName = 'नागरिक',
  villageName = 'मुख्य ग्राम',
  isHindi = true,
  canManagePhotos = true,
  role = 'sarpanch',
  jurisdictionLabel,
}: PanchayatShowcaseCardProps) {
  const [photos, setPhotos] = useState<string[]>([DEFAULT_VILLAGE_IMAGE]);
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [managerVisible, setManagerVisible] = useState(false);

  const isBdo = role === 'bdo';
  const isDm = role === 'dm';

  const displayUserName = localizeName(userName, isHindi);
  const displayVillageName = localizeVillageName(villageName, isHindi);

  useEffect(() => {
    let isMounted = true;
    const loadVillagePhotos = async () => {
      try {
        const storageKey = isBdo
          ? `block_photos_gallery_${villageName || 'default'}`
          : isDm
          ? `district_photos_gallery_${villageName || 'default'}`
          : `village_photos_gallery_${villageName || 'default'}`;
        const singleKey = isBdo
          ? `block_photo_${villageName}`
          : isDm
          ? `district_photo_${villageName}`
          : `village_photo_${villageName}`;
        const coverKey = isBdo ? 'block_cover_photo' : isDm ? 'district_cover_photo' : 'village_cover_photo';

        // 1. Instant Cache Check for zero screen-blink
        const savedGallery = await AsyncStorage.getItem(storageKey);
        if (savedGallery && isMounted) {
          try {
            const parsed = JSON.parse(savedGallery);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setPhotos(parsed);
            }
          } catch {}
        } else {
          const single =
            (await AsyncStorage.getItem(singleKey)) ||
            (await AsyncStorage.getItem(coverKey)) ||
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
        }

        // 2. LIVE SERVER SYNC: Fetch the official photo uploaded by Sarpanch / Admin / BDO / DM
        try {
          const res = await villageApi.getPhoto(villageName);
          const serverPhoto = res?.photoUrl;
          if (serverPhoto && serverPhoto.trim().length > 0 && isMounted) {
            setPhotos((prev) => {
              if (prev[0] === serverPhoto) return prev;
              return [serverPhoto, ...prev.filter((p) => p !== serverPhoto && p !== DEFAULT_VILLAGE_IMAGE)];
            });
            await AsyncStorage.setItem(singleKey, serverPhoto);
            await AsyncStorage.setItem(coverKey, serverPhoto);
            return;
          }
        } catch (apiErr) {
          console.log('Error fetching live photo from server:', apiErr);
        }

        // 3. Fallback if no photo anywhere
        if (isMounted) {
          setPhotos((prev) => (prev.length > 0 ? prev : [DEFAULT_VILLAGE_IMAGE]));
        }
      } catch (e) {
        if (isMounted) setPhotos([DEFAULT_VILLAGE_IMAGE]);
      }
    };

    loadVillagePhotos();

    const handlePhotoChange = () => {
      loadVillagePhotos();
    };
    const eventName = isBdo ? 'block_photo_changed' : isDm ? 'district_photo_changed' : 'village_photo_changed';

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).addEventListener === 'function') {
      (window as any).addEventListener(eventName, handlePhotoChange);
      (window as any).addEventListener('village_photo_changed', handlePhotoChange);
    }

    return () => {
      isMounted = false;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof (window as any).removeEventListener === 'function') {
        (window as any).removeEventListener(eventName, handlePhotoChange);
        (window as any).removeEventListener('village_photo_changed', handlePhotoChange);
      }
    };
  }, [villageName, role]);

  // Slideshow cycle only when multiple photos are added
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % photos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  const currentPhoto = photos.length > 0 ? photos[activeIdx] || photos[0] : DEFAULT_VILLAGE_IMAGE;

  const defaultJurisdictionLabel = isBdo
    ? (isHindi ? 'प्रखंड / उप-प्रभाग: ' : 'Sub-Division / Block: ')
    : isDm
    ? (isHindi ? 'जिला क्षेत्राधिकार: ' : 'District Jurisdiction: ')
    : (isHindi ? 'ग्राम पंचायत: ' : 'Panchayat: ');

  return (
    <View style={styles.card}>
      {/* 1. TOP GREETING & JURISDICTION HEADER */}
      <View style={styles.greetingHeader}>
        <View style={styles.greetingTextWrap}>
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {isHindi ? `नमस्ते, ${displayUserName} 👋` : `Hello, ${displayUserName} 👋`}
          </Text>
          <View style={styles.villageLocationRow}>
            <Ionicons name="location" size={13} color={COLORS.primary} />
            <Text style={styles.villageLocationText} numberOfLines={1}>
              {jurisdictionLabel || defaultJurisdictionLabel}
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

      {/* 2. DYNAMIC JURISDICTION PHOTO BANNER OR CLEAN EMPTY STATE */}
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
        /* CLEAN EMPTY PROFILE STATE */
        <TouchableOpacity
          style={styles.emptyContainer}
          activeOpacity={canManagePhotos ? 0.85 : 1}
          onPress={() => canManagePhotos && setManagerVisible(true)}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name={isDm ? 'ribbon-outline' : isBdo ? 'business-outline' : 'business-outline'}
              size={28}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {isBdo
              ? (isHindi ? 'विकासखंड / उप-प्रभाग प्रोफाइल' : 'Block / Sub-Division Profile')
              : isDm
              ? (isHindi ? 'जिला प्रशासन प्रोफाइल' : 'District Administration Profile')
              : (isHindi ? 'ग्राम पंचायत प्रोफाइल' : 'Gram Panchayat Profile')}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isBdo
              ? (isHindi
                  ? canManagePhotos
                    ? 'विकासखंड कार्यालय की फोटो जोड़ने हेतु यहां टैप करें'
                    : 'विकासखंड फोटो अधिकारी द्वारा अपडेट की जाएगी'
                  : canManagePhotos
                    ? 'Tap to add Block headquarters photos'
                    : 'Block photo will be updated by official')
              : isDm
              ? (isHindi
                  ? canManagePhotos
                    ? 'जिला कलेक्ट्रेट की फोटो जोड़ने हेतु यहां टैप करें'
                    : 'कलेक्ट्रेट फोटो जिलाधिकारी द्वारा अपडेट की जाएगी'
                  : canManagePhotos
                    ? 'Tap to add District Collectorate photos'
                    : 'District photo will be updated by DM')
              : (isHindi
                  ? canManagePhotos
                    ? 'पंचायत भवन की फोटो जोड़ने हेतु यहां टैप करें'
                    : 'पंचायत फोटो एडमिन द्वारा अपडेट की जाएगी'
                  : canManagePhotos
                    ? 'Tap to add Panchayat Bhavan photos'
                    : 'Panchayat photo will be updated by Admin')}
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
          userName={
            isBdo
              ? (isHindi ? `विकासखंड: ${displayVillageName}` : `Block: ${displayVillageName}`)
              : isDm
              ? (isHindi ? `जिला: ${displayVillageName}` : `District: ${displayVillageName}`)
              : (isHindi ? `ग्राम पंचायत: ${displayVillageName}` : `Gram Panchayat: ${displayVillageName}`)
          }
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
          role={role}
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
