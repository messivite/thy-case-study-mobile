import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

// Modül seviyesinde sabit obje — her render'da yeni referans üretilmez.
// useHaptics() hook gibi görünür ama aslında stable singleton döndürür.
const haptics = {
  light: () => { if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
  medium: () => { if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
  heavy: () => { if (isNative) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); },
  success: () => { if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  error: () => { if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
  warning: () => { if (isNative) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); },
  selection: () => { if (isNative) Haptics.selectionAsync(); },
};

export const useHaptics = () => haptics;
