// ---------------------------------------------------------------------------
// GET /api/me — Response
// ---------------------------------------------------------------------------

export type MeUserInfo = {
  id: string;
  email?: string;           // guest'te gelmez
  role: string;
  roles: string[];
  sessionId?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  issuedAt?: string;
  expiresAt?: string;
  appMetadata?: {
    provider?: string;
    providers?: string[];
    roles?: string[];       // guest'te bos gelir
  };
  userMetadata?: Record<string, unknown>;
};

export type MeProfile = {
  id: string;
  displayName?: string;     // guest/anonymous'ta gelmez
  role: string;
  isActive: boolean;
  locale: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  isAnonymous: boolean;
};

export type MeResponse = {
  user: MeUserInfo;
  profile: MeProfile;
};
