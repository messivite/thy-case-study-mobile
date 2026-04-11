import type { THYIconName, THYIconGlyph } from '@/atoms/thy-icon/types';
import { ThyLoadingSvg } from '@/atoms/thy-icon/icons/ThyLoadingSvg';

/**
 * İsim → SVG bileşeni. Yeni ikon: `THY_ICON_NAMES` + bu map + `icons/` altında glyph.
 */
export const THY_ICON_MAP: Record<THYIconName, THYIconGlyph> = {
  'thy-loading': ThyLoadingSvg,
};
