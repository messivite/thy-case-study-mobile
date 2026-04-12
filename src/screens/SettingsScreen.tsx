import React, { useCallback, useMemo, useState, type ComponentProps } from 'react';
import { ScrollView, View, StyleSheet, Alert, Platform, Pressable, Linking, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MotiView } from '@/lib/motiView';
import { Skeleton } from 'moti/skeleton';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@/lib/toast';
import Constants from 'expo-constants';
import { Avatar } from '@/atoms/Avatar';
import { Text } from '@/atoms/Text';
import { AppHeader } from '@/organisms/AppHeader';
import { SettingsSection } from '@/organisms/SettingsSection';
import { UsageStatsCard } from '@/molecules/UsageStatsCard';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import { useI18n } from '@/hooks/useI18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { canDeliverPushNotifications } from '@/lib/notificationPermission';
import { setStreaming } from '@/store/slices/settingsSlice';
import { ModelPickerSheet } from '@/organisms/ModelPickerSheet';
import { EditProfileSheet } from '@/organisms/EditProfileSheet';
import { LanguagePickerSheet } from '@/organisms/LanguagePickerSheet';
import { ThemePickerSheet } from '@/organisms/ThemePickerSheet';
import { useUploadAvatar } from '@/hooks/api/useUploadAvatar';
import { useGetUsageQuery } from '@/hooks/api/useUsage';
import { spacing, radius } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { openExternalLink } from '@/lib/openExternalLink';
import { DESIGN_BASE_WIDTH } from '@/lib/responsive';

const IS_WEB = Platform.OS === 'web';

type SettingsRowItem = ComponentProps<typeof SettingsSection>['items'][number];

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isGuest, logout } = useAuth();
  const { displayName: profileDisplayName, email: profileEmail, avatarUrl, isAnonymous, profileReady } = useWhoIAm();
  const { t, currentLanguage } = useI18n();
  const dispatch = useAppDispatch();
  const { theme, streamingEnabled } = useAppSelector((s) => s.settings);
  const {
    granted: notificationGranted,
    loading: notificationPermissionLoading,
    refresh: refreshNotificationPermission,
  } = useNotificationPermission();

  const themeSubtitle =
    theme === 'light'
      ? t('settings.themeLight')
      : theme === 'dark'
        ? t('settings.themeDark')
        : t('settings.themeSystem');

  const handleNotificationToggle = useCallback(
    async (turnOn: boolean) => {
      if (Platform.OS === 'web') return;

      if (turnOn) {
        let perm = await Notifications.getPermissionsAsync();
        if (!canDeliverPushNotifications(perm)) {
          perm = await Notifications.requestPermissionsAsync();
        }
        await refreshNotificationPermission();
        if (canDeliverPushNotifications(perm)) return;

        Alert.alert(
          t('settings.notificationsOpenSettingsTitle'),
          t('settings.notificationsOpenSettingsMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('settings.openSystemSettings'),
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
        return;
      }

      if (!notificationGranted) return;

      Alert.alert(
        t('settings.notificationsTurnOffTitle'),
        t('settings.notificationsTurnOffMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.openSystemSettings'),
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ],
      );
    },
    [notificationGranted, refreshNotificationPermission, t],
  );

  const preferenceItems = useMemo((): SettingsRowItem[] => {
    const items: SettingsRowItem[] = [
      {
        id: 'language',
        label: t('settings.language'),
        subtitle: currentLanguage === 'tr' ? t('settings.languageTR') : t('settings.languageEN'),
        icon: 'language-outline',
        iconColor: palette.geminiBlue,
        onPress: () => setLanguagePickerOpen(true),
      },
      {
        id: 'theme',
        label: t('settings.theme'),
        subtitle: themeSubtitle,
        icon: isDark ? 'moon-outline' : 'sunny-outline',
        iconColor: palette.claudeOrange,
        onPress: () => setThemePickerOpen(true),
      },
    ];

    if (Platform.OS !== 'web') {
      items.push({
        id: 'notifications',
        label: t('settings.notifications'),
        subtitle: notificationPermissionLoading
          ? ''
          : notificationGranted
            ? t('settings.notificationsStatusOn')
            : t('settings.notificationsStatusOff'),
        icon: 'notifications-outline',
        iconColor: palette.gptGreen,
        toggle: true,
        toggleValue: notificationGranted,
        onToggle: (v) => void handleNotificationToggle(v),
      });
    }

    return items;
  },
    [
      t,
      currentLanguage,
      themeSubtitle,
      isDark,
      dispatch,
      notificationPermissionLoading,
      notificationGranted,
      handleNotificationToggle,
    ],
  );

  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const selectedAIModel = useAppSelector((s) => s.chat.selectedAIModel);

  const { optimisticUri, isUploading, pickAndUpload } = useUploadAvatar();
  const handlePickAvatar = useCallback(() => {
    pickAndUpload({
      onSuccess: () => toast.success(t('settings.avatarUpdated')),
      onError: () => toast.error(t('settings.avatarUpdateFailed')),
    });
  }, [pickAndUpload, t]);
  const resolvedAvatarUri = optimisticUri ?? avatarUrl;

  const [shouldCrash, setShouldCrash] = useState(false);
  if (shouldCrash) {
    throw new Error('[SentryTest] Bilinçli test çöküşü — error boundary / Sentry akışını doğrular.');
  }

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.logoutConfirm'))) {
        logout();
        toast.success(t('toast.logoutSuccess'));
      }
      return;
    }
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

  const guestLike = isGuest || isAnonymous;
  const displayName = guestLike || !profileDisplayName ? t('settings.guest') : profileDisplayName;
  const displayEmail = guestLike ? t('settings.loginToSync') : (profileEmail || '');
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';


  const { data: usageData, isLoading: usageLoading } = useGetUsageQuery();

  return (
    <View style={{ flex: 1 }}>
      <AppHeader
        title={t('settings.title')}
        safeAreaTop={false}
        rightIcons={[
          {
            name: 'close',
            onPress: () => router.back(),
            accessibilityLabel: t('common.close'),
          },
        ]}
      />
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 20) + spacing[10] }]}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
      >
        <View style={styles.scrollContent}>
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
            {/* Avatar */}
            <Pressable
              style={styles.profileAvatarWrap}
              onPress={!guestLike ? handlePickAvatar : undefined}
              disabled={isUploading}
              accessibilityRole="button"
              accessibilityLabel={t('settings.changeAvatar')}
            >
              <Avatar
                name={displayName || 'G'}
                uri={resolvedAvatarUri}
                width={100}
                height={100}
                style={isUploading ? styles.avatarUploading : undefined}
              />
              {!isGuest && (
                <View style={[styles.onlineDot, { backgroundColor: palette.success, borderColor: colors.background }]} />
              )}
              {!guestLike && (
                <View style={[styles.avatarUploadBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {isUploading
                    ? <ActivityIndicator size={14} color={palette.primary} />
                    : <Ionicons name="camera-outline" size={25} color={colors.textSecondary} />
                  }
                </View>
              )}
            </Pressable>

            {/* İsim + email + aksiyonlar */}
            <View style={styles.profileBottom}>
              <View style={styles.profileInfo}>
                <Skeleton
                  show={!guestLike && !profileReady}
                  colorMode={isDark ? 'dark' : 'light'}
                  width={120}
                  height={18}
                  radius={5}
                >
                  {guestLike || profileReady ? (
                    <Text variant="h4" color={colors.text} style={{ fontFamily: fontFamily.semiBold, textAlign: 'center' }}>
                      {displayName}
                    </Text>
                  ) : null}
                </Skeleton>
                <Skeleton
                  show={!guestLike && !profileReady}
                  colorMode={isDark ? 'dark' : 'light'}
                  width={180}
                  height={14}
                  radius={4}
                >
                  {guestLike || profileReady ? (
                    <Text variant="caption" color={colors.textSecondary} style={[styles.emailText, { textAlign: 'center' }]}>
                      {displayEmail}
                    </Text>
                  ) : null}
                </Skeleton>
              </View>
              <View style={styles.profileActions}>
                <View style={[styles.profileBadge, { backgroundColor: isGuest ? colors.border : palette.primary + '18' }]}>
                  <Ionicons
                    name={isGuest ? 'person-outline' : 'shield-checkmark-outline'}
                    size={14}
                    color={isGuest ? colors.textSecondary : palette.primary}
                  />
                </View>
                {!guestLike && (
                  <Pressable
                    onPress={() => setEditProfileOpen(true)}
                    style={[styles.editBtn, { backgroundColor: colors.border }]}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.editProfile')}
                  >
                    <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
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
            isLoading={usageLoading && !usageData}
            dailyUsed={usageData?.daily.usedTokens ?? 0}
            dailyLimit={usageData?.daily.limitTokens ?? 0}
            weeklyUsed={usageData?.weekly.usedTokens ?? 0}
            weeklyLimit={usageData?.weekly.limitTokens ?? 0}
          />
        </MotiView>

        {/* Preferences */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 80 }}
        >
          <SettingsSection title={t('settings.preferences')} items={preferenceItems} />
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
                id: 'model',
                label: t('settings.model'),
                subtitle: selectedAIModel?.displayName ?? t('settings.modelDefault'),
                icon: 'hardware-chip-outline',
                iconColor: palette.primary,
                onPress: () => setModelPickerVisible(true),
              },
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
            colors={[palette.primary, palette.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.versionBadge}
          >
            <Ionicons name="airplane" size={14} color={palette.white} />
            <Text variant="caption" color={palette.white} style={{ fontFamily: fontFamily.medium }}>
              THY Asistan
            </Text>
            <View style={styles.versionPill}>
              <Text variant="caption" color={palette.white} style={{ fontFamily: fontFamily.semiBold, fontSize: 10 }}>
                v{appVersion}
              </Text>
            </View>
          </LinearGradient>
        </MotiView>

        {/* Sentry / Error Boundary Test */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 360 }}
        >
          <View style={[styles.sentryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.sentryHeader}>
              <View style={[styles.sentryIconWrap, { backgroundColor: palette.warning + '20' }]}>
                <Ionicons name="information-circle-outline" size={20} color={palette.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" color={colors.text} style={{ fontFamily: fontFamily.semiBold }}>
                  {t('settings.sentryTitle')}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {t('settings.sentrySubtitle')}
                </Text>
              </View>
              <View style={[styles.sentryBadge, { backgroundColor: palette.success + '20' }]}>
                <View style={[styles.sentryDot, { backgroundColor: palette.success }]} />
                <Text variant="caption" color={palette.success} style={{ fontFamily: fontFamily.semiBold }}>
                  {t('settings.sentryActive')}
                </Text>
              </View>
            </View>

            <Text variant="caption" color={colors.textSecondary} style={styles.sentryDesc}>
              {t('settings.sentryDesc')}
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
                  {t('settings.sentryCrashTest')}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </MotiView>

        {/* Logout */}
        <MotiView
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 350, delay: 440 }}
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
        </View>
      </ScrollView>

      <ModelPickerSheet
        visible={modelPickerVisible}
        onClose={() => setModelPickerVisible(false)}
        variant="backdrop"
      />

      <EditProfileSheet
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />

      <LanguagePickerSheet
        open={languagePickerOpen}
        onClose={() => setLanguagePickerOpen(false)}
      />

      <ThemePickerSheet
        open={themePickerOpen}
        onClose={() => setThemePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    height: '100%',
  },
  scroll: {
    gap: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    ...(IS_WEB && {
      maxWidth: DESIGN_BASE_WIDTH,
      width: '100%',
      alignSelf: 'center' as const,
    }),
  },
  profileCard: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[3],
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
  profileBottom: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[2],
    width: '100%',
  },
  avatarUploading: {
    opacity: 0.45,
  },
  avatarUploadBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 45,
    height: 45,
    borderRadius: 22.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  profileInfo: {
    gap: 3,
    alignItems: 'center',
  },
  emailText: {
    marginTop: 1,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  profileBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
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
