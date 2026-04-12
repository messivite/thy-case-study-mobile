import type { HapticType, NetworkPreview, OnboardingBackgroundVariant } from '@/types/ui.types';

describe('ui.types — runtime contract', () => {
  it('HapticType değerleri', () => {
    const types: HapticType[] = [
      'light',
      'medium',
      'heavy',
      'selection',
      'error',
      'success',
      'warning',
    ];
    expect(types).toHaveLength(7);
    for (const t of types) {
      expect(typeof t).toBe('string');
    }
  });

  it('NetworkPreview değerleri', () => {
    const values: NetworkPreview[] = [null, 'offline', 'online'];
    expect(values).toHaveLength(3);
  });

  it('OnboardingBackgroundVariant değerleri', () => {
    const variants: OnboardingBackgroundVariant[] = ['red', 'navy', 'gradient'];
    expect(variants).toHaveLength(3);
    for (const v of variants) {
      expect(typeof v).toBe('string');
    }
  });
});
