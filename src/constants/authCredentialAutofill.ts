import { Platform, type TextInputProps } from 'react-native';

/**
 * iOS Keychain / Android Autofill "şifreyi kaydet" önerisini tetiklememek için alanları nötrler.
 * OS veya kullanıcı ayarları yine nadiren müdahale edebilir; tam garanti Apple tarafında yok.
 */
export const AUTH_NO_CREDENTIAL_SAVE_PROPS: Pick<
  TextInputProps,
  'autoComplete' | 'textContentType' | 'importantForAutofill'
> =
  Platform.OS === 'ios'
    ? { autoComplete: 'off', textContentType: 'none' }
    : Platform.OS === 'android'
      ? { autoComplete: 'off', importantForAutofill: 'no' }
      : { autoComplete: 'off' };
