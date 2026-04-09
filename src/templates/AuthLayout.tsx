import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/constants/spacing';
import { palette } from '@/constants/colors';

type Props = {
  children: React.ReactNode;
  showLogo?: boolean;
};

export const AuthLayout: React.FC<Props> = ({ children, showLogo = true }) => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: spacing[8],
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
