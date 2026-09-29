import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Default backend API URL
// For Android emulator: http://10.0.2.2:8080
// For Web / iOS Simulator: http://localhost:8080
// For Physical phone with Expo Go: Change this to your laptop's WiFi IP (e.g., http://192.168.1.X:8080)
import Constants from 'expo-constants';

function getDefaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim().length > 0) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      return `http://${window.location.hostname}:8080`;
    }
    return 'http://localhost:8080';
  }
  // Try to get host machine IP from Expo debugger/host URI when running on physical phone
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8080`;
    }
  }

  // Physical Android/iOS devices on local Wi-Fi LAN
  return 'http://192.168.31.144:8080';
}

export const DEFAULT_API_URL = getDefaultApiUrl();

const API_STORAGE_KEY = '@village_api_base_url';
const TOKEN_STORAGE_KEY = '@village_jwt_token';
const USER_STORAGE_KEY = '@village_user_session';

export async function getApiBaseUrl(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_STORAGE_KEY);
    return saved || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_STORAGE_KEY, url.trim().replace(/\/+$/, ''));
}

export function resolvePhotoUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  const trimmed = String(photo).trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '""') return null;

  // 1. Direct standard data / file / blob URIs
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('content:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // 2. Full HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 3. Raw Base64 image payload (any long data string > 100 chars)
  if (trimmed.length > 100) {
    if (trimmed.startsWith('iVBORw0KGgo') || trimmed.startsWith('iVBOR')) {
      return `data:image/png;base64,${trimmed}`;
    }
    if (trimmed.startsWith('R0lGOD')) {
      return `data:image/gif;base64,${trimmed}`;
    }
    if (trimmed.startsWith('UklGR')) {
      return `data:image/webp;base64,${trimmed}`;
    }
    return `data:image/jpeg;base64,${trimmed}`;
  }

  // 4. Short raw base64 signatures
  if (trimmed.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${trimmed}`;
  }

  // 5. Server relative URLs (/uploads/..., uploads/...)
  const baseUrl = DEFAULT_API_URL.replace(/\/+$/, '');
  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }

  return `${baseUrl}/${trimmed}`;
}

export function isValidJwt(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.startsWith('session_') || trimmed.startsWith('mock_') || trimmed.startsWith('OFFLINE_')) return false;
  const parts = trimmed.split('.');
  if (parts.length !== 3) return false;
  return parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    let token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (isValidJwt(token)) return token!.trim();

    token = await AsyncStorage.getItem('token');
    if (isValidJwt(token)) return token!.trim();

    const villageSession = await AsyncStorage.getItem('@village_user_session');
    if (villageSession) {
      const parsed = JSON.parse(villageSession);
      if (isValidJwt(parsed?.token)) {
        return parsed.token.trim();
      }
    }

    const userSession = await AsyncStorage.getItem('user_session');
    if (userSession) {
      const parsed = JSON.parse(userSession);
      if (isValidJwt(parsed?.token)) {
        return parsed.token.trim();
      }
    }

    const citizen = await AsyncStorage.getItem('citizen');
    if (citizen) {
      const parsed = JSON.parse(citizen);
      if (isValidJwt(parsed?.token)) {
        return parsed.token.trim();
      }
    }

    const admin = await AsyncStorage.getItem('admin');
    if (admin) {
      const parsed = JSON.parse(admin);
      if (isValidJwt(parsed?.token)) {
        return parsed.token.trim();
      }
    }

    const secretary = await AsyncStorage.getItem('secretary');
    if (secretary) {
      const parsed = JSON.parse(secretary);
      if (isValidJwt(parsed?.token)) {
        return parsed.token.trim();
      }
    }
  } catch (err) {
    console.log('Error reading auth token:', err);
  }
  return null;
}

export async function setAuthToken(token: string): Promise<void> {
  const clean = token ? token.trim() : '';
  if (isValidJwt(clean)) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, clean);
    await AsyncStorage.setItem('token', clean);
  }
}

export async function removeAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
  await AsyncStorage.removeItem('user_session');
}

// -------------------------------------------------------------
// Generic HTTP Request Handler
// -------------------------------------------------------------
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint}`;

  const fetchPromise = (async () => {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        (typeof data === 'object' && data?.message) ||
        (typeof data === 'string' && data) ||
        `HTTP Error ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  })();

  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            'Request timed out. Please check if your backend server is running and reachable.'
          )
        ),
      30000
    )
  );

  return await Promise.race([fetchPromise, timeoutPromise]);
}

// -------------------------------------------------------------
// Authentication APIs
// -------------------------------------------------------------
export interface LoginPayload {
  mobileNumber?: string;
  identifier?: string;
  password: string;
  role?: 'CITIZEN' | 'SARPANCH' | 'SECRETARY';
}

export interface LoginResponseData {
  token: string;
  userId: number;
  name: string;
  mobileNumber: string;
  role: 'CITIZEN' | 'SARPANCH' | 'SECRETARY';
  villageName?: string;
  wardNumber?: string;
}

export interface RegisterPayload {
  name: string;
  mobileNumber: string;
  password: string;
  role: 'CITIZEN' | 'SARPANCH' | 'SECRETARY';
  state?: string;
  district?: string;
  block?: string;
  village?: string;
  ward?: string;
  villageName?: string;
  wardNumber?: string;
  officialId?: string;
  adminId?: string;
  secretaryId?: string;
  villageId?: number;
  wardId?: number;
}

export interface ResetPasswordPayload {
  identifier: string;
  newPassword: string;
  otp?: string;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponseData> => {
    const cleanId = (payload.mobileNumber || payload.identifier || '').trim();
    const res = await request<LoginResponseData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        mobileNumber: cleanId,
        identifier: cleanId,
      }),
    });
    if (res?.token && isValidJwt(res.token)) {
      await setAuthToken(res.token);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res));
    }
    return res;
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<{ success: boolean; message: string }> => {
    return await request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  register: async (payload: RegisterPayload): Promise<any> => {
    return await request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getVillageOfficials: async (villageName?: string, villageId?: number): Promise<any> => {
    let query = '';
    if (villageName) {
      query = `?villageName=${encodeURIComponent(villageName)}`;
    } else if (villageId) {
      query = `?villageId=${villageId}`;
    }
    return await request(`/api/users/officials${query}`, {
      method: 'GET',
    });
  },

  logout: async (): Promise<void> => {
    await removeAuthToken();
  },
};

// -------------------------------------------------------------
// Complaint APIs
// -------------------------------------------------------------
export interface ComplaintPayload {
  problemType: string;
  category?: string;
  priority?: string;
  department?: string;
  deadline?: string;
  photo?: string;
  audioUrl?: string;
  latitude?: number;
  longitude?: number;
  location: string;
  description: string;
}

export interface ComplaintData {
  id: number;
  problemType: string;
  category?: string;
  priority?: string;
  department?: string;
  deadline?: string;
  photo?: string;
  audioUrl?: string;
  latitude?: number;
  longitude?: number;
  villageName?: string;
  wardNumber?: string;
  location: string;
  description: string;
  status:
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'ACTION_TAKEN'
    | 'IN_PROGRESS'
    | 'RESOLVED'
    | 'VERIFICATION'
    | 'CLOSED'
    | 'REOPENED'
    | 'OVERDUE'
    | 'ESCALATED';
  createdAt: string;
  updatedAt?: string;
}

export const complaintApi = {
  createComplaint: async (
    payload: ComplaintPayload
  ): Promise<ComplaintData> => {
    return await request<ComplaintData>('/api/citizen/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCitizenComplaints: async (): Promise<ComplaintData[]> => {
    return await request<ComplaintData[]>('/api/citizen/complaints', {
      method: 'GET',
    });
  },

  getSingleComplaint: async (id: number): Promise<ComplaintData> => {
    let isOfficial = false;
    try {
      const sessionData = await AsyncStorage.getItem('@village_user_session');
      const fallbackSession = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : (fallbackSession ? JSON.parse(fallbackSession) : null);
      const role = String(session?.role || '').toUpperCase();
      isOfficial = role === 'SARPANCH' || role === 'SECRETARY' || role === 'ADMIN' || role === 'SUPER_ADMIN';
    } catch {
      // default to citizen
    }

    const endpoint = isOfficial
      ? `/api/sarpanch/complaints/${id}`
      : `/api/citizen/complaints/${id}`;

    return await request<ComplaintData>(endpoint, { method: 'GET' });
  },

  getSarpanchComplaints: async (): Promise<ComplaintData[]> => {
    return await request<ComplaintData[]>('/api/sarpanch/complaints', {
      method: 'GET',
    });
  },

  updateStatus: async (
    complaintId: number,
    status: string,
    remarks?: string
  ): Promise<ComplaintData> => {
    try {
      const sessionData = await AsyncStorage.getItem('@village_user_session');
      const fallbackSession = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : (fallbackSession ? JSON.parse(fallbackSession) : null);
      const isCitizen = session?.role === 'CITIZEN' || session?.role === 'citizen';

      if (isCitizen) {
        if (status === 'REOPENED') {
          return await request<ComplaintData>(`/api/citizen/complaints/${complaintId}/reopen`, {
            method: 'PUT',
          });
        }
        if (status === 'VERIFICATION') {
          return await request<ComplaintData>(`/api/citizen/complaints/${complaintId}/verify`, {
            method: 'PUT',
          });
        }
        if (status === 'CLOSED') {
          return await request<ComplaintData>(`/api/citizen/complaints/${complaintId}/close`, {
            method: 'PUT',
          });
        }
      }
    } catch (err) {
      console.log('Error checking citizen specific status endpoint:', err);
    }

    return await request<ComplaintData>(
      `/api/sarpanch/complaints/${complaintId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, remarks }),
      }
    );
  },
};

// -------------------------------------------------------------
// Village & Ward APIs
// -------------------------------------------------------------
export interface VillageData {
  id: number;
  name: string;
  district?: string;
  state?: string;
}

export interface WardData {
  id: number;
  wardNumber: string;
  villageId: number;
}

export const villageApi = {
  getVillages: async (): Promise<VillageData[]> => {
    return await request<VillageData[]>('/api/villages', {
      method: 'GET',
    });
  },

  getWards: async (villageId: number): Promise<WardData[]> => {
    return await request<WardData[]>(`/api/wards?villageId=${villageId}`, {
      method: 'GET',
    });
  },

  getPhoto: async (villageName?: string): Promise<{ photoUrl?: string }> => {
    try {
      const query = villageName ? `?village=${encodeURIComponent(villageName)}` : '';
      return await request<{ photoUrl?: string }>(`/api/villages/photo${query}`, {
        method: 'GET',
      });
    } catch {
      return { photoUrl: '' };
    }
  },

  updatePhoto: async (villageName: string, photoUrl: string | null): Promise<any> => {
    try {
      return await request('/api/villages/photo', {
        method: 'POST',
        body: JSON.stringify({ village: villageName, photoUrl: photoUrl || '' }),
      });
    } catch (e) {
      console.log('Error updating village photo on backend:', e);
      return null;
    }
  },

  getOfficials: async (
    villageName?: string
  ): Promise<{
    sarpanch?: { name?: string; mobile?: string; village?: string } | null;
    secretary?: { name?: string; mobile?: string; village?: string } | null;
  }> => {
    try {
      const query = villageName ? `?village=${encodeURIComponent(villageName)}` : '';
      return await request<{
        sarpanch?: { name?: string; mobile?: string; village?: string } | null;
        secretary?: { name?: string; mobile?: string; village?: string } | null;
      }>(`/api/villages/officials${query}`, {
        method: 'GET',
      });
    } catch (err) {
      console.log('Error fetching village officials from backend:', err);
      return { sarpanch: null, secretary: null };
    }
  },
};

// -------------------------------------------------------------
// Notification APIs
// -------------------------------------------------------------
export interface NotificationData {
  id: number;
  message: string;
  read: boolean;
  createdAt: string;
  complaintId?: number | string | null;
}

export const notificationApi = {
  getNotifications: async (): Promise<NotificationData[]> => {
    return await request<NotificationData[]>('/api/notifications', {
      method: 'GET',
    });
  },

  markAsRead: async (notificationId: number): Promise<string> => {
    return await request<string>(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },
};




