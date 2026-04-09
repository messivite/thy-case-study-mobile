import { privateApi } from '@/services/api';
import { MeResponse } from '@/types/user.api.types';

/**
 * GET /api/me
 * Oturum açmış kullanıcının bilgilerini döner.
 */
export const getMe = async (): Promise<MeResponse> => {
  const { data } = await privateApi.get<MeResponse>('/api/me');
  return data;
};
