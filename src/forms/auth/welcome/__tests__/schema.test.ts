import { welcomeLoginSchema } from '@/forms/auth/welcome/schema';

const t = (key: string) => key;

describe('welcomeLoginSchema', () => {
  const schema = welcomeLoginSchema(t as any);

  it('geçerli email + şifre', () => {
    const result = schema.safeParse({ email: 'test@example.com', password: 'secret123' });
    expect(result.success).toBe(true);
  });

  it('geçersiz email — hata', () => {
    const result = schema.safeParse({ email: 'not-an-email', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('boş email — hata', () => {
    const result = schema.safeParse({ email: '', password: 'secret123' });
    expect(result.success).toBe(false);
  });

  it('kısa şifre — hata', () => {
    const result = schema.safeParse({ email: 'test@example.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('boş şifre — hata', () => {
    const result = schema.safeParse({ email: 'test@example.com', password: '' });
    expect(result.success).toBe(false);
  });

  it('eksik alan — hata', () => {
    const result = schema.safeParse({ email: 'test@example.com' });
    expect(result.success).toBe(false);
  });
});
