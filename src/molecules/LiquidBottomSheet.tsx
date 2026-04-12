import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@/atoms/GlassView';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
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
  /** Input içermeyen sheet'lerde KAV'ı devre dışı bırak (default: true) */
  avoidKeyboard?: boolean;
};

const SLIDE_IN = { duration: 320, easing: Easing.out(Easing.cubic) } as const;

export const LiquidBottomSheet: React.FC<Props> = ({
  open,
  onClose,
  showHandle = true,
  showCloseButton = true,
  variant = 'glass',
  closeOnBackdropPress = true,
  children,
  contentStyle,
  avoidKeyboard = true,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  // Sabit offscreen mesafesi — useWindowDimensions kullanmıyoruz çünkü
  // klavye açılınca winH değişir → offscreen değişir → useEffect tetiklenir → sheet zıplar.
  const OFFSCREEN = 600;

  const [modalVisible, setModalVisible] = useState(open);
  const translateY = useSharedValue(OFFSCREEN);
  const backdropOp = useSharedValue(0);

  useEffect(() => {
    if (open) {
      translateY.value = OFFSCREEN;
      setModalVisible(true);
      requestAnimationFrame(() => {
        translateY.value = withTiming(0, SLIDE_IN);
        backdropOp.value = withTiming(0.52, { duration: 280 });
      });
    } else {
      backdropOp.value = withTiming(0, { duration: 240 });
      translateY.value = withTiming(OFFSCREEN, { duration: 280 }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values stable, OFFSCREEN sabiti
  }, [open]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOp.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleBackdrop = () => {
    if (closeOnBackdropPress) { haptics.light(); onClose(); }
  };

  const IS_WEB = Platform.OS === 'web';
  // Web'de safe area inset 0 gelir, sabit fallback ekle
  const bottomPad = spacing[5] + (IS_WEB ? 16 : insets.bottom);
  const innerStyle = [styles.sheetInner, { paddingBottom: bottomPad }, contentStyle];

  const sheetBody =
    variant === 'glass' ? (
      <GlassView
        variant="sheet"
        tint="light"
        intensity={80}
        style={innerStyle}
      >
        {children}
      </GlassView>
    ) : (
      <View
        style={[
          innerStyle,
          styles.solidSheet,
          { backgroundColor: colors.surface },
        ]}
      >
        {children}
      </View>
    );

  const innerContent = (
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
        style={[styles.sheetWrap, sheetStyle]}
        pointerEvents="box-none"
      >
        <View style={styles.sheetMaxWidth} pointerEvents="box-none">
          <View style={[styles.sheetCard, IS_WEB && { overflow: 'visible' }]}>
            {showHandle && (
              <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
            )}
            {showCloseButton && (
              <Pressable
                onPress={() => { haptics.light(); onClose(); }}
                style={styles.closeBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons
                  name="close"
                  size={26}
                  color={isDark ? 'rgba(255,255,255,0.90)' : 'rgba(0,0,0,0.55)'}
                />
              </Pressable>
            )}

            {sheetBody}
          </View>
        </View>
      </Animated.View>
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
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {innerContent}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.keyboardAvoid}>
          {innerContent}
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A12',
  },
  sheetWrap: {
    width: '100%',
    alignItems: 'center',
  },
  sheetMaxWidth: {
    width: '100%',
    maxWidth: 520,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.25,
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  sheetCard: {
    position: 'relative',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[5],
    right: spacing[4],
    zIndex: 2,
    padding: spacing[1],
  },
  sheetInner: {
    paddingTop: spacing[3],
    paddingHorizontal: spacing[5],
  },
  solidSheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
  },
});
