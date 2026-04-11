import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  header: React.ReactNode;
  children: React.ReactNode;
  input: React.ReactNode;
};

const ChatLayoutInner: React.FC<Props> = ({ header, children, input }) => {
  const { colors } = useTheme();

  const rootStyle = React.useMemo(() => [styles.root, { backgroundColor: colors.background }], [colors.background]);
  const inputAreaStyle = React.useMemo(() => [styles.inputArea, { backgroundColor: colors.background }], [colors.background]);

  return (
    <View style={rootStyle}>
      {header}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.content}>{children}</View>
        <View style={inputAreaStyle}>
          {input}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export const ChatLayout = React.memo(ChatLayoutInner);

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  content: { flex: 1 },
  inputArea: {},
});
