import React, { useEffect, useMemo, useState } from 'react';
import { View, Image, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { palette } from '@/constants/colors';
import { AVATAR_PRESET_SIZES, DEFAULT_AVATAR_PLACEHOLDER_URI } from '@/constants/avatar';
import { useTheme } from '@/hooks/useTheme';
import { fontFamily } from '@/constants/typography';
import type { AvatarProps, AvatarShape } from '@/types/avatar.types';

export type { AvatarProps, AvatarShape, AvatarFallbackMode, AvatarSizePreset } from '@/types/avatar.types';

function resolveDimensions(props: AvatarProps): { width: number; height: number } {
  const { width, height, size = 'md' } = props;
  if (width != null && height != null) {
    return { width, height };
  }
  if (width != null) {
    return { width, height: width };
  }
  if (height != null) {
    return { width: height, height };
  }
  const d = AVATAR_PRESET_SIZES[size];
  return { width: d, height: d };
}

function resolveBorderRadius(shape: AvatarShape, w: number, h: number): number {
  const m = Math.min(w, h);
  switch (shape) {
    case 'square':
      return 0;
    case 'rounded':
      return Math.round(m * 0.2);
    case 'circle':
    default:
      return m / 2;
  }
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 'md',
  width: widthProp,
  height: heightProp,
  shape = 'circle',
  fallback = 'icon',
  placeholderUri,
  style,
}) => {
  const { colors } = useTheme();
  const { width, height } = useMemo(
    () => resolveDimensions({ size, width: widthProp, height: heightProp }),
    [size, widthProp, heightProp],
  );

  const borderRadius = useMemo(() => resolveBorderRadius(shape, width, height), [shape, width, height]);

  const [imageFailed, setImageFailed] = useState(false);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);
  const trimmedUri = uri?.trim() ?? '';

  useEffect(() => {
    setImageFailed(false);
    setPlaceholderFailed(false);
  }, [trimmedUri, fallback, placeholderUri]);

  const showRemoteAvatar = Boolean(trimmedUri) && !imageFailed;

  const frameStyle: ViewStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
    }),
    [width, height, borderRadius, colors.surfaceAlt],
  );

  const initials = useMemo(() => {
    if (!name?.trim()) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }, [name]);

  const iconSize = Math.round(Math.min(width, height) * 0.52);
  const label = name?.trim() || 'Avatar';

  if (showRemoteAvatar) {
    return (
      <View accessibilityLabel={label} accessibilityRole="image" style={[frameStyle, style]}>
        <Image
          source={{ uri: trimmedUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  if (fallback === 'placeholder' && !placeholderFailed) {
    const ph = placeholderUri?.trim() || DEFAULT_AVATAR_PLACEHOLDER_URI;
    return (
      <View accessibilityLabel={label} accessibilityRole="image" style={[frameStyle, style]}>
        <Image
          source={{ uri: ph }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setPlaceholderFailed(true)}
        />
      </View>
    );
  }

  if (fallback === 'initials') {
    return (
      <View
        accessibilityLabel={label}
        accessibilityRole="image"
        style={[frameStyle, styles.centered, { backgroundColor: colors.primary }, style]}
      >
        <Text
          style={{
            color: palette.white,
            fontFamily: fontFamily.semiBold,
            fontSize: Math.min(width, height) * 0.35,
          }}
        >
          {initials}
        </Text>
      </View>
    );
  }

  // icon (default)
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      style={[frameStyle, styles.centered, style]}
    >
      <Ionicons name="person" size={iconSize} color={colors.textSecondary} />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { AVATAR_PRESET_SIZES, DEFAULT_AVATAR_PLACEHOLDER_URI } from '@/constants/avatar';
