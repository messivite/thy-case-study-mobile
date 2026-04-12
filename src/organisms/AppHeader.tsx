/**
 * AppHeader
 *
 * Kırmızı THY gradient arka planlı, her ekranda kullanılabilen header.
 *
 * Props:
 *  - title          : Ortada gösterilecek metin
 *  - isBack         : true ise sol tarafa geri butonu eklenir
 *  - onBack         : Geri butonuna basılınca çağrılır (verilmezse router.back() kullanır)
 *  - leftContent    : isBack yerine özel sol içerik
 *  - rightIcons     : Sağ tarafa sıralanacak ikonlar dizisi
 *  - subtitle       : Başlık altında küçük metin
 *  - style          : Dış container için ek stil
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/atoms/Text';
import { useHaptics } from '@/hooks/useHaptics';
import { palette } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { scale } from '@/lib/responsive';
import { fontFamily } from '@/constants/typography';

/** Safe area altındaki bar — tüm ekranlarda aynı yükseklik (tab geçişinde zıplama olmasın). */
const HEADER_ROW_HEIGHT = scale(50);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeaderIcon = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Opsiyonel badge sayısı */
  badge?: number;
  accessibilityLabel?: string;
};

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  isBack?: boolean;
  onBack?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  rightIcons?: HeaderIcon[];
  style?: ViewStyle;
  /** Sheet gibi alanlarda üst safe area zaten veriliyorsa kapatılabilir. */
  safeAreaTop?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  isBack = false,
  onBack,
  leftContent,
  rightContent,
  rightIcons,
  style,
  safeAreaTop = true,
}) => {
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const webScale = Platform.OS === 'web'
    ? Math.min(windowWidth > 0 ? windowWidth : 390, 390) / 390
    : 1;
  const s = (n: number) => Math.round(n * webScale);
  const rowHeight = Platform.OS === 'web' ? s(50) : HEADER_ROW_HEIGHT;

  const handleBack = () => {
    haptics.light();
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const sideLeftStyle = [styles.sideSlot, styles.sideSlotLeft, Platform.OS === 'web' && { width: s(72) }];
  const sideRightStyle = [styles.sideSlot, styles.sideSlotRight, Platform.OS === 'web' && { width: s(72) }];

  const renderLeft = () => {
    if (leftContent) return <View style={sideLeftStyle}>{leftContent}</View>;
    if (isBack) {
      return (
        <View style={sideLeftStyle}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Geri"
            accessibilityRole="button"
          >
            <View style={[styles.backCircle, Platform.OS === 'web' && { width: s(34), height: s(34) }]}>
              <Ionicons name="arrow-back" size={Platform.OS === 'web' ? s(18) : scale(18)} color={palette.white} />
            </View>
          </TouchableOpacity>
        </View>
      );
    }
    return <View style={sideLeftStyle} />;
  };

  const renderRight = () => {
    if (rightContent) {
      return <View style={[...sideRightStyle, styles.rightRow]}>{rightContent}</View>;
    }
    if (!rightIcons || rightIcons.length === 0) {
      return <View style={sideRightStyle} />;
    }

    return (
      <View style={[...sideRightStyle, styles.rightRow]}>
        {rightIcons.map((icon, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => { haptics.light(); icon.onPress(); }}
            style={styles.iconBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel={icon.accessibilityLabel}
            accessibilityRole="button"
          >
            <Ionicons name={icon.name} size={Platform.OS === 'web' ? s(22) : scale(22)} color={palette.white} />
            {icon.badge !== undefined && icon.badge > 0 && (
              <View
                style={[
                  styles.badge,
                  Platform.OS === 'web' && { minWidth: s(16), height: s(16) },
                ]}
              >
                <Text style={[styles.badgeText, Platform.OS === 'web' && { fontSize: s(9), lineHeight: s(12) }]}>
                  {icon.badge > 99 ? '99+' : String(icon.badge)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[palette.primary, palette.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      collapsable={false}
      style={[
        styles.gradientOuter,
        {
          paddingTop: safeAreaTop ? insets.top : 0,
        },
        style,
      ]}
    >
      <View style={[styles.row, { height: rowHeight }]}>
        {renderLeft()}
        <View style={styles.centerBlock}>
          <Text style={[styles.title, Platform.OS === 'web' && { fontSize: s(16) }]} numberOfLines={1}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, Platform.OS === 'web' && { fontSize: s(11) }]} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
        {renderRight()}
      </View>
    </LinearGradient>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  gradientOuter: {
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    minHeight: HEADER_ROW_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideSlot: {
    width: scale(72),
    height: HEADER_ROW_HEIGHT,
    justifyContent: 'center',
  },
  sideSlotLeft: {
    alignItems: 'flex-start',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1],
  },
  centerBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(16),
    color: palette.white,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: scale(11),
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCircle: {
    width: scale(34),
    height: scale(34),
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[1],
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: palette.white,
    borderRadius: 999,
    minWidth: scale(16),
    height: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: scale(9),
    color: palette.primary,
    lineHeight: scale(12),
  },
});
