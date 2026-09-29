import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  // Brand Indian Tri-colors
  saffron: string;
  saffronDark: string;
  saffronLight: string;
  navy: string;
  navyLight: string;
  indiaGreen: string;
  indiaGreenLight: string;

  // Background & Surfaces
  background: string;
  surface: string;
  card: string;
  cardElevated: string;
  glass: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textWhite: string;

  // Borders & Dividers
  border: string;
  borderLight: string;
  divider: string;

  // Status Colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;
}

export const LIGHT_THEME: ThemeColors = {
  saffron: '#FF9933',
  saffronDark: '#E67E17',
  saffronLight: '#FFF4E6',
  navy: '#000080',
  navyLight: '#EBF2FE',
  indiaGreen: '#138808',
  indiaGreenLight: '#EAF8EA',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.85)',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  textWhite: '#FFFFFF',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#CBD5E1',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#EFF6FF',
};

export const DARK_THEME: ThemeColors = {
  saffron: '#FFA726',
  saffronDark: '#FF9933',
  saffronLight: '#2D1B06',
  navy: '#38BDF8',
  navyLight: '#0F2A4A',
  indiaGreen: '#22C55E',
  indiaGreenLight: '#0A2E16',

  background: '#0B0F19',
  surface: '#131B2E',
  card: '#1E293B',
  cardElevated: '#243248',
  glass: 'rgba(19, 27, 46, 0.85)',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0F19',
  textWhite: '#FFFFFF',

  border: '#2A374D',
  borderLight: '#1E293B',
  divider: '#334155',

  success: '#22C55E',
  successLight: '#064E3B',
  warning: '#F59E0B',
  warningLight: '#451A03',
  error: '#EF4444',
  errorLight: '#450A0A',
  info: '#38BDF8',
  infoLight: '#082F49',
};

interface ThemeContextType {
  isDark: boolean;
  theme: 'light' | 'dark';
  colors: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  theme: 'light',
  colors: LIGHT_THEME,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

const THEME_STORAGE_KEY = '@village_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        setIsDark(saved === 'dark');
      } else if (systemScheme === 'dark') {
        setIsDark(true);
      }
    } catch {
      // Default to light
    }
  };

  const toggleTheme = async () => {
    const nextVal = !isDark;
    setIsDark(nextVal);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextVal ? 'dark' : 'light');
    } catch {}
  };

  const setThemeMode = async (mode: 'light' | 'dark') => {
    const darkVal = mode === 'dark';
    setIsDark(darkVal);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  };

  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        theme: isDark ? 'dark' : 'light',
        colors,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
