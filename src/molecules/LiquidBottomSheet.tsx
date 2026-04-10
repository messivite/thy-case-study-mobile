import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '@/atoms/GlassView';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { radius, spacing } from '@/constants/spacing';

export type LiquidBottomSheetVariant = 'glass' | 'solid';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Üstte çekme çentığı */
  showHandle?: boolean;
  /** Sağ üst X */
  showCloseButton?: boolean;
  /** glass: BlurView tabanlı; solid: tema yüzeyi */
  variant?: LiquidBottomSheetVariant;
  /** Boş alana basınca kapat */
  closeOnBackdropPress?: boolean;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

const SPRING = { damping: 26, stiffness: 280 } as const;

export const LiquidBottomSheet: React.FC<Props> = ({
  open,
  onClose,
  showHandle = true,
  showCloseButton = true,
  variant = 'glass',
  closeOnBackdropPress = true,
  children,
  contentStyle,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const offscreen = winH * 0.55;

  const [modalVisible, setModalVisible] = useState(open);
  const translateY = useSharedValue(offscreen);
  const backdropOp = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = offscreen;
      setModalVisible(true);
      requestAnimationFrame(() => {
        translateY.value = withSpring(0, SPRING);
        backdropOp.value = withTiming(0.52, { duration: 280 });
      });
    } else {
      backdropOp.value = withTiming(0, { duration: 240 });
      translateY.value = withTiming(offscreen, { duration: 280 }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stable
  }, [open, offscreen]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOp.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleBackdrop = () => {
    if (closeOnBackdropPress) onClose();
  };

  const sheetBody =
    variant === 'glass' ? (
      <GlassView variant="sheet" style={[styles.sheetInner, contentStyle]}>
        {children}
      </GlassView>
    ) : (
      <View
        style={[
          styles.sheetInner,
          styles.solidSheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    );

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdrop}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            sheetStyle,
            { paddingBottom: Math.max(insets.bottom, spacing[4]) },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.sheetMaxWidth} pointerEvents="box-none">
            <View style={styles.sheetCard}>
              {showHandle && (
                <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
              )}
              {showCloseButton && (
                <Pressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.close')}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={isDark ? 'rgba(255,255,255,0.85)' : colors.textSecondary}
                  />
                </Pressable>
              )}

              {sheetBody}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A12',
  },
  sheetWrap: {
    paddingHorizontal: spacing[4],
    width: '100%',
    alignItems: 'center',
  },
  sheetMaxWidth: {
    width: '100%',
    maxWidth: 520,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  sheetCard: {
    position: 'relative',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 2,
    padding: spacing[1],
  },
  sheetInner: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  solidSheet: {
    borderWidth: 1,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
});
