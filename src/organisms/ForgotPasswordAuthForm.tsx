/**
 * Şifre unuttum — tek e-posta alanı; Supabase resetPassword bağlı.
 */

import React, { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { toast } from '@/lib/toast';
import { Text } from '@/atoms/Text';
import { FormField } from '@/molecules/FormField';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useI18n } from '@/hooks/useI18n';
import { useValidatedForm } from '@/hooks/useValidatedForm';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { AUTH_NO_CREDENTIAL_EMAIL_PROPS } from '@/constants/authCredentialAutofill';
import { WELCOME_GUEST_AUTH_FLOW } from '@/constants/welcomeGuestAuthFlow';
import { WELCOME_LOGIN_BUTTON_DISABLED_OPACITY } from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import { useHaptics } from '@/hooks/useHaptics';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/forms/auth/forgotPassword/schema';

type WebScaled = {
  fieldLabel?: { fontSize: number; lineHeight?: number };
  submitBtn?: { height: number };
  submitBtnText?: { fontSize: number; lineHeight?: number };
};

type Props = {
  webScaled: WebScaled | null;
  footer: ReactNode;
};

export function ForgotPasswordAuthForm({ webScaled, footer }: Props) {
  const { t, currentLanguage } = useI18n();
  const { forgotPassword } = useSupabaseAuth();
  const haptics = useHaptics();

  // eslint-disable-next-line react-hooks/exhaustive-deps -- t referansı stabil değil; dil değişince yeterli
  const schema = useMemo(() => forgotPasswordSchema(t), [currentLanguage]);

  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useValidatedForm<ForgotPasswordFormValues>(schema, {
    defaultValues: { email: '' },
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
    async (data: ForgotPasswordFormValues) => {
      const result = await forgotPassword(data.email.trim());
      if (result.ok) {
        toast.success(t('toast.forgotPasswordSuccess'));
      } else {
        const errorKey = result.errorCode === 'RATE_LIMITED'
          ? 'toast.loginErrorRateLimited'
          : 'toast.forgotPasswordError';
        toast.error(t(errorKey));
      }
    },
    [forgotPassword, t],
  );

  const submitOpacity = isSubmitting ? 1 : !isValid ? WELCOME_LOGIN_BUTTON_DISABLED_OPACITY : 1;

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

          <TouchableOpacity
            style={[
              styles.submitBtn,
              webScaled?.submitBtn,
              { opacity: submitOpacity },
              (!isValid || isSubmitting) && styles.submitBtnDisabled,
            ]}
            onPress={() => { haptics.medium(); handleSubmit(onSubmit)(); }}
            activeOpacity={0.85}
            disabled={!isValid || isSubmitting}
            accessibilityState={{ disabled: !isValid || isSubmitting }}
          >
            {isSubmitting ? (
              <View style={styles.submitBtn}>
                <Ionicons name="reload-outline" size={scale(16)} color={palette.white} />
                <Text style={[styles.submitBtnText, webScaled?.submitBtnText]}>
                  {t('auth.sending')}
                </Text>
              </View>
            ) : (
              <Text style={[styles.submitBtnText, webScaled?.submitBtnText]}>
                {t('auth.forgotPasswordSubmit')}
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
  submitBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(16),
    color: palette.white,
    letterSpacing: 0.2,
  },
});
