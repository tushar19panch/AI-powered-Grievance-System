import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';
import { villageApi } from '../services/api';

interface PanchayatPhotoManagerModalProps {
  visible: boolean;
  onClose: () => void;
  villageName: string;
  photos: string[];
  onPhotosUpdated: (updatedPhotos: string[]) => void;
  isHindi: boolean;
  role?: 'citizen' | 'sarpanch' | 'secretary' | 'admin' | 'bdo' | 'dm';
}

export function PanchayatPhotoManagerModal({
  visible,
  onClose,
  villageName,
  photos,
  onPhotosUpdated,
  isHindi,
  role = 'sarpanch',
}: PanchayatPhotoManagerModalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [uploading, setUploading] = useState<boolean>(false);

  const isBdo = role === 'bdo';
  const isDm = role === 'dm';
  const storageKey = isBdo
    ? `block_photos_gallery_${villageName || 'default'}`
    : isDm
    ? `district_photos_gallery_${villageName || 'default'}`
    : `village_photos_gallery_${villageName || 'default'}`;
  const coverKey = isBdo ? 'block_cover_photo' : isDm ? 'district_cover_photo' : 'village_cover_photo';
  const singleKey = isBdo
    ? `block_photo_${villageName || 'default'}`
    : isDm
    ? `district_photo_${villageName || 'default'}`
    : `village_photo_${villageName || 'default'}`;
  const eventName = isBdo ? 'block_photo_changed' : isDm ? 'district_photo_changed' : 'village_photo_changed';

  const activePhoto = photos[selectedIdx] || photos[0] || null;

  const handlePickPhotos = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            isHindi ? 'गैलरी अनुमति' : 'Gallery Permission',
            isHindi ? 'कृपया फोटो चुनने की अनुमति दें।' : 'Please grant gallery access.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 12,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris: string[] = [];
        for (const asset of result.assets) {
          if (asset.base64) {
            newUris.push(
              asset.base64.startsWith('data:')
                ? asset.base64
                : `data:image/jpeg;base64,${asset.base64}`
            );
          } else if (asset.uri) {
            newUris.push(asset.uri);
          }
        }

        const merged = [...photos, ...newUris].slice(0, 12);
        await savePhotos(merged);
        setSelectedIdx(merged.length - 1);
        setRotation(0);
      }
    } catch (e) {
      console.log('Error selecting multiple photos:', e);
    }
  };

  const handleCaptureCamera = async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            isHindi ? 'कैमरा अनुमति' : 'Camera Permission',
            isHindi ? 'कृपया कैमरे की अनुमति दें।' : 'Please grant camera access.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64
          ? (asset.base64.startsWith('data:') ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`)
          : asset.uri;

        const merged = [uri, ...photos].slice(0, 12);
        await savePhotos(merged);
        setSelectedIdx(0);
        setRotation(0);
      }
    } catch (e) {
      console.log('Error taking camera photo:', e);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDeleteActive = async () => {
    if (photos.length <= 1) {
      Alert.alert(
        isHindi ? 'हटाएं' : 'Delete',
        isHindi ? 'कम से कम एक फोटो आवश्यक है या सभी हटा दें?' : 'Remove photo?',
        [
          { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
          {
            text: isHindi ? 'हटाएं' : 'Delete',
            style: 'destructive',
            onPress: async () => {
              await savePhotos([]);
              setSelectedIdx(0);
            },
          },
        ]
      );
      return;
    }

    const updated = photos.filter((_, idx) => idx !== selectedIdx);
    await savePhotos(updated);
    setSelectedIdx(Math.max(0, selectedIdx - 1));
    setRotation(0);
  };

  const handleSetAsCover = async () => {
    if (!activePhoto) return;
    const reordered = [activePhoto, ...photos.filter((_, i) => i !== selectedIdx)];
    await savePhotos(reordered);
    setSelectedIdx(0);
    Alert.alert(
      isHindi ? 'सफल' : 'Success',
      isHindi ? 'यह फोटो मुख्य कवर फोटो बना दी गई है।' : 'Set as main cover photo.'
    );
  };

  const handleUploadAndSave = async () => {
    if (photos.length === 0) {
      Alert.alert(
        isHindi ? 'फोटो चुनें' : 'Select Photo',
        isHindi ? 'कृपया पहले कम से कम एक फोटो जोड़ें।' : 'Please add at least one photo.'
      );
      return;
    }

    try {
      setUploading(true);
      await AsyncStorage.setItem(storageKey, JSON.stringify(photos));
      if (photos.length > 0) {
        await AsyncStorage.setItem(coverKey, photos[0]);
        if (villageName) {
          await AsyncStorage.setItem(singleKey, photos[0]);
        }
        // Sync with backend server
        try {
          await villageApi.updatePhoto(villageName || (isBdo ? 'Block' : isDm ? 'District' : 'Gram Panchayat'), photos[0]);
        } catch (serverErr) {
          console.log('Backend sync error:', serverErr);
        }
      }

      onPhotosUpdated(photos);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(eventName, { detail: photos[0] }));
        window.dispatchEvent(new CustomEvent('village_photo_changed', { detail: photos[0] }));
      }

      const successTitle = isHindi ? '✅ अपलोड सफल' : '✅ Upload Successful';
      const successMsg = isBdo
        ? (isHindi ? 'विकासखंड फोटो सफलतापूर्वक अपलोड और अपडेट हो गई हैं!' : 'Block showcase photos have been uploaded and updated successfully!')
        : isDm
        ? (isHindi ? 'जिला कलेक्ट्रेट फोटो सफलतापूर्वक अपलोड और अपडेट हो गई हैं!' : 'District showcase photos have been uploaded and updated successfully!')
        : (isHindi ? 'ग्राम पंचायत फोटो सफलतापूर्वक अपलोड और अपडेट हो गई हैं!' : 'Panchayat showcase photos have been uploaded and updated successfully!');

      Alert.alert(
        successTitle,
        successMsg,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (e) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', isHindi ? 'फोटो अपलोड नहीं हो सकी।' : 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const savePhotos = async (list: string[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(list));
      if (list.length > 0) {
        await AsyncStorage.setItem(coverKey, list[0]);
        if (villageName) {
          await AsyncStorage.setItem(singleKey, list[0]);
        }
      }
      onPhotosUpdated(list);
    } catch (e) {
      console.log('Error saving photo list:', e);
    }
  };

  const getAspectRatioStyle = () => {
    if (aspectRatio === '1:1') return { aspectRatio: 1 };
    if (aspectRatio === '4:3') return { aspectRatio: 4 / 3 };
    return { aspectRatio: 16 / 9 };
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* TOP HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {isBdo
                  ? (isHindi ? '📷 विकासखंड / उप-प्रभाग फोटो गैलरी' : '📷 Block / Sub-Division Photo Gallery')
                  : isDm
                  ? (isHindi ? '📷 जिला कलेक्ट्रेट फोटो गैलरी' : '📷 District Collectorate Photo Gallery')
                  : (isHindi ? '📷 ग्राम पंचायत फोटो गैलरी' : '📷 Panchayat Photo Gallery')}
              </Text>
              <Text style={styles.subTitle}>
                {isBdo
                  ? (isHindi
                      ? `${photos.length} फोटो जोड़ी गईं • विकासखंड कार्यालय`
                      : `${photos.length} photos added • Block Headquarters`)
                  : isDm
                  ? (isHindi
                      ? `${photos.length} फोटो जोड़ी गईं • जिला कलेक्ट्रेट व प्रशासनिक मुख्यालय`
                      : `${photos.length} photos added • District Administration`)
                  : (isHindi
                      ? `${photos.length} फोटो जोड़ी गईं • कम से कम 4 फोटो जोड़ सकते हैं`
                      : `${photos.length} photos added • Recommended at least 4 photos`)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.navy} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* ACTIVE PHOTO PREVIEW WITH CLEAN VIEW (NO TEXT ON IMAGE) */}
            <View style={styles.previewContainer}>
              {activePhoto ? (
                <View style={[styles.imageWrapper, getAspectRatioStyle()]}>
                  <Image
                    source={{ uri: activePhoto }}
                    style={[
                      styles.mainImage,
                      { transform: [{ rotate: `${rotation}deg` }] },
                    ]}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={[styles.placeholderBox, getAspectRatioStyle()]}>
                  <Ionicons name="images-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.placeholderText}>
                    {isBdo
                      ? (isHindi ? 'कोई फोटो अपलोड नहीं है (विकासखंड कार्यालय की फोटो जोड़ें)' : 'No photos uploaded (Add Block photos)')
                      : isDm
                      ? (isHindi ? 'कोई फोटो अपलोड नहीं है (जिला कलेक्ट्रेट की फोटो जोड़ें)' : 'No photos uploaded (Add District photos)')
                      : (isHindi ? 'कोई फोटो अपलोड नहीं है (कम से कम 4 जोड़ें)' : 'No photos uploaded (Add at least 4)')}
                  </Text>
                </View>
              )}
            </View>

            {/* QUICK ACTIONS TOOLBAR (ROTATE, CROP/ASPECT, SET AS COVER, DELETE) */}
            {activePhoto && (
              <View style={styles.toolsRow}>
                <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
                  <Ionicons name="refresh" size={18} color={COLORS.primary} />
                  <Text style={styles.toolBtnText}>
                    {isHindi ? 'घुमाएं (Rotate)' : 'Rotate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={() => {
                    const nextRatio = aspectRatio === '16:9' ? '4:3' : aspectRatio === '4:3' ? '1:1' : '16:9';
                    setAspectRatio(nextRatio);
                  }}
                >
                  <Ionicons name="crop" size={18} color={COLORS.primary} />
                  <Text style={styles.toolBtnText}>Crop: {aspectRatio}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toolBtn} onPress={handleSetAsCover}>
                  <Ionicons name="star" size={18} color={COLORS.saffron} />
                  <Text style={styles.toolBtnText}>
                    {isHindi ? 'कवर बनाएं' : 'Set Cover'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.toolBtn, { backgroundColor: '#FEE2E2' }]} onPress={handleDeleteActive}>
                  <Ionicons name="trash" size={18} color={COLORS.error} />
                  <Text style={[styles.toolBtnText, { color: COLORS.error }]}>
                    {isHindi ? 'हटाएं' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* THUMBNAIL STRIP */}
            <Text style={styles.sectionLabel}>
              {isHindi ? `अपलोड की गई फोटो (${photos.length} फोटो):` : `Uploaded Photos (${photos.length} photos):`}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
              {photos.map((uri, idx) => (
                <TouchableOpacity
                  key={`thumb-${idx}`}
                  style={[
                    styles.thumbWrap,
                    selectedIdx === idx && styles.thumbWrapSelected,
                  ]}
                  onPress={() => {
                    setSelectedIdx(idx);
                    setRotation(0);
                  }}
                >
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexBadgeText}>#{idx + 1}</Text>
                  </View>
                  {idx === 0 && (
                    <View style={styles.coverPill}>
                      <Text style={styles.coverPillText}>Cover</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {/* ADD MORE BUTTON */}
              <TouchableOpacity style={styles.addThumbBtn} onPress={handlePickPhotos}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
                <Text style={styles.addThumbText}>{isHindi ? '+ फोटो' : '+ Photo'}</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* BOTTOM PICK & UPLOAD ACTION BUTTONS */}
            <View style={styles.actionBtnRow}>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={handlePickPhotos}>
                <Ionicons name="images" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>
                  {isHindi ? 'गैलरी से फोटो चुनें' : 'Choose Photos'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleCaptureCamera}>
                <Ionicons name="camera" size={18} color={COLORS.primary} />
                <Text style={styles.secondaryActionBtnText}>
                  {isHindi ? 'कैमरा' : 'Camera'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* MAIN UPLOAD & SAVE BUTTON */}
            <TouchableOpacity
              style={styles.mainUploadBtn}
              onPress={handleUploadAndSave}
              disabled={uploading}
              activeOpacity={0.85}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
              )}
              <Text style={styles.mainUploadBtnText}>
                {uploading
                  ? (isHindi ? 'अपलोड हो रहा है...' : 'Uploading...')
                  : (isHindi ? '💾 फोटो अपलोड करें व सेव करें' : '💾 Upload & Save Photos')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
  },
  subTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  previewContainer: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageWrapper: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  badgeTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderBox: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  placeholderText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: 8,
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
  },
  thumbStrip: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  thumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  thumbWrapSelected: {
    borderColor: COLORS.primary,
    transform: [{ scale: 1.05 }],
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  indexBadge: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  indexBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  coverPill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.saffron,
    paddingVertical: 1,
    alignItems: 'center',
  },
  coverPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  addThumbBtn: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addThumbText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  mainUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
    ...SHADOWS.small,
  },
  mainUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
