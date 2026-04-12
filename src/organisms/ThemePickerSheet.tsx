/**
 * ThemePickerSheet
 *
 * Tema seçim sheet'i. LiquidBottomSheet üzerine kurulu.
 * - Başlık + kısa açıklama
 * - İkonlu tema satırları (tek seçim, checkmark)
 * - Seçimde: Redux setTheme
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiquidBottomSheet } from '@/molecules/LiquidBottomSheet';
import { Text } from '@/atoms/Text';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTheme } from '@/store/slices/settingsSlice';
import { useHaptics } from '@/hooks/useHaptics';
import { spacing, radius } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import type { ThemeMode } from '@/types/settings.types';

type ThemeOption = {
  value: ThemeMode;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  labelKey: 'settings.themeLight' | 'settings.themeDark' | 'settings.themeSystem';
  descriptionTR: string;
  descriptionEN: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'light',
    icon: 'sunny-outline',
    iconColor: '#F5A623',
    labelKey: 'settings.themeLight',
    descriptionTR: 'Her zaman açık tema kullan',
    descriptionEN: 'Always use the light theme',
  },
  {
    value: 'dark',
    icon: 'moon-outline',
    iconColor: '#7B8FF7',
    labelKey: 'settings.themeDark',
    descriptionTR: 'Her zaman koyu tema kullan',
    descriptionEN: 'Always use the dark theme',
  },
  {
    value: 'system',
    icon: 'phone-portrait-outline',
    iconColor: palette.primary,
    labelKey: 'settings.themeSystem',
    descriptionTR: 'Cihazın sistem ayarını takip et',
    descriptionEN: 'Follow the device system setting',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ThemePickerSheet({ open, onClose }: Props) {
  const { colors } = useTheme();
  const { t, currentLanguage } = useI18n();
  const dispatch = useAppDispatch();
  const haptics = useHaptics();
  const currentTheme = useAppSelector((s) => s.settings.theme);

  const handleSelect = useCallback(
    (value: 'light' | 'dark' | 'system') => {
      if (value === currentTheme) {
        onClose();
        return;
      }
      haptics.selection();
      dispatch(setTheme(value));
      onClose();
    },
    [currentTheme, dispatch, haptics, onClose],
  );

  return (
    <LiquidBottomSheet open={open} onClose={onClose} showHandle showCloseButton variant="solid">
      <View style={styles.container}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text variant="h4" color={colors.text} style={styles.title}>
            {t('settings.theme')}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {currentLanguage === 'tr'
              ? 'Uygulamanın görünümünü seçin. Anında uygulanır.'
              : 'Choose the app appearance. Applied instantly.'}
          </Text>
        </View>

        {/* Tema satırları */}
        <View style={[styles.list, { borderColor: colors.border }]}>
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = option.value === currentTheme;
            const isLast = index === THEME_OPTIONS.length - 1;
            const description = currentLanguage === 'tr' ? option.descriptionTR : option.descriptionEN;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.65}
              >
                {/* İkon */}
                <View style={[styles.iconWrap, { backgroundColor: `${option.iconColor}22` }]}>
                  <Ionicons name={option.icon} size={scale(22)} color={option.iconColor} />
                </View>

                {/* Metinler */}
                <View style={styles.rowText}>
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? palette.primary : colors.text },
                      isSelected && { fontFamily: fontFamily.semiBold },
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                  <Text style={[styles.themeDesc, { color: colors.textSecondary }]}>
                    {description}
                  </Text>
                </View>

                {/* Checkmark */}
                {isSelected && (
                  <View style={[styles.check, { backgroundColor: palette.primary }]}>
                    <Ionicons name="checkmark" size={scale(13)} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </LiquidBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  header: {
    gap: spacing[1],
    paddingHorizontal: spacing[1],
  },
  title: {
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  list: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  themeLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  themeDesc: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  check: {
    width: scale(22),
    height: scale(22),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
