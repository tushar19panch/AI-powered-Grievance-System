import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS, SHADOWS } from '../theme';

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
  const scrollRef = useRef<ScrollView>(null);

  if (!visible) return null;

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
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
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.overlay}>
        {/* TOP BAR */}
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
              <Text style={styles.userRole}>
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

        {/* IMAGE CONTAINER WITH PINCH / SCROLL ZOOM */}
        <View style={styles.imageWrapper}>
          {imageUri ? (
            <View style={styles.zoomContainer}>
              <ScrollView
                ref={scrollRef}
                maximumZoomScale={4}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent={true}
                contentContainerStyle={styles.scrollContent}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={[
                    styles.fullImage,
                    { transform: [{ scale: zoomLevel }] },
                  ]}
                  resizeMode="contain"
                />
              </ScrollView>

              {/* QUICK ZOOM CONTROLS */}
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
              <Ionicons name="person" size={100} color="#888888" />
              <Text style={styles.placeholderText}>
                {isHindi ? 'कोई प्रोफाइल फोटो उपलब्ध नहीं है' : 'No profile photo available'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 15,
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
    color: '#CCCCCC',
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: width * 0.92,
    height: height * 0.58,
    borderRadius: RADIUS.lg,
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 24,
    padding: 4,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 10,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  placeholderText: {
    color: '#AAAAAA',
    fontSize: TYPOGRAPHY.medium,
    marginTop: 15,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
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
