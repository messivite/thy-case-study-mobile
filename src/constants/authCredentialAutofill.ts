import { Platform, type TextInputProps } from 'react-native';

/**
 * iOS Keychain "Şifreyi kaydet" / Şifreler çubuğu — tam kapatma garantisi yok.
 * - email + secure alan + email klavyesi → sistem bunu login formu sayar.
 * - Şifre alanında passwordRules boş string, güçlü şifre / bazı önerileri kısar (iOS 12+).
 */

const iosBase: Pick<TextInputProps, 'autoCorrect' | 'spellCheck'> = {
  autoCorrect: false,
  spellCheck: false,
};

/** E-posta — iOS'ta mümkünse `keyboardType="default"` kullan (email-address + şifre = login eşlemesi). */
export const AUTH_NO_CREDENTIAL_EMAIL_PROPS: TextInputProps =
  Platform.OS === 'ios'
    ? {
        ...iosBase,
        autoComplete: 'off',
        textContentType: 'none',
      }
    : Platform.OS === 'android'
      ? {
          ...iosBase,
          autoComplete: 'off',
          importantForAutofill: 'no',
        }
      : {
          ...iosBase,
          autoComplete: 'off',
        };

/** Şifre — secureTextEntry yine Keychain ipucu verir; mümkün olan ek nötrleştirme.
 *  textContentType:'oneTimeCode' iOS'un password manager prompt'unu en güvenilir şekilde baskılar. */
export const AUTH_NO_CREDENTIAL_PASSWORD_PROPS: TextInputProps =
  Platform.OS === 'ios'
    ? {
        ...iosBase,
        autoComplete: 'off',
        textContentType: 'none',
        passwordRules: '',
      }
    : Platform.OS === 'android'
      ? {
          ...iosBase,
          autoComplete: 'off',
          importantForAutofill: 'no',
        }
      : {
          ...iosBase,
          autoComplete: 'off',
        };

/** Tek prop objesi isteyen eski kullanım — her iki alanda da `none` (şifre için passwordRules yok). */
export const AUTH_NO_CREDENTIAL_SAVE_PROPS: TextInputProps =
  Platform.OS === 'ios'
    ? { ...iosBase, autoComplete: 'off', textContentType: 'none' }
    : Platform.OS === 'android'
      ? { ...iosBase, autoComplete: 'off', importantForAutofill: 'no' }
      : { ...iosBase, autoComplete: 'off' };
