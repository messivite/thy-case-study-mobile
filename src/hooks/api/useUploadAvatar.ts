/**
 * useUploadAvatar
 *
 * Akış:
 *  1. launchImagePicker()  → expo-image-picker ile galeri/kamera
 *  2. Seçilen resim → PATCH /api/me (multipart/form-data)
 *  3. Başarıda:
 *     - expo-file-system ile <documentDirectory>/userAvatar.jpg'e kopyalar (override)
 *     - MMKV'ye LOCAL_AVATAR_PATH kaydeder
 *     - Redux profileSlice'ı günceller (setProfile)
 *
 * Optimistic UI: React Query onMutate ile seçilen URI'yi hemen gösterir.
 * onError ile önceki değere rollback edilir.
 * onSettled ile nihai state temizlenir.
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAppDispatch } from '@/store/hooks';
import { setProfile } from '@/store/slices/profileSlice';
import { uploadAvatar } from '@/api/user.api';
import { mmkvStorage, STORAGE_KEYS } from '@/lib/mmkv';
import type { MeResponse } from '@/types/user.api.types';

const LOCAL_AVATAR_FILENAME = 'userAvatar.jpg';
const getLocalAvatarPath = () =>
  FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${LOCAL_AVATAR_FILENAME}` : null;

/** MMKV'de kayıtlı local avatar path'i döner (yoksa undefined) */
export const getLocalAvatarUri = (): string | undefined =>
  mmkvStorage.getString(STORAGE_KEYS.LOCAL_AVATAR_PATH) ?? undefined;

type UseUploadAvatarResult = {
  /** Yükleme sırasında kullanılacak geçici local URI (optimistic) */
  optimisticUri: string | undefined;
  /** true = upload devam ediyor */
  isUploading: boolean;
  /** Picker'ı aç, seçilirse yükle. onSuccess/onError toast için callback alır. */
  pickAndUpload: (callbacks?: { onSuccess?: () => void; onError?: () => void }) => void;
};

export function useUploadAvatar(): UseUploadAvatarResult {
  const dispatch = useAppDispatch();
  const [optimisticUri, setOptimisticUri] = useState<string | undefined>(undefined);

  const { mutate, isPending } = useMutation<
    MeResponse,
    Error,
    { fileUri: string; mimeType: string },
    { previousUri: string | undefined }
  >({
    mutationFn: ({ fileUri, mimeType }) => uploadAvatar(fileUri, mimeType),

    onMutate: ({ fileUri }) => {
      const previousUri = optimisticUri;
      // Seçilen URI'yi hemen göster (optimistic)
      setOptimisticUri(fileUri);
      return { previousUri };
    },

    onError: (_err, _vars, context) => {
      // Hata durumunda önceki URI'ye rollback
      setOptimisticUri(context?.previousUri);
    },

    onSuccess: async (data, { fileUri }) => {
      dispatch(setProfile(data));

      // Local diske kopyala (override) ve cache-bust
      const destPath = getLocalAvatarPath();
      if (destPath) {
        try {
          await FileSystem.copyAsync({ from: fileUri, to: destPath });
          const cacheBustedUri = `${destPath}?t=${Date.now()}`;
          mmkvStorage.setString(STORAGE_KEYS.LOCAL_AVATAR_PATH, cacheBustedUri);
          setOptimisticUri(cacheBustedUri);
        } catch {
          // Kopyalama başarısız olsa da upload başarılı, optimistic URI kalır
        }
      }
    },

    onSettled: () => {
      // isPending burada zaten false olacak — ekstra temizleme gerekmez
    },
  });

  const pickAndUpload = useCallback(
    (callbacks?: { onSuccess?: () => void; onError?: () => void }) => {
      void (async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        const mimeType = asset.mimeType ?? 'image/jpeg';

        mutate(
          { fileUri: asset.uri, mimeType },
          {
            onSuccess: () => callbacks?.onSuccess?.(),
            onError: () => callbacks?.onError?.(),
          },
        );
      })();
    },
    [mutate],
  );

  return {
    optimisticUri,
    isUploading: isPending,
    pickAndUpload,
  };
}
