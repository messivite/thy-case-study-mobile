import {
  combineReducers,
  configureStore,
  createAction,
  createListenerMiddleware,
} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import settingsReducer from './slices/settingsSlice';
import uiReducer from './slices/uiSlice';
import { queryClient } from '@/services/queryClient';

/** Logout / oturum düşmesi: tüm slice'lar initialState'e döner + React Query önbelleği temizlenir */
export const resetAfterLogout = createAction('app/resetAfterLogout');

const combinedReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  settings: settingsReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof combinedReducer>;

export function rootReducer(
  state: RootState | undefined,
  action: Parameters<typeof combinedReducer>[1],
): RootState {
  if (resetAfterLogout.match(action)) {
    return combinedReducer(undefined, action);
  }
  return combinedReducer(state, action);
}

const logoutListener = createListenerMiddleware();
logoutListener.startListening({
  actionCreator: resetAfterLogout,
  effect: () => {
    queryClient.clear();
  },
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    }).prepend(logoutListener.middleware),
});

export type AppDispatch = typeof store.dispatch;

export default store;
