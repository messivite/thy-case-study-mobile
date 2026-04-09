import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { AI_MODELS, AIModelId } from '@/constants/models';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { radius, spacing, shadow } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { palette } from '@/constants/colors';
import { useI18n } from '@/hooks/useI18n';

type Props = {
  visible: boolean;
  selectedModel: AIModelId;
  onSelect: (modelId: AIModelId) => void;
  onClose: () => void;
};

export const ModelSelector: React.FC<Props> = ({
  visible,
  selectedModel,
  onSelect,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const { t } = useI18n();

  const handleSelect = useCallback(
    (id: AIModelId) => {
      haptics.selection();
      onSelect(id);
      onClose();
    },
    [onSelect, onClose],
  );

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
          from={{ opacity: 0, scale: 0.95, translateY: 20 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
            shadow.lg,
          ]}
        >
          <Text variant="h4" style={styles.title}>
            {t('models.selectModel')}
          </Text>

          {AI_MODELS.map((model) => {
            const isSelected = model.id === selectedModel;
            return (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.item,
                  { borderColor: colors.border },
                  isSelected && {
                    backgroundColor: model.color + '15',
                    borderColor: model.color + '55',
                  },
                ]}
                onPress={() => handleSelect(model.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: model.color + '22' }]}>
                  <Ionicons name={model.icon as any} size={22} color={model.color} />
                </View>
                <View style={styles.modelInfo}>
                  <Text variant="bodyMedium" style={{ fontFamily: fontFamily.semiBold }}>
                    {t(model.nameKey)}
                  </Text>
                  <Text variant="caption" color={colors.textSecondary}>
                    {model.description}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={model.color} />
                )}
              </TouchableOpacity>
            );
          })}
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
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  sheet: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[5],
  },
  title: {
    marginBottom: spacing[4],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
    gap: spacing[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelInfo: {
    flex: 1,
  },
});
