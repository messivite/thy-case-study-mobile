import type { TFunction } from 'i18next';
import { z } from 'zod';

export function editProfileSchema(t: TFunction) {
  return z.object({
    displayName: z.string().trim().min(2, t('settings.displayNameMin')),
  });
}

export type EditProfileFormValues = z.infer<ReturnType<typeof editProfileSchema>>;
