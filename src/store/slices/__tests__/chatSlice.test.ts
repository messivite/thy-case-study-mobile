jest.mock('@/lib/mmkv', () => {
  const mmkvStorage = {
    getString: jest.fn(),
    setString: jest.fn(),
    getBoolean: jest.fn(),
    setBoolean: jest.fn(),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    delete: jest.fn(),
    contains: jest.fn(),
    clearAll: jest.fn(),
  };
  return {
    mmkvStorage,
    STORAGE_KEYS: {
      ONBOARDING_DONE: 'onboarding_done',
      THEME: 'theme',
      LANGUAGE: 'language',
      SELECTED_MODEL: 'selected_model',
      CHAT_MESSAGES: 'chat_messages',
      REACT_QUERY_CACHE: 'rq_cache',
    },
  };
});

import { mmkvStorage } from '@/lib/mmkv';
import chatReducer, {
  addMessage,
  clearMessages,
  setLike,
  setSelectedModel,
} from '@/store/slices/chatSlice';
import type { Message } from '@/types/chat.types';

const mockStorage = mmkvStorage as jest.Mocked<typeof mmkvStorage>;

describe('chatSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getString.mockReturnValue(undefined);
  });

  const baseMessage = (overrides: Partial<Message> = {}): Message => ({
    id: 'm1',
    role: 'user',
    content: 'hi',
    model: 'gpt',
    timestamp: 1,
    ...overrides,
  });

  it('addMessage appends and persists', () => {
    const state = chatReducer(undefined, addMessage(baseMessage({ id: 'a' })));
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toBe('a');
    expect(mockStorage.setString).toHaveBeenCalled();
  });

  it('trims to last 10 messages', () => {
    let state: ReturnType<typeof chatReducer> | undefined;
    for (let i = 0; i < 12; i += 1) {
      state = chatReducer(state, addMessage(baseMessage({ id: `m${i}` })));
    }
    expect(state!.messages).toHaveLength(10);
    expect(state!.messages[0].id).toBe('m2');
    expect(state!.messages[9].id).toBe('m11');
  });

  it('setSelectedModel updates and persists key', () => {
    const state = chatReducer(undefined, setSelectedModel('claude'));
    expect(state.selectedModel).toBe('claude');
    expect(mockStorage.setString).toHaveBeenCalledWith('selected_model', 'claude');
  });

  it('clearMessages empties list', () => {
    const withMsg = chatReducer(undefined, addMessage(baseMessage()));
    const cleared = chatReducer(withMsg, clearMessages());
    expect(cleared.messages).toHaveLength(0);
    expect(cleared.sessionId).toBeNull();
  });

  it('setLike updates message', () => {
    const withMsg = chatReducer(undefined, addMessage(baseMessage({ id: 'x' })));
    const next = chatReducer(withMsg, setLike({ id: 'x', liked: true }));
    expect(next.messages[0].liked).toBe(true);
  });
});
