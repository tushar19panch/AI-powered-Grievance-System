import React from 'react';
import { Stack } from 'expo-router';
import { LanguageProvider } from '../i18n/LanguageContext';
import { Platform, View, StyleSheet } from 'react-native';

export default function RootLayout() {
  const content = (
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
        <Stack.Screen name="complaint-details" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="admin-register" />
        <Stack.Screen name="admin-profile" />
        <Stack.Screen name="secretary" />
        <Stack.Screen name="secretary-register" />
      </Stack>
    </LanguageProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuterContainer}>
        <View style={styles.webPhoneFrame}>
          {/* Top Bezel Bar with Speaker / Camera */}
          <View style={styles.webTopBar}>
            <View style={styles.webSpeaker} />
            <View style={styles.webCamera} />
          </View>
          <View style={styles.webScreenContainer}>
            {content}
          </View>
        </View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webOuterContainer: {
    flex: 1,
    height: '100vh' as any,
    backgroundColor: '#0B0F19',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  webPhoneFrame: {
    width: '100%',
    maxWidth: 410,
    height: '96vh' as any,
    maxHeight: 860,
    backgroundColor: '#1E293B',
    borderRadius: 40,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'hidden',
  },
  webTopBar: {
    height: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  webSpeaker: {
    width: 44,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  webCamera: {
    width: 6,
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
  },
  webScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
  },
});