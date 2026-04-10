import React, { useEffect, useState } from 'react';
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
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

const DURATION = 200;

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
  const { colors } = useTheme();
  const errorColor = colors.error;
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);

  // 3 durumu tek shared value ile yönet:
  // 0 = idle, 1 = focused, 2 = error
  const borderProgress = useSharedValue(0);

  useEffect(() => {
    if (error) {
      borderProgress.value = withTiming(2, { duration: DURATION });
    } else if (focused) {
      borderProgress.value = withTiming(1, { duration: DURATION });
    } else {
      borderProgress.value = withTiming(0, { duration: DURATION });
    }
  }, [error, focused, borderProgress]);

  const handleFocus = () => {
    setFocused(true);
    props.onFocus?.(null as any);
  };

  const handleBlur = () => {
    setFocused(false);
    props.onBlur?.(null as any);
  };

  const animatedBorder = useAnimatedStyle(() => {
    'worklet';
    if (borderProgress.value >= 1.5) {
      return { borderColor: errorColor };
    }
    if (borderProgress.value >= 0.5) {
      return { borderColor: colors.primary };
    }
    return { borderColor: colors.border };
  });

  return (
    <View>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: colors.inputBg },
          animatedBorder,
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
          style={[styles.errorText, { color: errorColor, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}
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
  errorText: {
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});
