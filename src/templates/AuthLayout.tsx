import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';

type Props = {
  children: React.ReactNode;
  showLogo?: boolean;
};

export const AuthLayout: React.FC<Props> = ({ children, showLogo = true }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        style={styles.kav}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: spacing[8] + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        bottomOffset={spacing[4] + insets.bottom}
        extraKeyboardSpace={spacing[2]}
      >
          {showLogo && (
            <View style={styles.logoWrap}>
              {/* THY Logo placeholder — assets/images/thy-logo.png buraya gelecek */}
              <View style={[styles.logoPlaceholder, { backgroundColor: palette.primary }]}>
                <View style={styles.logoLetters}>
                  {/* SVG logo veya Image component gelecek */}
                </View>
              </View>
            </View>
          )}
          <View style={styles.content}>{children}</View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing[6],
  },
  logoWrap: {
    alignItems: 'center',
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetters: {},
  content: {
    flex: 1,
  },
});
