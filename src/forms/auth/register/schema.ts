import type { TFunction } from 'i18next';
import { z } from 'zod';
import { emailZod, PASSWORD_MIN_LENGTH, passwordZod } from '@/lib/form/zodHelpers';

/** Kayıt ekranı — e-posta + şifre */
export function registerSchema(t: TFunction) {
  return z.object({
    email: emailZod(t('auth.validation.emailRequired'), t('auth.validation.emailInvalid')),
    password: passwordZod(
      PASSWORD_MIN_LENGTH,
      t('auth.validation.passwordRequired'),
      t('auth.validation.passwordMin'),
    ),
  });
}

export type RegisterFormValues = z.infer<ReturnType<typeof registerSchema>>;
