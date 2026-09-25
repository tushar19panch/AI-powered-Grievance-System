import AsyncStorage from '@react-native-async-storage/async-storage';
import { complaintApi, ComplaintPayload, ComplaintData } from './api';

export interface OfflineComplaint {
  id: string; // Temporary local ID, e.g. "OFFLINE_1727300000000"
  payload: ComplaintPayload;
  citizenName?: string;
  ward?: string;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const OFFLINE_QUEUE_STORAGE_KEY = '@village_offline_complaints_queue';

/**
 * Get list of complaints waiting in the offline queue
 */
export async function getOfflineQueue(): Promise<OfflineComplaint[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.log('Error reading offline complaints queue:', err);
    return [];
  }
}

/**
 * Get count of pending offline complaints
 */
export async function getPendingOfflineCount(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.length;
}

/**
 * Save a complaint to the offline queue when network fails
 */
export async function queueOfflineComplaint(
  payload: ComplaintPayload,
  extra?: { citizenName?: string; ward?: string }
): Promise<OfflineComplaint> {
  const queue = await getOfflineQueue();

  const newOfflineItem: OfflineComplaint = {
    id: `OFFLINE_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    payload,
    citizenName: extra?.citizenName,
    ward: extra?.ward,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const updatedQueue = [newOfflineItem, ...queue];
  await AsyncStorage.setItem(
    OFFLINE_QUEUE_STORAGE_KEY,
    JSON.stringify(updatedQueue)
  );

  return newOfflineItem;
}

/**
 * Remove a complaint from the offline queue (e.g. once synced or discarded)
 */
export async function removeOfflineComplaint(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await AsyncStorage.setItem(
    OFFLINE_QUEUE_STORAGE_KEY,
    JSON.stringify(filtered)
  );
}

/**
 * Clear all offline complaints
 */
export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
}

export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  syncedIds: string[];
}

/**
 * Synchronize all pending offline complaints with the backend server
 */
export async function syncOfflineComplaints(): Promise<SyncResult> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { total: 0, synced: 0, failed: 0, syncedIds: [] };
  }

  let synced = 0;
  let failed = 0;
  const syncedIds: string[] = [];
  const remainingQueue: OfflineComplaint[] = [];

  for (const item of queue) {
    try {
      const created = await complaintApi.createComplaint(item.payload);
      if (created && (created.id || (created as any).complaintNumber)) {
        synced++;
        syncedIds.push(item.id);
      } else {
        item.retryCount = (item.retryCount || 0) + 1;
        remainingQueue.push(item);
        failed++;
      }
    } catch (err: any) {
      console.log(`Failed to sync offline complaint ${item.id}:`, err);
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastError = err?.message || 'Network error';
      remainingQueue.push(item);
      failed++;
    }
  }

  // Update storage with items that failed
  await AsyncStorage.setItem(
    OFFLINE_QUEUE_STORAGE_KEY,
    JSON.stringify(remainingQueue)
  );

  return {
    total: queue.length,
    synced,
    failed,
    syncedIds,
  };
}
