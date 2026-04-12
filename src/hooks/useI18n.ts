import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/store/hooks';
import { setLanguage } from '@/store/slices/settingsSlice';
import i18n from '@/i18n';
import type { AppLanguage } from '@/types/settings.types';

export const useI18n = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const changeLanguage = async (lang: AppLanguage) => {
    await i18n.changeLanguage(lang);
    dispatch(setLanguage(lang));
  };

  return {
    t,
    changeLanguage,
    currentLanguage: i18n.language as AppLanguage,
  };
};
