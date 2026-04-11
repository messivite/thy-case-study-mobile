import {
  combineReducers,
  configureStore,
  createAction,
  createListenerMiddleware,
} from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import chatReducer from '@/store/slices/chatSlice';
import settingsReducer from '@/store/slices/settingsSlice';
import uiReducer from '@/store/slices/uiSlice';
import profileReducer from '@/store/slices/profileSlice';
import { queryClient } from '@/services/queryClient';

/** Logout / oturum düşmesi: tüm slice'lar initialState'e döner + React Query önbelleği temizlenir */
export const resetAfterLogout = createAction('app/resetAfterLogout');

const combinedReducer = combineReducers({
  auth: authReducer,
  chat: chatReducer,
  settings: settingsReducer,
  ui: uiReducer,
  profile: profileReducer,
});

export type RootState = ReturnType<typeof combinedReducer>;

export function rootReducer(
  state: RootState | undefined,
  action: Parameters<typeof combinedReducer>[1],
): RootState {
  if (resetAfterLogout.match(action)) {
    const reset = combinedReducer(undefined, action);
    // Welcome screen'in fade animasyonunu başlatması için status 'unauthenticated' olmalı
    return { ...reset, auth: { ...reset.auth, status: 'unauthenticated' } };
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
