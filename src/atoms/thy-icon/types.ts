import type { FC } from 'react';

/** Yeni ikon: buraya string literal ekle + `thyIconMap`e bileşen bağla. */
export const THY_ICON_NAMES = ['thy-loading'] as const;

export type THYIconName = (typeof THY_ICON_NAMES)[number];

export type THYIconGlyphProps = {
  width: number;
  height: number;
  /** Kurumsal kırmızı alanlar */
  fill?: string;
  /** Beyaz / ikincil alanlar */
  fillSecondary?: string;
};

export type THYIconGlyph = FC<THYIconGlyphProps>;
