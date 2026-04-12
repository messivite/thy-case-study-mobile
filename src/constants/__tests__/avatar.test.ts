import { AVATAR_PRESET_SIZES, DEFAULT_AVATAR_PLACEHOLDER_URI } from '@/constants/avatar';

describe('avatar constants', () => {
  it('AVATAR_PRESET_SIZES sm < md < lg < xl', () => {
    expect(AVATAR_PRESET_SIZES.sm).toBeLessThan(AVATAR_PRESET_SIZES.md);
    expect(AVATAR_PRESET_SIZES.md).toBeLessThan(AVATAR_PRESET_SIZES.lg);
    expect(AVATAR_PRESET_SIZES.lg).toBeLessThan(AVATAR_PRESET_SIZES.xl);
  });

  it('AVATAR_PRESET_SIZES tüm boyutlar pozitif', () => {
    for (const size of Object.values(AVATAR_PRESET_SIZES)) {
      expect(size).toBeGreaterThan(0);
    }
  });

  it('AVATAR_PRESET_SIZES sm 32px', () => {
    expect(AVATAR_PRESET_SIZES.sm).toBe(32);
  });

  it('AVATAR_PRESET_SIZES md 40px', () => {
    expect(AVATAR_PRESET_SIZES.md).toBe(40);
  });

  it('DEFAULT_AVATAR_PLACEHOLDER_URI tanımlı string', () => {
    expect(typeof DEFAULT_AVATAR_PLACEHOLDER_URI).toBe('string');
    expect(DEFAULT_AVATAR_PLACEHOLDER_URI.length).toBeGreaterThan(0);
  });
});
