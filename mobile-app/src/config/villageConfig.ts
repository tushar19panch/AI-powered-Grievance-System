import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocationConfig = {
  name: string;
  type: 'Gram Panchayat' | 'Village' | 'Panchayat';
  imageUri: string | null;
};

const STORAGE_KEY = '@village_app_location_config';

export const DEFAULT_LOCATION: LocationConfig = {
  name: 'Your Village',
  type: 'Village',
  imageUri: null,
};

export async function getLocationConfig(): Promise<LocationConfig> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return DEFAULT_LOCATION;
    }

    return {
      ...DEFAULT_LOCATION,
      ...JSON.parse(saved),
    };
  } catch (error) {
    console.log('Location config load error:', error);
    return DEFAULT_LOCATION;
  }
}

export async function saveLocationConfig(
  config: LocationConfig
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(config)
  );
}

export async function clearLocationConfig(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}