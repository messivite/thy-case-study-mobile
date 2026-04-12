export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  /** Supabase anonymous; JWT vardır, API çağrıları için */
  isAnonymous?: boolean;
};

export type AuthStatus =
  | 'idle'        // başlangıç — henüz kontrol edilmedi
  | 'loading'     // session kontrol ediliyor / işlem yapılıyor
  | 'authenticated' // geçerli session var
  | 'guest'       // misafir mod
  | 'unauthenticated'; // session yok, login gerekli

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'USER_ALREADY_REGISTERED'
  | 'PASSWORD_TOO_SHORT'
  | 'RATE_LIMITED'
  | 'UNKNOWN';

export type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;      // unix timestamp (s)
  isGuest: boolean;
  status: AuthStatus;
  // Geriye dönük uyumluluk için
  isLoading: boolean;
  token: string | null;          // accessToken alias
};
