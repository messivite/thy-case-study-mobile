/**
 * ErrorReportTest — Sadece manuel test için.
 * Tıklanınca render aşamasında hata fırlatır → AppErrorBoundary devreye girer.
 *
 * Kullanım: Herhangi bir ekranda <ErrorReportTest /> (varsayılan sadece __DEV__)
 * Production build’de de denemek için: <ErrorReportTest enabled />
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type ErrorReportTestProps = {
  /** false ise hiç render edilmez. Varsayılan: __DEV__ */
  enabled?: boolean;
};

export function ErrorReportTest({ enabled = __DEV__ }: ErrorReportTestProps) {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error(
      '[ErrorReportTest] Bilinçli test çöküşü — error boundary / Sentry akışını doğrular.',
    );
  }

  if (!enabled) {
    return null;
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Test crash — error boundary"
        onPress={() => setShouldCrash(true)}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Ionicons name="bug" size={22} color={palette.white} />
        <Text style={styles.label}>Crash test</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[20],
    zIndex: 9999,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: palette.primary,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: palette.white,
  },
});
