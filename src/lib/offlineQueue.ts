export { OfflineManager } from '@mustafaaksoy41/react-native-offline-queue';

export const OFFLINE_ACTIONS = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  LIKE_MESSAGE: 'LIKE_MESSAGE',
} as const;

// 4xx → queue'dan sil (client error, retry'da düzelmez)
// 5xx / network error → throw et (queue'da kalsın)
export async function withNoRetryOn4xx(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err: any) {
    const status = err?.response?.status ?? err?.status;
    if (status && status >= 400 && status < 500) return;

    // streamChat "HTTP 403" gibi string error
    const msg: string = err?.message ?? String(err);
    const match = msg.match(/HTTP (\d{3})/);
    if (match) {
      const code = parseInt(match[1], 10);
      if (code >= 400 && code < 500) return;
    }
    throw err;
  }
}
