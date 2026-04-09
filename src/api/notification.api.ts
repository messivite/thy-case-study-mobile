import { privateApi } from '@/services/api';
import {
  RegisterPushTokenRequest,
  RegisterPushTokenResponse,
} from '@/types/notification.api.types';

/**
 * POST /api/notifications/push-token
 * Cihazın push token'ını sunucuya kaydeder.
 */
export const registerPushToken = async (
  payload: RegisterPushTokenRequest,
): Promise<RegisterPushTokenResponse> => {
  const { data } = await privateApi.post<RegisterPushTokenResponse>(
    '/api/notifications/push-token',
    payload,
  );
  return data;
};
