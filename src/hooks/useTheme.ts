import { useColorScheme } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { lightColors, darkColors, ThemeColors } from '@/constants/colors';

export const useTheme = (): { colors: ThemeColors; isDark: boolean } => {
  const themeMode = useAppSelector((s) => s.settings.theme);
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
};
