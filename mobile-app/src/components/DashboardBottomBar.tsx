import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface DashboardBottomBarProps {
  activeTab?: 'home' | 'notices' | 'profile';
  role?: 'citizen' | 'sarpanch' | 'secretary' | 'admin' | 'bdo' | 'dm';
  isHindi?: boolean;
}

export function DashboardBottomBar({
  activeTab = 'home',
  role = 'citizen',
  isHindi = true,
}: DashboardBottomBarProps) {
  const router = useRouter();

  const openHome = () => {
    if (activeTab === 'home') return;
    if (role === 'bdo') {
      router.replace('/bdo-dashboard' as any);
    } else if (role === 'dm') {
      router.replace('/dm-dashboard' as any);
    } else if (role === 'sarpanch' || role === 'admin') {
      router.replace('/admin');
    } else if (role === 'secretary') {
      router.replace('/secretary');
    } else {
      router.replace('/citizen-dashboard');
    }
  };

  const openNotices = () => {
    router.push('/notifications');
  };

  const openProfile = () => {
    if (role === 'sarpanch' || role === 'secretary' || role === 'admin' || role === 'bdo' || role === 'dm') {
      router.push('/admin-profile');
    } else {
      router.push('/profile');
    }
  };

  return (
    <View style={styles.container}>
      {/* TRICOLOR TOP HAIRLINE */}
      <View style={styles.tricolorLine}>
        <View style={styles.saffron} />
        <View style={styles.white} />
        <View style={styles.green} />
      </View>

      <View style={styles.bar}>
        {/* 1. HOME TAB */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'home' && styles.activeTabButton]}
          onPress={openHome}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.iconWrapper,
              activeTab === 'home' && styles.activeIconWrapper,
            ]}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={22}
              color={activeTab === 'home' ? COLORS.white : COLORS.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.activeTabLabel,
            ]}
          >
            {isHindi ? 'होम' : 'Home'}
          </Text>
        </TouchableOpacity>

        {/* 2. NOTICES TAB */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'notices' && styles.activeTabButton,
          ]}
          onPress={openNotices}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.iconWrapper,
              activeTab === 'notices' && styles.activeIconWrapper,
            ]}
          >
            <Ionicons
              name={activeTab === 'notices' ? 'notifications' : 'notifications-outline'}
              size={22}
              color={activeTab === 'notices' ? COLORS.white : COLORS.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'notices' && styles.activeTabLabel,
            ]}
          >
            {isHindi ? 'सूचनाएं' : 'Notices'}
          </Text>
        </TouchableOpacity>

        {/* 3. PROFILE TAB */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'profile' && styles.activeTabButton,
          ]}
          onPress={openProfile}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.iconWrapper,
              activeTab === 'profile' && styles.activeIconWrapper,
            ]}
          >
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={22}
              color={activeTab === 'profile' ? COLORS.white : COLORS.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'profile' && styles.activeTabLabel,
            ]}
          >
            {isHindi ? 'प्रोफाइल' : 'Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...SHADOWS.large,
  },
  tricolorLine: {
    flexDirection: 'row',
    height: 3,
  },
  saffron: {
    flex: 1,
    backgroundColor: '#FF9933',
  },
  white: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  green: {
    flex: 1,
    backgroundColor: '#138808',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  activeTabButton: {},
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activeIconWrapper: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  activeTabLabel: {
    color: COLORS.primary,
    fontWeight: '800',
  },
});
