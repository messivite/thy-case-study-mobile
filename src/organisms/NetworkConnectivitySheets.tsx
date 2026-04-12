import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  useNetworkStatus,
  useOfflineQueue,
  useSyncProgress,
  OfflineManager,
} from '@mustafaaksoy41/react-native-offline-queue';
import { useQueryClient } from '@tanstack/react-query';
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
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { CHAT_QUERY_KEYS } from '@/hooks/api/useChats';

// ---------------------------------------------------------------------------
// AnimatedProgressBar — UI thread animasyonu, JS re-render yok
// ---------------------------------------------------------------------------

const AnimatedProgressBar = memo(({ percentage, done }: { percentage: number; done?: boolean }) => {
  const width = useSharedValue(0);
  const colorProgress = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percentage, {
      duration: percentage === 100 ? 300 : 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [percentage]);

  useEffect(() => {
    colorProgress.value = withTiming(done ? 1 : 0, { duration: 400 });
  }, [done]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as `${number}%`,
    backgroundColor: done ? palette.success : palette.primary,
  }));

  return (
    <View style={styles.progressTrack}>
      <View style={styles.progressBg} />
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
});

// ---------------------------------------------------------------------------
// SyncBreakdownRow — memo ile izole, sadece değer değişince render
// ---------------------------------------------------------------------------

const SyncBreakdownRow = memo(({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.breakdownItem}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text variant="caption" color={colors.textSecondary}>{label}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// NetworkConnectivitySheets
// ---------------------------------------------------------------------------

type NetworkConnectivitySheetsProps = {
  enabled?: boolean;
  promptOnMount?: boolean;
  onOpenRef?: React.RefObject<(() => void) | null>;
};

export function NetworkConnectivitySheets({ enabled = true, promptOnMount = false, onOpenRef }: NetworkConnectivitySheetsProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const preview = devConfig.networkSheetPreview;

  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, syncNow } = useOfflineQueue();
  const { percentage, completedCount, totalCount, failedCount, items } = useSyncProgress();

  const pendingMessages = items.filter((i) => i.action.actionName === 'SEND_MESSAGE').length;
  const pendingLikes = items.filter((i) => i.action.actionName === 'LIKE_MESSAGE').length;

  const [offlineOpen, setOfflineOpen] = useState(() => enabled && preview === 'offline');
  const [onlineOpen, setOnlineOpen] = useState(() => enabled && preview === 'online');
  const [syncDone, setSyncDone] = useState(false);

  const wasSyncingRef = useRef(false);
  const syncSnapshotRef = useRef({ messages: 0, likes: 0 });
  const isOnlineRef = useRef(isOnline);
  useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);

  // Sync başlarken snapshot al
  useEffect(() => {
    if (isSyncing && !wasSyncingRef.current) {
      syncSnapshotRef.current = { messages: pendingMessages, likes: pendingLikes };
    }
  }, [isSyncing, pendingMessages, pendingLikes]);

  // Offline sheet: isOnline false olunca aç
  useEffect(() => {
    if (!enabled || preview != null) return;
    if (isOnline == null) return;
    if (!isOnline) {
      setOfflineOpen(true);
      setOnlineOpen(false);
    }
  }, [isOnline, enabled, preview]);

  // Online restore: OfflineManager'ın onOnlineRestore callback'ini kaydet
  // Paket online'a dönünce bunu çağırır — pending varsa sheet aç
  useEffect(() => {
    if (!enabled) return;
    OfflineManager.configure({
      onOnlineRestore: ({ pendingCount: count }) => {
        if (count > 0) {
          setOfflineOpen(false);
          setOnlineOpen(true);
        }
      },
    });
  }, [enabled]);

  // promptOnMount: home'a girilince pending var mı — paket queue'dan oku
  useEffect(() => {
    if (!promptOnMount || !enabled) return;
    const queue = OfflineManager.getQueue();
    if (queue.length > 0 && OfflineManager.isOnline) {
      setOnlineOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // onOpenRef: dışarıdan (MessageBubble warning badge) sheet'i açmak için
  useEffect(() => {
    if (!onOpenRef) return;
    onOpenRef.current = () => {
      if (!isOnlineRef.current) {
        setOfflineOpen(true); // offline iken → bağlantı yok sheet'i aç
        return;
      }
      setOnlineOpen(false);
      requestAnimationFrame(() => setOnlineOpen(true));
    };
    return () => { if (onOpenRef) onOpenRef.current = null; };
  }, [onOpenRef]);

  const closeOffline = useCallback(() => setOfflineOpen(false), []);
  const closeOnline = useCallback(() => {
    setOnlineOpen(false);
    setSyncDone(false);
    wasSyncingRef.current = false;
  }, []);

  // Sync tamamlanınca: syncDone → true → 2sn sonra kapat
  useEffect(() => {
    if (isSyncing) {
      wasSyncingRef.current = true;
      setSyncDone(false);
    } else if (wasSyncingRef.current) {
      wasSyncingRef.current = false;
      setSyncDone(true);
    }
  }, [isSyncing, onlineOpen]);

  const onSyncPress = useCallback(async () => {
    haptics.success();
    try {
      await syncNow();
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
      // Toast gösterme — sheet içinde syncDone UI'ı gösterecek
    } catch {
      toast.error(t('toast.unknownError'));
    }
  }, [haptics, t, syncNow, queryClient]);

  // Sync sırasında / sonrasında sayaç değerleri
  const snap = syncSnapshotRef.current;
  const syncedMessages = Math.min(completedCount, snap.messages);
  const syncedLikes = Math.max(0, completedCount - snap.messages);

  const showBreakdown = (isSyncing || syncDone)
    ? (snap.messages > 0 || snap.likes > 0)
    : (pendingMessages > 0 || pendingLikes > 0);

  return (
    <>
      {/* Offline sheet */}
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

      {/* Online / Sync sheet */}
      <LiquidBottomSheet
        open={onlineOpen}
        onClose={closeOnline}
        showHandle
        showCloseButton
        variant="glass"
      >
        <View style={styles.body}>
          {/* İkon ring */}
          <View style={[
            styles.iconRing,
            {
              backgroundColor: isSyncing
                ? `${palette.primary}18`
                : syncDone
                  ? `${palette.success}18`
                  : `${palette.success}18`,
            },
          ]}>
            {isSyncing
              ? <ActivityThyLoading mode="pulse" size={36} />
              : syncDone && failedCount > 0
                ? <Ionicons name="warning-outline" size={36} color={palette.warning} />
                : <Ionicons name="cloud-done-outline" size={36} color={palette.success} />
            }
          </View>

          {/* Başlık */}
          <Text variant="h4" style={styles.title} color={colors.text}>
            {isSyncing
              ? t('network.syncingTitle')
              : syncDone
                ? failedCount > 0
                  ? t('network.syncPartialTitle')
                  : t('network.syncSuccess')
                : t('network.onlineTitle')}
          </Text>

          {/* Açıklama */}
          {syncDone ? (
            <Text style={styles.syncDoneSubtitle} color={failedCount > 0 ? palette.warning : palette.success}>
              {failedCount > 0
                ? t('network.syncFailed', { count: failedCount })
                : t('network.syncDoneSubtitle')}
            </Text>
          ) : (
            <Text variant="body" color={colors.textSecondary} style={styles.message}>
              {isSyncing
                ? t('network.syncingMessage', { completed: completedCount, total: totalCount })
                : pendingCount > 0
                  ? t('network.onlineMessagePending', { count: pendingCount })
                  : t('network.onlineMessage')}
            </Text>
          )}

          {/* Breakdown: mesaj / beğeni sayaçları */}
          {showBreakdown && (
            <View style={styles.breakdown}>
              {(isSyncing || syncDone ? snap.messages : pendingMessages) > 0 && (
                <SyncBreakdownRow
                  icon="chatbubble-outline"
                  label={(isSyncing || syncDone)
                    ? `${syncedMessages} / ${snap.messages} mesaj`
                    : t('network.syncPendingMessages', { count: pendingMessages })}
                />
              )}
              {(isSyncing || syncDone ? snap.likes : pendingLikes) > 0 && (
                <SyncBreakdownRow
                  icon="thumbs-up-outline"
                  label={(isSyncing || syncDone)
                    ? `${syncedLikes} / ${snap.likes} beğeni`
                    : t('network.syncPendingLikes', { count: pendingLikes })}
                />
              )}
            </View>
          )}

          {/* Animated progress bar — sync sırasında ve bitti sonrası */}
          {(isSyncing || syncDone) && (
            <AnimatedProgressBar percentage={syncDone ? 100 : percentage} done={syncDone && failedCount === 0} />
          )}

          {/* Butonlar */}
          {(isSyncing || syncDone) ? (
            /* Sync sırasında disabled, bitti sonrası aktif Tamam */
            <Button
              title={t('common.ok')}
              onPress={closeOnline}
              fullWidth
              disabled={isSyncing}
              icon={<Ionicons name="checkmark-outline" size={20} color={palette.white} />}
            />
          ) : (
            /* Sync bekleniyor */
            <>
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
            </>
          )}
        </View>
      </LiquidBottomSheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    marginBottom: spacing[1],
  },
  breakdown: {
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: spacing[1],
  },
  progressBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderRadius: 4,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: palette.primary,
    borderRadius: 4,
  },
  failedText: {
    textAlign: 'center',
  },
  syncDoneSubtitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  laterBtn: {
    marginTop: spacing[1],
    paddingVertical: spacing[2],
    alignSelf: 'center',
  },
  laterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
  },
});
