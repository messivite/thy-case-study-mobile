import { useState, type FC, type ReactNode } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  Text as RNText,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightColors, type ThemeColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type Props = TextInputProps & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: string;
  secure?: boolean;
  /** Renk tokenlari — verilmezse lightColors kullanilir (store subscription olmadan) */
  themeColors?: ThemeColors;
};

export const Input: FC<Props> = ({
  leftIcon,
  rightIcon,
  error,
  secure,
  style,
  themeColors,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...props
}) => {
  const colors = themeColors ?? lightColors;
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);

  const hasError = typeof error === 'string' && error.length > 0;

  const borderColor = hasError
    ? colors.error
    : focused
      ? colors.primary
      : colors.border;

  const handleFocus = (e: Parameters<NonNullable<Props['onFocus']>>[0]) => {
    setFocused(true);
    onFocusProp?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<Props['onBlur']>>[0]) => {
    setFocused(false);
    onBlurProp?.(e);
  };

  return (
    <View>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.inputBg, borderColor },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.base,
            },
            leftIcon ? { paddingLeft: spacing[2] } : undefined,
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secure && !secureVisible}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {secure && (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setSecureVisible((v) => !v)}
          >
            <Ionicons
              name={secureVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !secure && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {hasError ? (
        <RNText
          style={[styles.errorText, { color: colors.error, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}
        >
          {error}
        </RNText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing[4] : spacing[3],
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
  errorText: {
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});
