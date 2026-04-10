import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Input } from '@/atoms/Input';
import { Text } from '@/atoms/Text';
import { spacing } from '@/constants/spacing';
import { useTheme } from '@/hooks/useTheme';
import { TextInputProps } from 'react-native';

type Props<T extends FieldValues> = TextInputProps & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  secure?: boolean;
  leftIcon?: React.ReactNode;
};

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  secure,
  leftIcon,
  ...inputProps
}: Props<T>) {
  const { colors } = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.wrapper}>
          {label ? (
            <Text variant="label" color={colors.textSecondary} style={styles.label}>
              {label}
            </Text>
          ) : null}
          <Input
            {...inputProps}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={error?.message}
            secure={secure}
            leftIcon={leftIcon}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[1],
  },
});
