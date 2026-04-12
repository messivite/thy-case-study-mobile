/**
 * ServerUnavailableSheet
 *
 * Profil/API yüklemesi başarısız olduğunda gösterilir.
 * Sadece home ekranında render edilir — her yerde değil.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LiquidBottomSheet } from '@/molecules/LiquidBottomSheet';
import { Text } from '@/atoms/Text';
import { Button } from '@/atoms/Button';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearServerUnavailable } from '@/store/slices/profileSlice';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';

export function ServerUnavailableSheet() {
  const { colors } = useTheme();
  const { currentLanguage } = useI18n();
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.profile.serverUnavailable);

  const handleClose = useCallback(() => {
    dispatch(clearServerUnavailable());
  }, [dispatch]);

  return (
    <LiquidBottomSheet
      open={open}
      onClose={handleClose}
      showHandle
      showCloseButton
      variant="glass"
    >
      <View style={styles.body}>
        <View style={[styles.iconRing, { backgroundColor: `${palette.error}18` }]}>
          <Ionicons name="cloud-offline-outline" size={36} color={palette.error} />
        </View>

        <Text variant="h4" style={styles.title} color={colors.text}>
          {currentLanguage === 'tr'
            ? 'Sunucularımıza erişemiyoruz'
            : 'Cannot reach our servers'}
        </Text>

        <Text variant="body" color={colors.textSecondary} style={styles.message}>
          {currentLanguage === 'tr'
            ? 'Lütfen internet bağlantınızı kontrol edin ve daha sonra tekrar deneyin.'
            : 'Please check your internet connection and try again later.'}
        </Text>

        <Button
          title={currentLanguage === 'tr' ? 'Kapat' : 'Close'}
          onPress={handleClose}
          fullWidth
        />
      </View>
    </LiquidBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: spacing[3],
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  title: {
    textAlign: 'center',
    fontFamily: fontFamily.semiBold,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[2],
  },
});
