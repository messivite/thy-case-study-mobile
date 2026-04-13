import { Redirect, Stack, useSegments } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

const AUTH_LANDING_SEGMENTS = new Set(['welcome', 'login', 'register', 'forgotpassword']);

export default function AuthLayout() {
  const { status } = useAuth();
  const segments = useSegments();

  const onAuthLanding = segments.some((s) => AUTH_LANDING_SEGMENTS.has(String(s)));
  const sessionActive = status === 'authenticated' || status === 'guest';

  if (sessionActive && onAuthLanding) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: [styles.content, Platform.OS === 'web' && styles.contentWeb],
      }}
    >
      <Stack.Screen name="forgotpassword/index" options={{ animation: 'fade' }} />
      <Stack.Screen name="register/index" options={{ animation: 'fade' }} />
    </Stack>
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
