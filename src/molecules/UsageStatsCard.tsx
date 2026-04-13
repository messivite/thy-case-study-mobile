import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
type Props = {
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
  isLoading?: boolean;
};

type ProgressRowProps = {
  label: string;
  used: number;
  limit: number;
  remainingLabel: string;
  delayMs?: number;
};

const formatK = (n: number): string => {
  if (n >= 1000) return `${parseFloat((n / 1000).toFixed(1))}K`;
  return String(n);
};

const ProgressRow: React.FC<ProgressRowProps> = ({ label, used, limit, remainingLabel, delayMs = 0 }) => {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  const safeLimit = Math.max(limit, 1);
  const ratio = Math.max(0, Math.min(used / safeLimit, 1));
  const percent = Math.round(ratio * 100);
  const remaining = Math.max(limit - used, 0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withTiming(ratio, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delayMs, progress, ratio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(progress.value * 100, 100))}%`,
  }));

  return (
    <View style={styles.rowWrap}>
      <View style={styles.rowHeader}>
        <Text variant="label" color="rgba(255,255,255,0.94)" style={styles.rowLabel}>
          {label}
        </Text>
        <Text variant="micro" color="rgba(255,255,255,0.88)">
          {formatK(used)}/{formatK(limit)} · %{percent}
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fillWrap, fillStyle]}>
          <LinearGradient
            colors={['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.fillGradient}
          />
        </Animated.View>
      </View>

      <Text variant="micro" color="rgba(255,255,255,0.8)" style={styles.remainingText}>
        {remainingLabel} {formatK(remaining)}
      </Text>
    </View>
  );
};

export const UsageStatsCard: React.FC<Props> = ({
  dailyUsed,
  dailyLimit,
  weeklyUsed,
  weeklyLimit,
  isLoading = false,
}) => {
  const { isDark } = useTheme();
  const { t } = useI18n();

  const cardGradient = useMemo(
    () =>
      isDark
        ? (['#7A0B1D', '#A20E24', '#C0102A'] as const)
        : (['#B80C23', '#D41430', '#E81932'] as const),
    [isDark],
  );

  const totalUsed = dailyUsed + weeklyUsed;
  const totalLimit = dailyLimit + weeklyLimit;
  const totalRemaining = Math.max(totalLimit - totalUsed, 0);

  return (
    <LinearGradient
      colors={cardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name="pie-chart" size={16} color={palette.primary} />
          </View>
          <View>
            <Text variant="h4" color={palette.white} style={styles.title}>
              {t('settings.usageTitle')}
            </Text>
            <Text variant="caption" color="rgba(255,255,255,0.86)" style={styles.subtitle}>
              {t('settings.usageSubtitle')}
            </Text>
          </View>
        </View>

        {!isLoading && (
          <View style={styles.remainingBadge}>
            <Text variant="micro" color={palette.white} style={styles.remainingLabel}>
              {t('settings.usageRemaining')}
            </Text>
            <Text variant="label" color={palette.white} style={styles.remainingValue}>
              {formatK(totalRemaining)}
            </Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingOuter}>
          <ActivityThyLoading mode="float" size={44} />
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={styles.rowsContainer}>
          <ProgressRow label={t('settings.usageDaily')} used={dailyUsed} limit={dailyLimit} remainingLabel={t('settings.usageRemainingLabel')} delayMs={0} />
          <ProgressRow label={t('settings.usageWeekly')} used={weeklyUsed} limit={weeklyLimit} remainingLabel={t('settings.usageRemainingLabel')} delayMs={120} />
        </Animated.View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    marginBottom: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  title: {
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    marginTop: -2,
  },
  remainingBadge: {
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.17)',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  remainingLabel: {
    opacity: 0.9,
    textAlign: 'center',
  },
  remainingValue: {
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
  },
  loadingOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  rowsContainer: {
    gap: spacing[3],
  },
  rowWrap: {
    gap: spacing[2],
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontFamily: fontFamily.bold,
  },
  remainingText: {
    alignSelf: 'flex-end',
    textAlign: 'right',
  },
  track: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: palette.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  fillWrap: {
    height: '100%',
    minWidth: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fillGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
});
