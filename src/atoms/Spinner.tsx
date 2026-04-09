import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';
import { palette } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

type Props = ActivityIndicatorProps & {
  useThemeColor?: boolean;
};

export const Spinner: React.FC<Props> = ({ useThemeColor = false, color, ...props }) => {
  const { colors } = useTheme();
  return (
    <ActivityIndicator
      color={color ?? (useThemeColor ? colors.primary : palette.primary)}
      {...props}
    />
  );
};
