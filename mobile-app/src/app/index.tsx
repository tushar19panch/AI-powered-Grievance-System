import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const [route, setRoute] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('user_session');

      if (sessionData) {
        const session = JSON.parse(sessionData);

        if (session?.isLoggedIn === true) {
          const r = String(session?.role || '').toLowerCase();
          if (r === 'citizen') {
            setRoute('/citizen-dashboard');
            return;
          } else if (r === 'sarpanch' || r === 'admin') {
            setRoute('/admin');
            return;
          } else if (r === 'secretary') {
            setRoute('/secretary');
            return;
          }
        }
      }

      // Login nahi hai → Welcome Page
      setRoute('/(tabs)');
    } catch (error) {
      console.log('Session check error:', error);
      setRoute('/(tabs)');
    }
  };

  if (!route) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F7F8FA',
        }}
      >
        <ActivityIndicator size="large" color="#000080" />
      </View>
    );
  }

  return <Redirect href={route as any} />;
}