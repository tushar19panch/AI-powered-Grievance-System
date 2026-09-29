import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SHADOWS } from '../theme';
import { resolvePhotoUrl } from '../services/api';

interface PhotoPreviewModalProps {
  visible: boolean;
  imageUri?: string | null;
  userName?: string;
  userRole?: string;
  onClose: () => void;
  onChangePhoto?: () => void;
  isHindi?: boolean;
}

const { width, height } = Dimensions.get('window');

export function PhotoPreviewModal({
  visible,
  imageUri,
  userName = 'User',
  userRole,
  onClose,
  onChangePhoto,
  isHindi = true,
}: PhotoPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageLoading, setImageLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const resolvedUri = imageUri ? resolvePhotoUrl(imageUri) : null;

  useEffect(() => {
    if (visible) {
      setZoomLevel(1);
      setImageLoading(true);
      setHasError(false);
    }
  }, [visible, imageUri]);

  if (!visible) return null;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <View style={styles.overlay}>
        {/* TOP HEADER BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              handleResetZoom();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            {userRole ? (
              <Text style={styles.userRole} numberOfLines={1}>
                {userRole}
              </Text>
            ) : null}
          </View>

          {onChangePhoto ? (
            <TouchableOpacity
              style={styles.changeButton}
              onPress={() => {
                handleResetZoom();
                onClose();
                onChangePhoto();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 42 }} />
          )}
        </View>

        {/* IMAGE VIEW CONTAINER */}
        <View style={styles.imageWrapper}>
          {resolvedUri && !hasError ? (
            <View style={styles.zoomContainer}>
              {imageLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF9933" />
                  <Text style={styles.loadingText}>
                    {isHindi ? 'फोटो लोड हो रही है...' : 'Loading photo...'}
                  </Text>
                </View>
              )}

              <ScrollView
                ref={scrollRef}
                maximumZoomScale={4}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <Image
                  source={{ uri: resolvedUri }}
                  style={[
                    styles.fullImage,
                    { transform: [{ scale: zoomLevel }] },
                  ]}
                  resizeMode="contain"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setHasError(false);
                  }}
                  onLoadEnd={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setHasError(true);
                  }}
                />
              </ScrollView>

              {/* FLOATING ZOOM CONTROLS */}
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={handleZoomIn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                {zoomLevel > 1 && (
                  <TouchableOpacity
                    style={[styles.zoomButton, styles.zoomResetBtn]}
                    onPress={handleResetZoom}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.zoomResetText}>{Math.round(zoomLevel * 100)}%</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.zoomButton, zoomLevel <= 1 && styles.zoomButtonDisabled]}
                  onPress={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderIconCircle}>
                <Ionicons name={hasError ? "alert-circle-outline" : "image-outline"} size={52} color="#FF9933" />
              </View>
              <Text style={styles.placeholderTitle}>
                {hasError
                  ? (isHindi ? 'फोटो लोड नहीं हो सकी' : 'Unable to load photo')
                  : (isHindi ? 'कोई फोटो उपलब्ध नहीं है' : 'No photo available')}
              </Text>
              <Text style={styles.placeholderSub}>
                {hasError
                  ? (isHindi ? 'फ़ाइल प्रारूप या नेटवर्क में समस्या हो सकती है।' : 'The file format or network connection could not load the image.')
                  : (isHindi ? 'इस रिकॉर्ड के साथ कोई फोटो संलग्न नहीं की गई है।' : 'No image was attached with this report.')}
              </Text>
            </View>
          )}
        </View>

        {/* BOTTOM ACTION BAR */}
        <View style={styles.bottomBar}>
          {onChangePhoto ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                handleResetZoom();
                onClose();
                onChangePhoto();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="image-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>
                {isHindi ? 'फोटो बदलें / अपलोड करें' : 'Change Profile Photo'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                handleResetZoom();
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>
                {isHindi ? 'बंद करें' : 'Close'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.large,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#94A3B8',
    fontSize: TYPOGRAPHY.xs,
    marginTop: 2,
  },
  changeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  zoomContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '100%',
    minHeight: '100%',
  },
  fullImage: {
    width: width * 0.94,
    height: height * 0.65,
    borderRadius: RADIUS.md,
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 24,
    padding: 6,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...SHADOWS.medium,
  },
  zoomButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    backgroundColor: '#FF9933',
    width: 44,
    height: 26,
    borderRadius: 13,
  },
  zoomResetText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    maxWidth: 340,
  },
  placeholderIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 153, 51, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.large,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSub: {
    color: '#94A3B8',
    fontSize: TYPOGRAPHY.small,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionBtn: {
    backgroundColor: '#FF9933',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    ...SHADOWS.small,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.medium,
    fontWeight: 'bold',
  },
});

export default PhotoPreviewModal;
