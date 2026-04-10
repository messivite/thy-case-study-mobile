import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: styles.stackContent,
      }}
    />
  );
}

const styles = StyleSheet.create({
  stackContent: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100%' as const } : {}),
  },
});
