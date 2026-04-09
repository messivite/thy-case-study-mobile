export type ApiResponse<T> = {
  data: T;
  message?: string;
  success: boolean;
};

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

/** Sunucudan gelen hata body yapısı: { error: { code, message } } */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

// ---------------------------------------------------------------------------
// AI Shared Base Types — birden fazla endpoint'te reuse edilir
// ---------------------------------------------------------------------------

/** Provider + model bilgisi — her AI isteğinde/cevabında ortak */
export type AIProviderInfo = {
  provider: string;
  model: string;
};

/** Temel AI mesajı — role + content her endpoint'te ortak */
export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/** Token kullanım bilgisi — usage objesi birden fazla endpoint'te döner */
export type AIUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  provider: string;
  model: string;
};
