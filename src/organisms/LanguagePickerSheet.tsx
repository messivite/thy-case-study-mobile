/**
 * LanguagePickerSheet
 *
 * Dil seçim sheet'i. LiquidBottomSheet üzerine kurulu.
 * - Başlık + kısa açıklama
 * - Bayraklı dil satırları (tek seçim, checkmark)
 * - Seçimde: i18n.changeLanguage + Redux setLanguage + PATCH /api/me (locale)
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // checkmark için
import { LiquidBottomSheet } from '@/molecules/LiquidBottomSheet';
import { Text } from '@/atoms/Text';
import { useI18n } from '@/hooks/useI18n';
import i18n from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useUpdateMeMutation } from '@/hooks/api/useUpdateMe';
import { useHaptics } from '@/hooks/useHaptics';
import { toast } from '@/lib/toast';
import { spacing, radius } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily, fontSize } from '@/constants/typography';
import { scale } from '@/lib/responsive';

type Language = {
  code: 'tr' | 'en';
  flag: string;
  label: string;
  description: string;
};

const LANGUAGES: Language[] = [
  {
    code: 'tr',
    flag: '🇹🇷',
    label: 'Türkçe',
    description: 'Uygulama dilini Türkçe olarak kullan',
  },
  {
    code: 'en',
    flag: '🇬🇧',
    label: 'English',
    description: 'Use the app in English',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LanguagePickerSheet({ open, onClose }: Props) {
  const { colors } = useTheme();
  const { t, changeLanguage, currentLanguage } = useI18n();
  const { mutate: updateMe } = useUpdateMeMutation();
  const haptics = useHaptics();

  const handleSelect = useCallback(
    (lang: Language) => {
      if (lang.code === currentLanguage) {
        onClose();
        return;
      }
      haptics.selection();
      // i18n + Redux
      void changeLanguage(lang.code);
      // Seçilen dilin t() fonksiyonunu al — hook henüz güncellenmemiş olabilir
      const tNext = i18n.getFixedT(lang.code);
      // Backend sync
      updateMe(
        { locale: lang.code },
        {
          onSuccess: () => toast.info(tNext('toast.settingsSaved')),
          onError: () => {
            // Hata olsa bile UI değişimi kalır — locale kritik değil
          },
        },
      );
      onClose();
    },
    [currentLanguage, changeLanguage, updateMe, haptics, t, onClose],
  );

  return (
    <LiquidBottomSheet open={open} onClose={onClose} showHandle showCloseButton variant="solid">
      <View style={styles.container}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text variant="h4" color={colors.text} style={styles.title}>
            {t('settings.language')}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.subtitle}>
            {currentLanguage === 'tr'
              ? 'Uygulamanın dilini seçin. Tüm metinler anında değişir.'
              : 'Choose the app language. All text updates instantly.'}
          </Text>
        </View>

        {/* Dil satırları */}
        <View style={[styles.list, { borderColor: colors.border }]}>
          {LANGUAGES.map((lang, index) => {
            const isSelected = lang.code === currentLanguage;
            const isLast = index === LANGUAGES.length - 1;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.row,
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
                onPress={() => handleSelect(lang)}
                activeOpacity={0.65}
              >
                {/* Bayrak */}
                <Text style={styles.flag}>{lang.flag}</Text>

                {/* Metinler */}
                <View style={styles.rowText}>
                  <Text
                    style={[
                      styles.langLabel,
                      { color: isSelected ? palette.primary : colors.text },
                      isSelected && { fontFamily: fontFamily.semiBold },
                    ]}
                  >
                    {lang.label}
                  </Text>
                  <Text style={[styles.langDesc, { color: colors.textSecondary }]}>
                    {lang.description}
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
  flag: {
    fontSize: 28,
    lineHeight: 34,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  langLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
  },
  langDesc: {
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
