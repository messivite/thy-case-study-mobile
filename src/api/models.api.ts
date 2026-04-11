import { privateApi } from '@/services/api';
import { GetModelsResponse } from '@/types/models.api.types';

/**
 * GET /api/models
 * Sistemde aktif olan AI modellerini döner.
 */
export const getModels = async (): Promise<GetModelsResponse> => {
  const { data } = await privateApi.get<GetModelsResponse>('/api/models');
  return data;
};
