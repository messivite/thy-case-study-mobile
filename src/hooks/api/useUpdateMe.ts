import { useMutation } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setProfile, patchProfile } from '@/store/slices/profileSlice';
import { updateMe } from '@/api/user.api';
import { toast } from '@/lib/toast';
import { useI18n } from '@/hooks/useI18n';
import type { MeResponse, UpdateMeProfileRequest } from '@/types/user.api.types';

/**
 * PATCH /api/me — optimistic UI pattern.
 *
 * onMutate  → store'u hemen günceller, önceki snapshot'ı döner
 * onSuccess → API'den gelen gerçek veriyi store'a yazar, onClose callback'ini çağırır
 * onError   → snapshot ile store'u geri alır, toast gösterir
 */
export const useUpdateMeMutation = () => {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const currentData = useAppSelector((s) => s.profile.data);

  return useMutation<MeResponse, Error, UpdateMeProfileRequest, MeResponse | null>({
    mutationFn: (payload) => updateMe(payload),

    onMutate: (payload) => {
      const snapshot = currentData;
      dispatch(patchProfile(payload));
      return snapshot;
    },

    onSuccess: (data) => {
      dispatch(setProfile(data));
    },

    onError: (_err, _vars, snapshot) => {
      if (snapshot) dispatch(setProfile(snapshot));
      toast.error(t('settings.profileUpdateFailed'));
    },
  });
};
