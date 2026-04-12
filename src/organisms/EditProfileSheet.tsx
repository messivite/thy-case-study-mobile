import React, { useState, useRef, memo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  Text as RNText,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LiquidBottomSheet } from '@/molecules/LiquidBottomSheet';
import { Button } from '@/atoms/Button';
import { Text } from '@/atoms/Text';
import { useWhoIAm } from '@/hooks/useWhoIAm';
import { useUpdateMeMutation } from '@/hooks/api/useUpdateMe';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/lib/toast';
import { spacing, radius } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormProps = {
  initialDisplayName: string;
  onClose: () => void;
};

const MIN_LENGTH = 2;

const EditProfileForm = memo(function EditProfileForm({ initialDisplayName, onClose }: FormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { mutate, isPending } = useUpdateMeMutation();

  // Uncontrolled — ref ile değer takip, re-render yok
  const inputRef = useRef<TextInput>(null);
  const valueRef = useRef(initialDisplayName);
  const [error, setError] = useState<string | undefined>();
  const [focused, setFocused] = useState(false);

  const validate = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.length < MIN_LENGTH) return t('settings.displayNameMin');
    return undefined;
  };

  const handleChangeText = (text: string) => {
    valueRef.current = text;
    // Sadece hata varsa clear et — yeni hata gösterme (onBlur'da göster)
    if (error) setError(undefined);
  };

  const handleBlur = () => {
    setFocused(false);
    setError(validate(valueRef.current));
  };

  const handleSubmit = () => {
    const trimmed = valueRef.current.trim();
    const err = validate(trimmed);
    if (err) { setError(err); return; }
    mutate({ displayName: trimmed }, {
      onSuccess: () => {
        toast.success(t('settings.profileUpdated'));
        onClose();
      },
    });
  };

  const borderColor = error
    ? colors.error
    : focused
      ? colors.primary
      : colors.border;

  return (
    <View style={styles.container}>
      <Text variant="h4" color={colors.text} style={styles.title}>
        {t('settings.editProfile')}
      </Text>

      <View style={styles.fieldWrap}>
        <RNText style={[styles.label, { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: fontSize.sm }]}>
          {t('settings.displayName')}
        </RNText>
        <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor }]}>
          <TextInput
            ref={inputRef}
            defaultValue={initialDisplayName}
            onChangeText={handleChangeText}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder={t('settings.displayNamePlaceholder')}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            editable={!isPending}
            style={[styles.input, { color: colors.text, fontFamily: fontFamily.regular, fontSize: fontSize.base }]}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>
        {error ? (
          <RNText style={[styles.errorText, { color: colors.error, fontFamily: fontFamily.regular, fontSize: fontSize.xs }]}>
            {error}
          </RNText>
        ) : null}
      </View>

      <Button
        title={t('common.save')}
        onPress={handleSubmit}
        loading={isPending}
        disabled={isPending}
      />
    </View>
  );
});

export function EditProfileSheet({ open, onClose }: Props) {
  const { displayName } = useWhoIAm();
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
  fieldWrap: {
    marginBottom: spacing[4],
  },
  label: {
    marginBottom: spacing[1],
  },
  inputBox: {
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
  errorText: {
    marginTop: spacing[1],
    marginLeft: spacing[1],
  },
});
