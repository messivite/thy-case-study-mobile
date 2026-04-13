import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { canDeliverPushNotifications } from '@/lib/notificationPermission';

/**
 * Sistem bildirim izni — MMKV/Redux yok, sadece native durum.
 */
export function useNotificationPermission(): {
  granted: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') {
      setGranted(false);
      setLoading(false);
      return;
    }
    try {
      const Notifications = await import('expo-notifications');
      const perm = await Notifications.getPermissionsAsync();
      setGranted(canDeliverPushNotifications(perm));
    } catch {
      setGranted(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { granted, loading, refresh };
}
