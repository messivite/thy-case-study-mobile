import React from 'react';
import { Image, ImageStyle, StyleSheet } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogoProps {
  width?: number;
  height?: number;
  tintColor?: string;
  style?: ImageStyle;
}

// ---------------------------------------------------------------------------
// Constants — logo.png natural dimensions: 860×295
// ---------------------------------------------------------------------------

const ASPECT_RATIO = 860 / 295; // ≈ 2.915
const DEFAULT_WIDTH = 150;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Logo: React.FC<LogoProps> = ({
  width = DEFAULT_WIDTH,
  height,
  tintColor,
  style,
}) => {
  const resolvedHeight = height ?? Math.round(width / ASPECT_RATIO);

  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[styles.image, { width, height: resolvedHeight, tintColor }, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  image: {},
});

export default Logo;
