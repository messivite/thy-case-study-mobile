import { forgotPasswordSchema } from '@/forms/auth/forgotPassword/schema';

const t = (key: string) => key;

describe('forgotPasswordSchema', () => {
  const schema = forgotPasswordSchema(t as any);

  it('geçerli email', () => {
    const result = schema.safeParse({ email: 'reset@example.com' });
    expect(result.success).toBe(true);
  });

  it('geçersiz email', () => {
    const result = schema.safeParse({ email: 'not-valid' });
    expect(result.success).toBe(false);
  });

  it('boş email', () => {
    const result = schema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });

  it('eksik email alanı', () => {
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });
});
