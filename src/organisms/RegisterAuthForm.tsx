/**
 * Kayıt formu — WelcomeAuthForm ile aynı görsel dil (etiketler, birincil buton).
 */

import React, { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@/lib/toast';
import { useTranslation } from 'react-i18next';
import { Text } from '@/atoms/Text';
import { FormField } from '@/molecules/FormField';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useValidatedForm } from '@/hooks/useValidatedForm';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import {
  AUTH_NO_CREDENTIAL_EMAIL_PROPS,
  AUTH_NO_CREDENTIAL_PASSWORD_PROPS,
} from '@/constants/authCredentialAutofill';
import { WELCOME_GUEST_AUTH_FLOW } from '@/constants/welcomeGuestAuthFlow';
import { WELCOME_LOGIN_BUTTON_DISABLED_OPACITY } from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import { registerSchema, type RegisterFormValues } from '@/forms/auth/register/schema';

type WebScaled = {
  fieldLabel?: { fontSize: number; lineHeight?: number };
  submitBtn?: { height: number };
  submitBtnText?: { fontSize: number; lineHeight?: number };
};

type Props = {
  contentScale: (n: number) => number;
  webScaled: WebScaled | null;
  footer: ReactNode;
};

export function RegisterAuthForm({ contentScale, webScaled, footer }: Props) {
  const { t, i18n } = useTranslation();
  const { register: signUp } = useSupabaseAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => registerSchema(t), [i18n.language]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useValidatedForm<RegisterFormValues>(schema, {
    defaultValues: { email: '', password: '' },
  });

  const dim = useSharedValue(1);
  useEffect(() => {
    dim.value = withTiming(isSubmitting ? WELCOME_GUEST_AUTH_FLOW.dimTargetOpacity : 1, {
      duration: WELCOME_GUEST_AUTH_FLOW.dimDurationMs,
    });
  }, [isSubmitting, dim]);

  const formRootAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dim.value,
  }));

  const onSubmit = useCallback(
    async (data: RegisterFormValues) => {
      const result = await signUp(data.email.trim(), data.password);
      if (result.ok) {
        if (result.data) {
          // Session geldi → dispatchSession zaten çağrıldı → (auth)/_layout guard → /(tabs)
          toast.success(t('toast.registerSuccess'));
        } else {
          // E-posta doğrulama aktif → doğrulama maili gönderildi
          toast.info(t('toast.registerVerifyEmail'));
          router.replace('/(auth)/welcome');
        }
        return;
      }
      const errorKey = (() => {
        switch (result.errorCode) {
          case 'USER_ALREADY_REGISTERED':
            return 'toast.registerErrorAlreadyRegistered';
          case 'PASSWORD_TOO_SHORT':
            return 'toast.registerErrorPasswordTooShort';
          case 'RATE_LIMITED':
            return 'toast.loginErrorRateLimited';
          default:
            return 'toast.loginErrorUnknown';
        }
      })();
      toast.error(t(errorKey));
    },
    [signUp, t],
  );

  const submitOpacity = isSubmitting ? 1 : WELCOME_LOGIN_BUTTON_DISABLED_OPACITY;

  return (
    <Animated.View
      style={[styles.formRoot, formRootAnimatedStyle]}
      pointerEvents={isSubmitting ? 'none' : 'auto'}
    >
      <View style={styles.heroFormGap} />
      <View style={styles.formSection}>
        <View style={styles.formBlock}>
          <Text style={[styles.fieldLabel, webScaled?.fieldLabel]}>{t('auth.email')}</Text>
          <FormField
            control={control}
            name="email"
            placeholder={t('auth.emailPlaceholder')}
            keyboardType={Platform.OS === 'ios' ? 'default' : 'email-address'}
            autoCapitalize="none"
            editable={!isSubmitting}
            leftIcon={<Ionicons name="mail-outline" size={18} color={palette.gray400} />}
            {...AUTH_NO_CREDENTIAL_EMAIL_PROPS}
          />

          <Text style={[styles.fieldLabel, webScaled?.fieldLabel, styles.passwordLabel]}>
            {t('auth.password')}
          </Text>
          <FormField
            control={control}
            name="password"
            placeholder={t('auth.passwordPlaceholder')}
            secure
            autoCapitalize="none"
            editable={!isSubmitting}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={palette.gray400} />}
            {...AUTH_NO_CREDENTIAL_PASSWORD_PROPS}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              webScaled?.submitBtn,
              { opacity: submitOpacity },
              isSubmitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.85}
            disabled={isSubmitting}
            accessibilityState={{ disabled: isSubmitting }}
          >
            {isSubmitting ? (
              <View style={styles.submitBtnRow}>
                <Ionicons name="reload-outline" size={contentScale(16)} color={palette.white} />
                <Text style={[styles.submitBtnText, webScaled?.submitBtnText]}>
                  {t('auth.registering')}
                </Text>
              </View>
            ) : (
              <Text style={[styles.submitBtnText, webScaled?.submitBtnText]}>
                {t('auth.createAccount')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {footer}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  formRoot: {
    flex: 1,
    minHeight: 0,
  },
  heroFormGap: {
    height: spacing[3],
    flexShrink: 0,
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
  passwordLabel: {
    marginTop: spacing[2],
  },
  submitBtn: {
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
  submitBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  submitBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(16),
    color: palette.white,
    letterSpacing: 0.2,
  },
});
