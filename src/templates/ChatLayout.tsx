import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { DESIGN_BASE_WIDTH } from '@/lib/responsive';

const IS_WEB = Platform.OS === 'web';
const IS_ANDROID = Platform.OS === 'android';

type Props = {
  header: React.ReactNode;
  children: React.ReactNode;
  input: React.ReactNode;
};

const ChatLayoutInner: React.FC<Props> = ({ header, children, input }) => {
  const { colors } = useTheme();

  const rootStyle = React.useMemo(() => [styles.root, { backgroundColor: colors.background }], [colors.background]);
  const inputAreaStyle = React.useMemo(() => [styles.inputArea, { backgroundColor: colors.background }], [colors.background]);

  const inner = (
    <>
      <View style={IS_WEB ? styles.contentWeb : styles.content}>{children}</View>
      <View style={[inputAreaStyle, IS_WEB && styles.inputAreaWeb]}>
        {input}
      </View>
    </>
  );

  return (
    <View style={rootStyle}>
      {IS_WEB ? header : null}
      <KeyboardAvoidingView
        behavior={IS_WEB ? undefined : IS_ANDROID ? 'height' : 'padding'}
        style={IS_WEB ? styles.kavWeb : styles.kav}
      >
        {IS_WEB ? null : header}
        {inner}
      </KeyboardAvoidingView>
    </View>
  );
};

export const ChatLayout = React.memo(ChatLayoutInner);

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  kavWeb: {
    flex: 1,
    maxWidth: DESIGN_BASE_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  content: { flex: 1 },
  contentWeb: { flex: 1 },
  inputArea: {},
  inputAreaWeb: {
    maxWidth: DESIGN_BASE_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
});
