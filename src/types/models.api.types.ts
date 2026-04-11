// ---------------------------------------------------------------------------
// GET /api/models
// ---------------------------------------------------------------------------

/** Sunucudan dönen tek model kaydı */
export type AIModelRecord = {
  provider: string;
  model: string;
  displayName: string;
  supportsStream: boolean;
};

/** GET /api/models response */
export type GetModelsResponse = {
  models: AIModelRecord[];
};
