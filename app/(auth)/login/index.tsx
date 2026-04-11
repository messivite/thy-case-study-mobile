import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotiView } from '@/lib/motiView';
import { Ionicons } from '@expo/vector-icons';
import { AuthLayout } from '@/templates/AuthLayout';
import { FormField } from '@/molecules/FormField';
import { Button } from '@/atoms/Button';
import { IconButton } from '@/atoms/IconButton';
import { TextButton } from '@/atoms/TextButton';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { spacing } from '@/constants/spacing';
import { AUTH_NO_CREDENTIAL_SAVE_PROPS } from '@/constants/authCredentialAutofill';
import { toast } from '@/lib/toast';
import { loginSchema, type LoginFormValues } from '@/forms/auth/login/schema';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t, currentLanguage } = useI18n();
  const { login } = useSupabaseAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps -- t referansı stabil değil; dil değişince yeterli
  const schema = useMemo(() => loginSchema(t), [currentLanguage]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormValues) => {
    const result = await login(data.email, data.password);
    if (result.ok) {
      router.push('/(tabs)');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <AuthLayout>
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 350 }}
      >
        <IconButton onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </IconButton>

        <Text variant="h2" style={styles.title}>
          {t('auth.login')}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t('auth.welcomeSubtitle')}
        </Text>

        <View style={styles.form}>
          <FormField
            control={control}
            name="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
            {...AUTH_NO_CREDENTIAL_SAVE_PROPS}
          />
          <FormField
            control={control}
            name="password"
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            secure
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
            {...AUTH_NO_CREDENTIAL_SAVE_PROPS}
          />

          <TextButton
            title={t('auth.forgotPassword')}
            color={colors.primary}
            variant="label"
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgotpassword')}
            hapticType="light"
          />

          <Button
            title={t('auth.login')}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="body" color={colors.textSecondary}>
            {t('auth.noAccount')}{' '}
          </Text>
          <TextButton
            title={t('auth.register')}
            color={colors.primary}
            onPress={() => router.push('/(auth)/register')}
            hapticType="light"
          />
        </View>
      </MotiView>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginBottom: spacing[4],
    alignSelf: 'flex-start',
    padding: spacing[1],
  },
  title: {
    marginBottom: spacing[1],
  },
  subtitle: {
    marginBottom: spacing[6],
  },
  form: {
    gap: spacing[1],
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: spacing[2],
    marginTop: -spacing[2],
    paddingVertical: spacing[1],
  },
  submitBtn: {
    marginTop: spacing[2],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[6],
    flexWrap: 'wrap',
  },
});
