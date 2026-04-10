/**
 * ChatInput — Gemini-style expandable chat input
 *
 * Layout:
 *   ┌──────────────────────────────────────────┐
 *   │  placeholder text            [↗ expand]  │  ← collapsed / single line
 *   ├──────────────────────────────────────────┤
 *   │  [+]  [model]   input text...   [send/stop]│ ← toolbar row
 *   └──────────────────────────────────────────┘
 *
 * - Input auto-grows up to MAX_LINES, then scrolls
 * - ↗ button → expand to full-height modal overlay
 * - send button: THYIcon (thy-loading used as brand mark) → red gradient + stop on isStreaming
 * - isStreaming prop: parent passes true while AI is responding
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from '@/lib/motiView';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useHaptics } from '@/hooks/useHaptics';
import { THYIcon } from '@/atoms/thy-icon';
import { AI_MODELS, AIModelId } from '@/constants/models';
import { Attachment } from '@/types/chat.types';
import { AttachmentPreview } from '@/molecules/AttachmentPreview';
import { AttachmentPickerSheet } from '@/molecules/AttachmentPickerSheet';
import { radius, spacing, shadow } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { palette } from '@/constants/colors';
import { scale as scaleSize } from '@/lib/responsive';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINE_HEIGHT = 22;
const MIN_HEIGHT = 48;
const MAX_LINES = 5;
const MAX_HEIGHT = LINE_HEIGHT * MAX_LINES + 24; // ~134px

// ---------------------------------------------------------------------------
// SendButton — THYIcon or red-gradient stop
// ---------------------------------------------------------------------------

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface SendButtonProps {
  canSend: boolean;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
}

const SendButton: React.FC<SendButtonProps> = ({ canSend, isStreaming, onSend, onStop }) => {
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 12, stiffness: 200 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };
  const handlePress = () => {
    haptics.medium();
    if (isStreaming) onStop();
    else if (canSend) onSend();
  };

  const SIZE = scaleSize(36);

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isStreaming && !canSend}
      activeOpacity={1}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' }, animStyle]}
    >
      {isStreaming ? (
        // Red gradient circle with white stop square
        <LinearGradient
          colors={[palette.primaryLight, palette.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.sendCenter]}
        >
          <Ionicons name="stop" size={scaleSize(16)} color={palette.white} />
        </LinearGradient>
      ) : (
        // THY icon send — opacity fades when disabled
        <View
          style={[
            styles.sendCenter,
            {
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              backgroundColor: canSend ? palette.primary : palette.gray200,
            },
          ]}
        >
          <THYIcon
            name="thy-loading"
            width={SIZE - scaleSize(8)}
            height={SIZE - scaleSize(8)}
            fill={palette.white}
            fillSecondary={canSend ? palette.primary : palette.gray200}
          />
        </View>
      )}
    </AnimatedTouchable>
  );
};

// ---------------------------------------------------------------------------
// ExpandedInputModal — full-height compose overlay
// ---------------------------------------------------------------------------

interface ExpandedInputModalProps {
  visible: boolean;
  value: string;
  onChange: (t: string) => void;
  onClose: () => void;
  onSend: () => void;
  canSend: boolean;
  isStreaming: boolean;
  onStop: () => void;
  placeholder: string;
}

const ExpandedInputModal: React.FC<ExpandedInputModalProps> = ({
  visible,
  value,
  onChange,
  onClose,
  onSend,
  canSend,
  isStreaming,
  onStop,
  placeholder,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const handleSendAndClose = () => {
    onSend();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={() => setTimeout(() => inputRef.current?.focus(), 100)}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.expandedBg}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.expandedSheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + spacing[3],
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Grab bar */}
          <View style={[styles.grabBar, { backgroundColor: colors.border }]} />

          {/* Text area */}
          <TextInput
            ref={inputRef}
            style={[
              styles.expandedInput,
              { color: colors.text, fontFamily: fontFamily.regular, fontSize: fontSize.base },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            value={value}
            onChangeText={onChange}
            autoCorrect={false}
            textAlignVertical="top"
          />

          {/* Bottom row */}
          <View style={styles.expandedRow}>
            <TouchableOpacity onPress={onClose} style={styles.expandedClose}>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <SendButton
              canSend={canSend}
              isStreaming={isStreaming}
              onSend={handleSendAndClose}
              onStop={onStop}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// ChatInput — main component
// ---------------------------------------------------------------------------

type Props = {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  onModelSelectorPress: () => void;
  selectedModel: AIModelId;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
};

export const ChatInput: React.FC<Props> = ({
  onSend,
  onStop,
  onModelSelectorPress,
  selectedModel,
  disabled = false,
  isStreaming = false,
  placeholder = 'Mesajınızı yazın...',
}) => {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();

  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const focusProgress = useSharedValue(0);

  const containerBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, colors.primary + '88'],
    ),
  }));

  const handleFocus = () => (focusProgress.value = withTiming(1, { duration: 200 }));
  const handleBlur = () => (focusProgress.value = withTiming(0, { duration: 200 }));

  // --- Attachment helpers ---

  const addAttachment = (a: Attachment) => setAttachments((prev) => [...prev, a]);

  const updateAttachment = (id: string, updates: Partial<Attachment>) =>
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.15 + Math.random() * 0.1;
      if (progress >= 1) {
        clearInterval(interval);
        updateAttachment(id, { status: 'done', progress: 1, remoteUrl: 'https://placeholder.url' });
      } else {
        updateAttachment(id, { status: 'uploading', progress });
      }
    }, 250);
  };

  // --- Pickers ---

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const id = `att_${Date.now()}`;
    addAttachment({
      id, type: 'image',
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize,
      width: asset.width, height: asset.height,
      status: 'uploading', progress: 0,
    });
    simulateUpload(id);
  }, []);

  const handleGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85, selectionLimit: 5,
    });
    if (result.canceled || !result.assets?.length) return;
    result.assets.forEach((asset) => {
      const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      addAttachment({
        id, type: 'image',
        name: asset.fileName ?? `image_${Date.now()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
        width: asset.width, height: asset.height,
        status: 'uploading', progress: 0,
      });
      simulateUpload(id);
    });
  }, []);

  const handleDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', '*/*'], multiple: false, copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const id = `att_${Date.now()}`;
    const isPDF = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');
    addAttachment({
      id, type: isPDF ? 'pdf' : 'file',
      name: asset.name ?? `file_${Date.now()}`,
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size,
      status: 'uploading', progress: 0,
    });
    simulateUpload(id);
  }, []);

  // --- Send / Stop ---

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    const hasContent = trimmed.length > 0 || attachments.length > 0;
    if (!hasContent || disabled) return;
    if (attachments.some((a) => a.status === 'uploading')) return;
    haptics.medium();
    onSend(trimmed, attachments);
    setText('');
    setAttachments([]);
    setInputHeight(MIN_HEIGHT);
  }, [text, attachments, disabled, onSend, haptics]);

  const handleStop = useCallback(() => {
    haptics.medium();
    onStop?.();
  }, [onStop, haptics]);

  const canSend =
    !disabled &&
    (text.trim().length > 0 || attachments.length > 0) &&
    !attachments.some((a) => a.status === 'uploading');

  const model = AI_MODELS.find((m) => m.id === selectedModel);
  const hasAttachments = attachments.length > 0;
  const imageAttachments = attachments.filter((a) => a.type === 'image');
  const fileAttachments = attachments.filter((a) => a.type !== 'image');
  const clampedHeight = Math.max(MIN_HEIGHT, Math.min(inputHeight, MAX_HEIGHT));

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.background,
          paddingBottom: Math.max(insets.bottom, spacing[3]),
        },
      ]}
    >
      {/* Attachment previews */}
      {hasAttachments && (
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.previewArea}
        >
          {imageAttachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagePreviewRow}
            >
              {imageAttachments.map((att) => (
                <AttachmentPreview
                  key={att.id}
                  attachment={att}
                  isInput
                  onRemove={() => removeAttachment(att.id)}
                />
              ))}
            </ScrollView>
          )}
          {fileAttachments.map((att) => (
            <AttachmentPreview
              key={att.id}
              attachment={att}
              isInput
              onRemove={() => removeAttachment(att.id)}
            />
          ))}
        </MotiView>
      )}

      {/* Main input card */}
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
          shadow.sm,
          containerBorderStyle,
        ]}
      >
        {/* Expand button — top right corner */}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => { haptics.light(); setExpanded(true); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="expand-outline" size={scaleSize(16)} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Text area */}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.base,
              height: clampedHeight,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          value={text}
          onChangeText={setText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onContentSizeChange={(e) =>
            setInputHeight(e.nativeEvent.contentSize.height + 16)
          }
          returnKeyType="default"
          editable={!disabled && !isStreaming}
          textAlignVertical="top"
          scrollEnabled={inputHeight > MAX_HEIGHT}
        />

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          {/* Left: + attach + model */}
          <View style={styles.toolbarLeft}>
            <TouchableOpacity
              style={styles.toolbarBtn}
              onPress={() => { haptics.light(); setPickerVisible(true); }}
              disabled={disabled}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="add"
                size={scaleSize(22)}
                color={hasAttachments ? colors.primary : colors.textSecondary}
              />
              {hasAttachments && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Animated.Text style={styles.badgeText}>{attachments.length}</Animated.Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modelBtn}
              onPress={onModelSelectorPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={(model?.icon as any) ?? 'flash-outline'}
                size={scaleSize(16)}
                color={model?.color ?? colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Right: send / stop */}
          <SendButton
            canSend={canSend}
            isStreaming={isStreaming}
            onSend={handleSend}
            onStop={handleStop}
          />
        </View>
      </Animated.View>

      {/* Picker sheet */}
      <AttachmentPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onDocument={handleDocument}
      />

      {/* Expanded compose modal */}
      <ExpandedInputModal
        visible={expanded}
        value={text}
        onChange={setText}
        onClose={() => setExpanded(false)}
        onSend={handleSend}
        canSend={canSend}
        isStreaming={isStreaming}
        onStop={handleStop}
        placeholder={placeholder}
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    gap: spacing[2],
  },
  previewArea: {
    gap: spacing[2],
  },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  // Main card
  card: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[1],
    position: 'relative',
  },
  expandBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 1,
  },
  input: {
    paddingTop: 0,
    paddingBottom: spacing[1],
    paddingRight: scaleSize(24), // space for expand icon
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[1],
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  toolbarBtn: {
    width: scaleSize(36),
    height: scaleSize(36),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  modelBtn: {
    width: scaleSize(32),
    height: scaleSize(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: palette.white,
    fontSize: 9,
    fontFamily: fontFamily.bold,
  },
  sendCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Expanded modal
  expandedBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  expandedSheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderTopWidth: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    minHeight: 260,
    maxHeight: '75%',
  },
  grabBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  expandedInput: {
    flex: 1,
    minHeight: 160,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
  },
  expandedClose: {
    width: scaleSize(36),
    height: scaleSize(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
