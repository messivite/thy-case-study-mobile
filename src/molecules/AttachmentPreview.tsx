import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { Attachment } from '@/types/chat.types';
import { Text } from '@/atoms/Text';
import { useTheme } from '@/hooks/useTheme';
import { palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

type Props = {
  attachment: Attachment;
  onRemove?: () => void;      // only in input preview (before send)
  isInput?: boolean;
};

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const AttachmentPreview: React.FC<Props> = ({ attachment, onRemove, isInput }) => {
  const { colors } = useTheme();
  const isImage = attachment.type === 'image';
  const isPDF = attachment.type === 'pdf';
  const isUploading = attachment.status === 'uploading';
  const isError = attachment.status === 'error';

  if (isImage) {
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        style={[styles.imageWrap, isInput && styles.inputImageWrap]}
      >
        <Image
          source={{ uri: attachment.uri }}
          style={[styles.image, isInput && styles.inputImage]}
          resizeMode="cover"
        />

        {/* Upload progress overlay */}
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator color={palette.white} size="small" />
            {attachment.progress !== undefined && (
              <Text
                style={{ color: palette.white, fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, marginTop: 4 }}
              >
                {Math.round(attachment.progress * 100)}%
              </Text>
            )}
          </View>
        )}

        {/* Error overlay */}
        {isError && (
          <View style={[styles.uploadOverlay, { backgroundColor: 'rgba(239,68,68,0.75)' }]}>
            <Ionicons name="alert-circle" size={20} color={palette.white} />
          </View>
        )}

        {/* Remove button (input mode) */}
        {isInput && onRemove && (
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Ionicons name="close-circle" size={20} color={palette.white} />
          </TouchableOpacity>
        )}
      </MotiView>
    );
  }

  // PDF / File row
  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 250 }}
      style={[
        styles.fileRow,
        {
          backgroundColor: isInput ? colors.inputBg : colors.surfaceAlt,
          borderColor: isError ? palette.error : colors.border,
        },
      ]}
    >
      <View style={[
        styles.fileIcon,
        { backgroundColor: isPDF ? '#F59E0B18' : colors.surfaceAlt },
      ]}>
        {isUploading ? (
          <ActivityIndicator color={isPDF ? '#F59E0B' : colors.primary} size="small" />
        ) : isError ? (
          <Ionicons name="alert-circle-outline" size={22} color={palette.error} />
        ) : (
          <Ionicons
            name={isPDF ? 'document-text-outline' : 'attach-outline'}
            size={22}
            color={isPDF ? '#F59E0B' : colors.primary}
          />
        )}
      </View>

      <View style={styles.fileInfo}>
        <Text
          variant="label"
          style={{ fontFamily: fontFamily.medium }}
          numberOfLines={1}
        >
          {attachment.name}
        </Text>
        <View style={styles.fileMetaRow}>
          {isUploading && attachment.progress !== undefined ? (
            <>
              <Text variant="micro" color={colors.primary}>
                {Math.round(attachment.progress * 100)}% yükleniyor
              </Text>
              {/* Progress bar */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: colors.primary, width: `${(attachment.progress * 100)}%` as any },
                  ]}
                />
              </View>
            </>
          ) : isError ? (
            <Text variant="micro" color={palette.error}>
              {attachment.error ?? 'Yükleme başarısız'}
            </Text>
          ) : (
            <Text variant="micro" color={colors.textSecondary}>
              {isPDF ? 'PDF' : 'Dosya'}{attachment.size ? ` · ${formatBytes(attachment.size)}` : ''}
            </Text>
          )}
        </View>
      </View>

      {isInput && onRemove && (
        <TouchableOpacity onPress={onRemove} style={styles.fileRemoveBtn}>
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </MotiView>
  );
};

const styles = StyleSheet.create({
  // Image styles
  imageWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  inputImageWrap: {
    width: 80,
    height: 80,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
  },
  inputImage: {
    width: 80,
    height: 80,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
  },

  // File styles
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[2],
    gap: spacing[2],
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 3,
  },
  fileMetaRow: {
    gap: 4,
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 3,
    borderRadius: 2,
  },
  fileRemoveBtn: {
    padding: spacing[1],
  },
});
