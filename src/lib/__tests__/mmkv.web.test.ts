/**
 * mmkv.web uses `canUseDOM` (checks window.localStorage) at module load time.
 * We wire up a localStorage mock before the require so canUseDOM = true.
 */

const lsStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string): string | null => lsStore[key] ?? null,
  setItem: (key: string, value: string) => { lsStore[key] = value; },
  removeItem: (key: string) => { delete lsStore[key]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
  key: (i: number) => Object.keys(lsStore)[i] ?? null,
  get length() { return Object.keys(lsStore).length; },
};

// Expose on global before module loads
(global as any).localStorage = localStorageMock;
if (typeof window === 'undefined') {
  (global as any).window = { localStorage: localStorageMock };
} else {
  (global as any).window = { ...(global as any).window, localStorage: localStorageMock };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { mmkvStorage, storage, STORAGE_KEYS } = require('@/lib/mmkv.web') as typeof import('@/lib/mmkv.web');

beforeEach(() => {
  localStorageMock.clear();
});

describe('mmkv.web — storage', () => {
  it('getString — set ve oku', () => {
    storage.set('key1', 'value1');
    expect(storage.getString('key1')).toBe('value1');
  });

  it('getString — olmayan key undefined', () => {
    expect(storage.getString('nonexistent')).toBeUndefined();
  });

  it('set number değer', () => {
    storage.set('numKey', 42);
    expect(storage.getNumber('numKey')).toBe(42);
  });

  it('getBoolean — true', () => {
    storage.set('boolKey', true);
    expect(storage.getBoolean('boolKey')).toBe(true);
  });

  it('getBoolean — false', () => {
    storage.set('boolKey', false);
    expect(storage.getBoolean('boolKey')).toBe(false);
  });

  it('getBoolean — olmayan undefined', () => {
    expect(storage.getBoolean('missing')).toBeUndefined();
  });

  it('getNumber — olmayan undefined', () => {
    expect(storage.getNumber('missing')).toBeUndefined();
  });

  it('remove — key silinir', () => {
    storage.set('toRemove', 'val');
    storage.remove('toRemove');
    expect(storage.getString('toRemove')).toBeUndefined();
  });

  it('contains — var olan key', () => {
    storage.set('exists', 'y');
    expect(storage.contains('exists')).toBe(true);
  });

  it('contains — olmayan key', () => {
    expect(storage.contains('nope')).toBe(false);
  });

  it('clearAll — çağrılabilir (smoke)', () => {
    storage.set('a', '1');
    // clearAll internaly uses Object.keys(localStorage); smoke test only
    expect(() => storage.clearAll()).not.toThrow();
  });
});

describe('mmkv.web — mmkvStorage wrapper', () => {
  it('getString / setString round trip', () => {
    mmkvStorage.setString('test', 'hello');
    expect(mmkvStorage.getString('test')).toBe('hello');
  });

  it('delete', () => {
    mmkvStorage.setString('del', 'x');
    mmkvStorage.delete('del');
    expect(mmkvStorage.getString('del')).toBeUndefined();
  });

  it('getBoolean / setBoolean', () => {
    mmkvStorage.setBoolean('flag', true);
    expect(mmkvStorage.getBoolean('flag')).toBe(true);
  });

  it('getNumber / setNumber', () => {
    mmkvStorage.setNumber('count', 7);
    expect(mmkvStorage.getNumber('count')).toBe(7);
  });

  it('contains', () => {
    mmkvStorage.setString('c', 'v');
    expect(mmkvStorage.contains('c')).toBe(true);
    expect(mmkvStorage.contains('nokey')).toBe(false);
  });
});

describe('STORAGE_KEYS', () => {
  it("tüm key'ler string", () => {
    for (const v of Object.values(STORAGE_KEYS)) {
      expect(typeof v).toBe('string');
    }
  });

  it("key'ler unique", () => {
    const vals = Object.values(STORAGE_KEYS);
    expect(new Set(vals).size).toBe(vals.length);
  });

  it('ONBOARDING_DONE tanımlı', () => {
    expect(STORAGE_KEYS.ONBOARDING_DONE).toBeTruthy();
  });

  it('THEME tanımlı', () => {
    expect(STORAGE_KEYS.THEME).toBeTruthy();
  });
});
