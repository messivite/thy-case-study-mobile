import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/chat.types';
import { Text } from '@/atoms/Text';
import { AttachmentPreview } from '@/molecules/AttachmentPreview';
import { ThemeColors } from '@/constants/colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useTranslation } from 'react-i18next';
import { palette } from '@/constants/colors';
import { fontFamily } from '@/constants/typography';
import { radius, spacing } from '@/constants/spacing';
import { scale } from '@/lib/responsive';
import { toast } from '@/lib/toast';

type Props = {
  message: Message;
  colors: ThemeColors;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
  isSpeaking?: boolean;
  onSpeakToggle?: () => void;
  hideFooter?: boolean;
  hideModelLabel?: boolean;
  onQueuedPress?: () => void;
};

// Basit Pressable — SharedValue yok, scale animasyonu yok.
// Her MessageBubble için 4-5 adet SharedValue + worklet açmak birikimli yük yaratıyordu.
const ActionButton: React.FC<{
  onPress: () => void;
  children: React.ReactNode;
  accessibilityRole?: 'button' | 'link' | 'none';
  accessibilityLabel?: string;
}> = ({ onPress, children, accessibilityRole, accessibilityLabel }) => (
  <Pressable
    onPress={onPress}
    style={styles.actionBtn}
    accessibilityRole={accessibilityRole}
    accessibilityLabel={accessibilityLabel}
    hitSlop={4}
  >
    {children}
  </Pressable>
);

const UserTail = ({ color }: { color: string }) => (
  <Svg width={10} height={20} style={{ marginLeft: -1 }}>
    <Path d="M0 0 L0 20 L10 20 Q2 18 0 0 Z" fill={color} />
  </Svg>
);


const MessageBubbleInner: React.FC<Props> = ({
  message,
  colors,
  onLike,
  onRegenerate,
  isSpeaking = false,
  onSpeakToggle,
  hideFooter = false,
  hideModelLabel = false,
  onQueuedPress,
}) => {
  const haptics = useHaptics();
  const { t } = useTranslation();

  const likeScale = useSharedValue(1);
  const unlikeScale = useSharedValue(1);

  const likeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeScale.value }] }));
  const unlikeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: unlikeScale.value }] }));

  const isUser = message.role === 'user';

  const formattedTime = useMemo(() =>
    new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  [message.timestamp]);

  // Inline object yaratımını önle — colors değişmedikçe aynı referans
  const userBubbleStyle = useMemo(() => [
    styles.bubble, styles.userBubble, { backgroundColor: colors.primary },
  ], [colors.primary]);
  const aiBubbleStyle = useMemo(() => [
    styles.bubble, styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }, styles.aiBubbleFull,
  ], [colors.surface, colors.border]);

  const markdownStyles = useMemo(() => ({
    body: { color: colors.text, fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
    strong: { fontFamily: fontFamily.semiBold, color: colors.text },
    em: { fontFamily: fontFamily.regular, fontStyle: 'italic' as const, color: colors.text },
    heading1: { fontFamily: fontFamily.bold, fontSize: 20, color: colors.text, marginVertical: 6 },
    heading2: { fontFamily: fontFamily.bold, fontSize: 18, color: colors.text, marginVertical: 4 },
    heading3: { fontFamily: fontFamily.semiBold, fontSize: 16, color: colors.text, marginVertical: 4 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
    code_inline: {
      fontFamily: 'monospace',
      backgroundColor: colors.surfaceAlt,
      color: colors.primary,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    fence: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing[3],
      marginVertical: spacing[2],
    },
    code_block: {
      fontFamily: 'monospace',
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      fontSize: 13,
      lineHeight: 20,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: spacing[3],
      marginVertical: spacing[1],
      opacity: 0.85,
    },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: spacing[3] },
    link: { color: colors.primary },
  }), [colors]);

  const imageAttachments = message.attachments?.filter((a) => a.type === 'image') ?? [];
  const fileAttachments = message.attachments?.filter((a) => a.type !== 'image') ?? [];
  const hasAttachments = (message.attachments?.length ?? 0) > 0;

  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    await Clipboard.setStringAsync(message.content);
    haptics.success();
    toast.success('Kopyalandı');
  }, [message.content, haptics]);

  const handleLike = useCallback(
    (liked: boolean) => {
      haptics.light();
      const sv = liked ? likeScale : unlikeScale;
      sv.value = withSequence(withTiming(1.4, { duration: 120 }), withTiming(1, { duration: 100 }));
      onLike?.(message.id, message.liked === liked ? null : liked);
    },
    [message.id, message.liked, onLike, haptics, likeScale, unlikeScale],
  );

  const handleSpeak = useCallback(() => {
    haptics.light();
    onSpeakToggle?.();
  }, [onSpeakToggle, haptics]);

  const bubbleContent = (
    <View
      style={isUser ? userBubbleStyle : aiBubbleStyle}
    >
      {imageAttachments.length > 0 && (
        <View style={styles.imageGrid}>
          {imageAttachments.map((att) => (
            <Image
              key={att.id}
              source={{ uri: att.remoteUrl ?? att.uri }}
              style={[
                styles.imageThumb,
                imageAttachments.length === 1 && styles.imageThumbFull,
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {fileAttachments.length > 0 && (
        <View style={styles.fileList}>
          {fileAttachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} />
          ))}
        </View>
      )}

      {message.content.length > 0 && (
        isUser ? (
          <Text
            variant="body"
            color={palette.white}
            style={[styles.content, hasAttachments && styles.contentWithAttach]}
          >
            {message.content}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>
            {message.content}
          </Markdown>
        )
      )}

      {/* Footer: hideFooter ise layout'tan tamamen çıkar — opacity:0 layout kaymasına neden olur */}
      {!hideFooter && (
        <View style={[styles.footer, isUser && styles.footerUser]}>
          <Text variant="micro" color={isUser ? 'rgba(255,255,255,0.65)' : colors.textSecondary}>
            {formattedTime}
          </Text>

          {!isUser && (
            <View style={styles.actions}>
              {onSpeakToggle && (
                <ActionButton
                  onPress={handleSpeak}
                  accessibilityRole="button"
                  accessibilityLabel={isSpeaking ? 'Sesi durdur' : 'Sesli oku'}
                >
                  <Ionicons
                    name={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
                    size={18}
                    color={isSpeaking ? colors.primary : colors.textSecondary}
                  />
                </ActionButton>
              )}
              {message.content.length > 0 && (
                <ActionButton onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
                </ActionButton>
              )}
              <ActionButton onPress={() => handleLike(true)}>
                <Animated.View style={likeAnimStyle}>
                  <Ionicons
                    name={message.liked === true ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={18}
                    color={message.liked === true ? palette.success : colors.textSecondary}
                  />
                </Animated.View>
              </ActionButton>
              <ActionButton onPress={() => handleLike(false)}>
                <Animated.View style={unlikeAnimStyle}>
                  <Ionicons
                    name={message.liked === false ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={18}
                    color={message.liked === false ? palette.error : colors.textSecondary}
                  />
                </Animated.View>
              </ActionButton>
              {onRegenerate && (
                <ActionButton onPress={() => onRegenerate(message.id)}>
                  <Ionicons name="refresh-outline" size={18} color={colors.textSecondary} />
                </ActionButton>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View
      style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}
    >
      {isUser ? (
        <View style={[styles.bubbleRow, styles.bubbleRowUser]}>
          {message.queued && (
            <Pressable onPress={onQueuedPress} hitSlop={8} style={styles.queuedIcon}>
              <Ionicons name="warning" size={scale(22)} color={palette.error} />
            </Pressable>
          )}
          {bubbleContent}
          <UserTail color={colors.primary} />
        </View>
      ) : (
        <View style={styles.bubbleRowAi}>
          <View style={styles.aiBubbleInnerRow}>
            {bubbleContent}
          </View>
          {!hideFooter && !hideModelLabel && message.model && (
            <Animated.View entering={FadeIn.duration(200).delay(80)}>
              <Text variant="micro" color={colors.textSecondary} style={styles.modelLabel}>
                {t('assistant.generatedBy', { model: message.model })}
              </Text>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
};

export const MessageBubble = React.memo(MessageBubbleInner, (prev, next) => {
  if (prev.message.content !== next.message.content) return false;
  if (prev.message.timestamp !== next.message.timestamp) return false;
  if (prev.message.model !== next.message.model) return false;
  if (prev.message.liked !== next.message.liked) return false;
  if (prev.message.queued !== next.message.queued) return false;
  if (prev.isSpeaking !== next.isSpeaking) return false;
  if (prev.onSpeakToggle !== next.onSpeakToggle) return false;
  if (prev.onLike !== next.onLike) return false;
  if (prev.onRegenerate !== next.onRegenerate) return false;
  if (prev.hideFooter !== next.hideFooter) return false;
  if (prev.hideModelLabel !== next.hideModelLabel) return false;
  if (prev.onQueuedPress !== next.onQueuedPress) return false;
  if (prev.colors !== next.colors) return false;
  return true;
});

const styles = StyleSheet.create({
  row: {
    marginVertical: scale(10),
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
    marginHorizontal: spacing[4],
  },
  rowRight: {
    justifyContent: 'flex-end',
    marginHorizontal: spacing[2],
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    maxWidth: '75%',
  },
  queuedIcon: {
    alignSelf: 'flex-end',
    marginRight: spacing[1],
    marginBottom: spacing[1],
  },
  bubbleRowAi: {
    flex: 1,
    flexDirection: 'column',
  },
  aiBubbleInnerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  modelLabel: {
    marginTop: spacing[1],
    textAlign: 'right',
  },
  bubble: {
    padding: spacing[3],
  },
  userBubble: {
    borderRadius: radius.lg,
    borderBottomRightRadius: 0,
  },
  aiBubble: {
    borderWidth: 1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
  },
  aiBubbleFull: {
    flex: 1,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginBottom: spacing[2],
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  imageThumb: {
    width: 110,
    height: 110,
    borderRadius: radius.md,
  },
  imageThumbFull: {
    width: 200,
    height: 160,
  },
  fileList: {
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  content: {
    lineHeight: 22,
  },
  contentWithAttach: {
    marginTop: spacing[1],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  footerUser: {
    justifyContent: 'flex-end',
    marginTop: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    padding: 2,
  },
});
