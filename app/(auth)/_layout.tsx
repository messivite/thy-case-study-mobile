import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: [styles.content, Platform.OS === 'web' && styles.contentWeb],
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  contentWeb: {
    minHeight: '100%',
    height: '100%',
    width: '100%',
  },
});
