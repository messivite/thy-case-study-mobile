// ---------------------------------------------------------------------------
// POST /api/notifications/push-token — Push token kayıt
// ---------------------------------------------------------------------------

/** Push token kayıt isteğinin body'si */
export type RegisterPushTokenRequest = {
  push_token: string;
  language: string;
};

/** Push token kayıt response modeli */
export type RegisterPushTokenResponse = {
  push_token: string;
  language: string;
};
