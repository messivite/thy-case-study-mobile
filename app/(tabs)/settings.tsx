import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, Alert, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MotiView } from '@/lib/motiView';
import { Ionicons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import Constants from 'expo-constants';
import { Avatar } from '@/atoms/Avatar';
import { Text } from '@/atoms/Text';
import { AppHeader } from '@/organisms/AppHeader';
import { SettingsSection } from '@/organisms/SettingsSection';
import { UsageStatsCard } from '@/molecules/UsageStatsCard';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme, setNotifications, setStreaming } from '@/store/slices/settingsSlice';
import { spacing, radius } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { openExternalLink } from '@/lib/openExternalLink';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { user, isGuest, logout } = useAuth();
  const { t, changeLanguage, currentLanguage } = useI18n();
  const dispatch = useAppDispatch();
  const { theme, notificationsEnabled, streamingEnabled } = useAppSelector((s) => s.settings);

  const [shouldCrash, setShouldCrash] = useState(false);
  if (shouldCrash) {
    throw new Error('[SentryTest] Bilinçli test çöküşü — error boundary / Sentry akışını doğrular.');
  }

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: () => {
          logout();
          toast.success(t('toast.logoutSuccess'));
        },
      },
    ]);
  };

  const guestLike = isGuest || user?.isAnonymous === true;
  const displayName = guestLike ? t('settings.guest') : (user?.name ?? '');
  const displayEmail = guestLike ? t('settings.loginToSync') : (user?.email ?? '');
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? (Constants.expoConfig?.ios?.buildNumber ?? '—')
      : String(Constants.expoConfig?.android?.versionCode ?? '—');

  const themeSubtitle =
    theme === 'light'
      ? t('settings.themeLight')
      : theme === 'dark'
      ? t('settings.themeDark')
      : t('settings.themeSystem');

  // TODO: API entegresinde gerçek quota verisiyle değiştirilecek.
  const usageMock = {
    dailyUsed: 7,
    dailyLimit: 20,
    weeklyUsed: 32,
    weeklyLimit: 90,
  } as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <AppHeader title={t('settings.title')} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing[10] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 0 }}
        >
          <LinearGradient
            colors={isDark ? ['#1E1E38', '#1A1A2E'] : ['#FFFFFF', '#F5F5F5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.profileCard, { borderColor: colors.border }]}
          >
            <View style={styles.profileAvatarWrap}>
              <Avatar name={displayName || 'G'} uri={user?.avatarUrl} size="lg" />
              {!isGuest && (
                <View style={[styles.onlineDot, { backgroundColor: palette.success }]} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text variant="h4" style={{ fontFamily: fontFamily.semiBold }}>
                {displayName}
              </Text>
              <Text variant="caption" color={colors.textSecondary} style={styles.emailText}>
                {displayEmail}
              </Text>
            </View>
            <View style={[styles.profileBadge, { backgroundColor: isGuest ? colors.border : palette.primary + '18' }]}>
              <Ionicons
                name={isGuest ? 'person-outline' : 'shield-checkmark-outline'}
                size={14}
                color={isGuest ? colors.textSecondary : palette.primary}
              />
            </View>
          </LinearGradient>
        </MotiView>

        {/* Usage Stats (Mock) */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 40 }}
        >
          <UsageStatsCard
            dailyUsed={usageMock.dailyUsed}
            dailyLimit={usageMock.dailyLimit}
            weeklyUsed={usageMock.weeklyUsed}
            weeklyLimit={usageMock.weeklyLimit}
          />
        </MotiView>

        {/* Preferences */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 80 }}
        >
          <SettingsSection
            title={t('settings.preferences')}
            items={[
              {
                id: 'language',
                label: t('settings.language'),
                subtitle: currentLanguage === 'tr' ? t('settings.languageTR') : t('settings.languageEN'),
                icon: 'language-outline',
                iconColor: palette.geminiBlue,
                onPress: () => {
                  const next = currentLanguage === 'tr' ? 'en' : 'tr';
                  changeLanguage(next);
                  toast.info(t('toast.settingsSaved'));
                },
              },
              {
                id: 'theme',
                label: t('settings.theme'),
                subtitle: themeSubtitle,
                icon: isDark ? 'moon-outline' : 'sunny-outline',
                iconColor: palette.claudeOrange,
                onPress: () => {
                  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
                  dispatch(setTheme(next));
                },
              },
              {
                id: 'notifications',
                label: t('settings.notifications'),
                subtitle: t('settings.notificationsDesc'),
                icon: 'notifications-outline',
                iconColor: palette.gptGreen,
                toggle: true,
                toggleValue: notificationsEnabled,
                onToggle: (v) => dispatch(setNotifications(v)),
              },
            ]}
          />
        </MotiView>

        {/* Chat Settings */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 160 }}
        >
          <SettingsSection
            title={t('settings.chat')}
            items={[
              {
                id: 'streaming',
                label: t('settings.streaming'),
                subtitle: t('settings.streamingDesc'),
                icon: 'flash-outline',
                iconColor: palette.customPurple,
                toggle: true,
                toggleValue: streamingEnabled,
                onToggle: (v) => {
                  dispatch(setStreaming(v));
                  toast.info(t('toast.settingsSaved'));
                },
              },
            ]}
          />
        </MotiView>

        {/* About */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 240 }}
        >
          <SettingsSection
            title={t('settings.about')}
            items={[
              {
                id: 'version',
                label: t('settings.version'),
                subtitle: appVersion,
                icon: 'information-circle-outline',
                iconColor: palette.navyMid,
              },
              {
                id: 'build',
                label: t('settings.buildNumber'),
                subtitle: buildNumber,
                icon: 'construct-outline',
                iconColor: palette.gray400,
              },
              {
                id: 'support',
                label: t('settings.support'),
                icon: 'help-circle-outline',
                iconColor: palette.geminiBlue,
                onPress: () =>
                  openExternalLink({
                    url: 'https://www.turkishairlines.com',
                    openInApp: () =>
                      router.push({
                        pathname: '/webview-modal',
                        params: { url: 'https://www.turkishairlines.com', title: 'Destek' },
                      }),
                  }),
              },
            ]}
          />
        </MotiView>

        {/* App Version Badge */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 300 }}
          style={styles.versionBadgeWrap}
        >
          <LinearGradient
            colors={[palette.navy, palette.navyMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.versionBadge}
          >
            <Ionicons name="airplane" size={14} color="rgba(255,255,255,0.7)" />
            <Text variant="caption" color="rgba(255,255,255,0.85)" style={{ fontFamily: fontFamily.medium }}>
              THY Asistan
            </Text>
            <View style={styles.versionPill}>
              <Text variant="caption" color={palette.white} style={{ fontFamily: fontFamily.semiBold, fontSize: 10 }}>
                v{appVersion}
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Logout */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 360 }}
        >
          <SettingsSection
            items={[
              {
                id: 'logout',
                label: t('settings.logout'),
                icon: 'log-out-outline',
                iconColor: palette.error,
                destructive: true,
                onPress: handleLogout,
              },
            ]}
          />
        </MotiView>

        {/* Sentry / Error Boundary Test */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 440 }}
        >
          <View style={[styles.sentryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sentryHeader}>
              <View style={[styles.sentryIconWrap, { backgroundColor: palette.warning + '20' }]}>
                <Text style={styles.sentryEmoji}>😄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold }}>
                  Sentry Entegrasyonu
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  Error boundary akışını test et
                </Text>
              </View>
              <View style={[styles.sentryBadge, { backgroundColor: palette.success + '20' }]}>
                <View style={[styles.sentryDot, { backgroundColor: palette.success }]} />
                <Text variant="caption" color={palette.success} style={{ fontFamily: fontFamily.semiBold }}>
                  Aktif
                </Text>
              </View>
            </View>

            <Text variant="caption" color={colors.textSecondary} style={styles.sentryDesc}>
              Butona basınca uygulama kasıtlı crash atar, Sentry hatayı yakalar ve Error Boundary devreye girer. Case study değerlendiricileri için 🚀
            </Text>

            <Pressable
              onPress={() => setShouldCrash(true)}
              style={({ pressed }) => [styles.sentryButtonWrap, { opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[palette.warning, '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sentryButton}
              >
                <Ionicons name="bug-outline" size={16} color={palette.white} />
                <Text
                  variant="bodyMedium"
                  color={palette.white}
                  style={{ fontFamily: fontFamily.semiBold }}
                >
                  Crash Test Başlat 💥
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: spacing[4],
    gap: 0,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  emailText: {
    marginTop: 1,
  },
  profileBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionBadgeWrap: {
    alignItems: 'center',
    marginBottom: spacing[4],
    marginTop: -spacing[2],
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 999,
  },
  versionPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: 999,
  },
  sentryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  sentryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  sentryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentryEmoji: {
    fontSize: 20,
  },
  sentryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: 999,
  },
  sentryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sentryDesc: {
    lineHeight: 18,
  },
  sentryButtonWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sentryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
  },
});
