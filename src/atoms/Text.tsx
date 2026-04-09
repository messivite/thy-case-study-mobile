import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { textVariants, fontFamily } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

type TextVariant = keyof typeof textVariants;

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

export const Text: React.FC<Props> = ({
  variant = 'body',
  color,
  align = 'left',
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const variantStyle = textVariants[variant];

  return (
    <RNText
      style={[
        { fontFamily: fontFamily.regular }, // Inter default — variant veya style prop override eder
        variantStyle,
        { color: color ?? colors.text, textAlign: align },
        style,
      ]}
      {...props}
    />
  );
};
