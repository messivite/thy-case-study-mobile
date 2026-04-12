import {
  WELCOME_HERO_RATIO,
  WELCOME_SKY_GRADIENT,
  WELCOME_SKY_GRADIENT_LOCATIONS,
  WELCOME_MOUNT_FADE_DURATION_MS,
  WELCOME_LOGIN_BUTTON_DISABLED_OPACITY,
} from '@/constants/welcomeScreen';

describe('welcomeScreen constants', () => {
  it('WELCOME_HERO_RATIO 0-1 arası', () => {
    expect(WELCOME_HERO_RATIO).toBeGreaterThan(0);
    expect(WELCOME_HERO_RATIO).toBeLessThan(1);
  });

  it('WELCOME_SKY_GRADIENT 4 renk içeriyor', () => {
    expect(WELCOME_SKY_GRADIENT).toHaveLength(4);
  });

  it('WELCOME_SKY_GRADIENT geçerli hex renkleri', () => {
    for (const color of WELCOME_SKY_GRADIENT) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('WELCOME_SKY_GRADIENT_LOCATIONS 4 eleman, 0-1 arası', () => {
    expect(WELCOME_SKY_GRADIENT_LOCATIONS).toHaveLength(4);
    for (const loc of WELCOME_SKY_GRADIENT_LOCATIONS) {
      expect(loc).toBeGreaterThanOrEqual(0);
      expect(loc).toBeLessThanOrEqual(1);
    }
  });

  it('WELCOME_SKY_GRADIENT_LOCATIONS artan sırada', () => {
    const locs = [...WELCOME_SKY_GRADIENT_LOCATIONS];
    for (let i = 1; i < locs.length; i++) {
      expect(locs[i]).toBeGreaterThan(locs[i - 1]);
    }
  });

  it('WELCOME_MOUNT_FADE_DURATION_MS pozitif', () => {
    expect(WELCOME_MOUNT_FADE_DURATION_MS).toBeGreaterThan(0);
  });

  it('WELCOME_LOGIN_BUTTON_DISABLED_OPACITY 0-1 arası', () => {
    expect(WELCOME_LOGIN_BUTTON_DISABLED_OPACITY).toBeGreaterThan(0);
    expect(WELCOME_LOGIN_BUTTON_DISABLED_OPACITY).toBeLessThan(1);
  });
});
