import { Platform } from 'react-native';
import type { NotificationPermissionsStatus } from 'expo-notifications';

// expo-notifications enum'un runtime importunu web'de tetiklememek için sabit sayı kullanılır.
// iOS UNAuthorizationStatus.provisional = 3
const IOS_AUTH_STATUS_PROVISIONAL = 3;

/** Push gönderilebilsin mi (tam izin veya iOS provisional). */
export function canDeliverPushNotifications(
  perm: NotificationPermissionsStatus,
): boolean {
  if (perm.granted) return true;
  if (
    Platform.OS === 'ios' &&
    perm.ios?.status === IOS_AUTH_STATUS_PROVISIONAL
  ) {
    return true;
  }
  return false;
}
