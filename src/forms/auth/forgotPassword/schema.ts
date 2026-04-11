import type { TFunction } from 'i18next';
import { z } from 'zod';
import { emailZod } from '@/lib/form/zodHelpers';

/** Şifre sıfırlama — yalnızca e-posta (UI doğrulama) */
export function forgotPasswordSchema(t: TFunction) {
  return z.object({
    email: emailZod(t('auth.validation.emailRequired'), t('auth.validation.emailInvalid')),
  });
}

export type ForgotPasswordFormValues = z.infer<ReturnType<typeof forgotPasswordSchema>>;
