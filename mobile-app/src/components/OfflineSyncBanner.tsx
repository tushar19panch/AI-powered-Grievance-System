import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getPendingOfflineCount,
  syncOfflineComplaints,
} from '../services/offlineSyncService';

interface OfflineSyncBannerProps {
  isHindi?: boolean;
  onSyncComplete?: () => void;
}

export function OfflineSyncBanner({
  isHindi = true,
  onSyncComplete,
}: OfflineSyncBannerProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkPending = useCallback(async () => {
    try {
      const count = await getPendingOfflineCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    checkPending();
    // Periodically re-check for pending offline complaints every 10 seconds
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, [checkPending]);

  const handleSyncNow = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      const res = await syncOfflineComplaints();
      await checkPending();

      if (res.synced > 0) {
        Alert.alert(
          isHindi ? '✅ डेटा सिंक सफल' : '✅ Sync Completed',
          isHindi
            ? `${res.synced} ऑफलाइन शिकायतें सर्वर पर सफलतापूर्वक अपलोड हो गई हैं।`
            : `${res.synced} offline complaints were uploaded to server successfully.`
        );
        if (onSyncComplete) onSyncComplete();
      } else if (res.failed > 0) {
        Alert.alert(
          isHindi ? 'नेटवर्क समस्या' : 'Sync Issue',
          isHindi
            ? 'सर्वर से कनेक्ट नहीं हो सका। इंटरनेट मिलने पर पुनः प्रयास करें।'
            : 'Could not connect to server. Please check internet connection and try again.'
        );
      }
    } catch (err: any) {
      console.log('Manual sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="cloud-offline-outline" size={18} color="#D88A25" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {isHindi
              ? `${pendingCount} शिकायत ऑफलाइन सुरक्षित`
              : `${pendingCount} Offline Complaints Queued`}
          </Text>
          <Text style={styles.subtitle}>
            {isHindi
              ? 'इंटरनेट मिलते ही सिंक हो जाएगी'
              : 'Will auto-upload once connected'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.syncButton}
        onPress={handleSyncNow}
        disabled={syncing}
        activeOpacity={0.8}
      >
        {syncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="sync-outline" size={14} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>
              {isHindi ? 'सिंक करें' : 'Sync'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#FCE4C3',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#D88A25',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFEEDB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8A5300',
  },
  subtitle: {
    fontSize: 10,
    color: '#A06E22',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#D88A25',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
