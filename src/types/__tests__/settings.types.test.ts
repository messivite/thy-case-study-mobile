import type { AppLanguage, ThemeMode, ProfileLoadStatus } from '@/types/settings.types';

describe('settings.types — runtime contract', () => {
  it('AppLanguage değerleri', () => {
    const langs: AppLanguage[] = ['tr', 'en'];
    expect(langs).toHaveLength(2);
    for (const l of langs) {
      expect(typeof l).toBe('string');
    }
  });

  it('ThemeMode değerleri', () => {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    expect(modes).toHaveLength(3);
    for (const m of modes) {
      expect(typeof m).toBe('string');
    }
  });

  it('ProfileLoadStatus değerleri', () => {
    const statuses: ProfileLoadStatus[] = ['idle', 'loading', 'success', 'error'];
    expect(statuses).toHaveLength(4);
    for (const s of statuses) {
      expect(typeof s).toBe('string');
    }
  });
});
