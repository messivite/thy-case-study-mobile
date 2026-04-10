/**
 * SearchInput
 *
 * Drawer ve benzeri ekranlarda kullanılan arama input'u.
 * - leftIcon dışarıdan override edilebilir (default: search)
 * - rightIcon: focus'ta "İptal" text butonu
 * - focus animasyonu: border rengi
 * - onFocusChange: parent'ın search overlay'i açıp kapatması için
 */

import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { scale } from '@/lib/responsive';

export interface SearchInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

type Props = TextInputProps & {
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
  onFocusChange?: (focused: boolean) => void;
  onClear?: () => void;
  showCancelOnFocus?: boolean;
  cancelLabel?: string;
};

export const SearchInput = forwardRef<SearchInputRef, Props>(({
  leftIcon,
  containerStyle,
  onFocusChange,
  onClear,
  showCancelOnFocus = true,
  cancelLabel = 'İptal',
  style,
  value,
  onChangeText,
  ...props
}, ref) => {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const progress = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: () => {
      onChangeText?.('');
      onClear?.();
    },
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    progress.value = withTiming(1, { duration: 180 });
    onFocusChange?.(true);
    props.onFocus?.(null as any);
  }, [onFocusChange, progress, props]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    progress.value = withTiming(0, { duration: 180 });
    onFocusChange?.(false);
    props.onBlur?.(null as any);
  }, [onFocusChange, progress, props]);

  const handleCancel = useCallback(() => {
    onChangeText?.('');
    onClear?.();
    inputRef.current?.blur();
  }, [onChangeText, onClear]);

  const animatedContainer = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.primary + '88'],
    ),
  }));

  return (
    <View style={[styles.row, containerStyle]}>
      <Animated.View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.surface },
          animatedContainer,
        ]}
      >
        {/* Left icon */}
        <View style={styles.leftSlot}>
          {leftIcon ?? (
            <Ionicons
              name="search"
              size={scale(16)}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
          )}
        </View>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: colors.text, fontFamily: fontFamily.regular },
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          clearButtonMode="never"
          autoCorrect={false}
          autoCapitalize="none"
          {...props}
        />

        {/* Clear button — value varsa göster */}
        {!!value && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => { onChangeText?.(''); onClear?.(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={scale(16)} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* İptal butonu — focus'ta kayarak gelir */}
      {showCancelOnFocus && isFocused && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[styles.cancelText, { color: colors.primary }]}>
            {cancelLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

SearchInput.displayName = 'SearchInput';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[3],
    height: scale(38),
  },
  leftSlot: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: scale(13),
    paddingVertical: 0,
    includeFontPadding: false,
  },
  clearBtn: {
    marginLeft: spacing[1],
    padding: 2,
  },
  cancelBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
    flexShrink: 0,
  },
  cancelText: {
    fontFamily: fontFamily.medium,
    fontSize: scale(13),
  },
});
