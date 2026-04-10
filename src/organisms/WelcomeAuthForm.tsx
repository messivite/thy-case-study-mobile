/**
 * Welcome login form — useForm burada; her tuşta sadece bu subtree render olur (tüm ekran değil).
 */

import React, { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@/lib/toast';
import { FormField } from '@/molecules/FormField';
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
import {
  WELCOME_LOGIN_BUTTON_DISABLED_OPACITY,
  WELCOME_LOGIN_BUTTON_OPACITY_TRANSITION_MS,
} from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import {
  welcomeLoginSchema,
  type WelcomeLoginFormValues,
} from '@/forms/auth/welcome/schema';

/** Welcome ekranı `webScaled` ile aynı şekil (hero alanları formda kullanılmıyor ama prop uyumu için) */
type WebScaled = {
  heroTitle?: { fontSize: number; lineHeight: number };
  heroTitleAccent?: { fontSize: number; lineHeight: number };
  heroSub?: { fontSize: number; lineHeight: number };
  fieldLabel?: { fontSize: number; lineHeight?: number };
  forgotText?: { fontSize: number; lineHeight?: number };
  loginBtn?: { height: number };
  loginBtnText?: { fontSize: number; lineHeight?: number };
  dividerText?: { fontSize: number; lineHeight?: number };
  googleBtn?: { height: number };
  googleBtnText?: { fontSize: number; lineHeight?: number };
  footerLink?: { fontSize: number; lineHeight?: number };
  guestSigningToast?: { paddingVertical: number; paddingHorizontal: number };
  guestSigningToastText?: { fontSize: number; lineHeight?: number };
};

type Props = {
  contentScale: (n: number) => number;
  webScaled: WebScaled | null;
  guestAuthPending: boolean;
  setGuestAuthPending: Dispatch<SetStateAction<boolean>>;
};

export function WelcomeAuthForm({
  contentScale,
  webScaled,
  guestAuthPending,
  setGuestAuthPending,
}: Props) {
  const { t, currentLanguage } = useI18n();
  const { status } = useAuth();
  const { login, loginWithGoogle, continueAsGuest } = useSupabaseAuth();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // `t` her render’da yeni referans olabiliyor; [t] ile şema sürekli yenilenir → resolver/useForm kilitlenir.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- şemayı sadece dil değişince yenile
  const loginSchema = useMemo(() => welcomeLoginSchema(t), [currentLanguage]);

  const { control, handleSubmit, reset, formState } = useValidatedForm<WelcomeLoginFormValues>(
    loginSchema,
    { defaultValues: { email: '', password: '' } },
  );

  const { isValid } = formState;

  const isLoginPending = status === 'loading';
  const anyPending = isLoginPending || guestAuthPending;

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
      isValid ? 1 : WELCOME_LOGIN_BUTTON_DISABLED_OPACITY,
      { duration: WELCOME_LOGIN_BUTTON_OPACITY_TRANSITION_MS },
    );
  }, [isValid, loginBtnOpacity]);

  useEffect(() => {
    guestDimOpacity.value = withTiming(
      anyPending ? WELCOME_GUEST_AUTH_FLOW.dimTargetOpacity : 1,
      { duration: WELCOME_GUEST_AUTH_FLOW.dimDurationMs },
    );
  }, [anyPending, guestDimOpacity]);

  const onSubmit = useCallback(
    async (data: WelcomeLoginFormValues) => {
      const result = await login(data.email, data.password);
      if (result.ok) {
        toast.success(t('toast.loginSuccess'));
        router.replace('/(tabs)');
      } else {
        reset({ email: data.email, password: '' });
        const errorKey = (() => {
          switch (result.errorCode) {
            case 'INVALID_CREDENTIALS':
              return 'toast.loginErrorInvalidCredentials';
            case 'EMAIL_NOT_CONFIRMED':
              return 'toast.loginErrorEmailNotConfirmed';
            case 'RATE_LIMITED':
              return 'toast.loginErrorRateLimited';
            default:
              return 'toast.loginErrorUnknown';
          }
        })();
        toast.error(t(errorKey));
      }
    },
    [login, t, reset],
  );

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

  return (
    <Animated.View
      style={guestDimAnimatedStyle}
      pointerEvents={anyPending ? 'none' : 'auto'}
    >
      <View style={styles.flexSpacer} />
      <View style={styles.formSection}>
        <View style={styles.formBlock}>
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

          <Animated.View style={loginBtnAnimatedStyle}>
            <TouchableOpacity
              style={[styles.loginBtn, webScaled?.loginBtn]}
              onPress={handleSubmit(onSubmit)}
              activeOpacity={0.85}
              disabled={!isValid || anyPending}
              accessibilityState={{ disabled: !isValid || anyPending }}
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
                <Text style={[styles.loginBtnText, webScaled?.loginBtnText]}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, webScaled?.dividerText]}>{t('auth.orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

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
            <Text style={[styles.footerLink, webScaled?.footerLink]}>{t('auth.continueAsGuest')}</Text>
          </TouchableOpacity>
          <View style={styles.footerDot} />
          <TouchableOpacity
            onPress={handleRegister}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            disabled={anyPending}
            accessibilityState={{ disabled: anyPending }}
          >
            <Text style={[styles.footerLink, webScaled?.footerLink]}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flexSpacer: {
    flex: 1,
    minHeight: 0,
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
