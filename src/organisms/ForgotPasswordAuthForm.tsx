/**
 * Şifre unuttum — tek e-posta alanı; aksiyon (API) henüz bağlı değil.
 */

import React, { useCallback, useMemo, type ReactNode } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { FormField } from '@/molecules/FormField';
import { useI18n } from '@/hooks/useI18n';
import { useValidatedForm } from '@/hooks/useValidatedForm';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { AUTH_NO_CREDENTIAL_EMAIL_PROPS } from '@/constants/authCredentialAutofill';
import { WELCOME_LOGIN_BUTTON_DISABLED_OPACITY } from '@/constants/welcomeScreen';
import { fontFamily } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import { forgotPasswordSchema } from '@/forms/auth/forgotPassword/schema';

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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- t referansı stabil değil; dil değişince yeterli
  const schema = useMemo(() => forgotPasswordSchema(t), [currentLanguage]);

  const { control, handleSubmit, formState: { isValid } } = useValidatedForm<ForgotPasswordFormValues>(
    schema,
    {
      defaultValues: { email: '' },
    },
  );

  const onSubmit = useCallback(() => {
    // API / e-posta gönderimi sonra bağlanacak
  }, []);

  const submitOpacity = !isValid ? WELCOME_LOGIN_BUTTON_DISABLED_OPACITY : 1;

  return (
    <View style={styles.formRoot}>
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
            leftIcon={<Ionicons name="mail-outline" size={18} color={palette.gray400} />}
            {...AUTH_NO_CREDENTIAL_EMAIL_PROPS}
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              webScaled?.submitBtn,
              { opacity: submitOpacity },
              !isValid && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit(onSubmit)}
            activeOpacity={0.85}
            disabled={!isValid}
            accessibilityState={{ disabled: !isValid }}
          >
            <Text style={[styles.submitBtnText, webScaled?.submitBtnText]}>
              {t('auth.forgotPasswordSubmit')}
            </Text>
          </TouchableOpacity>
        </View>

        {footer}
      </View>
    </View>
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
