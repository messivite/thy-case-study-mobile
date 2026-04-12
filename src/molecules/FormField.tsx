import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { Input } from '@/atoms/Input';
import { Text } from '@/atoms/Text';
import { spacing } from '@/constants/spacing';
import { TextInputProps } from 'react-native';

type Props<T extends FieldValues> = TextInputProps & {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  labelColor?: string;
  secure?: boolean;
  leftIcon?: React.ReactNode;
};

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  labelColor,
  secure,
  leftIcon,
  ...inputProps
}: Props<T>) {
  const renderField = useCallback(
    ({ field: { onChange, onBlur, value }, fieldState: { error, isTouched } }: any) => {
      const errorMessage = isTouched && error?.message?.trim() ? error.message : undefined;
      return (
        <View style={styles.wrapper}>
          {label ? (
            <Text variant="label" color={labelColor} style={styles.label}>
              {label}
            </Text>
          ) : null}
          <Input
            {...inputProps}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errorMessage}
            secure={secure}
            leftIcon={leftIcon}
          />
        </View>
      );
    },
    // inputProps spread edildiginden sadece stable referanslari dep olarak aliyoruz
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [label, labelColor, secure, leftIcon],
  );

  return (
    <Controller
      control={control}
      name={name}
      render={renderField}
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
