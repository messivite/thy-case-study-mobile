import { editProfileSchema } from '@/forms/profile/editProfile/schema';

const t = (key: string) => key;

describe('editProfileSchema', () => {
  const schema = editProfileSchema(t as any);

  it('geçerli displayName', () => {
    const result = schema.safeParse({ displayName: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('trim sonrası 2 karakter yeterli', () => {
    const result = schema.safeParse({ displayName: 'AB' });
    expect(result.success).toBe(true);
  });

  it('çok kısa displayName — hata', () => {
    const result = schema.safeParse({ displayName: 'A' });
    expect(result.success).toBe(false);
  });

  it('boş displayName — hata', () => {
    const result = schema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
  });

  it('yalnızca boşluk — trim sonrası kısa hata', () => {
    const result = schema.safeParse({ displayName: '   ' });
    expect(result.success).toBe(false);
  });
});
