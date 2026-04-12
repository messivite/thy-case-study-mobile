import { spacing, radius, shadow } from '@/constants/spacing';

describe('spacing', () => {
  it('4px grid — temel değerler', () => {
    expect(spacing[0]).toBe(0);
    expect(spacing[1]).toBe(4);
    expect(spacing[2]).toBe(8);
    expect(spacing[3]).toBe(12);
    expect(spacing[4]).toBe(16);
  });

  it('büyük değerler doğru', () => {
    expect(spacing[8]).toBe(32);
    expect(spacing[12]).toBe(48);
    expect(spacing[16]).toBe(64);
    expect(spacing[20]).toBe(80);
  });
});

describe('radius', () => {
  it('temel radius değerleri', () => {
    expect(radius.sm).toBe(6);
    expect(radius.md).toBe(10);
    expect(radius.lg).toBe(14);
    expect(radius.xl).toBe(20);
    expect(radius['2xl']).toBe(28);
    expect(radius.full).toBe(9999);
  });
});

describe('shadow', () => {
  it('sm shadow tanımlı', () => {
    expect(shadow.sm.elevation).toBe(2);
    expect(shadow.sm.shadowOpacity).toBe(0.05);
  });

  it('md shadow tanımlı', () => {
    expect(shadow.md.elevation).toBe(4);
  });

  it('lg shadow tanımlı', () => {
    expect(shadow.lg.elevation).toBe(8);
  });
});
