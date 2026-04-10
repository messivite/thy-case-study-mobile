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
import { toast } from '@/lib/toast';
import { registerSchema, type RegisterFormValues } from '@/forms/auth/register/schema';

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { t, currentLanguage } = useI18n();
  const { register } = useSupabaseAuth();

  // eslint-disable-next-line react-hooks/exhaustive-deps -- t referansı stabil değil; dil değişince yeterli
  const schema = useMemo(() => registerSchema(t), [currentLanguage]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    const result = await register(data.email, data.password, data.name);
    if (result.ok) {
      if (result.data) {
        toast.success(t('toast.registerSuccess'));
        router.push('/(tabs)');
      } else {
        // E-posta doğrulama gönderildi
        toast.info('Lütfen e-posta kutunuzu kontrol edin ve hesabınızı doğrulayın.');
        router.replace('/(auth)/login');
      }
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
          {t('auth.createAccount')}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
          {t('auth.noAccount')}
        </Text>

        <View style={styles.form}>
          <FormField
            control={control}
            name="name"
            label={t('auth.name')}
            placeholder={t('auth.namePlaceholder')}
            autoCapitalize="words"
            leftIcon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
          />
          <FormField
            control={control}
            name="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
          />
          <FormField
            control={control}
            name="password"
            label={t('auth.password')}
            placeholder={t('auth.passwordPlaceholder')}
            secure
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
          />
          <FormField
            control={control}
            name="confirmPassword"
            label={t('auth.confirmPassword')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            secure
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
          />

          <Button
            title={t('auth.createAccount')}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text variant="body" color={colors.textSecondary}>
            {t('auth.haveAccount')}{' '}
          </Text>
          <TextButton
            title={t('auth.login')}
            color={colors.primary}
            onPress={() => router.back()}
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
  submitBtn: {
    marginTop: spacing[3],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing[6],
    flexWrap: 'wrap',
  },
});
