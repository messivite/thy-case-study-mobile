import { devConfig } from '@/config/devConfig';

describe('devConfig', () => {
  it('onboardingV2BackgroundVariant geçerli bir variant', () => {
    const valid = ['red', 'navy', 'gradient'];
    expect(valid).toContain(devConfig.onboardingV2BackgroundVariant);
  });

  it('networkSheetPreview varsayılan null', () => {
    expect(devConfig.networkSheetPreview).toBeNull();
  });

  it('networkSheetPreview geçerli değerlerden biri veya null', () => {
    const valid = [null, 'offline', 'online'];
    expect(valid).toContain(devConfig.networkSheetPreview);
  });
});
