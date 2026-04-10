/**
 * ChatInput — Gemini-style expandable chat input
 *
 * - Input auto-grows with text (no fixed height prop → no bounce loop)
 * - MAX_LINES cap via maxHeight on container
 * - ↗ expand → full-height modal overlay
 * - send: THYIcon brand mark; isStreaming: red gradient + stop icon
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
const MIN_INPUT_HEIGHT = 22; // single line
const MAX_LINES = 3;
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_LINES;

// ---------------------------------------------------------------------------
// SendButton
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
  const pressScale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const SIZE = scaleSize(36);

  return (
    <AnimatedTouchable
      onPress={() => {
        haptics.medium();
        if (isStreaming) onStop();
        else if (canSend) onSend();
      }}
      onPressIn={() => { pressScale.value = withSpring(0.85, { damping: 12, stiffness: 200 }); }}
      onPressOut={() => { pressScale.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
      disabled={!isStreaming && !canSend}
      activeOpacity={1}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' }, animStyle]}
    >
      {isStreaming ? (
        <LinearGradient
          colors={[palette.primaryLight, palette.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, centerStyle]}
        >
          <Ionicons name="stop" size={scaleSize(15)} color={palette.white} />
        </LinearGradient>
      ) : (
        <View
          style={[
            centerStyle,
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
            width={SIZE - scaleSize(10)}
            height={SIZE - scaleSize(10)}
            fill={palette.white}
            fillSecondary={canSend ? palette.primary : palette.gray200}
          />
        </View>
      )}
    </AnimatedTouchable>
  );
};

const centerStyle = { alignItems: 'center' as const, justifyContent: 'center' as const };

// Gemini-style soft shadow — no harsh border, depth comes from shadow
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.08,
  shadowRadius: 20,
  elevation: 12,
};

// ---------------------------------------------------------------------------
// ExpandedInputModal
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
  visible, value, onChange, onClose, onSend, canSend, isStreaming, onStop, placeholder,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

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
          <View style={[styles.grabBar, { backgroundColor: colors.border }]} />
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
          <View style={styles.expandedRow}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <SendButton
              canSend={canSend}
              isStreaming={isStreaming}
              onSend={() => { onSend(); onClose(); }}
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
  const [lineCount, setLineCount] = useState(1);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const focusProgress = useSharedValue(0);
  const expandOpacity = useSharedValue(0);
  const expandVisible = lineCount > 2;

  // expand icon sadece 2 satırı geçince görünür
  React.useEffect(() => {
    expandOpacity.value = withTiming(expandVisible ? 1 : 0, { duration: 180 });
  }, [expandVisible, expandOpacity]);

  const expandAnimStyle = useAnimatedStyle(() => ({
    opacity: expandOpacity.value,
    pointerEvents: expandOpacity.value > 0.5 ? 'auto' : 'none',
  }));

  const containerBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(0,0,0,0.06)', colors.primary + '55'],
    ),
  }));

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
      uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize, width: asset.width, height: asset.height,
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
        uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize, width: asset.width, height: asset.height,
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
      uri: asset.uri, mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size, status: 'uploading', progress: 0,
    });
    simulateUpload(id);
  }, []);

  // --- Send / Stop ---

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    if (attachments.some((a) => a.status === 'uploading')) return;
    haptics.medium();
    onSend(trimmed, attachments);
    setText('');
    setAttachments([]);
    setLineCount(1);
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

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
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
                <AttachmentPreview key={att.id} attachment={att} isInput onRemove={() => removeAttachment(att.id)} />
              ))}
            </ScrollView>
          )}
          {fileAttachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} isInput onRemove={() => removeAttachment(att.id)} />
          ))}
        </MotiView>
      )}

      {/* Main input card */}
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.inputBg, paddingBottom: insets.bottom },
          cardShadow,
          containerBorderStyle,
        ]}
      >
        {/* Expand — top right, animates in after 2 lines */}
        <Animated.View style={[styles.expandBtn, expandAnimStyle]} pointerEvents={expandVisible ? 'auto' : 'none'}>
          <TouchableOpacity
            onPress={() => { haptics.light(); setExpanded(true); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="expand-outline" size={scaleSize(16)} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Text input — minHeight/maxHeight drives growth, no explicit height prop */}
        <TextInput
          style={[
            styles.input,
            { color: colors.text, fontFamily: fontFamily.regular, fontSize: fontSize.base },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          value={text}
          onChangeText={setText}
          onFocus={() => (focusProgress.value = withTiming(1, { duration: 200 }))}
          onBlur={() => (focusProgress.value = withTiming(0, { duration: 200 }))}
          onContentSizeChange={(e) => {
            const lines = Math.round(e.nativeEvent.contentSize.height / LINE_HEIGHT);
            setLineCount(Math.max(1, lines));
          }}
          returnKeyType="default"
          editable={!disabled && !isStreaming}
          textAlignVertical="top"
          scrollEnabled
        />

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            {/* Attach */}
            <TouchableOpacity
              style={styles.iconBtn}
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

            {/* Model */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onModelSelectorPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={(model?.icon as any) ?? 'flash-outline'}
                size={scaleSize(17)}
                color={model?.color ?? colors.primary}
              />
            </TouchableOpacity>
          </View>

          <SendButton
            canSend={canSend}
            isStreaming={isStreaming}
            onSend={handleSend}
            onStop={handleStop}
          />
        </View>
      </Animated.View>

      <AttachmentPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onDocument={handleDocument}
      />

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
    paddingHorizontal: 0,
    paddingTop: spacing[2],
    paddingBottom: 0,
    gap: spacing[2],
  },
  previewArea: { gap: spacing[2] },
  imagePreviewRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  card: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    // paddingBottom is set dynamically with insets.bottom
    position: 'relative',
  },
  expandBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 1,
  },
  input: {
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    paddingTop: 0,
    paddingBottom: spacing[2],
    paddingRight: spacing[3] + scaleSize(16) + spacing[2],
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  iconBtn: {
    width: scaleSize(34),
    height: scaleSize(34),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
});
