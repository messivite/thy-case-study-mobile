import { z } from 'zod';

/** Giriş / kayıt şifre alanları için tek kaynak (Zod + UI metinleriyle uyumlu tut) */
export const PASSWORD_MIN_LENGTH = 6;

/** Boş / sadece boşluk string'leri reddeder */
export const requiredTrimmedString = (emptyMessage: string) =>
  z.string().trim().min(1, emptyMessage);

export const emailZod = (emptyMessage: string, invalidMessage: string) =>
  requiredTrimmedString(emptyMessage).email(invalidMessage);

/**
 * Şifre — trim yok (RHF değeriyle birebir; boşluklu parolalar da şema ile aynı string).
 * Boş: min(1), sonra min uzunluk.
 */
export const passwordZod = (
  minLength: number,
  emptyMessage: string,
  minMessage: string,
) => z.string().min(1, emptyMessage).min(minLength, minMessage);
