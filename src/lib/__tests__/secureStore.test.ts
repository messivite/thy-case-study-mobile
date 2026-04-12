import { SECURE_KEYS } from '@/lib/secureStore.keys';

describe('SECURE_KEYS', () => {
  it('ACCESS_TOKEN doğru key', () => {
    expect(SECURE_KEYS.ACCESS_TOKEN).toBe('access_token');
  });

  it('REFRESH_TOKEN doğru key', () => {
    expect(SECURE_KEYS.REFRESH_TOKEN).toBe('refresh_token');
  });

  it('USER_ID doğru key', () => {
    expect(SECURE_KEYS.USER_ID).toBe('user_id');
  });

  it('key değerleri unique', () => {
    const values = Object.values(SECURE_KEYS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});
