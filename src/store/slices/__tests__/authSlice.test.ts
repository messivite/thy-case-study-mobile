import authReducer, {
  logout,
  refreshTokens,
  setGuest,
  setLoading,
  setSession,
  setUnauthenticated,
  setUser,
} from '@/store/slices/authSlice';
import type { User } from '@/types/auth.types';

const user: User = {
  id: 'u1',
  email: 'a@b.com',
  name: 'Test User',
};

describe('authSlice', () => {
  it('setSession stores user and tokens', () => {
    const next = authReducer(
      undefined,
      setSession({
        user,
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: 123,
      }),
    );
    expect(next.user).toEqual(user);
    expect(next.accessToken).toBe('at');
    expect(next.refreshToken).toBe('rt');
    expect(next.expiresAt).toBe(123);
    expect(next.token).toBe('at');
    expect(next.isGuest).toBe(false);
    expect(next.status).toBe('authenticated');
    expect(next.isLoading).toBe(false);
  });

  it('refreshTokens updates tokens only', () => {
    const loggedIn = authReducer(
      undefined,
      setSession({
        user,
        accessToken: 'a1',
        refreshToken: 'r1',
        expiresAt: 1,
      }),
    );
    const next = authReducer(
      loggedIn,
      refreshTokens({ accessToken: 'a2', refreshToken: 'r2', expiresAt: 2 }),
    );
    expect(next.user).toEqual(user);
    expect(next.accessToken).toBe('a2');
    expect(next.refreshToken).toBe('r2');
    expect(next.expiresAt).toBe(2);
    expect(next.token).toBe('a2');
  });

  it('setGuest marks guest and clears tokens', () => {
    const next = authReducer(
      authReducer(
        undefined,
        setSession({
          user,
          accessToken: 'at',
          refreshToken: 'rt',
          expiresAt: 1,
        }),
      ),
      setGuest(),
    );
    expect(next.isGuest).toBe(true);
    expect(next.status).toBe('guest');
    expect(next.accessToken).toBeNull();
    expect(next.user).toBeNull();
  });

  it('logout resets to unauthenticated', () => {
    const loggedIn = authReducer(
      undefined,
      setSession({
        user,
        accessToken: 'at',
        refreshToken: 'rt',
        expiresAt: 1,
      }),
    );
    const next = authReducer(loggedIn, logout());
    expect(next.status).toBe('unauthenticated');
    expect(next.user).toBeNull();
    expect(next.accessToken).toBeNull();
  });

  it('setUnauthenticated clears session', () => {
    const next = authReducer(
      authReducer(
        undefined,
        setSession({
          user,
          accessToken: 'at',
          refreshToken: 'rt',
          expiresAt: 1,
        }),
      ),
      setUnauthenticated(),
    );
    expect(next.status).toBe('unauthenticated');
  });

  it('setLoading toggles loading flag', () => {
    const loading = authReducer(undefined, setLoading(true));
    expect(loading.isLoading).toBe(true);
    expect(loading.status).toBe('loading');
    const idle = authReducer(loading, setLoading(false));
    expect(idle.isLoading).toBe(false);
  });

  it('setUser maps legacy shape to session', () => {
    const next = authReducer(undefined, setUser({ user, token: 'legacy' }));
    expect(next.user).toEqual(user);
    expect(next.accessToken).toBe('legacy');
    expect(next.token).toBe('legacy');
    expect(next.status).toBe('authenticated');
  });
});
