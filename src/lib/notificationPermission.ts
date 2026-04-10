import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Push gönderilebilsin mi (tam izin veya iOS provisional). */
export function canDeliverPushNotifications(
  perm: Notifications.NotificationPermissionsStatus,
): boolean {
  if (perm.granted) return true;
  if (
    Platform.OS === 'ios' &&
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  return false;
}
