import { privateApi } from '@/services/api';
import { UsageResponse } from '@/types/usage.api.types';

/**
 * GET /api/me/usage
 * Kullanıcının token kullanım bilgilerini döner.
 */
export const getUsage = async (): Promise<UsageResponse> => {
  const { data } = await privateApi.get<UsageResponse>('/api/me/usage');
  return data;
};
