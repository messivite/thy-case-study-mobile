/**
 * useChatHistory
 *
 * Sohbet gecmisi icin tek veri kaynagi.
 *
 * Mimari:
 *   Realm (local DB/cache)
 *     └─ initialData olarak React Query'e verilir → mount'ta anlik render
 *   React Query infinite query
 *     └─ staleTime dolunca / invalidate edilince API'ye gider
 *     └─ API cevabi useChats.ts'deki useEffect ile Realm'e yazilir
 *
 * Sync tetikleyiciler:
 *   - Mount (staleTime dolmussa)            → otomatik fetch
 *   - staleTime (2dk) doldu                 → arka planda refetch
 *   - invalidateQueries(chatsList)           → yeni sohbet, mesaj sonrasi
 *   - refetch() — pull-to-refresh           → kullanici elle tetikler
 *   - App foreground (React Query focus)    → otomatik
 *
 * Guest / anonymous: API cagrisi yapilmaz, sadece Realm gosterilir.
 */

import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useInfiniteChatsQuery,
  useSearchChatsQuery,
  CHAT_QUERY_KEYS,
} from '@/hooks/api/useChats';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import { ChatListItem, ChatSearchResultItem } from '@/types/chat.api.types';

export type ChatHistoryData = {
  // Session listesi
  sessions: ChatListItem[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  isRefetching: boolean;

  // Arama
  searchSessions: (q: string) => void;
  searchQuery: string;
  searchResults: ChatSearchResultItem[];
  isSearching: boolean;
  isSearchFetchingNextPage: boolean;
  searchFetchNextPage: () => void;
  searchHasNextPage: boolean;

  // Invalidate — yeni sohbet / mesaj sonrasi tetikle
  invalidate: () => void;

  // Guest flag
  isAnonymous: boolean;
};

export function useChatHistory(searchQuery: string): ChatHistoryData {
  const { isAnonymous } = useWhoIAm();
  const queryClient = useQueryClient();

  // ── Session listesi ─────────────────────────────────────────────────────

  const chatsQuery = useInfiniteChatsQuery();

  const sessions = useMemo(
    () => chatsQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [chatsQuery.data],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.chatsList });
  }, [queryClient]);

  // ── Arama ───────────────────────────────────────────────────────────────

  const searchQuery_ = useSearchChatsQuery(searchQuery);

  const searchResults = useMemo(
    () => searchQuery_.data?.pages.flatMap((p) => p.items) ?? [],
    [searchQuery_.data],
  );

  if (__DEV__ && searchQuery.trim().length >= 2) {
    console.log('[useChatHistory] search:', {
      q: searchQuery,
      status: searchQuery_.status,
      isFetching: searchQuery_.isFetching,
      isError: searchQuery_.isError,
      error: searchQuery_.error?.message,
      resultCount: searchResults.length,
    });
  }

  return {
    sessions,
    isLoading: chatsQuery.isLoading,
    isFetchingNextPage: chatsQuery.isFetchingNextPage,
    hasNextPage: chatsQuery.hasNextPage ?? false,
    fetchNextPage: chatsQuery.fetchNextPage,
    refetch: chatsQuery.refetch,
    isRefetching: chatsQuery.isRefetching,

    searchSessions: () => {},  // searchQuery state'i caller'da yonetilir
    searchQuery,
    searchResults,
    isSearching: searchQuery_.isFetching && !searchQuery_.isError,
    isSearchFetchingNextPage: searchQuery_.isFetchingNextPage,
    searchFetchNextPage: searchQuery_.fetchNextPage,
    searchHasNextPage: searchQuery_.hasNextPage ?? false,

    invalidate,
    isAnonymous,
  };
}
