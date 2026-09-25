import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Default backend API URL
// For Android emulator: http://10.0.2.2:8080
// For Web / iOS Simulator: http://localhost:8080
// For Physical phone with Expo Go: Change this to your laptop's WiFi IP (e.g., http://192.168.1.X:8080)
import Constants from 'expo-constants';

function getDefaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, '');
  }
  if (Platform.OS === 'web') {
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

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }
  return 'http://localhost:8080';
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

export async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export async function removeAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
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
      15000
    )
  );

  return await Promise.race([fetchPromise, timeoutPromise]);
}

// -------------------------------------------------------------
// Authentication APIs
// -------------------------------------------------------------
export interface LoginPayload {
  mobileNumber: string;
  password: string;
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
  villageName?: string;
  wardNumber?: string;
  officialId?: string;
  adminId?: string;
  secretaryId?: string;
  villageId?: number;
  wardId?: number;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponseData> => {
    const res = await request<LoginResponseData>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.token) {
      await setAuthToken(res.token);
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res));
    }
    return res;
  },

  register: async (payload: RegisterPayload): Promise<any> => {
    return await request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(payload),
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
    try {
      const sessionData = await AsyncStorage.getItem('@village_user_session');
      const fallbackSession = await AsyncStorage.getItem('user_session');
      const session = sessionData ? JSON.parse(sessionData) : (fallbackSession ? JSON.parse(fallbackSession) : null);
      const isOfficial = session?.role && session.role !== 'CITIZEN';

      if (isOfficial) {
        return await request<ComplaintData>(`/api/sarpanch/complaints/${id}`, {
          method: 'GET',
        });
      }
    } catch {
      // fallback to citizen endpoint
    }

    try {
      return await request<ComplaintData>(`/api/citizen/complaints/${id}`, {
        method: 'GET',
      });
    } catch {
      return await request<ComplaintData>(`/api/sarpanch/complaints/${id}`, {
        method: 'GET',
      });
    }
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
};
