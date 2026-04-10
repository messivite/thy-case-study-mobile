import type { TFunction } from 'i18next';
import { z } from 'zod';
import { emailZod, passwordZod } from '@/lib/form/zodHelpers';

/**
 * Welcome / e-posta girişi — mesajlar i18n `auth.validation.*`
 * Başka ekranlarda aynı alanları paylaşmak için buradan import et.
 */
export function welcomeLoginSchema(t: TFunction) {
  return z.object({
    email: emailZod(t('auth.validation.emailRequired'), t('auth.validation.emailInvalid')),
    password: passwordZod(
      6,
      t('auth.validation.passwordRequired'),
      t('auth.validation.passwordMin'),
    ),
  });
}

export type WelcomeLoginFormValues = z.infer<ReturnType<typeof welcomeLoginSchema>>;
