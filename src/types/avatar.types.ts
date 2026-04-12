import type { StyleProp, ViewStyle } from 'react-native';

/** Kare, yuvarlatılmış kare veya tam daire. */
export type AvatarShape = 'square' | 'rounded' | 'circle';

/** width/height verilmediğinde kullanılan hazır boyutlar. */
export type AvatarSizePreset = 'sm' | 'md' | 'lg' | 'xl';

/**
 * uri yok veya yükleme hatası: ikon, baş harfler veya temsili görsel.
 */
export type AvatarFallbackMode = 'icon' | 'initials' | 'placeholder';

export type AvatarProps = {
  /** Uzak görsel URL'i; boş / null ise fallback devreye girer. */
  uri?: string | null;
  /** `fallback="initials"` için; ayrıca erişilebilirlik etiketi. */
  name?: string;
  /** Preset boyut — `width` / `height` yoksa kullanılır. */
  size?: AvatarSizePreset;
  /** Özel genişlik (preset'i geçersiz kılar). */
  width?: number;
  /** Özel yükseklik (verilmezse `width` ile kare kabul edilir). */
  height?: number;
  /** Görünüm şekli. Varsayılan: daire. */
  shape?: AvatarShape;
  /** Görsel yokken ne gösterileceği. Varsayılan: profil ikonu. */
  fallback?: AvatarFallbackMode;
  /** `fallback="placeholder"` iken kullanılacak URL; boşsa sabit temsili URL. */
  placeholderUri?: string;
  style?: StyleProp<ViewStyle>;
};
