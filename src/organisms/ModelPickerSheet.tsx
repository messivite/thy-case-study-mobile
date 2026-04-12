/**
 * ModelPickerSheet
 *
 * Provider bazında swipe tab view — her provider bir sayfa.
 * Gesture ile sola/sağa swipe, tab bar ile de geçiş yapılır.
 *
 * variant="backdrop"    — koyu backdrop + solid sheet
 * variant="liquidGlass" — hafif blur backdrop + frosted sheet
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/atoms/Text';
import { THYIcon } from '@/atoms/thy-icon';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useModels } from '@/hooks/api/useModels';
import { useUpdateMeMutation } from '@/hooks/api/useUpdateMe';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSelectedAIModel } from '@/store/slices/chatSlice';
import { palette } from '@/constants/colors';
import { radius, shadow, spacing } from '@/constants/spacing';
import { fontFamily } from '@/constants/typography';
import { scale } from '@/lib/responsive';
import type { AIModelRecord } from '@/types/models.api.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModelPickerVariant = 'backdrop' | 'liquidGlass';

export interface ModelPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  variant?: ModelPickerVariant;
}

type ProviderMeta = {
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  order: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER_META: Record<string, ProviderMeta> = {
  google:    { label: 'Google',    color: palette.geminiBlue,   icon: 'logo-google',                 order: 0 },
  openai:    { label: 'OpenAI',    color: palette.gptGreen,     icon: 'chatbubble-ellipses-outline', order: 1 },
  anthropic: { label: 'Anthropic', color: palette.claudeOrange, icon: 'flash-outline',               order: 2 },
};

function getProviderMeta(provider: string): ProviderMeta {
  return PROVIDER_META[provider.toLowerCase()] ?? {
    label: provider,
    color: palette.customPurple,
    icon: 'hardware-chip-outline',
    order: 99,
  };
}

// ---------------------------------------------------------------------------
// ModelRow — memo izole
// ---------------------------------------------------------------------------

interface ModelRowProps {
  record: AIModelRecord;
  isSelected: boolean;
  providerColor: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  description: string;
  onSelect: (r: AIModelRecord) => void;
}

const ModelRow = React.memo<ModelRowProps>(({
  record, isSelected, providerColor, textColor, textSecondary, borderColor, description, onSelect,
}) => (
  <TouchableOpacity
    style={[styles.modelRow, { borderBottomColor: borderColor }]}
    onPress={() => onSelect(record)}
    activeOpacity={0.65}
  >
    <View style={styles.modelRowContent}>
      <Text style={[styles.modelName, { color: textColor }]} numberOfLines={1}>
        {record.displayName}
      </Text>
      <Text style={[styles.modelSub, { color: textSecondary }]} numberOfLines={2}>
        {description}
      </Text>
    </View>
    {isSelected && (
      <View style={[styles.checkFilled, { backgroundColor: palette.primary }]}>
        <Ionicons name="checkmark" size={scale(13)} color="#fff" />
      </View>
    )}
  </TouchableOpacity>
));

// ---------------------------------------------------------------------------
// ProviderPage — tek provider'ın tüm modelleri
// ---------------------------------------------------------------------------

interface ProviderPageProps {
  models: AIModelRecord[];
  selectedKey: string | null;
  providerColor: string;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  surfaceColor: string;
  pageWidth: number;
  scrollHeight: number;
  bottomInset: number;
  getDescription: (modelId: string) => string;
  onSelect: (r: AIModelRecord) => void;
}

const ProviderPage = React.memo<ProviderPageProps>(({
  models, selectedKey, providerColor, textColor, textSecondary, borderColor, surfaceColor, pageWidth, scrollHeight, bottomInset, getDescription, onSelect,
}) => {
  const footer = useMemo(
    () => <View style={{ height: bottomInset }} />,
    [bottomInset],
  );
  return (
    <View style={[styles.page, { width: pageWidth }]}>
      <ScrollView
        style={[styles.pageCard, { backgroundColor: surfaceColor, maxHeight: scrollHeight }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {models.map((m, i) => (
          <ModelRow
            key={`${m.provider}-${m.model}`}
            record={m}
            isSelected={selectedKey === `${m.provider}::${m.model}`}
            providerColor={providerColor}
            textColor={textColor}
            textSecondary={textSecondary}
            borderColor={i < models.length - 1 ? borderColor + '55' : 'transparent'}
            description={getDescription(m.model)}
            onSelect={onSelect}
          />
        ))}
        {footer}
      </ScrollView>
    </View>
  );
});

// ---------------------------------------------------------------------------
// SheetHeader
// ---------------------------------------------------------------------------

interface SheetHeaderProps {
  onClose: () => void;
  textColor: string;
  textSecondary: string;
  borderColor: string;
}

const SheetHeader = React.memo<SheetHeaderProps>(({ onClose, textColor, textSecondary, borderColor }) => (
  <View style={[headerStyles.row, { borderBottomColor: borderColor + '44' }]}>
    <View style={headerStyles.left}>
      <THYIcon name="thy-loading" width={22} height={22} fill={palette.primary} fillSecondary="transparent" />
      <Text style={[headerStyles.title, { color: textColor }]}>THY Assistant</Text>
    </View>
    <TouchableOpacity onPress={onClose} hitSlop={12}>
      <Ionicons name="close" size={scale(20)} color={textSecondary} />
    </TouchableOpacity>
  </View>
));

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: scale(17),
    letterSpacing: -0.3,
  },
});

// ---------------------------------------------------------------------------
// TabBar
// ---------------------------------------------------------------------------

interface TabBarProps {
  groups: [string, AIModelRecord[]][];
  activeIndex: number;
  onPress: (i: number) => void;
  textColor: string;
  textSecondary: string;
  borderColor: string;
}

const TabBar = React.memo<TabBarProps>(({ groups, activeIndex, onPress, textColor, textSecondary, borderColor }) => (
  <View style={[styles.tabBar, { borderBottomColor: borderColor + '44' }]}>
    {groups.map(([provider], i) => {
      const meta = getProviderMeta(provider);
      const isActive = i === activeIndex;
      return (
        <TouchableOpacity
          key={provider}
          style={styles.tab}
          onPress={() => onPress(i)}
          activeOpacity={0.7}
        >
          <View style={styles.tabInner}>
            <Ionicons
              name={meta.icon}
              size={scale(14)}
              color={isActive ? palette.primary : textSecondary}
            />
            <Text style={[
              styles.tabLabel,
              { color: isActive ? palette.primary : textSecondary },
              isActive && { fontFamily: fontFamily.semiBold },
            ]}>
              {meta.label}
            </Text>
          </View>
          {isActive && (
            <View style={[styles.tabIndicator, { backgroundColor: palette.primary }]} />
          )}
        </TouchableOpacity>
      );
    })}
  </View>
));

// ---------------------------------------------------------------------------
// ModelPickerSheet — main
// ---------------------------------------------------------------------------

export const ModelPickerSheet: React.FC<ModelPickerSheetProps> = ({
  visible,
  onClose,
  variant = 'backdrop',
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const { mutate: updateMeProfile } = useUpdateMeMutation();
  const selectedAIModel = useAppSelector((s) => s.chat.selectedAIModel);
  const { models, isLoading } = useModels();

  const pageWidth = windowWidth;

  // Modal her zaman mount — kendi animasyonunu yönetir, exiting bug yok
  const [modalMounted, setModalMounted] = useState(false);
  const backdropOpacity = useSharedValue(0);

  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useSharedValue(0);
  const sheetY = useSharedValue(0);
  const sheetHeightSV = useSharedValue(600);
  // worklet'te activeIndex'e erişmek için shared value — closure stale olmasın
  const activeIndexSV = useSharedValue(0);
  const pageWidthSV = useSharedValue(windowWidth);
  const countSV = useSharedValue(0);

  const selectedKey = useMemo(
    () => `${selectedAIModel.provider}::${selectedAIModel.model}`,
    [selectedAIModel.provider, selectedAIModel.model],
  );

  const groups = useMemo(() => {
    const map = new Map<string, AIModelRecord[]>();
    for (const m of models) {
      const key = m.provider.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => getProviderMeta(a).order - getProviderMeta(b).order,
    );
  }, [models]);

  const count = groups.length;

  // shared value'ları JS değerleriyle sync tut
  useEffect(() => { activeIndexSV.value = activeIndex; }, [activeIndex, activeIndexSV]);
  useEffect(() => { pageWidthSV.value = pageWidth; }, [pageWidth, pageWidthSV]);
  useEffect(() => { countSV.value = count; }, [count, countSV]);

  const closeWithAnimation = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    sheetY.value = withTiming(sheetHeightSV.value + 40, { duration: 260 }, () => {
      runOnJS(setModalMounted)(false);
      runOnJS(onClose)();
    });
  }, [backdropOpacity, sheetY, sheetHeightSV, onClose]);

  useEffect(() => {
    if (visible) {
      // Önce reset, sonra modal mount et
      sheetY.value = 0;
      backdropOpacity.value = 0;
      setModalMounted(true);

      // Tab konumunu ayarla
      const providerKey = selectedAIModel.provider.toLowerCase();
      const idx = groups.findIndex(([p]) => p === providerKey);
      const targetIdx = idx >= 0 ? idx : 0;
      setActiveIndex(targetIdx);
      activeIndexSV.value = targetIdx;
      translateX.value = -targetIdx * pageWidthSV.value;

      // Aç animasyonu — mount sonrası bir frame bekle
      requestAnimationFrame(() => {
        backdropOpacity.value = withTiming(1, { duration: 200 });
        sheetY.value = withTiming(0, { duration: 0 }); // zaten 0, sadece tetikle
      });
    }
    // visible false → closeWithAnimation parent'tan çağrılır (onClose prop)
    // Backdrop tıklaması ve dismiss gesture zaten closeWithAnimation'ı çağırıyor
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const goTo = useCallback((index: number) => {
    const target = -index * pageWidthSV.value;
    translateX.value = withTiming(target, { duration: 240 });
    setActiveIndex(index);
    activeIndexSV.value = index;
  }, [pageWidthSV, translateX, activeIndexSV]);

  const handleTabPress = useCallback((i: number) => goTo(i), [goTo]);

  const handleSelect = useCallback((record: AIModelRecord) => {
    dispatch(setSelectedAIModel({
      provider: record.provider,
      model: record.model,
      displayName: record.displayName,
    }));
    // Silent backend sync — fire and forget, toast yok, UX block etmez
    updateMeProfile({ preferredProvider: record.provider, preferredModel: record.model });
    closeWithAnimation();
  }, [dispatch, updateMeProfile, closeWithAnimation]);

  // closeWithAnimation ref — gesture rebuild olmadan güncel fonksiyonu tutar
  const closeRef = useRef(closeWithAnimation);
  useEffect(() => { closeRef.current = closeWithAnimation; }, [closeWithAnimation]);
  const callClose = useCallback(() => { closeRef.current(); }, []);

  // Dismiss gesture — handle/header alanında dikey sürükle, bir kez build edilir
  const dismissGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetY([6, 999])
      .failOffsetX([-8, 8])
      .onUpdate((e) => {
        'worklet';
        const raw = e.translationY;
        sheetY.value = raw < 0 ? raw * 0.08 : raw;
      })
      .onEnd((e) => {
        'worklet';
        const shouldDismiss = sheetY.value > 80 || e.velocityY > 500;
        if (shouldDismiss) {
          runOnJS(callClose)();
        } else {
          sheetY.value = withTiming(0, { duration: 240 });
        }
      }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  // Swipe gesture — shared value'lar üzerinden çalışır, stale closure yok
  const swipeGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-12, 12])
      .onUpdate((e) => {
        'worklet';
        const base = -activeIndexSV.value * pageWidthSV.value;
        const next = base + e.translationX;
        const maxOffset = -(countSV.value - 1) * pageWidthSV.value;
        const clamped = interpolate(
          next,
          [maxOffset - 40, maxOffset, 0, 40],
          [maxOffset - 10, maxOffset, 0, 10],
          Extrapolation.CLAMP,
        );
        translateX.value = clamped;
      })
      .onEnd((e) => {
        'worklet';
        const SWIPE_THRESHOLD = pageWidthSV.value * 0.25;
        const VELOCITY_THRESHOLD = 400;
        let next = activeIndexSV.value;
        if (e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD) {
          next = Math.min(activeIndexSV.value + 1, countSV.value - 1);
        } else if (e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD) {
          next = Math.max(activeIndexSV.value - 1, 0);
        }
        translateX.value = withTiming(-next * pageWidthSV.value, { duration: 240 });
        runOnJS(setActiveIndex)(next);
      }),
  // gesture bir kez oluşturulur, shared value'lar üzerinden güncel kalır
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const slidesStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const sheetDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const getDescription = useCallback(
    (modelId: string) => {
      const key = `models.descriptions.${modelId}`;
      const result = t(key as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      return result !== key ? result : modelId;
    },
    [t],
  );

  // Stable derived values — her render'da yeniden hesaplanmasın
  const sheetBg = isDark ? palette.darkCard : palette.white;
  const scrollHeight = useMemo(() => windowHeight * 0.55 - 160, [windowHeight]);
  const bottomInset = useMemo(() => insets.bottom || spacing[4], [insets.bottom]);

  return (
    <Modal
      visible={modalMounted}
      transparent
      animationType="none"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={callClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, backdropStyle]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          onPress={callClose}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { backgroundColor: sheetBg }, sheetDragStyle]}
        onLayout={(e) => { sheetHeightSV.value = e.nativeEvent.layout.height; }}
      >
        {/* Üst köşe ayraç çizgisi */}
        <View style={[styles.sheetBorder, { borderTopColor: colors.border }]} />

        {/* Handle + Header: dismiss gesture dinlenir */}
        <GestureDetector gesture={dismissGesture}>
          <View>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border + '88' }]} />
            </View>
            <SheetHeader
              onClose={callClose}
              textColor={colors.text}
              textSecondary={colors.textSecondary}
              borderColor={colors.border}
            />
          </View>
        </GestureDetector>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Modeller yükleniyor...
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Model bulunamadı
            </Text>
          </View>
        ) : (
          <>
            {/* Tab bar */}
            <TabBar
              groups={groups}
              activeIndex={activeIndex}
              onPress={handleTabPress}
              textColor={colors.text}
              textSecondary={colors.textSecondary}
              borderColor={colors.border}
            />

            {/* Swipeable pages */}
            <GestureDetector gesture={swipeGesture}>
              <View style={[styles.pagesContainer, { width: pageWidth }]}>
                <Animated.View style={[styles.pagesRow, slidesStyle]}>
                  {groups.map(([provider, providerModels]) => {
                    const meta = getProviderMeta(provider);
                    return (
                      <ProviderPage
                        key={provider}
                        models={providerModels}
                        selectedKey={selectedKey}
                        providerColor={meta.color}
                        textColor={colors.text}
                        textSecondary={colors.textSecondary}
                        borderColor={colors.border}
                        surfaceColor="transparent"
                        pageWidth={pageWidth}
                        scrollHeight={scrollHeight}
                        bottomInset={bottomInset}
                        getDescription={getDescription}
                        onSelect={handleSelect}
                      />
                    );
                  })}
                </Animated.View>
              </View>
            </GestureDetector>
          </>
        )}
      </Animated.View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '55%',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    ...shadow.lg,
  },
  sheetBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },
  handle: {
    width: scale(32),
    height: 4,
    borderRadius: radius.full,
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    position: 'relative',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  tabLabel: {
    fontFamily: fontFamily.regular,
    fontSize: scale(13),
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing[3],
    right: spacing[3],
    height: 2,
    borderRadius: radius.full,
  },
  // Pages
  pagesContainer: {
    overflow: 'hidden',
  },
  pagesRow: {
    flexDirection: 'row',
  },
  page: {
    paddingHorizontal: spacing[4],
    paddingTop: 0,
    paddingBottom: 0,
  },
  pageCard: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  // Model row
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 0.5,
    gap: spacing[3],
  },
  modelRowContent: {
    flex: 1,
    gap: 3,
  },
  modelName: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(14),
  },
  modelSub: {
    fontFamily: fontFamily.regular,
    fontSize: scale(11),
  },
  checkFilled: {
    width: scale(22),
    height: scale(22),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Loading
  loadingWrap: {
    paddingVertical: spacing[10],
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: scale(14),
  },
});
