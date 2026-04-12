import { loginSchema } from '@/forms/auth/login/schema';

const t = (key: string) => key;

describe('loginSchema', () => {
  const schema = loginSchema(t as any);

  it('geçerli giriş', () => {
    const result = schema.safeParse({ email: 'user@example.com', password: 'password1' });
    expect(result.success).toBe(true);
  });

  it('geçersiz email', () => {
    const result = schema.safeParse({ email: 'badmail', password: 'password1' });
    expect(result.success).toBe(false);
  });

  it('kısa şifre', () => {
    const result = schema.safeParse({ email: 'user@example.com', password: 'abc' });
    expect(result.success).toBe(false);
  });

  it('boş form', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });
});
