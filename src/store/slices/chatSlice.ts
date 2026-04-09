import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatState, Message } from '@/types/chat.types';
import { DEFAULT_MODEL, AIModelId } from '@/constants/models';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';

const MAX_LOCAL_MESSAGES = 10;

const loadMessages = (): Message[] => {
  try {
    const stored = mmkvStorage.getString(STORAGE_KEYS.CHAT_MESSAGES);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
};

const persistMessages = (messages: Message[]) => {
  try {
    mmkvStorage.setString(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
  } catch {}
};

const savedModel = mmkvStorage.getString(STORAGE_KEYS.SELECTED_MODEL) as AIModelId | undefined;

const initialState: ChatState = {
  messages: loadMessages(),
  selectedModel: savedModel ?? DEFAULT_MODEL,
  isTyping: false,
  sessionId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload);
      // Keep only last MAX_LOCAL_MESSAGES
      if (state.messages.length > MAX_LOCAL_MESSAGES) {
        state.messages = state.messages.slice(-MAX_LOCAL_MESSAGES);
      }
      persistMessages(state.messages);
    },
    updateMessage(state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) {
      const idx = state.messages.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) {
        state.messages[idx] = { ...state.messages[idx], ...action.payload.updates };
        persistMessages(state.messages);
      }
    },
    setSelectedModel(state, action: PayloadAction<AIModelId>) {
      state.selectedModel = action.payload;
      mmkvStorage.setString(STORAGE_KEYS.SELECTED_MODEL, action.payload);
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload;
    },
    setSessionId(state, action: PayloadAction<string | null>) {
      state.sessionId = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
      state.sessionId = null;
      persistMessages([]);
    },
    setLike(state, action: PayloadAction<{ id: string; liked: boolean | null }>) {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) {
        msg.liked = action.payload.liked;
        persistMessages(state.messages);
      }
    },
  },
});

export const {
  addMessage,
  updateMessage,
  setSelectedModel,
  setTyping,
  setSessionId,
  clearMessages,
  setLike,
} = chatSlice.actions;
export default chatSlice.reducer;
