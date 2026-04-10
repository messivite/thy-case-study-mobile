import React, { memo, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Text as RNText,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
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
  /** Sağdaki chevron çifti (ör. model seçimi) — sadece ilgili slaytta */
  showSelectorChevrons?: boolean;
  /** `ai`: pulse noktası yerine AI ikon rozeti (Choose model slaytı) */
  selectorLeading?: 'pulse' | 'ai';
  onPressPicker?: () => void;
  style?: ViewStyle;
};

const CARD_BG = palette.onboardingCardBg;
const BORDER_COLOR = palette.onboardingCardBorder;
/** Alt bant (çizginin altı) — sabit yükseklik, satır bu alanda ortalanır */
const FOOTER_BAND_HEIGHT = scale(50);
const SELECTOR_AI_BADGE = scale(26);
const SELECTOR_AI_ICON = scale(17);

const SelectorDotPulse = memo<{ color: string }>(({ color }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 850, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.selectorDot, { backgroundColor: color }, pulseStyle]} />
  );
});

export const ModelPickerCard: React.FC<Props> = ({
  title,
  description,
  mainIcon,
  overlayIcons,
  selectorLabel,
  selectorDotColor = palette.onboardingActiveDot,
  showSelectorChevrons = false,
  selectorLeading = 'pulse',
  onPressPicker,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.bodyTop}>
        {/* Icon row */}
        <View style={styles.iconRow}>
          <View style={[styles.mainIconWrap, { backgroundColor: mainIcon.bgColor }]}>
            <Ionicons
              name={mainIcon.name}
              size={mainIcon.size ?? 26}
              color={mainIcon.color}
            />
          </View>
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
        <RNText style={styles.title} numberOfLines={2}>{title}</RNText>
        <RNText style={styles.description} numberOfLines={2}>{description}</RNText>
      </View>

      <View style={styles.separator} />

      {/* Sabit yükseklik — FLIGHT INFO satırı bu bant içinde dikey ortada */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.selectorRow}
          onPress={onPressPicker}
          activeOpacity={onPressPicker ? 0.7 : 1}
        >
          {selectorLeading === 'ai' ? (
            <View style={styles.selectorAiBadge}>
              <Ionicons name="sparkles" size={SELECTOR_AI_ICON} color={palette.primary} />
            </View>
          ) : (
            <SelectorDotPulse color={selectorDotColor} />
          )}
          <RNText style={styles.selectorLabel}>{selectorLabel}</RNText>
          {showSelectorChevrons ? (
            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-up" size={11} color="#9CA3AF" />
              <Ionicons name="chevron-down" size={11} color="#9CA3AF" style={styles.chevronDown} />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'column',
    alignSelf: 'stretch',
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 36,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[5],
    paddingBottom: 0,
    minHeight: scale(248),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  bodyTop: {
    flexShrink: 0,
    marginBottom: spacing[2],
  },
  footer: {
    height: FOOTER_BAND_HEIGHT,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'stretch',
    width: '100%',
  },

  // Icons
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[5],
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
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * 1.25),
    color: '#1A1A2E',
    marginBottom: spacing[2],
  },
  description: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * 1.7),
    color: '#6B7280',
    marginBottom: 0,
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
    alignSelf: 'stretch',
    gap: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  selectorDot: {
    width: 9,
    height: 9,
    borderRadius: radius.full,
  },
  selectorAiBadge: {
    width: SELECTOR_AI_BADGE,
    height: SELECTOR_AI_BADGE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 25, 50, 0.12)',
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
