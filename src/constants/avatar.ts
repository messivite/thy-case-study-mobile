import type { AvatarSizePreset } from '@/types/avatar.types';

/** Preset kare boyutlar (px). */
export const AVATAR_PRESET_SIZES: Record<AvatarSizePreset, number> = {
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72,
} as const;

/**
 * Temsili uzak avatar görseli (DiceBear). `fallback="placeholder"` veya özel kullanım.
 * Ağ erişimi gerekir; offline'da onError ile ikona düşülebilir.
 */
export const DEFAULT_AVATAR_PLACEHOLDER_URI =
  'https://api.dicebear.com/7.x/avataaars/png?seed=thy-assistant&size=256' as const;
