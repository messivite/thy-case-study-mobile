import React from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { toast } from 'sonner-native';
import { SettingsSection } from '@/organisms/SettingsSection';
import { Avatar } from '@/atoms/Avatar';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store/slices/settingsSlice';
import { setNotifications } from '@/store/slices/settingsSlice';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const { user, isGuest, logout } = useAuth();
  const { t, changeLanguage, currentLanguage } = useI18n();
  const dispatch = useAppDispatch();
  const { theme, notificationsEnabled } = useAppSelector((s) => s.settings);

  const handleLogout = () => {
    Alert.alert(t('settings.logout'), t('settings.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          toast.success(t('toast.logoutSuccess'));
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const displayName = isGuest ? t('settings.guest') : (user?.name ?? '');
  const displayEmail = isGuest ? t('settings.loginToSync') : (user?.email ?? '');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text variant="h4" color={palette.white}>
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Avatar name={displayName || 'G'} uri={user?.avatarUrl} size="lg" />
          <View style={styles.profileInfo}>
            <Text variant="h4">{displayName}</Text>
            <Text variant="caption" color={colors.textSecondary}>{displayEmail}</Text>
          </View>
        </MotiView>

        {/* Preferences */}
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
              subtitle: theme === 'light' ? t('settings.themeLight') : theme === 'dark' ? t('settings.themeDark') : t('settings.themeSystem'),
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

        {/* About */}
        <SettingsSection
          title={t('settings.about')}
          items={[
            {
              id: 'version',
              label: t('settings.version'),
              subtitle: Constants.expoConfig?.version ?? '1.0.0',
              icon: 'information-circle-outline',
              iconColor: palette.customPurple,
            },
            {
              id: 'support',
              label: t('settings.support'),
              icon: 'help-circle-outline',
              iconColor: palette.navyMid,
              onPress: () => {},
            },
          ]}
        />

        {/* Logout */}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  scroll: {
    padding: spacing[4],
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing[5],
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
});
