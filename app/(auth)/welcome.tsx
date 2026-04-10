/**
 * WelcomeScreen
 *
 * Onboarding bittikten sonra gösterilen ilk auth ekranı.
 * Ekran görüntüsündeki tasarımı referans alır:
 *   - Üst %45: açık mavi-gri gradient hero (uçak ikonu, başlık, alt başlık)
 *   - Alt: form alanı (beyaz kart yok — gradient ile devam), giriş, Google, linkler
 *
 * Animasyon: Tek seferlik mount fade-in, sallantı/spring yok.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  useWindowDimensions,
  StatusBar,
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
import { toast } from 'sonner-native';
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
import { fontFamily, fontSize } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import {
  welcomeLoginSchema,
  type WelcomeLoginFormValues,
} from '@/schemas/authForms';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Daha alçak hero → form alanı yukarı, tek ekranda sabit layout */
const HERO_RATIO = 0.30;

/** Tam ekran dikey gökyüzü → açık ton (referans: üst #B6D8E4, alt #F0F7F9) */
const WELCOME_SKY_GRADIENT = ['#B6D8E4', '#C9E4ED', '#E0F0F5', '#F0F7F9'] as const;
const WELCOME_SKY_LOCATIONS = [0, 0.32, 0.68, 1] as const;

const INFO_SITE_URL = 'https://mustafaaksoy.dev/';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { t } = useI18n();
  const { status } = useAuth();
  const { login, loginWithGoogle, continueAsGuest } = useSupabaseAuth();

  // Mount fade-in — tek seferlik, RN Animated (Reanimated bağımlılığı yok burada)
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, []);

  // Authenticated guard
  useEffect(() => {
    if (status === 'authenticated' || status === 'guest') {
      router.replace('/(tabs)');
    }
  }, [status]);

  if (status === 'authenticated' || status === 'guest') return null;

  const loginSchema = useMemo(() => welcomeLoginSchema(t), [t]);

  const { control, handleSubmit, watch, formState: { isSubmitting } } =
    useValidatedForm<WelcomeLoginFormValues>(loginSchema, {
      defaultValues: { email: '', password: '' },
    });

  const email = watch('email');
  const password = watch('password');
  const canSubmit = useMemo(
    () => loginSchema.safeParse({ email, password }).success,
    [loginSchema, email, password],
  );

  const loginBtnOpacity = useSharedValue(0.42);
  useEffect(() => {
    loginBtnOpacity.value = withTiming(canSubmit ? 1 : 0.42, { duration: 220 });
  }, [canSubmit, loginBtnOpacity]);

  const loginBtnAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loginBtnOpacity.value,
  }));

  const onSubmit = async (data: WelcomeLoginFormValues) => {
    const result = await login(data.email, data.password);
    if (result.ok) {
      toast.success(t('toast.loginSuccess'));
    } else {
      toast.error(result.error);
    }
  };

  const handleGoogle = async () => {
    await loginWithGoogle();
  };

  const handleGuest = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  const openInfoSite = () => {
    router.push({
      pathname: '/webview-modal',
      params: {
        url: INFO_SITE_URL,
        title: t('auth.infoSiteWebTitle'),
      },
    });
  };

  return (
    <View style={styles.screenWrap}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <LinearGradient
        colors={[...WELCOME_SKY_GRADIENT]}
        locations={[...WELCOME_SKY_LOCATIONS]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientFill}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeOverlay} edges={['bottom']}>
        <RNAnimated.View
          style={[
            styles.fill,
            { opacity: fadeAnim, paddingTop: insets.top },
          ]}
        >
        <KeyboardAvoidingView
          style={styles.fill}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <View style={styles.pageGradient}>
              <SurfaceIconPressable
                shape="circle"
                width={scale(44)}
                height={scale(44)}
                onPress={openInfoSite}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={t('auth.infoSiteA11yLabel')}
                style={[
                  styles.infoSiteAnchor,
                  { top: 0, right: spacing[4] + insets.right },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={scale(24)}
                  color={palette.primary}
                />
              </SurfaceIconPressable>

              <View style={[styles.hero, { height: windowHeight * HERO_RATIO }]}>
                <View style={styles.heroLogoBox}>
                  <Logo width={scale(100)} />
                </View>
                <View style={styles.heroTitleWrap}>
                  <Text style={styles.heroTitle}>
                    {t('auth.welcomeHeroLine1')}
                    {'\n'}
                    <Text style={styles.heroTitleAccent}>{t('auth.welcomeHeroLine2')}</Text>
                  </Text>
                </View>
                <Text style={styles.heroSub}>
                  {t('auth.welcomeSubtitle')}
                </Text>
              </View>

              {/* Klavye açılınca sıkışır; form alta yapışır, scroll yok */}
              <View style={styles.flexSpacer} />

              <View style={styles.formSection}>
              <View style={styles.formBlock}>
              {/* Email */}
              <Text style={styles.fieldLabel}>{t('auth.email')}</Text>
              <FormField
                control={control}
                name="email"
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Ionicons name="mail-outline" size={18} color={palette.gray400} />}
              />

              {/* Password */}
              <View style={styles.passwordHeader}>
                <Text style={styles.fieldLabel}>{t('auth.password')}</Text>
                <TouchableOpacity
                  onPress={() => {}}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
                >
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              </View>
              <FormField
                control={control}
                name="password"
                placeholder={t('auth.passwordPlaceholder')}
                secure
              />

              {/* Login butonu — geçersiz formda disabled + düşük opacity (Reanimated) */}
              <Animated.View style={loginBtnAnimatedStyle}>
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={handleSubmit(onSubmit)}
                  activeOpacity={0.85}
                  disabled={!canSubmit || isSubmitting}
                  accessibilityState={{ disabled: !canSubmit || isSubmitting }}
                >
                  {isSubmitting ? (
                    <View style={styles.loginBtnRow}>
                      <Ionicons name="reload-outline" size={scale(16)} color={palette.white} />
                      <Text style={styles.loginBtnText}>{t('auth.loggingIn')}</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogle}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google" size={scale(18)} color="#4285F4" />
                <Text style={styles.googleBtnText}>{t('auth.loginWithGoogle')}</Text>
              </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity onPress={handleGuest} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
                  <Text style={styles.footerLink}>{t('auth.continueAsGuest')}</Text>
                </TouchableOpacity>
                <View style={styles.footerDot} />
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/register')}
                  hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                >
                  <Text style={styles.footerLink}>{t('auth.register')}</Text>
                </TouchableOpacity>
              </View>
              </View>
          </View>
        </KeyboardAvoidingView>
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
  fill: {
    flex: 1,
  },
  pageGradient: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
    position: 'relative',
    flexDirection: 'column',
  },
  flexSpacer: {
    flex: 1,
    minHeight: 0,
  },
  infoSiteAnchor: {
    position: 'absolute',
    zIndex: 2,
  },

  // Hero (yükseklik: windowHeight * HERO_RATIO — useWindowDimensions)
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  /** Onboarding V2 header ile aynı THY logo kabı */
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

  // Form
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

  // Login button
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

  // Divider
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

  // Google
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

  // Footer
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
});
