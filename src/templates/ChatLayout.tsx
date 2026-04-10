import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  header: React.ReactNode;
  children: React.ReactNode;
  /** Rendered below content, pinned to bottom. Receives bottomInset as padding. */
  input: React.ReactNode;
};

export const ChatLayout: React.FC<Props> = ({ header, children, input }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {header}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>{children}</View>
        {/*
          No extra paddingBottom here — ChatInput wrapper already has spacing[1].
          insets.bottom fills the home-indicator gap so background is seamless.
        */}
        <View style={[styles.inputArea, { backgroundColor: colors.background }]}>
          {input}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  content: { flex: 1 },
  inputArea: {},
});
