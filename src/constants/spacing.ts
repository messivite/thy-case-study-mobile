// 4px base grid
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

const _nativeShadowTokens = {
  sm: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  md: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  lg: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
} as const;

/**
 * Platform-aware shadow tokens.
 * Web'de shadow* props deprecated — web'de boş obje döner, warning oluşmaz.
 */
export const shadow: {
  sm: Record<string, unknown>;
  md: Record<string, unknown>;
  lg: Record<string, unknown>;
} = Platform.OS === 'web'
  ? { sm: {}, md: {}, lg: {} }
  : _nativeShadowTokens;

import { Platform } from 'react-native';

/**
 * Web'de shadow* style props deprecated — bu helper native-only shadow objesini döndürür.
 * StyleSheet.create içinde spread ile kullan:
 *   ...nativeShadow({ color: '#000', offsetY: 4, opacity: 0.12, radius: 16, elevation: 8 })
 */
export function nativeShadow(opts: {
  color: string;
  offsetX?: number;
  offsetY: number;
  opacity: number;
  radius: number;
  elevation: number;
}): Record<string, unknown> {
  if (Platform.OS === 'web') return {};
  return {
    shadowColor: opts.color,
    shadowOffset: { width: opts.offsetX ?? 0, height: opts.offsetY },
    shadowOpacity: opts.opacity,
    shadowRadius: opts.radius,
    elevation: opts.elevation,
  };
}
