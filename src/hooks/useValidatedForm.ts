import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

/**
 * Zod + RHF varsayılanları: blur’da doğrula, hata varken yazarken yenile.
 * Zod 4 + zodResolver generic uyumu için resolver’da Resolver<T> cast kullanılır.
 */
export function useValidatedForm<T extends FieldValues>(
  schema: Parameters<typeof zodResolver>[0],
  options?: Omit<UseFormProps<T>, 'resolver' | 'mode' | 'reValidateMode'>,
) {
  return useForm<T>({
    resolver: zodResolver(schema) as Resolver<T>,
    mode: 'onBlur',
    reValidateMode: 'onChange',
    ...options,
  });
}
