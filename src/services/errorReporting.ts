/**
 * errorReporting.ts — Merkezi Sentry raporlama katmanı
 *
 * Tüm hata kaynakları (error boundary, API, client) tek formatta
 * Sentry.withScope ile izole scope'da raporlanır.
 * Auth bilgisi store'dan okunur; token asla gönderilmez.
 */

import * as Sentry from '@sentry/react-native';
import { AxiosError } from 'axios';
import Constants from 'expo-constants';
import {
  defaultErrorReportingConfig,
  type ErrorReportKind,
  type ErrorReportingConfig,
} from '@/config/errorReporting.config';
/** Döngüsel import riskini azaltmak için runtime'da yükle */
function getReduxStore() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/store').store as typeof import('@/store').store;
}

const SENTRY_DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
const HAS_DSN = Boolean(SENTRY_DSN);

let isInitialized = false;
let config: ErrorReportingConfig = defaultErrorReportingConfig;

// ── Init ──────────────────────────────────────────────────────────────────

/**
 * Her zaman bir kez Sentry.init çağrılır (DSN yokken bile).
 * DSN yokken veya __DEV__ iken enabled:false — aksi halde Sentry.wrap / native
 * modül init edilmeden kullanılırsa girişte crash oluşabiliyor.
 */
export function initErrorReporting(overrides?: Partial<ErrorReportingConfig>): void {
  if (isInitialized) return;

  if (overrides) config = { ...config, ...overrides };

  const sendInThisBuild = HAS_DSN && !__DEV__;

  Sentry.init({
    dsn: HAS_DSN ? SENTRY_DSN : undefined,
    enabled: sendInThisBuild,
    tracesSampleRate: sendInThisBuild ? 1.0 : 0,
    enableAutoSessionTracking: sendInThisBuild,
    attachScreenshot: false,
    debug: __DEV__ && HAS_DSN,
    environment: __DEV__ ? 'development' : 'production',
  });

  isInitialized = true;
}

export function isErrorReportingActive(): boolean {
  return isInitialized && HAS_DSN && !__DEV__;
}

// ── Auth snapshot ─────────────────────────────────────────────────────────

function getAuthSnapshot(): {
  user: Sentry.User | null;
  authStatus: string;
  isGuest: boolean;
} {
  const { auth } = getReduxStore().getState();
  if (!auth.user) {
    return { user: null, authStatus: auth.status, isGuest: auth.isGuest };
  }
  return {
    user: { id: auth.user.id, email: auth.user.email, username: auth.user.name },
    authStatus: auth.status,
    isGuest: auth.isGuest,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function sanitizeUrl(url: string | undefined): string {
  if (!url) return 'unknown';
  if (config.stripQueryString) {
    const idx = url.indexOf('?');
    return idx >= 0 ? url.slice(0, idx) : url;
  }
  return url;
}

function truncate(str: unknown, max: number): string {
  const s = typeof str === 'string' ? str : JSON.stringify(str) ?? '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// ── Core capture ──────────────────────────────────────────────────────────

export type CaptureOptions = {
  kind: ErrorReportKind;
  extraContext?: Record<string, unknown>;
  tags?: Record<string, string>;
};

/**
 * Tek giriş noktası: her hata türü bu fonksiyonu çağırır.
 * withScope ile izole scope oluşturur; global scope'u kirletmez.
 */
export function captureAppError(
  error: Error,
  options: CaptureOptions,
): string {
  if (!isErrorReportingActive()) return '';

  let eventId = '';

  Sentry.withScope((scope) => {
    const { user, authStatus, isGuest } = getAuthSnapshot();

    scope.setLevel(config.severityByKind[options.kind]);
    scope.setTag('kind', options.kind);
    scope.setTag('auth_status', authStatus);
    if (isGuest) scope.setTag('is_guest', 'true');

    const appVersion = Constants.expoConfig?.version ?? 'unknown';
    scope.setTag('app_version', appVersion);

    if (user) scope.setUser(user);

    if (options.tags) {
      Object.entries(options.tags).forEach(([k, v]) => scope.setTag(k, v));
    }

    if (options.extraContext) {
      scope.setContext(options.kind, options.extraContext);
    }

    const fpFn = config.fingerprintByKind[options.kind];
    if (fpFn) {
      const meta = {
        kind: options.kind,
        errorName: error.name,
        ...(options.extraContext as Record<string, unknown>),
      };
      scope.setFingerprint(fpFn(meta as Parameters<typeof fpFn>[0]));
    }

    eventId = Sentry.captureException(error);
  });

  return eventId;
}

// ── API-specific capture ──────────────────────────────────────────────────

/**
 * Axios hataları için: status, method, path, response özeti ile birlikte raporlar.
 * Config'deki status kurallarına uymuyorsa sessizce geçer.
 */
export function captureApiError(error: AxiosError): string {
  if (!isErrorReportingActive()) return '';

  const status = error.response?.status ?? 0;

  if (config.silentAuthStatuses.includes(status)) return '';
  if (status > 0 && !config.apiReportableStatuses(status)) return '';

  const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
  const path = sanitizeUrl(error.config?.url);
  const responseBody = truncate(
    error.response?.data,
    config.apiResponseBodyMaxChars,
  );

  return captureAppError(error, {
    kind: 'api',
    tags: {
      'http.method': method,
      'http.status_code': String(status),
    },
    extraContext: {
      method,
      path,
      status,
      responseBody,
    },
  });
}

// ── Backward-compatible wrappers ──────────────────────────────────────────

/**
 * Eski Error Boundary / genel kullanım uyumu.
 * Yeni kodda captureAppError tercih edilmeli.
 */
export function reportError(
  error: Error,
  context?: Record<string, unknown>,
): string {
  return captureAppError(error, {
    kind: 'error_boundary',
    extraContext: context,
  });
}

export function reportMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
): void {
  if (!isErrorReportingActive()) return;
  Sentry.captureMessage(message, level);
}

// ── User sync ─────────────────────────────────────────────────────────────

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
