/**
 * ChatHistoryDrawer
 *
 * Soldan kayan drawer — ChatGPT benzeri sohbet geçmişi.
 *
 * Layout (yukarıdan aşağı, tümü fixed):
 *   ┌─────────────────────────────┐
 *   │  [gradient header — title]  │  ← AppHeader (safe area içerir)
 *   │  [search input]             │  ← DrawerToolbar (fix)
 *   │  [+ Yeni Sohbet]            │
 *   ├─────────────────────────────┤
 *   │  FlashList (scroll)         │
 *   └─────────────────────────────┘
 *
 * Focus olunca SearchOverlay tam panel'i kaplar:
 *   ┌─────────────────────────────┐
 *   │  [gradient header — title]  │
 *   │  [search input (focused)]   │
 *   ├─────────────────────────────┤
 *   │  "En yeni" section          │
 *   │  Son 10 arama geçmişi       │
 *   │  (arama yapınca: sonuçlar)  │
 *   └─────────────────────────────┘
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  LayoutChangeEvent,
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

import { Text } from '@/atoms/Text';
import { Button } from '@/atoms/Button';
import { Spinner } from '@/atoms/Spinner';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { SearchInput, SearchInputRef } from '@/atoms/SearchInput';
import { AppHeader } from '@/organisms/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useI18n } from '@/hooks/useI18n';
import { useInfiniteChatsQuery, useSearchChatsQuery, CHAT_QUERY_KEYS } from '@/hooks/api/useChats';
import { ChatListItem, ChatSearchResultItem, PaginatedChatsResponse } from '@/types/chat.api.types';
import { realmService } from '@/services/realm';
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
  onNewChat?: () => void;
}

type ContextMenuState = {
  chat: ChatListItem;
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
const CONTEXT_MENU_HEIGHT = 108;
const MAX_RECENT_SEARCHES = 10;

const MOCK_RECENT_SEARCHES: string[] = [
  'İstanbul uçuş saatleri',
  'Bagaj kuralları',
  'Miles&Smiles puan',
  'Vize gereksinimleri',
  'Online check-in',
];

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
  return new Date(isoString).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
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
// EmptyState
// ---------------------------------------------------------------------------

const EmptyState = ({ textColor, textSecondary, t }: { textColor: string; textSecondary: string; t: (k: string) => string }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="chatbubbles-outline" size={56} color={palette.gray300} />
    <Text style={[styles.emptyTitle, { color: textColor }]}>{t('chatHistory.emptyTitle')}</Text>
    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
      {t('chatHistory.emptySubtitle')}
    </Text>
  </View>
);

// ---------------------------------------------------------------------------
// ContextMenuOverlay — full blur + action menü
// ---------------------------------------------------------------------------

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
  t,
}: {
  contextMenu: NonNullable<ContextMenuState>;
  onDelete: () => void;
  onArchive: () => void;
  onDismiss: () => void;
  isDark: boolean;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  panelWidth: number;
  t: (k: string) => string;
}) => {
  const { height: screenHeight } = useWindowDimensions();
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
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss}>
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={isDark ? 40 : 30}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
        )}
      </Pressable>

      <Animated.View
        entering={FadeIn.springify().damping(22).stiffness(280)}
        style={[styles.contextMenu, { top: clampedTop, left: menuLeft, backgroundColor: surfaceColor, borderColor }]}
      >
        <TouchableOpacity style={styles.contextItem} onPress={onArchive} activeOpacity={0.75}>
          <Ionicons name="archive-outline" size={18} color={textColor} />
          <Text style={[styles.contextLabel, { color: textColor }]}>{t('chatHistory.archive')}</Text>
        </TouchableOpacity>
        <View style={[styles.contextDivider, { backgroundColor: borderColor }]} />
        <TouchableOpacity style={styles.contextItem} onPress={onDelete} activeOpacity={0.75}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
          <Text style={[styles.contextLabel, { color: palette.error }]}>{t('chatHistory.delete')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
});

// ---------------------------------------------------------------------------
// SearchOverlay — focus olunca tüm listeyi kaplar
// ---------------------------------------------------------------------------

interface SearchOverlayProps {
  query: string;
  recentSearches: string[];
  isSearching: boolean;
  isFetchingNext: boolean;
  hasNext: boolean;
  searchResults: ChatSearchResultItem[];
  topOffset: number;
  onLoadMore: () => void;
  onSelectRecent: (term: string) => void;
  onClearRecent: (term: string) => void;
  onSelectResult: (item: ChatSearchResultItem) => void;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  backgroundColor: string;
  isDark: boolean;
  t: (k: string, opts?: Record<string, string>) => string;
}

const SearchOverlay = React.memo(({
  query,
  recentSearches,
  isSearching,
  isFetchingNext,
  hasNext,
  searchResults,
  topOffset,
  onLoadMore,
  onSelectRecent,
  onClearRecent,
  onSelectResult,
  textColor,
  textSecondary,
  borderColor,
  backgroundColor,
  isDark,
  t,
}: SearchOverlayProps) => {
  const hasQuery = query.trim().length > 0;

  return (
    <Animated.View
      style={[styles.searchOverlay, { backgroundColor, top: topOffset }]}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
    >
      {hasQuery ? (
        // --- Arama sonuçları ---
        isSearching ? (
          <View style={styles.searchLoading}>
            <ActivityThyLoading mode="float" size={48} />
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.searchLoading}>
            <Ionicons name="search-outline" size={40} color={palette.gray300} />
            <Text style={[styles.emptyTitle, { color: textColor, marginTop: spacing[3] }]}>
              Sonuç bulunamadı
            </Text>
            <Text style={[styles.searchHint, { color: textSecondary }]}>
              "{query}" için eşleşme yok
            </Text>
          </View>
        ) : (
          <FlashList
            data={searchResults}
            keyExtractor={(item) => item.sessionId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onEndReachedThreshold={0.2}
            onEndReached={() => { if (hasNext && !isFetchingNext) onLoadMore(); }}
            ListFooterComponent={
              isFetchingNext ? (
                <View style={styles.footerLoader}>
                  <Spinner size="small" color={palette.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: borderColor + 'AA' }]}
                onPress={() => onSelectResult(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.providerAvatar, { backgroundColor: palette.primary + '1A' }]}>
                  <Ionicons name="search" size={scale(14)} color={palette.primary} />
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTitleRow}>
                    <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemTime, { color: textSecondary }]}>
                      {getRelativeTime(item.lastMessageAt)}
                    </Text>
                  </View>
                  {item.matchedContent && (
                    <Text style={[styles.itemPreview, { color: textSecondary }]} numberOfLines={2}>
                      {item.matchedContent}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        // --- Son aramalar ---
        recentSearches.length === 0 ? (
          <View style={styles.searchLoading}>
            <Text style={[styles.searchHint, { color: textSecondary }]}>
              {t('chatHistory.noRecentSearches')}
            </Text>
          </View>
        ) : (
          <FlashList
            data={recentSearches}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={[styles.sectionTitle, { color: textSecondary }]}>{t('chatHistory.recentSection')}</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.recentItem, { borderBottomColor: borderColor + '55' }]}
                onPress={() => onSelectRecent(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={scale(15)} color={textSecondary} style={styles.recentIcon} />
                <Text style={[styles.recentText, { color: textColor }]} numberOfLines={1}>
                  {item}
                </Text>
                <TouchableOpacity
                  onPress={() => onClearRecent(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={scale(14)} color={textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )
      )}
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
  onNewChat,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const DRAWER_WIDTH = windowWidth * 0.85;

  // Reanimated
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const drawerWidthSV = useSharedValue(DRAWER_WIDTH);

  useEffect(() => { drawerWidthSV.value = DRAWER_WIDTH; }, [DRAWER_WIDTH, drawerWidthSV]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const closeDrawerFromGesture = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  // UI state
  const [modalVisible, setModalVisible] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Fixed area height (header + toolbar) — SearchOverlay top offset
  const [fixedAreaHeight, setFixedAreaHeight] = useState(0);
  const fixedAreaRef = useRef<View>(null);

  // Search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(MOCK_RECENT_SEARCHES);
  const searchInputRef = useRef<SearchInputRef>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search API — 2+ karakter, debounce 400ms
  const {
    data: searchData,
    isLoading: isSearching,
    isFetchingNextPage: isSearchFetchingNext,
    hasNextPage: searchHasNext,
    fetchNextPage: searchFetchNext,
  } = useSearchChatsQuery(debouncedQuery);

  const searchResults = useMemo(
    () => searchData?.pages.flatMap((p) => p.items) ?? [],
    [searchData],
  );

  // Toolbar animation — newChat slides out on focus
  const newChatOpacity = useSharedValue(1);
  const newChatMaxHeight = useSharedValue(48);

  // React Query
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
    () => (data?.pages.flatMap((p) => p.items ?? []) ?? []).filter((c) => c?.id && !deletedIds.has(c.id)),
    [data, deletedIds],
  );

  // Session listesi API'den gelince Realm'e kaydet
  useEffect(() => {
    if (!data) return;
    const allItems = data.pages.flatMap((p) => p.items ?? []).filter((c) => c?.id);
    if (allItems.length > 0) realmService.saveSessions(allItems);
  }, [data]);

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
      // Arama state'ini temizle
      setSearchFocused(false);
      setSearchQuery('');
      newChatOpacity.value = 1;
      newChatMaxHeight.value = 48;
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
            runOnJS(closeDrawerFromGesture)();
          } else {
            translateX.value = withSpring(0, SPRING_CONFIG);
            overlayOpacity.value = withTiming(0.55, { duration: 200 });
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const panelAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const newChatAnimatedStyle = useAnimatedStyle(() => ({
    opacity: newChatOpacity.value,
    maxHeight: newChatMaxHeight.value,
    overflow: 'hidden',
  }));

  // ---------------------------------------------------------------------------
  // Search handlers
  // ---------------------------------------------------------------------------

  const handleSearchFocus = useCallback((focused: boolean) => {
    setSearchFocused(focused);
    if (focused) {
      newChatOpacity.value = withTiming(0, { duration: 160 });
      newChatMaxHeight.value = withTiming(0, { duration: 180 });
    } else {
      newChatOpacity.value = withTiming(1, { duration: 200 });
      newChatMaxHeight.value = withTiming(48, { duration: 200 });
      setSearchQuery('');
      setDebouncedQuery('');
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    }
  }, [newChatOpacity, newChatMaxHeight]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!text.trim()) {
      setDebouncedQuery('');
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 400);
  }, []);

  const handleSelectRecent = useCallback((term: string) => {
    setSearchQuery(term);
    handleSearchChange(term);
  }, [handleSearchChange]);

  const handleClearRecent = useCallback((term: string) => {
    setRecentSearches((prev) => prev.filter((t) => t !== term));
  }, []);

  const handleSelectSearchResult = useCallback((item: ChatSearchResultItem) => {
    // Arama geçmişine ekle
    if (searchQuery.trim()) {
      setRecentSearches((prev) => {
        const filtered = prev.filter((t) => t !== searchQuery.trim());
        return [searchQuery.trim(), ...filtered].slice(0, MAX_RECENT_SEARCHES);
      });
    }
    searchInputRef.current?.blur();
    setSearchFocused(false);
    setSearchQuery('');
    setDebouncedQuery('');
    // ChatListItem shape'ine map et — sessionId → id
    onSelectChat?.({
      id: item.sessionId,
      title: item.title,
      provider: '',
      model: '',
      createdAt: item.sessionCreatedAt,
      updatedAt: item.sessionUpdatedAt,
      lastMessagePreview: item.matchedContent ?? '',
    });
    onClose();
  }, [searchQuery, onSelectChat, onClose]);

  // ---------------------------------------------------------------------------
  // Chat handlers
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

  const optimisticRemove = useCallback(
    (chatId: string) => {
      type IC = InfiniteData<PaginatedChatsResponse>;
      const previous = queryClient.getQueryData<IC>(CHAT_QUERY_KEYS.chatsList);

      setDeletedIds((prev) => new Set([...prev, chatId]));

      queryClient.setQueryData<IC>(CHAT_QUERY_KEYS.chatsList, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: (page.items ?? []).filter((c) => c.id !== chatId),
          })),
        };
      });

      return () => {
        if (previous) queryClient.setQueryData(CHAT_QUERY_KEYS.chatsList, previous);
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
      };
    },
    [queryClient],
  );

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    const { id } = contextMenu.chat;
    setContextMenu(null);
    const rollback = optimisticRemove(id);
    realmService.clearSessionMessages(id);
    // TODO: deleteChat(id).catch(() => rollback());
    void rollback;
  }, [contextMenu, optimisticRemove]);

  const handleArchive = useCallback(() => {
    if (!contextMenu) return;
    const { id } = contextMenu.chat;
    setContextMenu(null);
    const rollback = optimisticRemove(id);
    // TODO: archiveChat(id).catch(() => rollback());
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
          {/* ── Fixed top section — ölçüm burada ── */}
          <View
            ref={fixedAreaRef}
            onLayout={(e: LayoutChangeEvent) => setFixedAreaHeight(e.nativeEvent.layout.height)}
          >
            <AppHeader
              title={t('chatHistory.title')}
              style={{
                paddingHorizontal: spacing[3],
                paddingTop: Math.max(0, insets.top - verticalScale(6)),
              }}
            />

            {/* Toolbar: search + new chat */}
            <View style={[styles.toolbar, { backgroundColor: colors.background, borderBottomColor: colors.border + '55' }]}>
              <SearchInput
                ref={searchInputRef}
                placeholder={t('chatHistory.searchPlaceholder')}
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocusChange={handleSearchFocus}
                onClear={() => { setSearchQuery(''); setDebouncedQuery(''); }}
                showCancelOnFocus
                cancelLabel={t('chatHistory.cancel')}
                containerStyle={styles.searchInputContainer}
              />
              <Animated.View style={[styles.newChatWrap, newChatAnimatedStyle]}>
                <Button
                  title={t('chatHistory.newChat')}
                  variant="ghost"
                  fullWidth={false}
                  style={styles.newChatBtn}
                  titleStyle={styles.newChatBtnText}
                  icon={<Ionicons name="create-outline" size={scale(20)} color={colors.primary} />}
                  onPress={() => { onNewChat?.(); onClose(); }}
                />
              </Animated.View>
            </View>
          </View>

          {/* ── Scrollable content ── */}
          <View style={styles.listContainer}>
            {isLoading && chats.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Spinner size="large" color={palette.primary} />
              </View>
            ) : chats.length === 0 ? (
              <EmptyState textColor={colors.text} textSecondary={colors.textSecondary} t={t} />
            ) : (
              <FlashList
                data={chats}
                keyExtractor={(item) => item.id}
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

          {/* Search overlay — focus olunca liste üstünü kaplar, fixed area altından başlar */}
          {searchFocused && (
            <SearchOverlay
              query={searchQuery}
              recentSearches={recentSearches}
              isSearching={isSearching}
              isFetchingNext={isSearchFetchingNext}
              hasNext={searchHasNext ?? false}
              searchResults={searchResults}
              topOffset={fixedAreaHeight}
              onLoadMore={searchFetchNext}
              onSelectRecent={handleSelectRecent}
              onClearRecent={handleClearRecent}
              onSelectResult={handleSelectSearchResult}
              textColor={colors.text}
              textSecondary={colors.textSecondary}
              borderColor={colors.border}
              backgroundColor={colors.background}
              isDark={isDark}
              t={t}
            />
          )}

          {/* Context menu overlay */}
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
              t={t}
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
    overflow: 'hidden',
    ...shadow.lg,
  },
  // Toolbar
  toolbar: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing[2],
  },
  searchInputContainer: {
    // full width içinde SearchInput zaten flex: 1 alıyor
  },
  newChatWrap: {
    alignItems: 'flex-start',
  },
  newChatBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    minHeight: 0,
    borderRadius: radius.md,
  },
  newChatBtnText: {
    fontSize: scale(12),
  },
  // List
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
  // Search overlay — top değeri prop'tan gelir (fixedAreaHeight)
  searchOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(11),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentIcon: {
    marginRight: spacing[3],
  },
  recentText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: scale(13),
  },
  searchLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  searchHint: {
    fontFamily: fontFamily.regular,
    fontSize: scale(13),
    textAlign: 'center',
  },
});
