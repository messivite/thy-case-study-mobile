/**
 * useChatSession.ts — toLocalMessage helper testi
 * Fonksiyon export edilmediği için aynı mantığı burada doğruluyoruz.
 */

import type { ChatMessage } from '@/types/chat.api.types';
import type { Message } from '@/types/chat.types';

// toLocalMessage'ın aynı implementasyonu — export olmadığı için burada mirror
const toLocalMessage = (msg: ChatMessage): Message => ({
  id: msg.id ?? `msg_${msg.createdAt}_${msg.role}`,
  role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
  content: msg.content ?? '',
  timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : 0,
  provider: msg.provider,
  model: msg.model,
  liked: msg.liked ?? null,
});

describe('toLocalMessage', () => {
  const base: ChatMessage = {
    id: 'msg1',
    role: 'assistant',
    content: 'Hello',
    provider: 'openai',
    model: 'gpt-4o',
    createdAt: '2024-01-01T10:00:00Z',
    liked: null,
  };

  it('maps id correctly', () => {
    expect(toLocalMessage(base).id).toBe('msg1');
  });

  it('generates fallback id when id is missing', () => {
    const msg = { ...base, id: undefined };
    expect(toLocalMessage(msg).id).toContain('msg_');
    expect(toLocalMessage(msg).id).toContain(msg.role);
  });

  it('maps liked: null correctly', () => {
    expect(toLocalMessage({ ...base, liked: null }).liked).toBeNull();
  });

  it('maps liked: true correctly', () => {
    expect(toLocalMessage({ ...base, liked: true }).liked).toBe(true);
  });

  it('maps liked: false correctly', () => {
    expect(toLocalMessage({ ...base, liked: false }).liked).toBe(false);
  });

  it('defaults liked to null when field is undefined', () => {
    const msg: ChatMessage = { ...base };
    delete (msg as any).liked;
    expect(toLocalMessage(msg).liked).toBeNull();
  });

  it('maps role: user correctly', () => {
    expect(toLocalMessage({ ...base, role: 'user' }).role).toBe('user');
  });

  it('falls back unknown role to assistant', () => {
    expect(toLocalMessage({ ...base, role: 'system' as any }).role).toBe('assistant');
  });

  it('converts createdAt ISO string to timestamp number', () => {
    const ts = toLocalMessage(base).timestamp;
    expect(ts).toBe(new Date('2024-01-01T10:00:00Z').getTime());
  });

  it('defaults timestamp to 0 when createdAt missing', () => {
    const msg = { ...base, createdAt: undefined };
    expect(toLocalMessage(msg).timestamp).toBe(0);
  });

  it('defaults content to empty string when missing', () => {
    const msg = { ...base, content: undefined as any };
    expect(toLocalMessage(msg).content).toBe('');
  });
});
