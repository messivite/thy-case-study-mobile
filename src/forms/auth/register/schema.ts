import type { TFunction } from 'i18next';
import { z } from 'zod';
import { emailZod, PASSWORD_MIN_LENGTH, passwordZod } from '@/lib/form/zodHelpers';

/** Kayıt ekranı — alan + şifre eşleşmesi */
export function registerSchema(t: TFunction) {
  return z
    .object({
      name: z.string().min(2, t('auth.validation.nameRequired')),
      email: emailZod(t('auth.validation.emailRequired'), t('auth.validation.emailInvalid')),
      password: passwordZod(
        PASSWORD_MIN_LENGTH,
        t('auth.validation.passwordRequired'),
        t('auth.validation.passwordMin'),
      ),
      confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: t('auth.validation.passwordsNoMatch'),
      path: ['confirmPassword'],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof registerSchema>>;
