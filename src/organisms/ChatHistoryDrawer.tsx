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
 *   │  FlatList (scroll)         │
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
  Alert,
  LayoutChangeEvent,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
// Gesture/GestureDetector pan gesture kaldırıldı ama drawer pan gesture için hala gerekli
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/atoms/Text';
import { Button } from '@/atoms/Button';
import { Spinner } from '@/atoms/Spinner';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { SearchInput, SearchInputRef } from '@/atoms/SearchInput';
import { AppHeader } from '@/organisms/AppHeader';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useAppDispatch } from '@/store/hooks';
import { setSessionId } from '@/store/slices/chatSlice';
import { useDeleteChatMutation } from '@/hooks/api/useChats';
import { useChatHistory } from '@/hooks/useChatHistory';
import { realmService } from '@/services/realm';
import { ChatListItem, ChatSearchResultItem, PaginatedChatsResponse } from '@/types/chat.api.types';
import { toast } from '@/lib/toast';
import { palette } from '@/constants/colors';
import { radius, shadow, spacing } from '@/constants/spacing';
import { scale, verticalScale, moderateScale } from '@/lib/responsive';

const IS_WEB = Platform.OS === 'web';
const WEB_DRAWER_WIDTH = 320;
import { fontFamily } from '@/constants/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onHidden?: () => void;
  onSelectChat?: (chat: ChatListItem) => void;
  onNewChat?: () => void;
  activeChatId?: string | null;
  onDeleteActiveChat?: () => void;
}

type ContextMenuState = {
  chat: ChatListItem;
  pageY: number;
  pageH: number;
  pageX: number;
  pageW: number;
} | null;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// stiffness↑ + mass↓ = daha hızlı, native iOS sidepanel hissine yakın
const SPRING_CONFIG = { damping: 28, stiffness: 480, mass: 0.45 } as const;
const CLOSE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 600;
const CONTEXT_MENU_WIDTH = 200;
const CONTEXT_MENU_HEIGHT = 108;
const SWIPE_ACTION_WIDTH = 130; // Sil + Arşivle butonları toplam genişlik
const SWIPE_OPEN_THRESHOLD = 60; // Bu kadar sürüklendikten sonra snap-open

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
  <View style={[styles.chip, { borderColor: color + '40', backgroundColor: isDark ? color + '18' : color + '12' }]}>
    <Ionicons name="hardware-chip-outline" size={moderateScale(13)} color={color} style={styles.chipIcon} />
    <Text style={[styles.chipText, { color }]} numberOfLines={1}>{model}</Text>
  </View>
));

// ---------------------------------------------------------------------------
// ChatHistoryItem
// ---------------------------------------------------------------------------

interface ChatHistoryItemProps {
  item: ChatListItem;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  isDeleting: boolean;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  isDark: boolean;
}

const ChatHistoryItem = React.memo<ChatHistoryItemProps>(
  ({ item, onPress, onDelete, onArchive, isDeleting, textColor, textSecondary, borderColor, isDark }) => {
    const deleteProgress = useSharedValue(1);

    useEffect(() => {
      if (isDeleting) {
        deleteProgress.value = withTiming(0, { duration: 220 });
      }
    }, [isDeleting, deleteProgress]);

    const deleteAnimStyle = useAnimatedStyle(() => ({
      opacity: deleteProgress.value,
      maxHeight: interpolate(deleteProgress.value, [0, 1], [0, 200]),
      overflow: 'hidden',
    }));

    const providerColor = getProviderColor(item.provider);
    const providerIcon = getProviderIcon(item.provider);

    return (
      <Animated.View style={deleteAnimStyle}>
        <TouchableOpacity
          style={[styles.item, { borderBottomColor: borderColor + 'AA' }]}
          onPress={() => onPress(item.id)}
          onLongPress={() => onDelete(item.id)}
          delayLongPress={400}
          activeOpacity={0.7}
        >
          {/* Sağ taraftaki ince accent bar — provider rengini gösterir, yer kaplamaz */}
          <View style={[styles.accentBar, { backgroundColor: providerColor }]} />
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
              <View style={styles.itemActions}>
                {/* Arşivleme geçici olarak devre dışı
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); onArchive(item.id); }}
                  hitSlop={6}
                  style={styles.itemActionBtn}
                >
                  <Ionicons name="archive-outline" size={moderateScale(16)} color={textSecondary} />
                </Pressable>
                */}
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); onDelete(item.id); }}
                  hitSlop={6}
                  style={styles.itemActionBtn}
                >
                  <Ionicons name="trash-outline" size={moderateScale(20)} color={palette.error + 'CC'} />
                </Pressable>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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

  // Menüyü row'un hemen üstüne koy; sığmazsa altına al
  // Row ortasına hizala, biraz yukarı çek — responsive (pageH bazlı)
  const menuAbove = contextMenu.pageY + contextMenu.pageH / 2 - CONTEXT_MENU_HEIGHT / 2 - contextMenu.pageH * -0.2;
  const menuBelow = contextMenu.pageY + contextMenu.pageH + 4;
  const clampedTop = menuAbove >= 0 ? menuAbove : menuBelow;

  // Menüyü row'un ortasına hizala, panel sınırına taşmasın
  const menuLeft = Math.min(
    Math.max(8, contextMenu.pageX + (contextMenu.pageW - CONTEXT_MENU_WIDTH) / 2),
    panelWidth - CONTEXT_MENU_WIDTH - 8,
  );

  return (
    <Animated.View
      style={[styles.contextOverlayWrapper, { width: panelWidth }]}
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(120)}
    >
      {/* Dismiss alanı — transparan, blur yok */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

      {/* Sadece row blur — pageY/pageH koordinatlarına göre konumlu */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: contextMenu.pageY,
          height: contextMenu.pageH,
          overflow: 'hidden',
        }}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(128,128,128,0.10)' }]} />
      </View>

      {/* Floating menü */}
      <Animated.View
        entering={FadeIn.springify().damping(20).stiffness(300)}
        style={[styles.contextMenu, { top: clampedTop, left: menuLeft, backgroundColor: surfaceColor, borderColor }]}
      >
        {/* Arşivleme geçici olarak devre dışı
        <TouchableOpacity style={styles.contextItem} onPress={onArchive} activeOpacity={0.75}>
          <Ionicons name="archive-outline" size={18} color={textColor} />
          <Text style={[styles.contextLabel, { color: textColor }]}>{t('chatHistory.archive')}</Text>
        </TouchableOpacity>
        <View style={[styles.contextDivider, { backgroundColor: borderColor }]} />
        */}
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

type QueryState = 'empty' | 'typing' | 'ready';

interface SearchOverlayProps {
  queryState: QueryState;
  queryText: string; // sadece empty state gösterimi için
  isSearching: boolean;
  isFetchingNext: boolean;
  hasNext: boolean;
  searchResults: ChatSearchResultItem[];
  focusInitialSessions: ChatListItem[];
  topOffset: number;
  onLoadMore: () => void;
  onSelectResult: (item: ChatSearchResultItem) => void;
  onSelectSession: (item: ChatListItem) => void;
  textColor: string;
  textSecondary: string;
  borderColor: string;
  backgroundColor: string;
  t: (k: string, opts?: Record<string, string>) => string;
}

const SearchOverlay = React.memo(({
  queryState,
  queryText,
  isSearching,
  isFetchingNext,
  hasNext,
  searchResults,
  focusInitialSessions,
  topOffset,
  onLoadMore,
  onSelectResult,
  onSelectSession,
  textColor,
  textSecondary,
  borderColor,
  backgroundColor,
  t,
}: SearchOverlayProps) => {

  const renderSearchResult = useCallback(({ item }: { item: ChatSearchResultItem }) => (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: borderColor + 'AA' }]}
      onPress={() => onSelectResult(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.accentBar, { backgroundColor: palette.primary }]} />
      <View style={styles.itemContent}>
        <View style={styles.itemTitleRow}>
          <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemTime, { color: textSecondary }]}>
            {getRelativeTime(item.lastMessageAt)}
          </Text>
        </View>
        {item.matchedContent ? (
          <Text style={[styles.itemPreview, { color: textSecondary }]} numberOfLines={2}>
            {item.matchedContent}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  ), [borderColor, textColor, textSecondary, onSelectResult]);

  const renderRecentSession = useCallback(({ item }: { item: ChatListItem }) => {
    const providerColor = getProviderColor(item.provider);
    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: borderColor + 'AA' }]}
        onPress={() => onSelectSession(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.accentBar, { backgroundColor: providerColor }]} />
        <View style={styles.itemContent}>
          <View style={styles.itemTitleRow}>
            <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.itemTime, { color: textSecondary }]}>
              {getRelativeTime(item.updatedAt)}
            </Text>
          </View>
          <Text style={[styles.itemPreview, { color: textSecondary }]} numberOfLines={1}>
            {item.lastMessagePreview || item.model}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [borderColor, textColor, textSecondary, onSelectSession]);

  const searchFooter = useMemo(() => {
    if (isFetchingNext) return <View style={styles.footerLoader}><Spinner size="small" color={palette.primary} /></View>;
    if (!hasNext && searchResults.length > 0) return (
      <View style={styles.footerLoader}>
        <Text style={[styles.searchHint, { color: textSecondary }]}>Tüm sonuçlar gösterildi</Text>
      </View>
    );
    return null;
  }, [isFetchingNext, hasNext, searchResults.length, textSecondary]);

  const recentHeader = useMemo(() => (
    <Text style={[styles.sectionTitle, { color: textSecondary }]}>
      {t('chatHistory.recentSection')}
    </Text>
  ), [textSecondary, t]);

  return (
    <Animated.View
      style={[styles.searchOverlay, { backgroundColor, top: topOffset }]}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
    >
      {queryState === 'ready' ? (
        // --- API arama sonuçları (>= 2 karakter) ---
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
              "{queryText}" için eşleşme yok
            </Text>
          </View>
        ) : (
          <View style={styles.overlayList}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.sessionId}
              renderItem={renderSearchResult}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              onEndReachedThreshold={0.3}
              onEndReached={() => { if (hasNext && !isFetchingNext) onLoadMore(); }}
              ListFooterComponent={searchFooter}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )
      ) : queryState === 'typing' ? (
        // --- 1 karakter: bekle ---
        <View style={styles.searchLoading}>
          <Text style={[styles.searchHint, { color: textSecondary }]}>
            Aramak için en az 2 karakter girin
          </Text>
        </View>
      ) : focusInitialSessions.length === 0 ? (
        // --- Boş query + Realm boş ---
        <View style={styles.searchLoading}>
          <Ionicons name="chatbubbles-outline" size={40} color={palette.gray300} />
          <Text style={[styles.searchHint, { color: textSecondary, marginTop: spacing[3] }]}>
            Henüz sohbet bulunmuyor
          </Text>
        </View>
      ) : (
        // --- Boş query: Realm'den son 20 session ---
        <View style={styles.overlayList}>
          <FlatList
            data={focusInitialSessions}
            keyExtractor={(item) => item.id}
            renderItem={renderRecentSession}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={recentHeader}
            keyboardShouldPersistTaps="handled"
          />
        </View>
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
  onHidden,
  onSelectChat,
  onNewChat,
  activeChatId,
  onDeleteActiveChat,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const DRAWER_WIDTH = IS_WEB ? WEB_DRAWER_WIDTH : windowWidth * 0.85;

  // Reanimated
  const translateX = useSharedValue(-DRAWER_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const drawerWidthSV = useSharedValue(DRAWER_WIDTH);
  // Overlay/panel tıklama aktif mi — animasyon tamamlanınca true
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { drawerWidthSV.value = DRAWER_WIDTH; }, [DRAWER_WIDTH, drawerWidthSV]);

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const onHiddenRef = useRef(onHidden);
  useEffect(() => { onHiddenRef.current = onHidden; }, [onHidden]);
  const callOnHidden = useCallback(() => { onHiddenRef.current?.(); }, []);
  const closeDrawerFromGesture = useCallback(() => {
    onCloseRef.current?.();
  }, []);

  // UI state
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { mutate: deleteChatMutate } = useDeleteChatMutation();

  // Fixed area height (header + toolbar) — SearchOverlay top offset
  const [fixedAreaHeight, setFixedAreaHeight] = useState(0);
  const fixedAreaRef = useRef<View>(null);

  // Search state
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchQueryRef = useRef('');
  const searchInputRef = useRef<SearchInputRef>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Overlay input focus'tan bağımsız — query doluyken veya input focus'tayken açık kalır
  const searchOverlayVisible = searchFocused || debouncedQuery.trim().length > 0;

  // Toolbar animation — newChat slides out on focus
  const newChatOpacity = useSharedValue(1);
  const newChatMaxHeight = useSharedValue(48);

  // Data — useChatHistory tum Realm/API/sync logic'ini yonetir
  const {
    sessions,
    isLoading,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    searchResults,
    isSearching,
    isSearchFetchingNextPage: isSearchFetchingNext,
    searchFetchNextPage: searchFetchNext,
    searchHasNextPage: searchHasNext,
  } = useChatHistory(debouncedQuery);

  // Search focus'a gelince React Query cache'inden oku — sessions zaten güncel
  const [focusInitialSessions, setFocusInitialSessions] = useState<ChatListItem[]>([]);
  useEffect(() => {
    if (searchOverlayVisible) {
      setFocusInitialSessions(sessions.filter((c) => c?.id && !deletedIds.has(c.id)));
    }
  }, [searchOverlayVisible, sessions, deletedIds]);

  // QueryState: sadece debouncedQuery'e göre hesapla — her karakter basışında re-render yok.
  const queryState = useMemo((): QueryState => {
    const debouncedLen = debouncedQuery.trim().length;
    if (debouncedLen === 0) return 'empty';
    if (debouncedLen < 2) return 'typing';
    return 'ready';
  }, [debouncedQuery]);

  const chats = useMemo(
    () => sessions.filter((c) => c?.id && !deletedIds.has(c.id)),
    [sessions, deletedIds],
  );

  const filteredSearchResults = useMemo(
    () => searchResults.filter((r) => r?.sessionId && !deletedIds.has(r.sessionId)),
    [searchResults, deletedIds],
  );

  const extraData = useMemo(
    () => ({ deletedIds, deletingId }),
    [deletedIds, deletingId],
  );

  // ---------------------------------------------------------------------------
  // Open / Close animations
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (visible) {
      // View her zaman mounted — animasyon gecikme olmadan anında başlar
      translateX.value = -DRAWER_WIDTH;
      overlayOpacity.value = 0;
      setIsOpen(true);
      translateX.value = withSpring(0, SPRING_CONFIG);
      overlayOpacity.value = withTiming(0.45, { duration: 200 });
      return;
    } else {
      setIsOpen(false);
      overlayOpacity.value = withTiming(0, { duration: 160 });
      translateX.value = withTiming(-DRAWER_WIDTH, { duration: 180 }, (done) => {
        'worklet';
        if (done) runOnJS(callOnHidden)();
      });
      // Arama state'ini temizle
      setSearchFocused(false);
      searchQueryRef.current = '';
      setDebouncedQuery('');
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
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
        .activeOffsetX([-12, 999])
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
      // Query'yi burada temizleme — onSubmitEditing sonrası blur gelince sonuçları siler.
      // Temizlik: İptal butonu (handleCancel içinde onClear), drawer kapanışı (visible effect) ve
      // handleSelectSearchResult tarafından yapılır.
    }
  }, [newChatOpacity, newChatMaxHeight]);

  const handleSearchChange = useCallback((text: string) => {
    searchQueryRef.current = text;

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!text.trim()) {
      setDebouncedQuery('');
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 400);
  }, []);

  const handleSelectSearchResult = useCallback((item: ChatSearchResultItem) => {
    // Önce session'ı yükle, sonra overlay'i kapat — sıra önemli
    if (onSelectChat) {
      onSelectChat({ id: item.sessionId, title: item.title } as ChatListItem);
    } else {
      dispatch(setSessionId(item.sessionId));
      onClose();
    }
    // State'i temizle (blur'dan önce — blur onFocusChange tetikler, o da state'i temizler; çift temizlik zararsız)
    searchQueryRef.current = '';
    setDebouncedQuery('');
    setSearchFocused(false);
    searchInputRef.current?.blur();
  }, [dispatch, onSelectChat, onClose]);

  // ---------------------------------------------------------------------------
  // Chat handlers
  // ---------------------------------------------------------------------------

  const chatsRef = useRef(chats);
  useEffect(() => { chatsRef.current = chats; }, [chats]);

  const handleSelectChatById = useCallback(
    (id: string) => {
      if (onSelectChat) {
        const chat = chatsRef.current.find((c) => c.id === id);
        onSelectChat(chat ?? ({ id } as ChatListItem));
      } else {
        dispatch(setSessionId(id));
        onClose();
      }
    },
    [dispatch, onSelectChat, onClose],
  );


  // Silme onayı + animasyon + mutation — hem context menu hem swipe için ortak
  const confirmDelete = useCallback(
    (item: ChatListItem) => {
      const doDelete = () => {
        if (activeChatId === item.id) onDeleteActiveChat?.();
        setDeletingId(item.id);
        setTimeout(() => {
          setDeletedIds((prev) => new Set([...prev, item.id]));
          setDeletingId(null);
        }, 220);
        deleteChatMutate(item.id, {
          onSuccess: () => toast.success(t('chatHistory.deleteSuccess')),
          onError: () => {
            setDeletedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
            toast.error(t('chatHistory.deleteError'));
          },
        });
      };

      if (IS_WEB) {
        if (window.confirm(`${t('chatHistory.deleteAlertTitle')}\n${t('chatHistory.deleteAlertMessage', { title: item.title })}`)) {
          doDelete();
        }
      } else {
        Alert.alert(
          t('chatHistory.deleteAlertTitle'),
          t('chatHistory.deleteAlertMessage', { title: item.title }),
          [
            { text: t('chatHistory.deleteAlertCancel'), style: 'cancel' },
            { text: t('chatHistory.deleteAlertConfirm'), style: 'destructive', onPress: doDelete },
          ],
        );
      }
    },
    [t, deleteChatMutate, activeChatId, onDeleteActiveChat],
  );


  // ---------------------------------------------------------------------------
  // Render item
  // ---------------------------------------------------------------------------

  const handleDeleteById = useCallback((id: string) => {
    const item = chatsRef.current.find((c) => c.id === id);
    if (item) confirmDelete(item);
  }, [confirmDelete]);

  const handleArchiveById = useCallback((id: string) => {
    setDeletedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const textColor = colors.text;
  const textSecondary = colors.textSecondary;
  const borderColor = colors.border;

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => (
      <ChatHistoryItem
        item={item}
        onPress={handleSelectChatById}
        onDelete={handleDeleteById}
        onArchive={handleArchiveById}
        isDeleting={deletingId === item.id}
        textColor={textColor}
        textSecondary={textSecondary}
        borderColor={borderColor}
        isDark={isDark}
      />
    ),
    [handleSelectChatById, handleDeleteById, handleArchiveById, deletingId, textColor, textSecondary, borderColor, isDark],
  );

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  // Drawer kapalıyken overlay ve panel tıklamaları geçirgen yap
  const containerPointerEvents = isOpen ? 'box-none' : 'none';

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={containerPointerEvents}
    >
      {/* Dimmed overlay */}
      <Animated.View style={[styles.overlay, overlayAnimatedStyle]} pointerEvents={isOpen ? 'box-none' : 'none'}>
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
              style={{ paddingHorizontal: spacing[3] }}
            />

            {/* Toolbar: search + new chat */}
            <View style={[styles.toolbar, { backgroundColor: colors.background, borderBottomColor: colors.border + '55' }]}>
              <SearchInput
                ref={searchInputRef}
                placeholder={t('chatHistory.searchPlaceholder')}
                onChangeText={handleSearchChange}
                onFocusChange={handleSearchFocus}
                onClear={() => { searchQueryRef.current = ''; setDebouncedQuery(''); }}
                onSubmitEditing={() => {
                  // Debounce beklemeden anında ara
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  const q = searchQueryRef.current.trim();
                  if (q) setDebouncedQuery(q);
                }}
                showCancelOnFocus
                cancelLabel={t('chatHistory.cancel')}
                containerStyle={styles.searchInputContainer}
                themeColors={colors}
              />
              <Animated.View style={[styles.newChatWrap, newChatAnimatedStyle]}>
                <Button
                  title={t('chatHistory.newChat')}
                  variant="ghost"
                  fullWidth={false}
                  style={styles.newChatBtn}
                  titleStyle={styles.newChatBtnText}
                  icon={<Ionicons name="create-outline" size={moderateScale(22)} color={colors.primary} />}
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
              <FlatList
                data={chats}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                extraData={extraData}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.2}
                onEndReached={handleEndReached}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                windowSize={5}
                removeClippedSubviews
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

          {/* Search overlay — focus veya dolu query varken açık kalır */}
          {searchOverlayVisible && (
            <SearchOverlay
              queryState={queryState}
              queryText={debouncedQuery}
              isSearching={isSearching}
              isFetchingNext={isSearchFetchingNext}
              hasNext={searchHasNext ?? false}
              searchResults={filteredSearchResults}
              focusInitialSessions={focusInitialSessions}
              topOffset={fixedAreaHeight}
              onLoadMore={searchFetchNext}
              onSelectResult={handleSelectSearchResult}
              onSelectSession={(item) => {
                if (onSelectChat) {
                  onSelectChat(item);
                } else {
                  dispatch(setSessionId(item.id));
                  onClose();
                }
                setSearchFocused(false);
                searchInputRef.current?.blur();
              }}
              textColor={colors.text}
              textSecondary={colors.textSecondary}
              borderColor={colors.border}
              backgroundColor={colors.background}
              t={t}
            />
          )}
        </Animated.View>
      </GestureDetector>

    </View>
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
    fontSize: moderateScale(14),
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
    alignItems: 'stretch',
    paddingRight: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: spacing[3],
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  itemContent: {
    flex: 1,
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
    fontSize: moderateScale(15),
    letterSpacing: 0.1,
  },
  itemPreview: {
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
  },
  itemTime: {
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(12),
    flexShrink: 0,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  itemActionBtn: {
    padding: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: moderateScale(100),
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
    fontSize: moderateScale(12),
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
    fontSize: moderateScale(17),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(14),
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  // Context overlay — sadece drawer alanı, sağa taşmaz
  contextOverlayWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    // width prop'tan gelir
  },
  // Item highlight — long press yapılan row
  itemHighlighted: {
    backgroundColor: 'rgba(128,128,128,0.12)',
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
    fontSize: moderateScale(14),
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
    fontSize: moderateScale(13),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  searchLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  searchHint: {
    fontFamily: fontFamily.regular,
    fontSize: moderateScale(13),
    textAlign: 'center',
  },
  overlayList: {
    flex: 1,
  },
});
