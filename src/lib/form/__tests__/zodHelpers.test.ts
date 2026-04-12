import {
  PASSWORD_MIN_LENGTH,
  requiredTrimmedString,
  emailZod,
  passwordZod,
} from '@/lib/form/zodHelpers';

describe('PASSWORD_MIN_LENGTH', () => {
  it('6 değerinde', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(6);
  });
});

describe('requiredTrimmedString', () => {
  const schema = requiredTrimmedString('Boş olamaz');

  it('geçerli string kabul eder', () => {
    expect(schema.safeParse('hello').success).toBe(true);
  });

  it('boş string reddeder', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('sadece boşluk reddeder', () => {
    const result = schema.safeParse('   ');
    expect(result.success).toBe(false);
  });

  it('hata mesajı doğru', () => {
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Boş olamaz');
    }
  });
});

describe('emailZod', () => {
  const schema = emailZod('Email gerekli', 'Geçersiz email');

  it('geçerli email kabul eder', () => {
    expect(schema.safeParse('test@example.com').success).toBe(true);
  });

  it('boş email reddeder', () => {
    expect(schema.safeParse('').success).toBe(false);
  });

  it('geçersiz format reddeder', () => {
    expect(schema.safeParse('notanemail').success).toBe(false);
  });

  it('@sız format reddeder', () => {
    expect(schema.safeParse('test.com').success).toBe(false);
  });
});

describe('passwordZod', () => {
  const schema = passwordZod(6, 'Şifre gerekli', 'En az 6 karakter');

  it('geçerli şifre kabul eder', () => {
    expect(schema.safeParse('123456').success).toBe(true);
  });

  it('boş şifre reddeder', () => {
    expect(schema.safeParse('').success).toBe(false);
  });

  it('kısa şifre reddeder', () => {
    expect(schema.safeParse('123').success).toBe(false);
  });

  it('tam sınırda (6 karakter) kabul eder', () => {
    expect(schema.safeParse('abcdef').success).toBe(true);
  });

  it('boşluklu şifre kabul eder (trim yok)', () => {
    expect(schema.safeParse('   abc').success).toBe(true);
  });
});
