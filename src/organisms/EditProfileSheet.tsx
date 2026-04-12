import React, { useCallback, useMemo, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LiquidBottomSheet } from '@/molecules/LiquidBottomSheet';
import { FormField } from '@/molecules/FormField';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import { useUpdateMeMutation } from '@/hooks/api/useUpdateMe';
import { useValidatedForm } from '@/hooks/useValidatedForm';
import { useI18n } from '@/hooks/useI18n';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/lib/toast';
import { spacing } from '@/constants/spacing';
import { editProfileSchema, type EditProfileFormValues } from '@/forms/profile/editProfile/schema';

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormProps = {
  initialDisplayName: string;
  onClose: () => void;
};

/**
 * Form ayrı component'te — her onChange yalnızca burayı re-render eder,
 * LiquidBottomSheet animasyon state'ini etkilemez.
 */
const EditProfileForm = memo(function EditProfileForm({ initialDisplayName, onClose }: FormProps) {
  const { t, currentLanguage } = useI18n();
  const { colors } = useTheme();
  const { mutate, isPending } = useUpdateMeMutation();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => editProfileSchema(t), [currentLanguage]);

  const { control, handleSubmit, formState: { isValid } } = useValidatedForm<EditProfileFormValues>(schema, {
    defaultValues: { displayName: initialDisplayName },
  });

  const onSubmit = useCallback(
    (values: EditProfileFormValues) => {
      mutate({ displayName: values.displayName.trim() });
      toast.success(t('settings.profileUpdated'));
      onClose();
    },
    [mutate, t, onClose],
  );

  return (
    <View style={styles.container}>
      <Text variant="h4" color={colors.text} style={styles.title}>
        {t('settings.editProfile')}
      </Text>

      <FormField
        control={control}
        name="displayName"
        label={t('settings.displayName')}
        labelColor={colors.textSecondary}
        placeholder={t('settings.displayNamePlaceholder')}
        autoCapitalize="words"
        editable={!isPending}
      />

      <Button
        title={t('common.save')}
        onPress={handleSubmit(onSubmit)}
        loading={isPending}
        disabled={!isValid || isPending}
      />
    </View>
  );
});

export function EditProfileSheet({ open, onClose }: Props) {
  const { displayName } = useWhoIAm();

  // Sheet her açıldığında güncel displayName'i key olarak kullan —
  // EditProfileForm remount olur ve form fresh defaultValues alır.
  const formKey = open ? (displayName ?? '') : null;

  return (
    <LiquidBottomSheet open={open} onClose={onClose} variant="solid">
      {formKey !== null && (
        <EditProfileForm
          key={formKey}
          initialDisplayName={formKey}
          onClose={onClose}
        />
      )}
    </LiquidBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    marginBottom: spacing[2],
  },
});
