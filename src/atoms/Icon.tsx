import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
};

export const Icon: React.FC<Props> = ({ name, size = 24, color }) => {
  const { colors } = useTheme();
  return <Ionicons name={name} size={size} color={color ?? colors.text} />;
};
