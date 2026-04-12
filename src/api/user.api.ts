import { privateApi } from '@/services/api';
import { MeResponse, UpdateMeProfileRequest } from '@/types/user.api.types';

/**
 * GET /api/me
 * Oturum açmış kullanıcının bilgilerini döner.
 */
export const getMe = async (): Promise<MeResponse> => {
  const { data } = await privateApi.get<MeResponse>('/api/me');
  return data;
};

/**
 * PATCH /api/me
 * Kullanıcı profilini günceller, güncel MeResponse döner.
 */
export const updateMe = async (payload: UpdateMeProfileRequest): Promise<MeResponse> => {
  const { data } = await privateApi.patch<MeResponse>('/api/me', payload);
  return data;
};

/**
 * PATCH /api/me  (multipart/form-data)
 * Avatar yükler, güncel MeResponse döner.
 *
 * @param fileUri  expo-image-picker'dan gelen yerel URI (file://...)
 * @param mimeType ör. 'image/jpeg'
 */
export const uploadAvatar = async (fileUri: string, mimeType = 'image/jpeg'): Promise<MeResponse> => {
  const form = new FormData();
  // React Native FormData: uri + name + type ile native dosya gönderimi
  form.append('avatar', {
    uri: fileUri,
    name: 'avatar.jpg',
    type: mimeType,
  } as unknown as Blob);

  const { data } = await privateApi.patch<MeResponse>('/api/me', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
