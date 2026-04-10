/**
 * ChatHistoryDrawer
 *
 * Soldan kayan drawer — sohbet geçmişini listeler.
 * Reanimated + GestureHandler ile custom implementasyon (drawer lib yok).
 * AppHeader ile fixed başlık, FlashList ile list, uzun basınca context menü.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { palette } from '@/constants/colors';
import { radius, shadow, spacing } from '@/constants/spacing';
import { scale, verticalScale } from '@/lib/responsive';
import { fontFamily } from '@/constants/typography';

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
  menuY: number;
} | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_HEIGHT = 108; // paddingVertical 8+8, 2 satır preview, chip
const SPRING_CONFIG = { damping: 28, stiffness: 300, mass: 0.8 } as const;
const CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 600;
const MENU_HEIGHT = 104; // ~2 items + divider

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

function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider.toLowerCase()] ?? palette.primary;
}

function getProviderInitial(provider: string): string {
  const map: Record<string, string> = {
    openai: 'O',
    google: 'G',
    anthropic: 'A',
  };
  return map[provider.toLowerCase()] ?? provider.charAt(0).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Provider icon mapping
const PROVIDER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  openai: 'sparkles',
  google: 'logo-google',
  anthropic: 'planet-outline',
};

function getProviderIcon(provider: string): React.ComponentProps<typeof Ionicons>['name'] {
  return PROVIDER_ICONS[provider.toLowerCase()] ?? 'hardware-chip-outline';
}

interface ChatHistoryItemProps {
  item: ChatListItem;
  onPress: () => void;
  onLongPress: (menuY: number) => void;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

const ChatHistoryItem = React.memo<ChatHistoryItemProps>(
  ({ item, onPress, onLongPress, textColor, textSecondary, borderColor, isDark }) => {
    const itemRef = useRef<View>(null);
    const insets = useSafeAreaInsets();

    const handleLongPress = useCallback(() => {
      itemRef.current?.measureInWindow((_x, y, _w, h) => {
        const HEADER_HEIGHT = scale(48) + insets.top;
        const relativeY = y - HEADER_HEIGHT + h / 2 - MENU_HEIGHT / 2;
        onLongPress(relativeY);
      });
    }, [onLongPress, insets.top]);

    const providerColor = getProviderColor(item.provider);
    const providerIcon = getProviderIcon(item.provider);

    return (
      <TouchableOpacity
        ref={itemRef}
        style={[styles.item, { borderBottomColor: borderColor + 'AA' }]}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={380}
        activeOpacity={0.7}
      >
        {/* Provider avatar */}
        <View
          style={[
            styles.providerAvatar,
            { backgroundColor: providerColor + '1A' },
          ]}
        >
          <Ionicons name={providerIcon} size={scale(16)} color={providerColor} />
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          {/* Title row */}
          <View style={styles.itemTitleRow}>
            <Text
              style={[styles.itemTitle, { color: textColor }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.itemTime, { color: textSecondary }]}>
              {getRelativeTime(item.updatedAt)}
            </Text>
          </View>

          {/* Preview */}
          <Text
            style={[styles.itemPreview, { color: textSecondary }]}
            numberOfLines={2}
          >
            {item.lastMessagePreview}
          </Text>

          {/* Model chip */}
          <View style={styles.chipRow}>
            <ModelChip
              model={item.model}
              color={providerColor}
              isDark={isDark}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

// ---------------------------------------------------------------------------
// Model Chip — liquid glass look
// ---------------------------------------------------------------------------

interface ModelChipProps {
  model: string;
  color: string;
  isDark: boolean;
}

const ModelChip = ({ model, color, isDark }: ModelChipProps) => (
  <View style={[styles.chip, { borderColor: color + '40' }]}>
    {Platform.OS === 'ios' ? (
      <BlurView
        intensity={isDark ? 28 : 18}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
    ) : (
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? color + '18' : color + '12' },
        ]}
      />
    )}
    <Ionicons name="hardware-chip-outline" size={scale(11)} color={color} style={styles.chipIcon} />
    <Text style={[styles.chipText, { color }]} numberOfLines={1}>
      {model}
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

const EmptyState = ({
  textColor,
  textSecondary,
}: {
  textColor: string;
  textSecondary: string;
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconWrap}>
      <Ionicons
        name="chatbubbles-outline"
        size={56}
        color={palette.gray300}
      />
    </View>
    <Text style={[styles.emptyTitle, { color: textColor }]}>
      Henüz sohbet yok
    </Text>
    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
      Asistan ile yeni bir sohbet başlatın.
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

interface ContextMenuProps {
  menuY: number;
  onDelete: () => void;
  onArchive: () => void;
  onDismiss: () => void;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
}

const ContextMenu = ({
  menuY,
  onDelete,
  onArchive,
  onDismiss,
  surfaceColor,
  borderColor,
  textColor,
}: ContextMenuProps) => (
  <>
    {/* Invisible backdrop */}
    <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
    {/* Menu card */}
    <View
      style={[
        styles.contextMenu,
        {
          top: menuY,
          backgroundColor: surfaceColor,
          borderColor: borderColor,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.contextItem}
        onPress={onDelete}
        activeOpacity={0.75}
      >
        <Ionicons name="trash-outline" size={18} color={palette.error} />
        <Text style={[styles.contextLabel, { color: palette.error }]}>
          Sil
        </Text>
      </TouchableOpacity>
      <View style={[styles.contextDivider, { backgroundColor: borderColor }]} />
      <TouchableOpacity
        style={styles.contextItem}
        onPress={onArchive}
        activeOpacity={0.75}
      >
        <Ionicons name="archive-outline" size={18} color={textColor} />
        <Text style={[styles.contextLabel, { color: textColor }]}>
          Arşivle
        </Text>
      </TouchableOpacity>
    </View>
  </>
);

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

  // Modal stays mounted through exit animation
  const [modalVisible, setModalVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

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

  const chats = data?.pages.flatMap((p) => p.items) ?? [];

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
      // Exit animation → then unmount Modal
      overlayOpacity.value = withTiming(0, { duration: 200 });
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 220 }, (done) => {
        if (done) runOnJS(setModalVisible)(false);
      });
      // Also clear context menu on close
      setContextMenu(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ---------------------------------------------------------------------------
  // Pan gesture — swipe left to close
  // ---------------------------------------------------------------------------

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      if (e.translationX < 0) {
        translateX.value = e.translationX;
        overlayOpacity.value = Math.max(
          0,
          0.55 * (1 + e.translationX / DRAWER_WIDTH),
        );
      }
    })
    .onEnd((e) => {
      const shouldClose =
        e.translationX < -CLOSE_THRESHOLD ||
        e.velocityX < -SWIPE_VELOCITY_THRESHOLD;
      if (shouldClose) {
        runOnJS(onClose)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        overlayOpacity.value = withTiming(0.55, { duration: 200 });
      }
    });

  // ---------------------------------------------------------------------------
  // Animated styles
  // ---------------------------------------------------------------------------

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

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
    (chat: ChatListItem, rawMenuY: number) => {
      haptics.medium();
      // Clamp so menu never overflows the bottom of the panel
      const clampedY = Math.min(
        Math.max(rawMenuY, 8),
        windowHeight - MENU_HEIGHT - spacing[8],
      );
      setContextMenu({ chat, menuY: clampedY });
    },
    [haptics, windowHeight],
  );

  const removeFromCache = useCallback((chatId: string) => {
    type InfiniteChats = import('@tanstack/react-query').InfiniteData<import('@/data/mockChats').MockChatsPage>;
    queryClient.setQueryData<InfiniteChats>(
      CHAT_QUERY_KEYS.chatsList,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((c) => c.id !== chatId),
          })),
        };
      },
    );
  }, [queryClient]);

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    removeFromCache(contextMenu.chat.id);
    setContextMenu(null);
  }, [contextMenu, removeFromCache]);

  const handleArchive = useCallback(() => {
    if (!contextMenu) return;
    removeFromCache(contextMenu.chat.id);
    setContextMenu(null);
  }, [contextMenu, removeFromCache]);

  // ---------------------------------------------------------------------------
  // Render item
  // ---------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatHistoryItem
        item={item}
        onPress={() => handleSelectChat(item)}
        onLongPress={(menuY) => handleLongPress(item, menuY)}
        textColor={colors.text}
        textSecondary={colors.textSecondary}
        borderColor={colors.border}
        isDark={isDark}
      />
    ),
    [handleSelectChat, handleLongPress, colors, isDark],
  );

  // ---------------------------------------------------------------------------
  // Close button (for AppHeader rightContent)
  // ---------------------------------------------------------------------------

  const closeButton = (
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
      <Animated.View
        style={[styles.overlay, overlayAnimatedStyle]}
        pointerEvents="box-none"
      >
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
          {/* Fixed header — paddingHorizontal AppHeader default 16'dan 12'ye düşürüldü */}
          <AppHeader
            title="Sohbet Geçmişi"
            rightContent={closeButton}
            style={{ paddingHorizontal: spacing[3], paddingTop: Math.max(0, insets.top - verticalScale(6)) }}
          />

          {/* List area */}
          <View style={styles.listContainer}>
            {isLoading && chats.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Spinner size="large" color={palette.primary} />
              </View>
            ) : chats.length === 0 ? (
              <EmptyState
                textColor={colors.text}
                textSecondary={colors.textSecondary}
              />
            ) : (
              <FlashList
                data={chats}
                keyExtractor={(item) => item.id}
                estimatedItemSize={ITEM_HEIGHT}
                renderItem={renderItem}
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

          {/* Context Menu */}
          {contextMenu && (
            <ContextMenu
              menuY={contextMenu.menuY}
              onDelete={handleDelete}
              onArchive={handleArchive}
              onDismiss={() => setContextMenu(null)}
              surfaceColor={colors.surface}
              borderColor={colors.border}
              textColor={colors.text}
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
  // Model chip
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
  // Context menu
  contextMenu: {
    position: 'absolute',
    right: spacing[4],
    width: 160,
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
