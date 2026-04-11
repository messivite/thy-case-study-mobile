import { useQuery } from '@tanstack/react-query';
import { getModels } from '@/api/models.api';
import type { AIModelRecord } from '@/types/models.api.types';

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const MODELS_QUERY_KEY = ['models'] as const;

// ---------------------------------------------------------------------------
// Timing constants
//
// staleTime: 10 dakika — modeller sık değişmez, her mount'ta refetch olmasın.
// gcTime   : 24 saat  — MMKV persister cache'i zaten kalıcı tutar;
//            bu süre içinde app kapalıyken bile cache query client'ta yaşar.
// ---------------------------------------------------------------------------

const MODELS_STALE_TIME_MS = 10 * 60 * 1000;   // 10 dakika
const MODELS_GC_TIME_MS    = 24 * 60 * 60 * 1000; // 24 saat

// ---------------------------------------------------------------------------
// useModels
// ---------------------------------------------------------------------------

type UseModelsResult = {
  models: AIModelRecord[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Sistemdeki aktif AI modellerini React Query cache üzerinden döner.
 *
 * - staleTime 10 dk: aynı session içinde tekrar refetch tetiklenmez.
 * - gcTime 24 saat + MMKV persister: app yeniden açılınca cache hemen hazır,
 *   ağ yoksa son bilinen liste gösterilmeye devam eder.
 * - Her yerden (home, chat, settings…) çağrılabilir, tek network isteği.
 */
export function useModels(): UseModelsResult {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: MODELS_QUERY_KEY,
    queryFn: getModels,
    staleTime: MODELS_STALE_TIME_MS,
    gcTime: MODELS_GC_TIME_MS,
    select: (res) => res.models,
  });

  return {
    models: data ?? [],
    isLoading,
    isError,
    refetch,
  };
}
