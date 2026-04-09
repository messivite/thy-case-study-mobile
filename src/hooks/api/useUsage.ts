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
export const useGetUsageQuery = () =>
  useQuery<UsageResponse, Error>({
    queryKey: USAGE_QUERY_KEYS.usage,
    queryFn: getUsage,
  });
