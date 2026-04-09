import type { SeverityLevel } from '@sentry/react-native';

export type ErrorReportKind = 'error_boundary' | 'api' | 'client';

export type ErrorReportingConfig = {
  /** API: hangi HTTP status kodlarında Sentry'ye raporla. Varsayılan >= 500. */
  apiReportableStatuses: (status: number) => boolean;
  /** API: 401/403 gibi auth hatalarını sessizce geç. */
  silentAuthStatuses: number[];
  /** API: response body'sinden kaç karakter context'e eklensin (hassas veri koruma). */
  apiResponseBodyMaxChars: number;
  /** API: URL'deki query string'i soyar. */
  stripQueryString: boolean;
  /** Kind bazlı varsayılan Sentry severity. */
  severityByKind: Record<ErrorReportKind, SeverityLevel>;
  /** Kind bazlı fingerprint üretimi. null ise Sentry kendi belirler. */
  fingerprintByKind: Record<ErrorReportKind, ((meta: FingerprintMeta) => string[]) | null>;
};

export type FingerprintMeta = {
  kind: ErrorReportKind;
  method?: string;
  path?: string;
  status?: number;
  errorName?: string;
};

export const defaultErrorReportingConfig: ErrorReportingConfig = {
  apiReportableStatuses: (status) => status >= 500,
  silentAuthStatuses: [401, 403],
  apiResponseBodyMaxChars: 500,
  stripQueryString: true,
  severityByKind: {
    error_boundary: 'fatal',
    api: 'error',
    client: 'error',
  },
  fingerprintByKind: {
    error_boundary: null,
    api: ({ method, path, status }) => [
      'api',
      method ?? 'UNKNOWN',
      path ?? 'unknown',
      String(status ?? 0),
    ],
    client: null,
  },
};
