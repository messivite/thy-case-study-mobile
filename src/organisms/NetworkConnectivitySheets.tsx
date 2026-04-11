import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
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

type Preview = typeof devConfig.networkSheetPreview;

type NetworkConnectivitySheetsProps = {
  /** false → sheet’ler kapalı (ör. onboarding’de sadece 1. slayt) */
  enabled?: boolean;
};

/**
 * NetInfo + isteğe bağlı devConfig.networkSheetPreview ile alt sheet’ler.
 * Offline kuyruk iş mantığı yok — sadece UI; sync butonu placeholder toast.
 */
export function NetworkConnectivitySheets({ enabled = true }: NetworkConnectivitySheetsProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const netInfo = useNetInfo();
  const preview = devConfig.networkSheetPreview as Preview;

  const [offlineOpen, setOfflineOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const prevConnectedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOfflineOpen(false);
      setOnlineOpen(false);
      return;
    }

    if (preview === 'offline') {
      setOfflineOpen(true);
      setOnlineOpen(false);
      return;
    }
    if (preview === 'online') {
      setOfflineOpen(false);
      setOnlineOpen(true);
      return;
    }

    const connected = netInfo.isConnected;
    if (connected == null) return;

    if (!connected) {
      setOfflineOpen(true);
      setOnlineOpen(false);
      prevConnectedRef.current = false;
      return;
    }

    setOfflineOpen(false);
    if (prevConnectedRef.current === false) {
      setOnlineOpen(true);
    }
    prevConnectedRef.current = true;
  }, [netInfo.isConnected, preview, enabled]);

  const closeOffline = useCallback(() => setOfflineOpen(false), []);
  const closeOnline = useCallback(() => setOnlineOpen(false), []);

  const onSyncPress = useCallback(() => {
    haptics.success();
    toast.info(t('network.syncPlaceholder'));
    setOnlineOpen(false);
  }, [haptics, t]);

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
            {t('network.onlineMessage')}
          </Text>
          <Button
            title={t('network.onlineSync')}
            onPress={onSyncPress}
            fullWidth
            icon={
              <Ionicons name="sync-outline" size={20} color={palette.white} />
            }
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
