jest.mock('@/lib/responsive', () => ({
  fontScale: (size: number) => size,
}));

import { fontFamily, fontSize, lineHeight, textVariants } from '@/constants/typography';

describe('fontFamily', () => {
  it('tüm ağırlıklar tanımlı', () => {
    expect(fontFamily.regular).toBe('Inter_400Regular');
    expect(fontFamily.medium).toBe('Inter_500Medium');
    expect(fontFamily.semiBold).toBe('Inter_600SemiBold');
    expect(fontFamily.bold).toBe('Inter_700Bold');
  });
});

describe('fontSize', () => {
  it('xs < sm < base < md < lg < xl < 2xl < 3xl < 4xl', () => {
    expect(fontSize.xs).toBeLessThan(fontSize.sm);
    expect(fontSize.sm).toBeLessThan(fontSize.base);
    expect(fontSize.base).toBeLessThan(fontSize.md);
    expect(fontSize.md).toBeLessThan(fontSize.lg);
    expect(fontSize.lg).toBeLessThan(fontSize.xl);
    expect(fontSize.xl).toBeLessThan(fontSize['2xl']);
    expect(fontSize['2xl']).toBeLessThan(fontSize['3xl']);
    expect(fontSize['3xl']).toBeLessThan(fontSize['4xl']);
  });

  it('temel boyutlar doğru (fontScale identity mock ile)', () => {
    expect(fontSize.xs).toBe(11);
    expect(fontSize.sm).toBe(13);
    expect(fontSize.base).toBe(15);
  });
});

describe('lineHeight', () => {
  it('tight < normal < relaxed', () => {
    expect(lineHeight.tight).toBeLessThan(lineHeight.normal);
    expect(lineHeight.normal).toBeLessThan(lineHeight.relaxed);
  });
});

describe('textVariants', () => {
  const variants = ['h1', 'h2', 'h3', 'h4', 'body', 'bodyMedium', 'caption', 'label', 'micro'] as const;

  it('tüm variant\'lar tanımlı', () => {
    for (const v of variants) {
      expect(textVariants[v]).toBeDefined();
    }
  });

  it.each(variants)('%s — fontFamily, fontSize, lineHeight var', (v) => {
    expect(textVariants[v].fontFamily).toBeTruthy();
    expect(textVariants[v].fontSize).toBeGreaterThan(0);
    expect(textVariants[v].lineHeight).toBeGreaterThan(0);
  });

  it('h1 en büyük font', () => {
    expect(textVariants.h1.fontSize).toBeGreaterThanOrEqual(textVariants.h2.fontSize);
  });

  it('micro en küçük font', () => {
    expect(textVariants.micro.fontSize).toBeLessThanOrEqual(textVariants.caption.fontSize);
  });
});
