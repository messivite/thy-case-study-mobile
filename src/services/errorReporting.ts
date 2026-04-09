/**
 * errorReporting.ts — Sentry entegrasyonu
 *
 * Sentry DSN .env dosyasindan okunur: EXPO_PUBLIC_SENTRY_DSN
 * Sentry baslatma app root'ta init() ile yapilir.
 * Error boundary ve diger yerlerden captureException/captureMessage cagirilir.
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

let isInitialized = false;

/**
 * Sentry'yi baslatir. App root'ta bir kez cagirilir.
 */
export function initErrorReporting(): void {
  if (isInitialized || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
    attachScreenshot: true,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
  });

  isInitialized = true;
}

/**
 * Hatayi Sentry'ye raporlar. eventId doner.
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>,
): string {
  if (context) {
    Sentry.setContext('errorBoundary', context);
  }

  const eventId = Sentry.captureException(error);
  return eventId;
}

/**
 * Mesaj seviyesinde log gonderir.
 */
export function reportMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Kullanici bilgisi set eder — login sonrasi cagirilir.
 */
export function setErrorReportingUser(user: {
  id: string;
  email?: string;
  username?: string;
} | null): void {
  if (user) {
    Sentry.setUser(user);
  } else {
    Sentry.setUser(null);
  }
}

export { Sentry };
