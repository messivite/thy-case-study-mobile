import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/chat.types';
import { Text } from '@/atoms/Text';
import { AttachmentPreview } from '@/molecules/AttachmentPreview';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { toast } from '@/lib/toast';

type Props = {
  message: Message;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
  isSpeaking?: boolean;
  onSpeakToggle?: () => void;
  hideFooter?: boolean;
  hideModelLabel?: boolean;
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
  onLike,
  onRegenerate,
  isSpeaking = false,
  onSpeakToggle,
  hideFooter = false,
  hideModelLabel = false,
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();

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
      onLike?.(message.id, message.liked === liked ? null : liked);
    },
    [message.id, message.liked, onLike, haptics],
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
        <Text
          variant="body"
          color={isUser ? palette.white : colors.text}
          style={[styles.content, hasAttachments && styles.contentWithAttach]}
        >
          {message.content}
        </Text>
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
                    size={14}
                    color={isSpeaking ? colors.primary : colors.textSecondary}
                  />
                </ActionButton>
              )}
              {message.content.length > 0 && (
                <ActionButton onPress={handleCopy}>
                  <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                </ActionButton>
              )}
              <ActionButton onPress={() => handleLike(true)}>
                <Ionicons
                  name={message.liked === true ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={14}
                  color={message.liked === true ? palette.success : colors.textSecondary}
                />
              </ActionButton>
              <ActionButton onPress={() => handleLike(false)}>
                <Ionicons
                  name={message.liked === false ? 'thumbs-down' : 'thumbs-down-outline'}
                  size={14}
                  color={message.liked === false ? palette.error : colors.textSecondary}
                />
              </ActionButton>
              {onRegenerate && (
                <ActionButton onPress={() => onRegenerate(message.id)}>
                  <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
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
                {`Bu mesaj ${message.model} ile üretildi`}
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
  if (prev.isSpeaking !== next.isSpeaking) return false;
  if (prev.onSpeakToggle !== next.onSpeakToggle) return false;
  if (prev.onLike !== next.onLike) return false;
  if (prev.onRegenerate !== next.onRegenerate) return false;
  if (prev.hideFooter !== next.hideFooter) return false;
  if (prev.hideModelLabel !== next.hideModelLabel) return false;
  return true;
});

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing[1],
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
