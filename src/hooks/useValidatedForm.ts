import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * Zod + RHF: onChange — değer değişince resolver; fieldState.error güncellenir,
 * FormField doğrudan error?.message ile border + metni bağlar (focus/dirty şartı yok).
 *
 * Zod 4 şemalarında @hookform/resolvers varsayılanı parseAsync kullanır; bu durumda
 * formState.isValid senkron güncellenmeyebilir. mode: 'sync' zorunlu.
 */
export function useValidatedForm<T extends FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
  options?: Omit<UseFormProps<T>, 'resolver' | 'mode' | 'reValidateMode'>,
) {
  return useForm<T>({
    resolver: zodResolver(schema, undefined, { mode: 'sync' }) as Resolver<T>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    delayError: 0,
    shouldFocusError: false,
    ...options,
  });
}
