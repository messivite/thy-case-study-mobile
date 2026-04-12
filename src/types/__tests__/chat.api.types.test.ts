/**
 * chat.api.types.ts — runtime kontrat testleri
 * MessageLikeAction değerleri ve LikeSyncResult.state semantiği
 */

import type {
  MessageLikeAction,
  LikeMessageRequest,
  LikeSyncItem,
  SyncLikesRequest,
  LikeSyncResult,
  SyncLikesResponse,
} from '@/types/chat.api.types';

describe('MessageLikeAction semantiği', () => {
  it('action 1 = like', () => {
    const req: LikeMessageRequest = { action: 1 };
    expect(req.action).toBe(1);
  });

  it('action 2 = unlike', () => {
    const req: LikeMessageRequest = { action: 2 };
    expect(req.action).toBe(2);
  });
});

describe('SyncLikesRequest', () => {
  it('items dizisi doğru yapıda', () => {
    const req: SyncLikesRequest = {
      items: [
        { messageId: 'msg1', action: 1 },
        { messageId: 'msg2', action: 2 },
      ],
    };
    expect(req.items).toHaveLength(2);
    expect(req.items[0].messageId).toBe('msg1');
    expect(req.items[0].action).toBe(1);
    expect(req.items[1].action).toBe(2);
  });

  it('boş items dizisi geçerli', () => {
    const req: SyncLikesRequest = { items: [] };
    expect(req.items).toHaveLength(0);
  });
});

describe('SyncLikesResponse', () => {
  it('state 1 = liked, state 2 = unliked', () => {
    const res: SyncLikesResponse = {
      results: [
        { messageId: 'msg1', ok: true, state: 1 },
        { messageId: 'msg2', ok: true, state: 2 },
        { messageId: 'msg3', ok: false, state: 1, code: 'NOT_FOUND' },
      ],
    };
    expect(res.results[0].state).toBe(1);
    expect(res.results[1].state).toBe(2);
    expect(res.results[2].ok).toBe(false);
    expect(res.results[2].code).toBe('NOT_FOUND');
  });
});

describe('LikeSyncItem', () => {
  it('messageId ve action zorunlu', () => {
    const item: LikeSyncItem = { messageId: 'abc', action: 1 };
    expect(item.messageId).toBe('abc');
    expect(item.action).toBe(1);
  });
});
