/**
 * Kayıt ekranı — Welcome ile aynı gökyüzü gradient + hero; form `RegisterAuthForm` içinde.
 */

import React, { useMemo, type ComponentType } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  Platform,
  type ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/atoms/Logo';
import { SurfaceIconPressable } from '@/atoms/SurfaceIconPressable';
import { Text } from '@/atoms/Text';
import { useI18n } from '@/hooks/useI18n';
import { usePageTitle } from '@/hooks/usePageTitle';
import { palette } from '@/constants/colors';
import { spacing, radius, nativeShadow } from '@/constants/spacing';
import {
  WELCOME_HERO_RATIO,
  WELCOME_SKY_GRADIENT,
  WELCOME_SKY_GRADIENT_LOCATIONS,
} from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale, DESIGN_BASE_WIDTH } from '@/lib/responsive';
import { RegisterAuthForm } from '@/organisms/RegisterAuthForm';

const IS_WEB = Platform.OS === 'web';
const KeyboardContainer: ComponentType<any> = IS_WEB ? View : KeyboardAvoidingView;
const keyboardContainerProps = IS_WEB ? {} : { behavior: 'padding' as const, keyboardVerticalOffset: 0 };
const safeAreaEdges = ['top', 'bottom'] as const;
const gradientColors = [...WELCOME_SKY_GRADIENT] as [string, string, ...string[]];
const gradientLocations = [...WELCOME_SKY_GRADIENT_LOCATIONS] as [number, number, ...number[]];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const viewportHeight = windowHeight > 0 ? windowHeight : 844;

  const contentScale = useMemo(() => {
    if (!IS_WEB) return scale;
    const w = windowWidth > 0 ? windowWidth : DESIGN_BASE_WIDTH;
    const cw = Math.max(1, Math.min(w, DESIGN_BASE_WIDTH));
    return (n: number) => Math.round((cw / DESIGN_BASE_WIDTH) * n);
  }, [windowWidth]);

  const webScaled = useMemo(() => {
    if (!IS_WEB) return null;
    const cs = contentScale;
    return {
      heroTitle: { fontSize: cs(28), lineHeight: cs(34) },
      heroTitleAccent: { fontSize: cs(28), lineHeight: cs(34) },
      heroSub: { fontSize: cs(13), lineHeight: cs(20) },
      fieldLabel: { fontSize: cs(12) },
      submitBtn: { height: cs(52) },
      submitBtnText: { fontSize: cs(16) },
      footerLink: { fontSize: cs(12) },
    };
  }, [contentScale]);

  const { t } = useI18n();
  usePageTitle(`${t('meta.register')} | ${t('meta.suffix')}`);

  const screenWrapStyle = useMemo<(ViewStyle | false | undefined)[]>(() => {
    const s: (ViewStyle | false | undefined)[] = [styles.screenWrap];
    if (IS_WEB) s.push({ minHeight: viewportHeight, height: viewportHeight });
    return s;
  }, [viewportHeight]);

  const heroStyle = useMemo(
    () => [styles.hero, { height: viewportHeight * WELCOME_HERO_RATIO }],
    [viewportHeight],
  );

  const backAnchorStyle = useMemo(
    () => [
      styles.backAnchor,
      {
        top: IS_WEB ? insets.top + spacing[3] : 0,
        left: spacing[4] + insets.left,
      },
    ],
    [insets.top, insets.left],
  );

  const pageGradientStyle = useMemo(
    () => [styles.pageGradient, IS_WEB && styles.pageGradientWebRoot],
    [],
  );

  const pageGradientInnerStyle = useMemo(
    () => [styles.pageGradientInner, IS_WEB && styles.pageGradientInnerWeb],
    [],
  );

  const safeOverlayStyle = useMemo(
    () => [styles.safeOverlay, IS_WEB && styles.safeOverlayWeb],
    [],
  );

  return (
    <View style={screenWrapStyle}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientFill}
      />
      <SafeAreaView style={safeOverlayStyle} edges={safeAreaEdges}>
        <KeyboardContainer style={styles.fill} {...keyboardContainerProps}>
          <View style={pageGradientStyle}>
            <View style={pageGradientInnerStyle}>
              <View style={backAnchorStyle}>
                <SurfaceIconPressable
                  shape="circle"
                  width={contentScale(44)}
                  height={contentScale(44)}
                  onPress={() => router.back()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={t('common.back')}
                >
                  <Ionicons
                    name="arrow-back"
                    size={contentScale(24)}
                    color={palette.primary}
                  />
                </SurfaceIconPressable>
              </View>

              <View style={heroStyle}>
                <View style={styles.heroLogoBox}>
                  <Logo width={contentScale(100)} />
                </View>
                <View style={styles.heroTitleWrap}>
                  <Text style={[styles.heroTitle, webScaled?.heroTitle]}>
                    {t('auth.registerHeroLine1')}
                    {'\n'}
                    <Text style={[styles.heroTitleAccent, webScaled?.heroTitleAccent]}>
                      {t('auth.registerHeroLine2')}
                    </Text>
                  </Text>
                </View>
                <Text style={[styles.heroSub, webScaled?.heroSub]}>{t('auth.registerSubtitle')}</Text>
              </View>

              <RegisterAuthForm
                contentScale={contentScale}
                webScaled={webScaled}
                footer={
                  <View style={styles.footer}>
                    <Text style={[styles.footerHint, webScaled?.footerLink]}>
                      {t('auth.haveAccount')}{' '}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.back()}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('auth.login')}
                    >
                      <Text style={[styles.footerLink, webScaled?.footerLink]}>{t('auth.login')}</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            </View>
          </View>
        </KeyboardContainer>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    backgroundColor: '#F0F7F9',
  },
  gradientFill: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none' as const,
  },
  safeOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeOverlayWeb: {
    width: '100%',
    minHeight: 0,
    height: '100%',
  },
  fill: {
    flex: 1,
  },
  pageGradient: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
    flexDirection: 'column',
  },
  pageGradientWebRoot: {
    width: '100%',
    minHeight: 0,
  },
  pageGradientInner: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative',
    flexDirection: 'column',
  },
  pageGradientInnerWeb: {
    maxWidth: DESIGN_BASE_WIDTH,
    alignSelf: 'center',
  },
  backAnchor: {
    position: 'absolute',
    zIndex: 2,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  heroLogoBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    marginBottom: spacing[1],
    ...nativeShadow({ color: '#000', offsetY: 2, opacity: 0.08, radius: 8, elevation: 3 }),
  },
  heroTitleWrap: {
    width: '100%',
    alignItems: 'center',
  },
  heroTitle: {
    width: '100%',
    fontFamily: fontFamily.bold,
    fontSize: scale(28),
    color: palette.navy,
    textAlign: 'center',
    lineHeight: scale(34),
  },
  heroTitleAccent: {
    fontFamily: fontFamily.bold,
    fontSize: scale(28),
    color: palette.primary,
    lineHeight: scale(34),
    textAlign: 'center',
  },
  heroSub: {
    fontFamily: fontFamily.regular,
    fontSize: scale(13),
    color: palette.gray500,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    flexWrap: 'wrap',
  },
  footerHint: {
    fontFamily: fontFamily.regular,
    fontSize: scale(12),
    color: palette.gray500,
  },
  footerLink: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(12),
    color: palette.primary,
  },
});
