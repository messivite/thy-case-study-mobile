import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/atoms/Text';
import { AI_MODELS, AIModelId } from '@/constants/models';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type Props = {
  modelId: AIModelId;
  style?: ViewStyle;
  compact?: boolean;
};

export const ModelBadge: React.FC<Props> = ({ modelId, style, compact = false }) => {
  const model = AI_MODELS.find((m) => m.id === modelId);
  if (!model) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: model.color + '22', borderColor: model.color + '55' },
        compact && styles.compact,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: model.color, fontFamily: fontFamily.semiBold, fontSize: compact ? fontSize.xs : fontSize.sm },
        ]}
      >
        {compact ? model.id.toUpperCase() : (model.description)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  label: {},
});
