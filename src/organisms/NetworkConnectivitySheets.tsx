import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNetworkStatus,
  useOfflineQueue,
  useOfflineSyncInterceptor,
} from '@mustafaaksoy41/react-native-offline-queue';
import { LiquidBottomSheet } from '@/molecules/LiquidBottomSheet';
import { Text } from '@/atoms/Text';
import { Button } from '@/atoms/Button';
import { TextButton } from '@/atoms/TextButton';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { devConfig } from '@/config/devConfig';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { useHaptics } from '@/hooks/useHaptics';
import { toast } from '@/lib/toast';

type NetworkConnectivitySheetsProps = {
  enabled?: boolean;
};

export function NetworkConnectivitySheets({ enabled = true }: NetworkConnectivitySheetsProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const preview = devConfig.networkSheetPreview;

  // Paketin state'leri
  const { isOnline } = useNetworkStatus();
  const { pendingCount, syncNow } = useOfflineQueue();

  // Sheet görünürlük state'leri — paketin isOnline'ından türetilir
  const [offlineOpen, setOfflineOpen] = useState(() => enabled && preview === 'offline');
  const [onlineOpen, setOnlineOpen] = useState(() => enabled && preview === 'online');
  // Online restore → online sheet
  useOfflineSyncInterceptor({
    onPromptNeeded: useCallback(() => {
      if (!enabled) return;
      setOfflineOpen(false);
      setOnlineOpen(true);
    }, [enabled]),
  });

  // Offline algılama → offline sheet
  const prevOnlineRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!enabled || preview != null) return;
    if (isOnline == null) return;

    if (!isOnline) {
      setOfflineOpen(true);
      setOnlineOpen(false);
    }

    prevOnlineRef.current = isOnline;
  }, [isOnline, enabled, preview]);

  const closeOffline = useCallback(() => setOfflineOpen(false), []);
  const closeOnline = useCallback(() => setOnlineOpen(false), []);

  const onSyncPress = useCallback(async () => {
    haptics.success();
    setOnlineOpen(false);
    try {
      await syncNow();
      toast.success(t('network.syncSuccess'));
    } catch {
      toast.error(t('toast.unknownError'));
    }
  }, [haptics, t, syncNow]);

  return (
    <>
      <LiquidBottomSheet
        open={offlineOpen}
        onClose={closeOffline}
        showHandle
        showCloseButton
        variant="glass"
      >
        <View style={styles.body}>
          <View style={[styles.iconRing, { backgroundColor: `${palette.primary}18` }]}>
            <Ionicons name="cloud-offline-outline" size={36} color={palette.primary} />
          </View>
          <Text variant="h4" style={styles.title} color={colors.text}>
            {t('network.offlineTitle')}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.message}>
            {t('network.offlineMessage')}
          </Text>
          <Button title={t('network.offlineDismiss')} onPress={closeOffline} fullWidth />
        </View>
      </LiquidBottomSheet>

      <LiquidBottomSheet
        open={onlineOpen}
        onClose={closeOnline}
        showHandle
        showCloseButton
        variant="glass"
      >
        <View style={styles.body}>
          <View style={[styles.iconRing, { backgroundColor: `${palette.success}22` }]}>
            <Ionicons name="cloud-done-outline" size={36} color={palette.success} />
          </View>
          <Text variant="h4" style={styles.title} color={colors.text}>
            {t('network.onlineTitle')}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.message}>
            {pendingCount > 0
              ? t('network.onlineMessagePending', { count: pendingCount })
              : t('network.onlineMessage')}
          </Text>
          <Button
            title={t('network.onlineSync')}
            onPress={onSyncPress}
            fullWidth
            icon={<Ionicons name="sync-outline" size={20} color={palette.white} />}
          />
          <TextButton
            title={t('network.onlineLater')}
            onPress={closeOnline}
            color={colors.textSecondary}
            hapticType="selection"
            style={styles.laterBtn}
            textStyle={styles.laterText}
          />
        </View>
      </LiquidBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing[3],
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  title: {
    textAlign: 'center',
    fontFamily: fontFamily.semiBold,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    fontSize: fontSize.base,
    marginBottom: spacing[2],
  },
  laterBtn: {
    marginTop: spacing[1],
    paddingVertical: spacing[2],
  },
  laterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
});
