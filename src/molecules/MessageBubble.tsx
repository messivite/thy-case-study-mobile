import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { MotiView } from '@/lib/motiView';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/chat.types';
import { Text } from '@/atoms/Text';
import { ModelBadge } from '@/atoms/Badge';
import { AttachmentPreview } from '@/molecules/AttachmentPreview';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { toast } from '@/lib/toast';
import { useI18n } from '@/hooks/useI18n';

type Props = {
  message: Message;
  onLike?: (id: string, liked: boolean | null) => void;
  onRegenerate?: (id: string) => void;
  index: number;
  isSpeaking?: boolean;
  onSpeakToggle?: () => void;
};

// Kullanıcı tail — bubble'ın sağ alt köşesine tam oturur
// Sol kenar düz (bubble'a yapışık), sağ alt sivri uç
const UserTail = ({ color }: { color: string }) => (
  <Svg width={10} height={20} style={{ marginLeft: -1 }}>
    <Path d="M0 0 L0 20 L10 20 Q2 18 0 0 Z" fill={color} />
  </Svg>
);

// AI tail — bubble'ın sol alt köşesine tam oturur (user'ın ayna görüntüsü)
const AiTail = ({ color, borderColor }: { color: string; borderColor: string }) => (
  <Svg width={10} height={20} style={{ marginRight: -1 }}>
    <Path d="M10 0 L10 20 L0 20 Q8 18 10 0 Z" fill={borderColor} />
    <Path d="M10 0 L10 20 L1 20 Q8 17 10 0 Z" fill={color} />
  </Svg>
);

export const MessageBubble: React.FC<Props> = React.memo(({
  message,
  onLike,
  onRegenerate,
  index,
  isSpeaking = false,
  onSpeakToggle,
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { t } = useI18n();

  const isUser = message.role === 'user';

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const imageAttachments = message.attachments?.filter((a) => a.type === 'image') ?? [];
  const fileAttachments = message.attachments?.filter((a) => a.type !== 'image') ?? [];
  const hasAttachments = (message.attachments?.length ?? 0) > 0;

  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    await Clipboard.setStringAsync(message.content);
    haptics.success();
    toast.success(t('toast.copied'));
  }, [message.content]);

  const handleLike = useCallback(
    (liked: boolean) => {
      haptics.light();
      onLike?.(message.id, message.liked === liked ? null : liked);
    },
    [message.id, message.liked, onLike],
  );

  const handleSpeak = useCallback(() => {
    haptics.light();
    onSpeakToggle?.();
  }, [onSpeakToggle, haptics]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200, delay: 0 }}
      style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}
    >
      {/* Bubble + tail wrapper — alignItems flex-end ile dibe hizalı */}
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAi]}>


        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
          ]}
        >
          {/* AI model badge */}
          {!isUser && message.modelId && (
            <ModelBadge modelId={message.modelId} compact style={styles.badge} />
          )}

          {/* Image attachments */}
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

          {/* File attachments */}
          {fileAttachments.length > 0 && (
            <View style={styles.fileList}>
              {fileAttachments.map((att) => (
                <AttachmentPreview key={att.id} attachment={att} />
              ))}
            </View>
          )}

          {/* Text content */}
          {message.content.length > 0 && (
            <Text
              variant="body"
              color={isUser ? palette.white : colors.text}
              style={[styles.content, hasAttachments && styles.contentWithAttach]}
            >
              {message.content}
            </Text>
          )}

          {/* Footer: time + actions */}
          <View style={styles.footer}>
            <Text
              variant="micro"
              color={isUser ? 'rgba(255,255,255,0.65)' : colors.textSecondary}
            >
              {formattedTime}
            </Text>

            {!isUser && (
              <View style={styles.actions}>
                {onSpeakToggle && (
                  <TouchableOpacity
                    onPress={handleSpeak}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel={isSpeaking ? t('assistant.stopSpeaking') : t('assistant.speak')}
                  >
                    <Ionicons
                      name={isSpeaking ? 'stop-circle-outline' : 'volume-high-outline'}
                      size={14}
                      color={isSpeaking ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                {message.content.length > 0 && (
                  <TouchableOpacity onPress={handleCopy} style={styles.actionBtn}>
                    <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleLike(true)} style={styles.actionBtn}>
                  <Ionicons
                    name={message.liked === true ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={14}
                    color={message.liked === true ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleLike(false)} style={styles.actionBtn}>
                  <Ionicons
                    name={message.liked === false ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={14}
                    color={message.liked === false ? palette.error : colors.textSecondary}
                  />
                </TouchableOpacity>
                {onRegenerate && (
                  <TouchableOpacity onPress={() => onRegenerate(message.id)} style={styles.actionBtn}>
                    <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* User tail — bubble sağında */}
        {isUser && <UserTail color={colors.primary} />}
      </View>
    </MotiView>
  );
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
  // Bubble + tail yan yana, dibe hizalı
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  bubbleRowUser: {
    flexDirection: 'row',
  },
  bubbleRowAi: {
    flexDirection: 'row',
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
  badge: {
    marginBottom: spacing[2],
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
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    padding: 2,
  },
});
