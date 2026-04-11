import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostNavigationEnterFade } from '@/components/PostNavigationEnterFade';
import { TabBarItem } from '@/molecules/TabBarItem';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAppDispatch } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { setProfile, setProfileError } from '@/store/slices/profileSlice';
import { getMe } from '@/api/user.api';

function MeBootstrap() {
  const dispatch = useAppDispatch();
  const { status } = useAuth();

  useEffect(() => {
    if (status !== 'authenticated') return;

    getMe()
      .then((data) => dispatch(setProfile(data)))
      .catch(() => dispatch(setProfileError()));
  }, [status, dispatch]);

  return null;
}

export default function TabLayout() {
  return (
    <PostNavigationEnterFade>
      <MeBootstrap />
      {/* En basit yol: web'de push tarafını tamamen devre dışı bırak. */}
      {Platform.OS !== 'web' ? <NativePushNotificationsBootstrap /> : null}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' }, // Tab bar gizli
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="settings" />
      </Tabs>
    </PostNavigationEnterFade>
  );
}

function NativePushNotificationsBootstrap() {
  usePushNotifications();
  return null;
}

const styles = StyleSheet.create({
  host: {
    backgroundColor: 'transparent',
    width: '100%',
  },
  surface: {
    overflow: 'hidden',
    minHeight: 64,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
    zIndex: 1,
  },
});
