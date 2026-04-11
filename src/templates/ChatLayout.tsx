import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  header: React.ReactNode;
  children: React.ReactNode;
  input: React.ReactNode;
};

export const ChatLayout: React.FC<Props> = ({ header, children, input }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {header}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>{children}</View>
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
