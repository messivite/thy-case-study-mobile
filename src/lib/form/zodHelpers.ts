import { z } from 'zod';

/** Boş / sadece boşluk string’leri reddeder */
export const requiredTrimmedString = (emptyMessage: string) =>
  z.string().trim().min(1, emptyMessage);

export const emailZod = (emptyMessage: string, invalidMessage: string) =>
  requiredTrimmedString(emptyMessage).email(invalidMessage);

/** Önce zorunluluk, sonra min uzunluk (mesaj sırası doğru çıkar) */
export const passwordZod = (
  minLength: number,
  emptyMessage: string,
  minMessage: string,
) =>
  requiredTrimmedString(emptyMessage).min(minLength, minMessage);
