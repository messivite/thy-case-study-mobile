// ---------------------------------------------------------------------------
// GET /api/me/usage — Response
// ---------------------------------------------------------------------------

export type UsageTokenInfo = {
  limitTokens: number;
  usedTokens: number;
  remainingTokens: number;
};

export type UsageResponse = {
  quotaBypass: boolean;
  daily: UsageTokenInfo;
  weekly: UsageTokenInfo;
  periodNote: string;
};
