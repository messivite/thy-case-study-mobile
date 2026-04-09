import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/atoms/Button';
import { TextButton } from '@/atoms/TextButton';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { continueAsGuest, loginWithGoogle } = useSupabaseAuth();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated' || status === 'guest') {
      router.push('/(tabs)');
    }
  }, [status]);

  // Flash önleme
  if (status === 'authenticated' || status === 'guest') return null;

  const handleGuest = () => {
    continueAsGuest();
    router.push('/(tabs)');
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
    // Session onAuthStateChange ile gelir, navigation oradan tetiklenir
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Hero section */}
      <MotiView
        from={{ opacity: 0, translateY: -30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 18, delay: 100 }}
        style={[styles.hero, { backgroundColor: palette.navy }]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="airplane" size={44} color={palette.white} />
        </View>
        <Text variant="h2" color={palette.white} align="center" style={styles.heroTitle}>
          THY Asistan
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.65)" align="center">
          {t('auth.welcomeSubtitle')}
        </Text>
      </MotiView>

      {/* Buttons */}
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 400, delay: 200 }}
        style={styles.actions}
      >
        {/* Google */}
        <Button
          title={t('auth.loginWithGoogle')}
          variant="google"
          onPress={handleGoogle}
          icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
          style={styles.btn}
        />

        {/* Email */}
        <Button
          title={t('auth.loginWithEmail')}
          variant="primary"
          onPress={() => router.push('/(auth)/login')}
          icon={<Ionicons name="mail-outline" size={20} color={palette.white} />}
          style={styles.btn}
        />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text variant="caption" color={colors.textSecondary} style={{ paddingHorizontal: spacing[3] }}>
            {t('auth.orContinueWith')}
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        {/* Guest */}
        <TextButton
          title={t('auth.continueAsGuest')}
          color={colors.textSecondary}
          onPress={handleGuest}
          style={styles.guestBtn}
          hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
        />
      </MotiView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[8],
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    letterSpacing: 0.3,
  },
  actions: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  btn: {
    marginBottom: spacing[1],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[2],
  },
  line: {
    flex: 1,
    height: 1,
  },
  guestBtn: {
    alignSelf: 'center',
  },
});
