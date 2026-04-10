import React from 'react';
import type { THYIconGlyphProps, THYIconName } from './types';
import { THY_ICON_MAP } from './thyIconMap';

export type THYIconProps = {
  name: THYIconName;
  width?: number;
  height?: number;
} & Omit<THYIconGlyphProps, 'width' | 'height'>;

const DEFAULT_SIZE = 32;

/**
 * THY ikon haritasından isimle SVG render eder; `width` / `height` ile ölçeklenir.
 */
export const THYIcon: React.FC<THYIconProps> = ({
  name,
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE,
  fill,
  fillSecondary,
}) => {
  const Glyph = THY_ICON_MAP[name];
  return <Glyph width={width} height={height} fill={fill} fillSecondary={fillSecondary} />;
};
