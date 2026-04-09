import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { palette } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { radius } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72,
};

type Props = {
  size?: AvatarSize;
  uri?: string | null;
  name?: string;
  style?: ViewStyle;
};

export const Avatar: React.FC<Props> = ({ size = 'md', uri, name, style }) => {
  const { colors } = useTheme();
  const dim = sizeMap[size];
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, { width: dim, height: dim, borderRadius: dim / 2 }] as any}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.initials,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.primary },
        style,
      ]}
    >
      <Text
        style={{
          color: palette.white,
          fontFamily: fontFamily.semiBold,
          fontSize: dim * 0.35,
        }}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
