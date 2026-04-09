/**
 * useAppErrorReporter — FC'ler için stabil hata raporlama API'si.
 *
 * Dahili olarak errorReporting servisini kullanır.
 * Auth snapshot'ı her capture'da store'dan alınır (hook'un kendisi
 * sadece stabil callback referansları döndürür).
 */

import { useCallback } from 'react';
import { AxiosError } from 'axios';
import {
  captureAppError,
  captureApiError as captureApiErrorService,
  type CaptureOptions,
} from '@/services/errorReporting';

export function useAppErrorReporter() {
  const captureException = useCallback(
    (error: Error, options?: Partial<Omit<CaptureOptions, 'kind'>>) =>
      captureAppError(error, { kind: 'client', ...options }),
    [],
  );

  const captureApiError = useCallback(
    (error: AxiosError) => captureApiErrorService(error),
    [],
  );

  const captureClientError = useCallback(
    (error: Error, extraContext?: Record<string, unknown>) =>
      captureAppError(error, { kind: 'client', extraContext }),
    [],
  );

  return { captureException, captureApiError, captureClientError } as const;
}
