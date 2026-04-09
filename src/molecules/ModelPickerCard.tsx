import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Text as RNText,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { palette } from '@/constants/colors';
import { scale } from '@/lib/responsive';

type IconDef = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  bgColor: string;
  size?: number;
};

type Props = {
  title: string;
  description: string;
  /** Ana büyük kare ikon */
  mainIcon: IconDef;
  /** İki küçük overlap daire ikon */
  overlayIcons: [IconDef, IconDef];
  /** Alt satır label (ör. "CHOOSE YOUR MODEL") */
  selectorLabel: string;
  /** Alt satır dot rengi */
  selectorDotColor?: string;
  onPressPicker?: () => void;
  style?: ViewStyle;
};

const CARD_BG = palette.onboardingCardBg;
const BORDER_COLOR = palette.onboardingCardBorder;

export const ModelPickerCard: React.FC<Props> = ({
  title,
  description,
  mainIcon,
  overlayIcons,
  selectorLabel,
  selectorDotColor = palette.onboardingActiveDot,
  onPressPicker,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {/* Icon row */}
      <View style={styles.iconRow}>
        {/* Ana kare ikon */}
        <View style={[styles.mainIconWrap, { backgroundColor: mainIcon.bgColor }]}>
          <Ionicons
            name={mainIcon.name}
            size={mainIcon.size ?? 26}
            color={mainIcon.color}
          />
        </View>

        {/* İki overlap daire */}
        <View style={styles.overlapRow}>
          <View style={[styles.overlapCircle, { backgroundColor: overlayIcons[0].bgColor }]}>
            <Ionicons
              name={overlayIcons[0].name}
              size={overlayIcons[0].size ?? 14}
              color={overlayIcons[0].color}
            />
          </View>
          <View style={[styles.overlapCircle, styles.overlapSecond, { backgroundColor: overlayIcons[1].bgColor }]}>
            <Ionicons
              name={overlayIcons[1].name}
              size={overlayIcons[1].size ?? 14}
              color={overlayIcons[1].color}
            />
          </View>
        </View>
      </View>

      {/* Başlık */}
      <RNText style={styles.title} numberOfLines={1}>{title}</RNText>

      {/* Açıklama */}
      <RNText style={styles.description} numberOfLines={2}>{description}</RNText>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Selector row */}
      <TouchableOpacity
        style={styles.selectorRow}
        onPress={onPressPicker}
        activeOpacity={onPressPicker ? 0.7 : 1}
      >
        <View style={[styles.selectorDot, { backgroundColor: selectorDotColor }]} />
        <RNText style={styles.selectorLabel}>{selectorLabel}</RNText>
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-up" size={11} color="#9CA3AF" />
          <Ionicons name="chevron-down" size={11} color="#9CA3AF" style={styles.chevronDown} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 36,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: 0,
    height: scale(280),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // Icons
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  mainIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 4,
  },
  overlapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlapCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: CARD_BG,
  },
  overlapSecond: {
    marginLeft: -10,
    zIndex: 1,
  },

  // Text
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: Math.round(fontSize['3xl'] * 1.22),
    color: '#1A1A2E',
    marginBottom: spacing[3],
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * 1.7),
    color: '#6B7280',
    marginBottom: spacing[5],
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginHorizontal: -spacing[6],
  },

  // Selector
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[4],
    paddingBottom: spacing[5],
  },
  selectorDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  selectorLabel: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    letterSpacing: 1.0,
    color: '#374151',
  },
  chevronWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronDown: {
    marginTop: -4,
  },
});
