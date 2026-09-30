import React from 'react';
import { Stack } from 'expo-router';
import { LanguageProvider } from '../i18n/LanguageContext';
import { ThemeProvider } from '../theme/ThemeContext';
import { Platform, View, StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Stack
          initialRouteName="(tabs)"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="role-selection" />
          <Stack.Screen name="login" />
          <Stack.Screen name="report" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="register" />
          <Stack.Screen name="citizen-dashboard" />
          <Stack.Screen name="complaint-details" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="help-line" />
          <Stack.Screen name="audit-report" />
          <Stack.Screen name="ward-scorecard" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="admin-register" />
          <Stack.Screen name="admin-profile" />
          <Stack.Screen name="secretary" />
          <Stack.Screen name="secretary-register" />
        </Stack>
      </LanguageProvider>
    </ThemeProvider>
  );
}