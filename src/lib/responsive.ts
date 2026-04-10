/**
 * responsive.ts
 *
 * Tasarım referansı: 390×844 (iPhone 14)
 *
 * scale()          → yatay ölçek (genişlik bazlı UI elemanları)
 * verticalScale()  → dikey ölçek (padding / margin / yükseklik)
 * moderateScale()  → karma ölçek — font boyutları için ideal
 * fontScale()      → PixelRatio normalize edilmiş font boyutu
 *
 * Web'de tüm fonksiyonlar identity döner — CSS/browser zaten responsive.
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

export const DESIGN_BASE_WIDTH = 390;
const BASE_HEIGHT = 844;
const BASE_WIDTH = DESIGN_BASE_WIDTH;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Yatay ölçek — genişliğe orantılı */
export const scale = (size: number): number =>
  Math.round((SCREEN_W / BASE_WIDTH) * size);

/** Dikey ölçek — yüksekliğe orantılı */
export const verticalScale = (size: number): number =>
  Math.round((SCREEN_H / BASE_HEIGHT) * size);

/**
 * Karma ölçek — büyük/küçük ekranlar arası dengeli ölçekleme.
 * factor = 0 → sabit boyut, factor = 1 → tam ölçek
 * Varsayılan 0.5: tasarım niyetini korur, aşırı büyümez.
 */
export const moderateScale = (size: number, factor = 0.5): number =>
  Math.round(size + (scale(size) - size) * factor);

/**
 * Font ölçeği — PixelRatio normalize + moderateScale.
 * Web'de sabit kalır (browser font scaling yeterli).
 */
export const fontScale = (size: number): number => {
  if (Platform.OS === 'web') return size;
  return Math.round(PixelRatio.roundToNearestPixel(moderateScale(size)));
};

/** Mevcut ekran boyutları — bileşenlerde kullanım için */
export const screen = {
  width: SCREEN_W,
  height: SCREEN_H,
} as const;
