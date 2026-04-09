import React, { useState, useRef } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type Props = TextInputProps & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  secure?: boolean;
};

export const Input: React.FC<Props> = ({
  leftIcon,
  rightIcon,
  error,
  secure,
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const progress = useSharedValue(0);

  const handleFocus = () => {
    setFocused(true);
    progress.value = withTiming(1, { duration: 200 });
    props.onFocus?.(null as any);
  };

  const handleBlur = () => {
    setFocused(false);
    progress.value = withTiming(0, { duration: 200 });
    props.onBlur?.(null as any);
  };

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [error ? '#EF4444' : colors.border, error ? '#EF4444' : colors.primary],
    ),
  }));

  return (
    <View>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.inputBg },
          animatedBorder,
          error ? styles.errorBorder : undefined,
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
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secure && !secureVisible}
          {...props}
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
      </Animated.View>
      {error ? (
        <Animated.Text
          style={[styles.errorText, { color: '#EF4444', fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}
        >
          {error}
        </Animated.Text>
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
  errorBorder: {
    borderColor: '#EF4444',
  },
  errorText: {
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});
