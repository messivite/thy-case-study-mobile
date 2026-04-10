/**
 * ChatHistoryDrawer
 *
 * Soldan kayan drawer — sohbet geçmişini listeler.
 * Reanimated + GestureHandler ile custom implementasyon (drawer lib yok).
 * AppHeader ile fixed başlık, FlashList ile infinite scroll list,
 * uzun basınca ChatGPT tarzı blur overlay + context menü.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { AppHeader } from '@/organisms/AppHeader';
import { Text } from '@/atoms/Text';
import { Spinner } from '@/atoms/Spinner';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useInfiniteChatsQuery, CHAT_QUERY_KEYS } from '@/hooks/api/useChats';
import { ChatListItem } from '@/types/chat.api.types';
import { MockChatsPage } from '@/data/mockChats';
import { palette } from '@/constants/colors';
import { radius, shadow, spacing } from '@/constants/spacing';
import { scale, verticalScale } from '@/lib/responsive';
import { fontFamily } from '@/constants/typography';
import type { InfiniteData } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectChat?: (chat: ChatListItem) => void;
}

type ContextMenuState = {
  chat: ChatListItem;
  /** Item'ın ekrandaki mutlak Y pozisyonu — BlurOverlay içinde konumlandırma için */
  pageY: number;
  pageH: number;
} | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 108;
const SPRING_CONFIG = { damping: 28, stiffness: 300, mass: 0.8 } as const;
const CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 600;
const CONTEXT_MENU_WIDTH = 200;
const CONTEXT_MENU_HEIGHT = 108; // 2 items × 48px + divider

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(isoString: string): string {
  const now = Date.now();
  const diff = now - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} hf`;
  return new Date(isoString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: palette.gptGreen,
  google: palette.geminiBlue,
  anthropic: palette.claudeOrange,
};
const PROVIDER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  openai: 'sparkles',
  google: 'logo-google',
  anthropic: 'planet-outline',
};

function getProviderColor(p: string) { return PROVIDER_COLORS[p.toLowerCase()] ?? palette.primary; }
function getProviderIcon(p: string): React.ComponentProps<typeof Ionicons>['name'] {
  return PROVIDER_ICONS[p.toLowerCase()] ?? 'hardware-chip-outline';
}

// ---------------------------------------------------------------------------
// ChatHistoryItem
// ---------------------------------------------------------------------------

interface ChatHistoryItemProps {
  item: ChatListItem;
  onPress: () => void;
  onLongPress: (pageY: number, pageH: number) => void;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

const ChatHistoryItem = React.memo<ChatHistoryItemProps>(
  ({ item, onPress, onLongPress, textColor, textSecondary, borderColor, isDark }) => {
    const itemRef = useRef<View>(null);

    const handleLongPress = useCallback(() => {
      itemRef.current?.measureInWindow((_x, y, _w, h) => {
        onLongPress(y, h);
      });
    }, [onLongPress]);

    const providerColor = getProviderColor(item.provider);
    const providerIcon = getProviderIcon(item.provider);

    return (
      <View ref={itemRef}>
        <TouchableOpacity
          style={[styles.item, { borderBottomColor: borderColor + 'AA' }]}
          onPress={onPress}
          onLongPress={handleLongPress}
          delayLongPress={350}
          activeOpacity={0.7}
        >
          <View style={[styles.providerAvatar, { backgroundColor: providerColor + '1A' }]}>
            <Ionicons name={providerIcon} size={scale(16)} color={providerColor} />
          </View>

          <View style={styles.itemContent}>
            <View style={styles.itemTitleRow}>
              <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.itemTime, { color: textSecondary }]}>
                {getRelativeTime(item.updatedAt)}
              </Text>
            </View>

            <Text style={[styles.itemPreview, { color: textSecondary }]} numberOfLines={2}>
              {item.lastMessagePreview}
            </Text>

            <View style={styles.chipRow}>
              <ModelChip model={item.model} color={providerColor} isDark={isDark} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  },
);

// ---------------------------------------------------------------------------
// ModelChip
// ---------------------------------------------------------------------------

const ModelChip = React.memo(({ model, color, isDark }: { model: string; color: string; isDark: boolean }) => (
  <View style={[styles.chip, { borderColor: color + '40' }]}>
    {Platform.OS === 'ios' ? (
      <BlurView
        intensity={isDark ? 28 : 18}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    ) : (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? color + '18' : color + '12' }]} />
    )}
    <Ionicons name="hardware-chip-outline" size={scale(11)} color={color} style={styles.chipIcon} />
    <Text style={[styles.chipText, { color }]} numberOfLines={1}>{model}</Text>
  </View>
));

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

const EmptyState = ({ textColor, textSecondary }: { textColor: string; textSecondary: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name="chatbubbles-outline" size={56} color={palette.gray300} />
    </View>
    <Text style={[styles.emptyTitle, { color: textColor }]}>Henüz sohbet yok</Text>
    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
      Asistan ile yeni bir sohbet başlatın.
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// ContextMenuOverlay — ChatGPT tarzı tam blur + action menü
// ---------------------------------------------------------------------------

interface ContextMenuOverlayProps {
  contextMenu: NonNullable<ContextMenuState>;
  onDelete: () => void;
  onArchive: () => void;
  onDismiss: () => void;
  isDark: boolean;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  panelWidth: number;
}

const ContextMenuOverlay = React.memo(({
  contextMenu,
  onDelete,
  onArchive,
  onDismiss,
  isDark,
  surfaceColor,
  borderColor,
  textColor,
  panelWidth,
}: ContextMenuOverlayProps) => {
  const { height: screenHeight } = useWindowDimensions();

  // Menüyü item'ın altında göster, ekrandan taşıyorsa üstünde
  const menuTop = contextMenu.pageY + contextMenu.pageH + 6;
  const clampedTop = menuTop + CONTEXT_MENU_HEIGHT > screenHeight
    ? contextMenu.pageY - CONTEXT_MENU_HEIGHT - 6
    : menuTop;

  const menuLeft = (panelWidth - CONTEXT_MENU_WIDTH) / 2;

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(140)}
    >
      {/* Full-panel blur backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 40 : 30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBlurFallback]} />
        )}
      </Pressable>

      {/* Action menu card */}
      <Animated.View
        entering={FadeIn.springify().damping(22).stiffness(280)}
        style={[
          styles.contextMenu,
          {
            top: clampedTop,
            left: menuLeft,
            backgroundColor: surfaceColor,
            borderColor,
          },
        ]}
      >
        {/* Arşivle */}
        <TouchableOpacity style={styles.contextItem} onPress={onArchive} activeOpacity={0.75}>
          <Ionicons name="archive-outline" size={18} color={textColor} />
          <Text style={[styles.contextLabel, { color: textColor }]}>Arşivle</Text>
        </TouchableOpacity>

        <View style={[styles.contextDivider, { backgroundColor: borderColor }]} />

        {/* Sil — kırmızı, ayrı tutuluyor */}
        <TouchableOpacity style={styles.contextItem} onPress={onDelete} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
          <Text style={[styles.contextLabel, { color: palette.error }]}>Sil</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
  visible,
  onClose,
  onSelectChat,
}) => {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const DRAWER_WIDTH = windowWidth * 0.85;

  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const drawerWidthSV = useSharedValue(DRAWER_WIDTH);

  useEffect(() => { drawerWidthSV.value = DRAWER_WIDTH; }, [DRAWER_WIDTH, drawerWidthSV]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const [modalVisible, setModalVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  // Silinen item ID'leri — FlashList extraData ile re-render tetikler
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // React Query — infinite scroll
  const {
    data,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteChatsQuery();

  const chats = useMemo(
    () => (data?.pages.flatMap((p) => p.items) ?? []).filter((c) => !deletedIds.has(c.id)),
    [data, deletedIds],
  );

  // extraData: FlashList'in re-render'ı tetiklemesi için
  const extraData = useMemo(() => ({ deletedIds, colors }), [deletedIds, colors]);

  // ---------------------------------------------------------------------------
  // Open / Close animations
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      translateX.value = -DRAWER_WIDTH;
      requestAnimationFrame(() => {
        translateX.value = withSpring(0, SPRING_CONFIG);
        overlayOpacity.value = withTiming(0.55, { duration: 260 });
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 220 }, (done) => {
        if (done) runOnJS(setModalVisible)(false);
      });
      setContextMenu(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ---------------------------------------------------------------------------
  // Pan gesture
  // ---------------------------------------------------------------------------

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-15, 15])
        .onUpdate((e) => {
          'worklet';
          const next = Math.min(0, e.translationX);
          translateX.value = next;
          overlayOpacity.value = Math.max(0, 0.55 * (1 + next / drawerWidthSV.value));
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose =
            e.translationX < -CLOSE_THRESHOLD ||
            e.velocityX < -SWIPE_VELOCITY_THRESHOLD;
          if (shouldClose) {
            translateX.value = withTiming(-drawerWidthSV.value, { duration: 220 });
            overlayOpacity.value = withTiming(0, { duration: 200 });
            runOnJS(onCloseRef.current)();
          } else {
            translateX.value = withSpring(0, SPRING_CONFIG);
            overlayOpacity.value = withTiming(0.55, { duration: 200 });
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ---------------------------------------------------------------------------
  // Animated styles
  // ---------------------------------------------------------------------------

  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const panelAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectChat = useCallback(
    (chat: ChatListItem) => {
      onSelectChat?.(chat);
      onClose();
    },
    [onSelectChat, onClose],
  );

  const handleLongPress = useCallback(
    (chat: ChatListItem, pageY: number, pageH: number) => {
      haptics.medium();
      setContextMenu({ chat, pageY, pageH });
    },
    [haptics],
  );

  // Optimistic update helper — cache'den çıkar, hata olursa rollback
  const optimisticRemove = useCallback(
    (chatId: string, onRollback?: () => void) => {
      type IC = InfiniteData<MockChatsPage>;
      const previous = queryClient.getQueryData<IC>(CHAT_QUERY_KEYS.chatsList);

      // 1. UI'dan anında çıkar (local state ile — FlashList extraData ile algılar)
      setDeletedIds((prev) => new Set([...prev, chatId]));

      // 2. React Query cache'den de çıkar
      queryClient.setQueryData<IC>(CHAT_QUERY_KEYS.chatsList, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((c) => c.id !== chatId),
          })),
        };
      });

      // Rollback fonksiyonu döndür — API hata verirse çağrılır
      return () => {
        if (previous) queryClient.setQueryData(CHAT_QUERY_KEYS.chatsList, previous);
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
        onRollback?.();
      };
    },
    [queryClient],
  );

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    const { id } = contextMenu.chat;
    setContextMenu(null);

    const rollback = optimisticRemove(id);

    // TODO: API entegrasyon — deleteChat(id) gelince buraya ekle
    // deleteChat(id).catch(() => rollback());
    //
    // Şimdilik mock: simulate başarı (rollback örneği için comment out edilebilir)
    void rollback; // lint'i susturmak için — gerçek API'de .catch'e geçecek
  }, [contextMenu, optimisticRemove]);

  const handleArchive = useCallback(() => {
    if (!contextMenu) return;
    const { id } = contextMenu.chat;
    setContextMenu(null);

    const rollback = optimisticRemove(id);

    // TODO: API entegrasyon — archiveChat(id) gelince buraya ekle
    // archiveChat(id).catch(() => rollback());
    void rollback;
  }, [contextMenu, optimisticRemove]);

  // ---------------------------------------------------------------------------
  // Render item
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatHistoryItem
        item={item}
        onPress={() => handleSelectChat(item)}
        onLongPress={(pageY, pageH) => handleLongPress(item, pageY, pageH)}
        textColor={colors.text}
        textSecondary={colors.textSecondary}
        borderColor={colors.border}
        isDark={isDark}
      />
    ),
    [handleSelectChat, handleLongPress, colors, isDark],
  );

  // ---------------------------------------------------------------------------
  // Close button
  // ---------------------------------------------------------------------------

  const closeButton = useMemo(
    () => (
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Kapat"
        activeOpacity={0.75}
      >
        <Ionicons name="close" size={scale(22)} color={palette.white} />
      </TouchableOpacity>
    ),
    [onClose],
  );

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={onClose}
    >
      {/* Dimmed overlay */}
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer panel */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.panel,
            { width: DRAWER_WIDTH, backgroundColor: colors.background },
            panelAnimatedStyle,
          ]}
        >
          <AppHeader
            title="Sohbet Geçmişi"
            rightContent={closeButton}
            style={{ paddingHorizontal: spacing[3], paddingTop: Math.max(0, insets.top - verticalScale(6)) }}
          />

          <View style={styles.listContainer}>
            {isLoading && chats.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Spinner size="large" color={palette.primary} />
              </View>
            ) : chats.length === 0 ? (
              <EmptyState textColor={colors.text} textSecondary={colors.textSecondary} />
            ) : (
              <FlashList
                data={chats}
                keyExtractor={(item) => item.id}
                estimatedItemSize={ITEM_HEIGHT}
                renderItem={renderItem}
                extraData={extraData}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.2}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                ListFooterComponent={
                  isFetchingNextPage ? (
                    <View style={styles.footerLoader}>
                      <Spinner size="small" color={palette.primary} />
                    </View>
                  ) : null
                }
                refreshControl={
                  <RefreshControl
                    refreshing={isRefetching && !isLoading}
                    onRefresh={refetch}
                    tintColor={palette.primary}
                    colors={[palette.primary]}
                  />
                }
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>

          {/* ChatGPT tarzı blur overlay + context menu */}
          {contextMenu && (
            <ContextMenuOverlay
              contextMenu={contextMenu}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onDismiss={() => setContextMenu(null)}
              isDark={isDark}
              surfaceColor={colors.surface}
              borderColor={colors.border}
              textColor={colors.text}
              panelWidth={DRAWER_WIDTH}
            />
          )}
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: radius['2xl'],
    borderBottomRightRadius: radius['2xl'],
    overflow: 'hidden',
    ...shadow.lg,
  },
  closeBtn: {
    width: scale(36),
    height: scale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing[8],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: spacing[5],
    alignItems: 'center',
  },
  // Item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  providerAvatar: {
    width: scale(36),
    height: scale(36),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    marginLeft: spacing[2],
    gap: 3,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  itemTitle: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: scale(12),
    letterSpacing: 0.1,
  },
  itemPreview: {
    fontFamily: fontFamily.regular,
    fontSize: scale(10),
    lineHeight: scale(14),
  },
  itemTime: {
    fontFamily: fontFamily.regular,
    fontSize: scale(10),
    flexShrink: 0,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: scale(90),
    borderRadius: radius.full,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipIcon: {
    marginRight: 3,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: scale(9),
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  emptyIconWrap: {
    marginBottom: spacing[2],
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(17),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: scale(14),
    textAlign: 'center',
    lineHeight: scale(20),
  },
  // Context menu overlay
  androidBlurFallback: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  contextMenu: {
    position: 'absolute',
    width: CONTEXT_MENU_WIDTH,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.lg,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    height: 48,
  },
  contextLabel: {
    fontFamily: fontFamily.medium,
    fontSize: scale(14),
  },
  contextDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing[4],
  },
});
