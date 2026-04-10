/**
 * Tab (home) mount + app foreground: izin varsa push token’ı API’ye bir kez kaydet (process içi tekrar yok).
 * Tercih / MMKV yok; izin durumu native + ayarlar ekranı.
 */

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from '@/api/notification.api';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import { canDeliverPushNotifications } from '@/lib/notificationPermission';

const ANDROID_DEFAULT_CHANNEL_ID = 'default';

/** Aynı token+dil için tekrar POST atma (bellekte; cold start’ta bir kez daha gidebilir, backend idempotent olabilir). */
let lastRegisteredFingerprint: string | null = null;

function resolveExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function ensureAndroidDefaultChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await import('expo-notifications');
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export function usePushNotifications(): void {
  useEffect(() => {
    if (Platform.OS === 'web' || !Device.isDevice) return;

    let cancelled = false;
    const subs: Array<{ remove: () => void }> = [];

    const cleanupListeners = () => {
      subs.forEach((s) => s.remove());
      subs.length = 0;
    };

    const sync = async () => {
      const Notifications = await import('expo-notifications');
      try {
        await ensureAndroidDefaultChannel();
      } catch {
        // devam
      }

      let perm = await Notifications.getPermissionsAsync();
      if (!canDeliverPushNotifications(perm)) {
        perm = await Notifications.requestPermissionsAsync();
      }

      if (cancelled || !canDeliverPushNotifications(perm)) {
        cleanupListeners();
        return;
      }

      const projectId = resolveExpoProjectId();
      let expoToken: string;
      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync(
          projectId != null && projectId !== '' ? { projectId } : undefined,
        );
        expoToken = tokenResult.data;
      } catch {
        cleanupListeners();
        return;
      }

      if (cancelled || !expoToken) {
        cleanupListeners();
        return;
      }

      const lang =
        (mmkvStorage.getString(STORAGE_KEYS.LANGUAGE) as 'tr' | 'en' | undefined) ?? 'tr';
      const fingerprint = `${expoToken}|${lang}`;

      if (lastRegisteredFingerprint !== fingerprint) {
        try {
          await registerPushToken({ push_token: expoToken, language: lang });
          lastRegisteredFingerprint = fingerprint;
        } catch {
          // ağ hatası — sonraki foreground’da tekrar
        }
      }

      if (cancelled) return;

      cleanupListeners();
      subs.push(
        Notifications.addNotificationReceivedListener(() => {
          void 0;
        }),
      );
      subs.push(
        Notifications.addNotificationResponseReceivedListener(() => {
          void 0;
        }),
      );
    };

    void sync();

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void sync();
    });

    return () => {
      cancelled = true;
      cleanupListeners();
      appSub.remove();
    };
  }, []);
}
