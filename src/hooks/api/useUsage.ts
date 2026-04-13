import { useQuery } from '@tanstack/react-query';
import { getUsage } from '@/api/usage.api';
import { UsageResponse } from '@/types/usage.api.types';

export const USAGE_QUERY_KEYS = {
  usage: ['user', 'usage'] as const,
};

/**
 * GET /api/me/usage
 * Kullanıcının token kullanım bilgilerini çeker.
 *
 * Kullanım:
 *   const { data, isLoading } = useGetUsageQuery();
 */
const THIRTY_SECONDS_MS = 30 * 1000;

export const useGetUsageQuery = () =>
  useQuery<UsageResponse, Error>({
    queryKey: USAGE_QUERY_KEYS.usage,
    queryFn: getUsage,
    staleTime: THIRTY_SECONDS_MS,
    gcTime: 5 * 60_000,
  });
