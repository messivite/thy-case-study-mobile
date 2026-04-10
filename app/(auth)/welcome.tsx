/**
 * WelcomeScreen
 *
 * Onboarding bittikten sonra gösterilen ilk auth ekranı.
 * Ekran görüntüsündeki tasarımı referans alır:
 *   - Arka plan: açık gökyüzü LinearGradient
 *   - Üst: hero (logo, başlık); alt: form, giriş, Google, linkler
 *
 * Animasyon: Tek seferlik mount fade-in, sallantı/spring yok.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@/lib/toast';
import { FormField } from '@/molecules/FormField';
import { Logo } from '@/atoms/Logo';
import { SurfaceIconPressable } from '@/atoms/SurfaceIconPressable';
import { Text } from '@/atoms/Text';
import { useAuth } from '@/hooks/useAuth';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useI18n } from '@/hooks/useI18n';
import { useValidatedForm } from '@/hooks/useValidatedForm';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import {
  WELCOME_GUEST_AUTH_FLOW,
  WELCOME_GUEST_SIGNING_TOAST_ID,
} from '@/constants/welcomeGuestAuthFlow';
import { devConfig } from '@/config/devConfig';
import {
  WELCOME_HERO_RATIO,
  WELCOME_INFO_SITE_URL,
  WELCOME_LOGIN_BUTTON_DISABLED_OPACITY,
  WELCOME_LOGIN_BUTTON_OPACITY_TRANSITION_MS,
  WELCOME_MOUNT_FADE_DURATION_MS,
  WELCOME_SKY_GRADIENT,
  WELCOME_SKY_GRADIENT_LOCATIONS,
} from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale, DESIGN_BASE_WIDTH } from '@/lib/responsive';
import { openExternalLink } from '@/lib/openExternalLink';
import {
  welcomeLoginSchema,
  type WelcomeLoginFormValues,
} from '@/schemas/authForms';

// Sabit — Platform.OS runtime'da değişmez
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
  const { login, loginWithGoogle, continueAsGuest } = useSupabaseAuth();
  const [guestAuthPending, setGuestAuthPending] = useState(false);
  const mountedRef = useRef(true);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const loginSchema = useMemo(() => welcomeLoginSchema(t), [t]);

  const { control, handleSubmit, watch, reset } =
    useValidatedForm<WelcomeLoginFormValues>(loginSchema, {
      defaultValues: { email: '', password: '' },
    });

  const email = watch('email');
  const password = watch('password');

  const isLoginPending = status === 'loading';
  const canSubmit = useMemo(
    () => loginSchema.safeParse({ email, password }).success,
    [loginSchema, email, password],
  );
  const anyPending = isLoginPending || guestAuthPending;

  // --- Animations ---
  const loginBtnOpacity = useSharedValue(WELCOME_LOGIN_BUTTON_DISABLED_OPACITY);
  const guestDimOpacity = useSharedValue(1);

  const loginBtnAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loginBtnOpacity.value,
  }));
  const guestDimAnimatedStyle = useAnimatedStyle(() => ({
    opacity: guestDimOpacity.value,
  }));

  useEffect(() => {
    loginBtnOpacity.value = withTiming(
      canSubmit ? 1 : WELCOME_LOGIN_BUTTON_DISABLED_OPACITY,
      { duration: WELCOME_LOGIN_BUTTON_OPACITY_TRANSITION_MS },
    );
  }, [canSubmit, loginBtnOpacity]);

  useEffect(() => {
    guestDimOpacity.value = withTiming(
      anyPending ? WELCOME_GUEST_AUTH_FLOW.dimTargetOpacity : 1,
      { duration: WELCOME_GUEST_AUTH_FLOW.dimDurationMs },
    );
  }, [anyPending, guestDimOpacity]);

  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: WELCOME_MOUNT_FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Authenticated guard
  useEffect(() => {
    if (devConfig.welcomeInitial) return;
    if (status === 'authenticated' || status === 'guest') {
      router.replace('/(tabs)');
    }
  }, [status]);

  if (!devConfig.welcomeInitial && (status === 'authenticated' || status === 'guest')) return null;

  // --- Handlers ---
  const onSubmit = useCallback(async (data: WelcomeLoginFormValues) => {
    const result = await login(data.email, data.password);
    if (result.ok) {
      toast.success(t('toast.loginSuccess'));
      router.replace('/(tabs)');
    } else {
      // Şifre alanını temizle, email'i koru
      reset({ email: data.email, password: '' });

      const errorKey = (() => {
        switch (result.errorCode) {
          case 'INVALID_CREDENTIALS': return 'toast.loginErrorInvalidCredentials';
          case 'EMAIL_NOT_CONFIRMED': return 'toast.loginErrorEmailNotConfirmed';
          case 'RATE_LIMITED': return 'toast.loginErrorRateLimited';
          default: return 'toast.loginErrorUnknown';
        }
      })();
      toast.error(t(errorKey));
    }
  }, [login, t, reset]);

  const handleGoogle = useCallback(async () => {
    await loginWithGoogle();
  }, [loginWithGoogle]);

  const handleGuest = useCallback(async () => {
    if (anyPending) return;
    setGuestAuthPending(true);
    toast.custom(
      <View style={[styles.guestSigningToast, webScaled?.guestSigningToast]}>
        <Text style={[styles.guestSigningToastText, webScaled?.guestSigningToastText]}>
          {t('auth.loggingIn')}
        </Text>
      </View>,
      { id: WELCOME_GUEST_SIGNING_TOAST_ID, ...WELCOME_GUEST_AUTH_FLOW.signingToast },
    );
    try {
      await continueAsGuest();
      router.replace('/(tabs)');
    } finally {
      toast.dismiss(WELCOME_GUEST_SIGNING_TOAST_ID);
      if (mountedRef.current) setGuestAuthPending(false);
    }
  }, [anyPending, continueAsGuest, t, webScaled]);

  const handleRegister = useCallback(() => {
    router.push('/(auth)/register');
  }, []);

  const openInfoSite = useCallback(() => {
    openExternalLink({
      url: WELCOME_INFO_SITE_URL,
      openInApp: () =>
        router.push({
          pathname: '/webview-modal',
          params: { url: WELCOME_INFO_SITE_URL, title: t('auth.infoSiteWebTitle') },
        }),
    });
  }, [t]);

  // --- Computed styles ---
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
      { top: IS_WEB ? insets.top + spacing[3] : 0, right: spacing[4] + insets.right },
      guestDimAnimatedStyle,
    ],
    [insets.top, insets.right, guestDimAnimatedStyle],
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
                  pointerEvents={anyPending ? 'none' : 'auto'}
                >
                  <SurfaceIconPressable
                    shape="circle"
                    width={contentScale(44)}
                    height={contentScale(44)}
                    onPress={openInfoSite}
                    disabled={anyPending}
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

                <Animated.View
                  style={guestDimAnimatedStyle}
                  pointerEvents={anyPending ? 'none' : 'auto'}
                >
                  <View style={styles.flexSpacer} />
                  <View style={styles.formSection}>
                    <View style={styles.formBlock}>
                      {/* Email */}
                      <Text style={[styles.fieldLabel, webScaled?.fieldLabel]}>{t('auth.email')}</Text>
                      <FormField
                        control={control}
                        name="email"
                        placeholder={t('auth.emailPlaceholder')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        editable={!anyPending}
                        leftIcon={<Ionicons name="mail-outline" size={18} color={palette.gray400} />}
                      />

                      {/* Password */}
                      <View style={styles.passwordHeader}>
                        <Text style={[styles.fieldLabel, webScaled?.fieldLabel]}>{t('auth.password')}</Text>
                        <TouchableOpacity
                          onPress={() => {}}
                          hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
                          disabled={anyPending}
                          accessibilityState={{ disabled: anyPending }}
                        >
                          <Text style={[styles.forgotText, webScaled?.forgotText]}>{t('auth.forgotPassword')}</Text>
                        </TouchableOpacity>
                      </View>
                      <FormField
                        control={control}
                        name="password"
                        placeholder={t('auth.passwordPlaceholder')}
                        secure
                        editable={!anyPending}
                      />

                      {/* Login button */}
                      <Animated.View style={loginBtnAnimatedStyle}>
                        <TouchableOpacity
                          style={[styles.loginBtn, webScaled?.loginBtn]}
                          onPress={handleSubmit(onSubmit)}
                          activeOpacity={0.85}
                          disabled={!canSubmit || anyPending}
                          accessibilityState={{ disabled: !canSubmit || anyPending }}
                        >
                          {isLoginPending ? (
                            <View style={styles.loginBtnRow}>
                              <Ionicons
                                name="reload-outline"
                                size={contentScale(16)}
                                color={palette.white}
                              />
                              <Text style={[styles.loginBtnText, webScaled?.loginBtnText]}>
                                {t('auth.loggingIn')}
                              </Text>
                            </View>
                          ) : (
                            <Text style={[styles.loginBtnText, webScaled?.loginBtnText]}>
                              {t('auth.login')}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </Animated.View>

                      {/* Divider */}
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={[styles.dividerText, webScaled?.dividerText]}>
                          {t('auth.orContinueWith')}
                        </Text>
                        <View style={styles.dividerLine} />
                      </View>

                      {/* Google */}
                      <TouchableOpacity
                        style={[styles.googleBtn, webScaled?.googleBtn]}
                        onPress={handleGoogle}
                        activeOpacity={0.85}
                        disabled={anyPending}
                        accessibilityState={{ disabled: anyPending }}
                      >
                        <Ionicons name="logo-google" size={contentScale(18)} color="#4285F4" />
                        <Text style={[styles.googleBtnText, webScaled?.googleBtnText]}>
                          {t('auth.loginWithGoogle')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                      <TouchableOpacity
                        onPress={handleGuest}
                        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                        disabled={anyPending}
                        accessibilityState={{ disabled: anyPending }}
                      >
                        <Text style={[styles.footerLink, webScaled?.footerLink]}>
                          {t('auth.continueAsGuest')}
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.footerDot} />
                      <TouchableOpacity
                        onPress={handleRegister}
                        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                        disabled={anyPending}
                        accessibilityState={{ disabled: anyPending }}
                      >
                        <Text style={[styles.footerLink, webScaled?.footerLink]}>
                          {t('auth.register')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              </View>
            </View>
          </KeyboardContainer>
        </RNAnimated.View>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  flexSpacer: {
    flex: 1,
    minHeight: 0,
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
  formSection: {
    flexShrink: 0,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  formBlock: {
    flexShrink: 0,
  },
  fieldLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(12),
    color: palette.gray600,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing[1],
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
    marginTop: spacing[2],
  },
  forgotText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(12),
    color: palette.primary,
    letterSpacing: 0.2,
  },
  loginBtn: {
    backgroundColor: palette.primary,
    borderRadius: radius.xl,
    height: scale(52),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  loginBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loginBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(16),
    color: palette.white,
    letterSpacing: 0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing[5],
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.gray100,
  },
  dividerText: {
    fontFamily: fontFamily.regular,
    fontSize: scale(12),
    color: palette.gray400,
    letterSpacing: 0.2,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: scale(52),
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: palette.gray200,
    backgroundColor: palette.white,
    gap: spacing[3],
  },
  googleBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(15),
    color: palette.gray700,
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  footerLink: {
    fontFamily: fontFamily.medium,
    fontSize: scale(12),
    color: palette.gray400,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 999,
    backgroundColor: palette.gray300,
  },
  guestSigningToast: {
    backgroundColor: '#000000',
    paddingVertical: scale(14),
    paddingHorizontal: scale(22),
    borderRadius: radius.lg,
    alignSelf: 'center',
    maxWidth: '92%',
  },
  guestSigningToastText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(15),
    color: palette.white,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
