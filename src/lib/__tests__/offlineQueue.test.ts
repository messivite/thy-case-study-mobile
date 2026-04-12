jest.mock('@mustafaaksoy41/react-native-offline-queue', () => ({
  OfflineManager: { configure: jest.fn(), push: jest.fn(), flushQueue: jest.fn() },
}));

import { OFFLINE_ACTIONS } from '@/lib/offlineQueue';

describe('OFFLINE_ACTIONS', () => {
  it('SEND_MESSAGE sabiti doğru', () => {
    expect(OFFLINE_ACTIONS.SEND_MESSAGE).toBe('SEND_MESSAGE');
  });

  it('LIKE_MESSAGE sabiti doğru', () => {
    expect(OFFLINE_ACTIONS.LIKE_MESSAGE).toBe('LIKE_MESSAGE');
  });

  it('action değerleri string', () => {
    expect(typeof OFFLINE_ACTIONS.SEND_MESSAGE).toBe('string');
    expect(typeof OFFLINE_ACTIONS.LIKE_MESSAGE).toBe('string');
  });

  it('farklı action değerleri — çakışma yok', () => {
    expect(OFFLINE_ACTIONS.SEND_MESSAGE).not.toBe(OFFLINE_ACTIONS.LIKE_MESSAGE);
  });
});
