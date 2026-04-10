import type { TFunction } from 'i18next';
import { z } from 'zod';
import { emailZod, PASSWORD_MIN_LENGTH, passwordZod } from '@/lib/form/zodHelpers';

/** Login ekranı — welcome ile aynı alan kuralları, mesajlar i18n */
export function loginSchema(t: TFunction) {
  return z.object({
    email: emailZod(t('auth.validation.emailRequired'), t('auth.validation.emailInvalid')),
    password: passwordZod(
      PASSWORD_MIN_LENGTH,
      t('auth.validation.passwordRequired'),
      t('auth.validation.passwordMin'),
    ),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof loginSchema>>;
