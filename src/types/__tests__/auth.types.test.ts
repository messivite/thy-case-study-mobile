import type { AuthErrorCode, AuthStatus, AuthState, User } from '@/types/auth.types';

describe('auth.types — runtime contract', () => {
  it('AuthStatus değerleri', () => {
    const statuses: AuthStatus[] = [
      'idle',
      'loading',
      'authenticated',
      'guest',
      'unauthenticated',
    ];
    expect(statuses).toHaveLength(5);
    for (const s of statuses) {
      expect(typeof s).toBe('string');
    }
  });

  it('AuthErrorCode değerleri', () => {
    const codes: AuthErrorCode[] = [
      'INVALID_CREDENTIALS',
      'EMAIL_NOT_CONFIRMED',
      'USER_ALREADY_REGISTERED',
      'PASSWORD_TOO_SHORT',
      'RATE_LIMITED',
      'UNKNOWN',
    ];
    expect(codes).toHaveLength(6);
    for (const c of codes) {
      expect(typeof c).toBe('string');
    }
  });

  it('User obje yapısı doğru', () => {
    const user: User = { id: 'u1', email: 'a@b.com', name: 'Alice' };
    expect(user.id).toBeTruthy();
    expect(user.email).toContain('@');
    expect(user.name).toBeTruthy();
  });

  it('User — isteğe bağlı alanlar undefined olabilir', () => {
    const user: User = { id: 'u2', email: 'b@c.com', name: 'Bob' };
    expect(user.avatarUrl).toBeUndefined();
    expect(user.isAnonymous).toBeUndefined();
  });

  it('AuthState başlangıç yapısı', () => {
    const state: AuthState = {
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isGuest: false,
      status: 'idle',
      isLoading: false,
      token: null,
    };
    expect(state.status).toBe('idle');
    expect(state.isGuest).toBe(false);
  });
});
