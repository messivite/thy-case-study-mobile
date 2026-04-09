import { useQuery } from '@tanstack/react-query';
import { getMe } from '@/api/user.api';
import { MeResponse } from '@/types/user.api.types';

export const USER_QUERY_KEYS = {
  me: ['user', 'me'] as const,
};

/**
 * GET /api/me
 * Oturum açmış kullanıcının bilgilerini çeker.
 *
 * Kullanım:
 *   const { data, isLoading } = useGetMeQuery();
 */
export const useGetMeQuery = () =>
  useQuery<MeResponse, Error>({
    queryKey: USER_QUERY_KEYS.me,
    queryFn: getMe,
  });
