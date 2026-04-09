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
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text } from '@/atoms/Text';
import { useHaptics } from '@/hooks/useHaptics';
import { palette } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { scale } from '@/lib/responsive';
import { fontFamily } from '@/constants/typography';

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
  rightIcons?: HeaderIcon[];
  style?: ViewStyle;
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
  rightIcons,
  style,
}) => {
  const haptics = useHaptics();

  const handleBack = () => {
    haptics.light();
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const renderLeft = () => {
    if (leftContent) return <View style={styles.side}>{leftContent}</View>;
    if (isBack) {
      return (
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Geri"
          accessibilityRole="button"
        >
          <View style={styles.backCircle}>
            <Ionicons name="arrow-back" size={scale(18)} color={palette.white} />
          </View>
        </TouchableOpacity>
      );
    }
    return <View style={styles.side} />;
  };

  const renderRight = () => {
    if (!rightIcons || rightIcons.length === 0) return <View style={styles.side} />;

    return (
      <View style={[styles.side, styles.rightRow]}>
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
            <Ionicons name={icon.name} size={scale(22)} color={palette.white} />
            {icon.badge !== undefined && icon.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
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
      colors={['#E81932', '#C0102A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {/* Sol */}
      {renderLeft()}

      {/* Orta */}
      <View style={styles.centerBlock}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      {/* Sağ */}
      {renderRight()}
    </LinearGradient>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: scale(56),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  side: {
    width: scale(72),
    alignItems: 'flex-start',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1],
  },
  centerBlock: {
    flex: 1,
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
