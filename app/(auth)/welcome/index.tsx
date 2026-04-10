/**
 * WelcomeScreen
 *
 * Onboarding bittikten sonra gösterilen ilk auth ekranı.
 * Form mantığı `WelcomeAuthForm` içinde — her tuşta gradient/hero yeniden çizilmez.
 */

import React, { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  useWindowDimensions,
  StatusBar,
  Platform,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/atoms/Logo';
import { SurfaceIconPressable } from '@/atoms/SurfaceIconPressable';
import { Text } from '@/atoms/Text';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { devConfig } from '@/config/devConfig';
import { WELCOME_GUEST_AUTH_FLOW } from '@/constants/welcomeGuestAuthFlow';
import {
  WELCOME_HERO_RATIO,
  WELCOME_INFO_SITE_URL,
  WELCOME_MOUNT_FADE_DURATION_MS,
  WELCOME_SKY_GRADIENT,
  WELCOME_SKY_GRADIENT_LOCATIONS,
} from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale, DESIGN_BASE_WIDTH } from '@/lib/responsive';
import { openExternalLink } from '@/lib/openExternalLink';
import { WelcomeAuthForm } from '@/organisms/WelcomeAuthForm';

const IS_WEB = Platform.OS === 'web';
const KeyboardContainer: ComponentType<any> = IS_WEB ? View : KeyboardAvoidingView;
const keyboardContainerProps = IS_WEB ? {} : { behavior: 'padding' as const, keyboardVerticalOffset: 0 };
const safeAreaEdges = ['top', 'bottom'] as const;
const gradientColors = [...WELCOME_SKY_GRADIENT] as [string, string, ...string[]];
const gradientLocations = [...WELCOME_SKY_GRADIENT_LOCATIONS] as [number, number, ...number[]];

export default function WelcomeScreen() {
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
      forgotText: { fontSize: cs(12) },
      loginBtn: { height: cs(52) },
      loginBtnText: { fontSize: cs(16) },
      dividerText: { fontSize: cs(12) },
      googleBtn: { height: cs(52) },
      googleBtnText: { fontSize: cs(15) },
      footerLink: { fontSize: cs(12) },
      guestSigningToast: { paddingVertical: cs(14), paddingHorizontal: cs(22) },
      guestSigningToastText: { fontSize: cs(15) },
    };
  }, [contentScale]);

  const { t } = useI18n();
  const { status } = useAuth();
  const [guestAuthPending, setGuestAuthPending] = useState(false);
  const isLoginPending = status === 'loading';
  const anyBlocked = isLoginPending || guestAuthPending;

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: WELCOME_MOUNT_FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (devConfig.welcomeInitial) return;
    if (status === 'authenticated' || status === 'guest') {
      router.replace('/(tabs)');
    }
  }, [status]);

  if (!devConfig.welcomeInitial && (status === 'authenticated' || status === 'guest')) return null;

  const openInfoSite = () => {
    openExternalLink({
      url: WELCOME_INFO_SITE_URL,
      openInApp: () =>
        router.push({
          pathname: '/webview-modal',
          params: { url: WELCOME_INFO_SITE_URL, title: t('auth.infoSiteWebTitle') },
        }),
    });
  };

  const screenWrapStyle = useMemo<(ViewStyle | false | undefined)[]>(() => {
    const s: (ViewStyle | false | undefined)[] = [styles.screenWrap];
    if (IS_WEB) s.push({ minHeight: viewportHeight, height: viewportHeight });
    return s;
  }, [viewportHeight]);

  const heroStyle = useMemo(
    () => [styles.hero, { height: viewportHeight * WELCOME_HERO_RATIO }],
    [viewportHeight],
  );

  const infoSiteAnchorStyle = useMemo(
    () => [
      styles.infoSiteAnchor,
      {
        top: IS_WEB ? insets.top + spacing[3] : 0,
        right: spacing[4] + insets.right,
        opacity: anyBlocked ? WELCOME_GUEST_AUTH_FLOW.dimTargetOpacity : 1,
      },
    ],
    [insets.top, insets.right, anyBlocked],
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

  const fadeStyle = useMemo(() => [styles.fill, { opacity: fadeAnim }], [fadeAnim]);

  return (
    <View style={screenWrapStyle}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientFill}
        pointerEvents="none"
      />
      <SafeAreaView style={safeOverlayStyle} edges={safeAreaEdges}>
        <RNAnimated.View style={fadeStyle}>
          <KeyboardContainer style={styles.fill} {...keyboardContainerProps}>
            <View style={pageGradientStyle}>
              <View style={pageGradientInnerStyle}>
                <Animated.View
                  style={infoSiteAnchorStyle}
                  pointerEvents={anyBlocked ? 'none' : 'auto'}
                >
                  <SurfaceIconPressable
                    shape="circle"
                    width={contentScale(44)}
                    height={contentScale(44)}
                    onPress={openInfoSite}
                    disabled={anyBlocked}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={t('auth.infoSiteA11yLabel')}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={contentScale(24)}
                      color={palette.primary}
                    />
                  </SurfaceIconPressable>
                </Animated.View>

                <View style={heroStyle}>
                  <View style={styles.heroLogoBox}>
                    <Logo width={contentScale(100)} />
                  </View>
                  <View style={styles.heroTitleWrap}>
                    <Text style={[styles.heroTitle, webScaled?.heroTitle]}>
                      {t('auth.welcomeHeroLine1')}
                      {'\n'}
                      <Text style={[styles.heroTitleAccent, webScaled?.heroTitleAccent]}>
                        {t('auth.welcomeHeroLine2')}
                      </Text>
                    </Text>
                  </View>
                  <Text style={[styles.heroSub, webScaled?.heroSub]}>
                    {t('auth.welcomeSubtitle')}
                  </Text>
                </View>

                <WelcomeAuthForm
                  contentScale={contentScale}
                  webScaled={webScaled}
                  guestAuthPending={guestAuthPending}
                  setGuestAuthPending={setGuestAuthPending}
                />
              </View>
            </View>
          </KeyboardContainer>
        </RNAnimated.View>
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
  infoSiteAnchor: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
});
