import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { MotiView } from '@/lib/motiView';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { Text } from '@/atoms/Text';
import { radius, spacing, shadow } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';

type PickerOption = {
  id: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  onDocument: () => void;
};

export const AttachmentPickerSheet: React.FC<Props> = ({
  visible,
  onClose,
  onCamera,
  onGallery,
  onDocument,
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();

  const options: PickerOption[] = [
    {
      id: 'camera',
      label: 'Kamera',
      icon: 'camera-outline',
      color: '#3B82F6',
      onPress: () => { haptics.light(); onCamera(); onClose(); },
    },
    {
      id: 'gallery',
      label: 'Fotoğraf / Video',
      icon: 'image-outline',
      color: '#10B981',
      onPress: () => { haptics.light(); onGallery(); onClose(); },
    },
    {
      id: 'document',
      label: 'Dosya / PDF',
      icon: 'document-outline',
      color: '#F59E0B',
      onPress: () => { haptics.light(); onDocument(); onClose(); },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <MotiView
          from={{ opacity: 0, translateY: 40 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 40 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.lg]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text variant="label" color={colors.textSecondary} style={styles.title}>
            EK DOSYA EKLE
          </Text>

          <View style={styles.options}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, { borderColor: colors.border }]}
                onPress={opt.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: opt.color + '18' }]}>
                  <Ionicons name={opt.icon} size={24} color={opt.color} />
                </View>
                <Text
                  variant="bodyMedium"
                  style={{ fontFamily: fontFamily.medium }}
                >
                  {opt.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cancelBtn, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => { haptics.light(); onClose(); }}
          >
            <Text variant="bodyMedium" color={colors.textSecondary}>
              İptal
            </Text>
          </TouchableOpacity>
        </MotiView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: spacing[5],
    paddingBottom: Platform.OS === 'ios' ? spacing[10] : spacing[6],
    paddingTop: spacing[3],
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  title: {
    marginBottom: spacing[3],
    letterSpacing: 0.8,
  },
  options: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: radius.lg,
  },
});
