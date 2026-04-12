import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { textVariants, fontFamily } from '@/constants/typography';

type TextVariant = keyof typeof textVariants;

type Props = TextProps & {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

// useTheme yok — color her zaman prop olarak geçilmeli.
// Default renk: koyu (light mode uyumlu) — tema geçişlerinde parent zaten rengi prop olarak veriyor.
// Context subscription yok → re-render yok.
const TextInner: React.FC<Props> = ({
  variant = 'body',
  color = '#111111',
  align = 'left',
  style,
  ...props
}) => {
  const variantStyle = textVariants[variant];

  return (
    <RNText
      style={[
        { fontFamily: fontFamily.regular },
        variantStyle,
        { color, textAlign: align },
        style,
      ]}
      {...props}
    />
  );
};

export const Text = React.memo(TextInner);
