import React from 'react';
import { useRouter } from 'expo-router';
import { GramMitraModal } from '../components/GramMitraModal';

export default function ChatScreen() {
  const router = useRouter();

  return (
    <GramMitraModal
      visible={true}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/citizen-dashboard');
        }
      }}
    />
  );
}
