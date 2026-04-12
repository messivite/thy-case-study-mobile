export { OfflineManager } from '@mustafaaksoy41/react-native-offline-queue';

export const OFFLINE_ACTIONS = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  LIKE_MESSAGE: 'LIKE_MESSAGE',
} as const;

/**
 * 4xx hatalarında queue'da bekletme — client error, retry'da düzelmez.
 * Handler içinde bu fonksiyon ile wrap et: 4xx gelirse sessizce geçer (queue'dan silinir),
 * 5xx / network error'da throw eder (queue'da kalır, tekrar denenebilir).
 */
export async function withNoRetryOn4xx(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err: any) {
    // Axios error objesi
    const status = err?.response?.status ?? err?.status;
    if (status && status >= 400 && status < 500) {
      console.warn('[OfflineQueue] 4xx hatası, item queue\'dan siliniyor:', status);
      return;
    }
    // streamChat string error: "HTTP 403", "HTTP 401" vb.
    const msg: string = err?.message ?? String(err);
    const match = msg.match(/HTTP (\d{3})/);
    if (match) {
      const code = parseInt(match[1], 10);
      if (code >= 400 && code < 500) {
        console.warn('[OfflineQueue] 4xx hatası (string), item queue\'dan siliniyor:', code);
        return;
      }
    }
    throw err;
  }
}
