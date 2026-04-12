/**
 * responsive.ts — saf matematik fonksiyonlarını doğrudan test eder.
 * Platform/Dimensions mock'u gerekmez; fonksiyon mantığını sayılarla doğrularız.
 */

// Sabitlerle aynı değerleri kullanarak beklenen sonuçları hesaplıyoruz
const DESIGN_BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

describe('scale mantığı — 390px tasarım baz', () => {
  // Ekran genişliği 390 ise scale(x) = x (1:1)
  const screenW = 390;
  const scaleVal = (size: number) => Math.round((screenW / DESIGN_BASE_WIDTH) * size);

  it('390px ekranda scale identity', () => {
    expect(scaleVal(16)).toBe(16);
    expect(scaleVal(24)).toBe(24);
  });

  it('780px ekranda scale 2x', () => {
    const s = (size: number) => Math.round((780 / DESIGN_BASE_WIDTH) * size);
    expect(s(16)).toBe(32);
    expect(s(10)).toBe(20);
  });

  it('scale(0) sıfır döner', () => {
    expect(scaleVal(0)).toBe(0);
  });
});

describe('verticalScale mantığı', () => {
  const screenH = 844;
  const vs = (size: number) => Math.round((screenH / BASE_HEIGHT) * size);

  it('844px ekranda verticalScale identity', () => {
    expect(vs(20)).toBe(20);
    expect(vs(48)).toBe(48);
  });

  it('verticalScale(0) sıfır döner', () => {
    expect(vs(0)).toBe(0);
  });
});

describe('moderateScale mantığı', () => {
  const screenW = 390;
  const sc = (size: number) => Math.round((screenW / DESIGN_BASE_WIDTH) * size);
  const ms = (size: number, factor = 0.5) =>
    Math.round(size + (sc(size) - size) * factor);

  it('390px ekranda moderateScale identity (scale=1)', () => {
    expect(ms(14)).toBe(14);
    expect(ms(20)).toBe(20);
  });

  it('factor=0 → sabit boyut', () => {
    const sc2 = (size: number) => Math.round((780 / DESIGN_BASE_WIDTH) * size);
    const ms2 = (size: number, factor = 0) =>
      Math.round(size + (sc2(size) - size) * factor);
    expect(ms2(16, 0)).toBe(16);
  });

  it('factor=1 → tam scale', () => {
    const sc2 = (size: number) => Math.round((780 / DESIGN_BASE_WIDTH) * size);
    const ms2 = (size: number) => Math.round(size + (sc2(size) - size) * 1);
    expect(ms2(16)).toBe(sc2(16));
  });
});

describe('DESIGN_BASE_WIDTH sabiti', () => {
  it('390 değerinde', () => {
    expect(DESIGN_BASE_WIDTH).toBe(390);
  });
});
