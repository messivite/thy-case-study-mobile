import { useMutation } from '@tanstack/react-query';
import { registerPushToken } from '@/api/notification.api';
import {
  RegisterPushTokenRequest,
  RegisterPushTokenResponse,
} from '@/types/notification.api.types';

/**
 * POST /api/notifications/push-token
 * Push token'ı sunucuya kaydeder.
 *
 * Kullanım:
 *   const { mutate, isPending } = useRegisterPushTokenMutation();
 *   mutate({ push_token: 'ExponentPushToken[xxx]', language: 'tr' });
 */
export const useRegisterPushTokenMutation = () =>
  useMutation<RegisterPushTokenResponse, Error, RegisterPushTokenRequest>({
    mutationFn: (payload) => registerPushToken(payload),
  });
