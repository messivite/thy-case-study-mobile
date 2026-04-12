/**
 * responsive.ts — web branch test (no RN import via requireActual).
 * Mocks Platform.OS=web so all functions return identity.
 */
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  PixelRatio: { roundToNearestPixel: (n: number) => n },
}));

import {
  DESIGN_BASE_WIDTH,
  scale,
  verticalScale,
  moderateScale,
  fontScale,
  screen,
} from '@/lib/responsive';

describe('responsive — web identity branch', () => {
  it('DESIGN_BASE_WIDTH 390', () => {
    expect(DESIGN_BASE_WIDTH).toBe(390);
  });

  it('scale — identity', () => {
    expect(scale(16)).toBe(16);
    expect(scale(0)).toBe(0);
    expect(scale(100)).toBe(100);
  });

  it('verticalScale — identity', () => {
    expect(verticalScale(24)).toBe(24);
  });

  it('moderateScale — identity regardless of factor', () => {
    expect(moderateScale(14)).toBe(14);
    expect(moderateScale(14, 0)).toBe(14);
    expect(moderateScale(14, 1)).toBe(14);
  });

  it('fontScale — identity', () => {
    expect(fontScale(13)).toBe(13);
    expect(fontScale(0)).toBe(0);
    expect(fontScale(20)).toBe(20);
  });

  it('screen — Dimensions\'dan gelir', () => {
    expect(screen.width).toBe(390);
    expect(screen.height).toBe(844);
  });
});
