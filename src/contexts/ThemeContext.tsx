import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { lightColors, darkColors, ThemeColors } from '@/constants/colors';

type ThemeContextValue = { colors: ThemeColors; isDark: boolean };

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

/**
 * Tek bir Redux subscription + useColorScheme burada.
 * Alt componentler useTheme() ile context'ten okur — her biri ayrı subscription açmaz.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useAppSelector((s) => s.settings.theme);
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
    return { colors: isDark ? darkColors : lightColors, isDark };
  }, [themeMode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
