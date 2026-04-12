/**
 * secureStore.web uses `canUseSession` evaluated at module load time.
 * We reset modules and re-require after wiring up the mock.
 */
import { SECURE_KEYS } from '@/lib/secureStore.keys';

const sessionStore: Record<string, string> = {};

const sessionStorageMock = {
  getItem: (key: string) => sessionStore[key] ?? null,
  setItem: (key: string, value: string) => { sessionStore[key] = value; },
  removeItem: (key: string) => { delete sessionStore[key]; },
  clear: () => { Object.keys(sessionStore).forEach((k) => delete sessionStore[k]); },
};

// Wire mock before any imports can evaluate canUseSession
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { secureStorage } = require('@/lib/secureStore.web') as typeof import('@/lib/secureStore.web');

const PREFIX = 'thy.sec.v1:';

beforeEach(() => {
  sessionStorageMock.clear();
});

describe('secureStore.web', () => {
  it('set ve get round trip', async () => {
    await secureStorage.set('test_key', 'test_value');
    const result = await secureStorage.get('test_key');
    expect(result).toBe('test_value');
  });

  it('get — olmayan key null', async () => {
    const result = await secureStorage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('delete — key silinir', async () => {
    await secureStorage.set('toDelete', 'value');
    await secureStorage.delete('toDelete');
    const result = await secureStorage.get('toDelete');
    expect(result).toBeNull();
  });

  it('setToken / getToken round trip', async () => {
    await secureStorage.setToken('my_token_123');
    const token = await secureStorage.getToken();
    expect(token).toBe('my_token_123');
  });

  it('clearTokens — tüm SECURE_KEYS silinir', async () => {
    await secureStorage.set(SECURE_KEYS.ACCESS_TOKEN, 'atoken');
    await secureStorage.set(SECURE_KEYS.REFRESH_TOKEN, 'rtoken');
    await secureStorage.set(SECURE_KEYS.USER_ID, 'uid123');

    await secureStorage.clearTokens();

    expect(await secureStorage.get(SECURE_KEYS.ACCESS_TOKEN)).toBeNull();
    expect(await secureStorage.get(SECURE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(await secureStorage.get(SECURE_KEYS.USER_ID)).toBeNull();
  });

  it('prefix ile ayrı namespace', async () => {
    await secureStorage.set('mykey', 'val');
    const rawKey = PREFIX + 'mykey';
    expect(sessionStorageMock.getItem(rawKey)).toBe('val');
  });
});
