/**
 * Welcome ekranı — layout, görsel ve genel animasyon sabitleri.
 */

/** Daha alçak hero → form alanı yukarı, tek ekranda sabit layout */
export const WELCOME_HERO_RATIO = 0.3;

/** Tam ekran dikey gökyüzü → açık ton (üst #B6D8E4, alt #F0F7F9) */
export const WELCOME_SKY_GRADIENT = [
  '#B6D8E4',
  '#C9E4ED',
  '#E0F0F5',
  '#F0F7F9',
] as const;

export const WELCOME_SKY_GRADIENT_LOCATIONS = [0, 0.32, 0.68, 1] as const;

/** Bilgi ikonu → webview */
export const WELCOME_INFO_SITE_URL = 'https://mustafaaksoy.dev/';

/** İlk mount fade-in (RN Animated) */
export const WELCOME_MOUNT_FADE_DURATION_MS = 120;

/** Giriş butonu — form geçersizken düşük opacity (`WelcomeAuthForm` RN style) */
export const WELCOME_LOGIN_BUTTON_DISABLED_OPACITY = 0.52;
