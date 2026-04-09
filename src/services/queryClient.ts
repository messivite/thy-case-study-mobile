import { QueryClient } from '@tanstack/react-query';
import { storage, STORAGE_KEYS } from '@/lib/mmkv';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// MMKV persister for React Query
export const mmkvPersister = {
  persistClient: async (client: unknown): Promise<void> => {
    storage.set(STORAGE_KEYS.REACT_QUERY_CACHE, JSON.stringify(client));
  },
  restoreClient: async (): Promise<unknown> => {
    const cached = storage.getString(STORAGE_KEYS.REACT_QUERY_CACHE);
    if (!cached) return undefined;
    try {
      return JSON.parse(cached) as unknown;
    } catch {
      return undefined;
    }
  },
  removeClient: async (): Promise<void> => {
    storage.remove(STORAGE_KEYS.REACT_QUERY_CACHE);
  },
};

export default queryClient;
