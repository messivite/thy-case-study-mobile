import type { TFunction } from 'i18next';
import { z } from 'zod';
import { emailZod, PASSWORD_MIN_LENGTH, passwordZod } from '@/lib/form/zodHelpers';

/** Welcome ekranı — i18n `auth.validation.*` */
export function welcomeLoginSchema(t: TFunction) {
  return z.object({
    email: emailZod(t('auth.validation.emailRequired'), t('auth.validation.emailInvalid')),
    password: passwordZod(
      PASSWORD_MIN_LENGTH,
      t('auth.validation.passwordRequired'),
      t('auth.validation.passwordMin'),
    ),
  });
}

export type WelcomeLoginFormValues = z.infer<ReturnType<typeof welcomeLoginSchema>>;
