import { registerSchema } from '@/forms/auth/register/schema';

const t = (key: string) => key;

describe('registerSchema', () => {
  const schema = registerSchema(t as any);

  it('geçerli kayıt', () => {
    const result = schema.safeParse({ email: 'new@example.com', password: 'strongpass' });
    expect(result.success).toBe(true);
  });

  it('geçersiz email', () => {
    const result = schema.safeParse({ email: 'noatsign', password: 'strongpass' });
    expect(result.success).toBe(false);
  });

  it('kısa şifre hatası var', () => {
    const result = schema.safeParse({ email: 'new@example.com', password: 'ab' });
    expect(result.success).toBe(false);
  });

  it('boş nesne hata döner', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });
});
