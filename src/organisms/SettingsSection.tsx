import React from 'react';
import { View, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';

type SettingsItem = {
  id: string;
  label: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
};

type Props = {
  title?: string;
  items: SettingsItem[];
};

export const SettingsSection: React.FC<Props> = ({ title, items }) => {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <View style={styles.section}>
      {title && (
        <Text
          variant="label"
          color={colors.textSecondary}
          style={[styles.sectionTitle, { textTransform: 'uppercase', letterSpacing: 0.5 }]}
        >
          {title}
        </Text>
      )}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {items.map((item, i) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                if (item.toggle) return;
                if (item.onPress) {
                  haptics.light();
                  item.onPress();
                }
              }}
              disabled={!item.onPress && !item.toggle}
              activeOpacity={0.7}
            >
              {item.icon && (
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: (item.iconColor ?? colors.primary) + '18' },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={item.destructive ? '#EF4444' : (item.iconColor ?? colors.primary)}
                  />
                </View>
              )}

              <View style={styles.labelWrap}>
                <Text
                  variant="bodyMedium"
                  color={item.destructive ? '#EF4444' : colors.text}
                  style={{ fontFamily: fontFamily.medium }}
                >
                  {item.label}
                </Text>
                {item.subtitle && (
                  <Text variant="caption" color={colors.textSecondary}>
                    {item.subtitle}
                  </Text>
                )}
              </View>

              {item.toggle ? (
                <Switch
                  value={item.toggleValue}
                  onValueChange={(v) => { haptics.selection(); item.onToggle?.(v); }}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor="#fff"
                />
              ) : item.rightElement ? (
                item.rightElement
              ) : item.onPress ? (
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              ) : null}
            </TouchableOpacity>

            {i < items.length - 1 && (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    marginBottom: spacing[2],
    marginLeft: spacing[1],
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrap: {
    flex: 1,
    gap: 2,
  },
  separator: {
    height: 1,
    marginLeft: spacing[4] + 36 + spacing[3],
  },
});
