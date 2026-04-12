/**
 * ErrorBoundaryScreen
 *
 * Uygulama genelinde yakalanamamis hatalar icin gosterilen
 * tam ekran fallback. THY logolu, animasyonlu, Sentry-ready.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text as RNText,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from '@/lib/motiView';
import { Logo } from '@/atoms/Logo';
import { GradientButton } from '@/atoms/GradientButton';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { scale, verticalScale } from '@/lib/responsive';
import i18n from '@/i18n';

const { width: W } = Dimensions.get('window');

interface ErrorBoundaryScreenProps {
  error: Error;
  errorId?: string;
  onRetry: () => void;
}

export const ErrorBoundaryScreen: React.FC<ErrorBoundaryScreenProps> = ({
  error,
  errorId,
  onRetry,
}) => {
  const t = (key: string) => i18n.t(key);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background gradient */}
      <LinearGradient
        colors={[palette.navy, '#0F1A2E', '#0A1020']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.08, scale: 1 }}
          transition={{ type: 'timing', duration: 2000, loop: true }}
          style={[styles.circle, styles.circleTopRight]}
        />
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.06, scale: 1.1 }}
          transition={{ type: 'timing', duration: 3000, loop: true, delay: 500 }}
          style={[styles.circle, styles.circleBottomLeft]}
        />
      </View>

      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          {/* Logo with pulse animation */}
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
            style={styles.logoContainer}
          >
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: 1.03 }}
              transition={{
                type: 'timing',
                duration: 2000,
                loop: true,
              }}
            >
              <View style={styles.logoBox}>
                <Logo width={scale(120)} />
              </View>
            </MotiView>
          </MotiView>

          {/* Error icon */}
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 450, delay: 300 }}
            style={styles.iconContainer}
          >
            <View style={styles.errorIconCircle}>
              <RNText style={styles.errorIcon}>!</RNText>
            </View>
          </MotiView>

          {/* Title */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 500 }}
          >
            <RNText style={styles.title}>
              {t('errorBoundary.title')}
            </RNText>
          </MotiView>

          {/* Message */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 650 }}
          >
            <RNText style={styles.message}>
              {t('errorBoundary.message')}
            </RNText>
          </MotiView>

          {/* Error ID (for support reference) */}
          {errorId && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300, delay: 800 }}
            >
              <View style={styles.errorIdBox}>
                <RNText style={styles.errorIdLabel}>
                  {t('errorBoundary.errorId')}
                </RNText>
                <RNText style={styles.errorIdValue}>
                  {errorId}
                </RNText>
              </View>
            </MotiView>
          )}
        </View>

        {/* Retry button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 450, delay: 900 }}
          style={styles.buttonContainer}
        >
          <GradientButton
            title={t('errorBoundary.retry')}
            onPress={onRetry}
            colors={[palette.primary, palette.primaryDark]}
            showArrow={false}
          />
        </MotiView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  logoContainer: {
    marginBottom: verticalScale(32),
  },
  logoBox: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: verticalScale(24),
  },
  errorIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  errorIcon: {
    fontFamily: fontFamily.bold,
    fontSize: scale(32),
    color: palette.white,
    marginTop: -2,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: palette.white,
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: Math.round(fontSize.base * 1.6),
    paddingHorizontal: spacing[2],
    marginBottom: verticalScale(20),
  },
  errorIdBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  errorIdLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  errorIdValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  circleTopRight: {
    width: scale(280),
    height: scale(280),
    top: -scale(80),
    right: -scale(80),
  },
  circleBottomLeft: {
    width: scale(200),
    height: scale(200),
    bottom: -scale(60),
    left: -scale(60),
  },
});
