/**
 * ChatInput — Gemini-style expandable chat input
 *
 * - Input auto-grows with text (no fixed height prop → no bounce loop)
 * - MAX_LINES cap via maxHeight on container
 * - ↗ expand → full-height modal overlay
 * - send: THYIcon brand mark; isStreaming: red gradient + stop icon
 */

import React, { useState, useCallback, useRef, useMemo, useEffect, memo } from 'react';
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
  interpolate,
  Extrapolation,
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
import { radius, spacing } from '@/constants/spacing';
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
const SIZE = scaleSize(36);
const ICON_SIZE = SIZE - scaleSize(10);

// ---------------------------------------------------------------------------
// SendButton — memo ile izole edildi; kendi shared value'ları var,
// parent render'ında gereksiz yeniden mount olmaz.
// ---------------------------------------------------------------------------

interface SendButtonProps {
  canSend: boolean;
  isStreaming: boolean;
  onSend: () => void;
  onStop: () => void;
}

const SendButton = memo<SendButtonProps>(({ canSend, isStreaming, onSend, onStop }) => {
  const haptics = useHaptics();

  // 0 = send görünür, 1 = stop görünür.
  // Her iki layer her zaman mount — sadece opacity/transform animate edilir.
  // withSpring başladıktan sonra tamamen UI thread'de çalışır, JS'ye dönmez.
  const streamProgress = useSharedValue(isStreaming ? 1 : 0);

  useEffect(() => {
    streamProgress.value = withSpring(isStreaming ? 1 : 0, {
      damping: 18,
      stiffness: 120,
      mass: 0.6,
    });
  }, [isStreaming, streamProgress]);

  // streaming'de sıfıra iner, send modunda tam opak — canSend'e göre opacity yok
  const sendLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - streamProgress.value,
  }));

  const stopLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(streamProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const stopIconSlideStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(streamProgress.value, [0, 1], [SIZE * 0.8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  const handlePress = useCallback(() => {
    haptics.medium();
    if (isStreaming) onStop();
    else if (canSend) onSend();
  }, [haptics, isStreaming, canSend, onSend, onStop]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!isStreaming && !canSend}
      activeOpacity={0.85}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        overflow: 'hidden',
        opacity: (!isStreaming && !canSend) ? 0.75 : 1,
      }}
    >
      {/* Sabit primary arka plan — geçiş sırasında parlama olmasın */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.primary, borderRadius: SIZE / 2 },
        ]}
        pointerEvents="none"
      />

      {/* Stop layer — gradient + stop icon, send'in altında */}
      <Animated.View
        style={[StyleSheet.absoluteFill, stopLayerStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[palette.primaryLight, palette.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, centerStyle]}
        >
          <Animated.View style={stopIconSlideStyle}>
            <Ionicons name="stop" size={scaleSize(20)} color={palette.white} />
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Send layer — THY icon, üstte */}
      <Animated.View
        style={[StyleSheet.absoluteFill, centerStyle, sendLayerStyle]}
        pointerEvents="none"
      >
        <THYIcon
          name="thy-loading"
          width={ICON_SIZE}
          height={ICON_SIZE}
          fill={palette.white}
          fillSecondary={palette.primary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
});

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
// ExpandedInputModal — memo ile izole edildi
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

const ExpandedInputModal = memo<ExpandedInputModalProps>(({
  visible, value, onChange, onClose, onSend, canSend, isStreaming, onStop, placeholder,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const handleShow = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSendAndClose = useCallback(() => {
    onSend();
    onClose();
  }, [onSend, onClose]);

  const sheetStyle = useMemo(() => ([
    styles.expandedSheet,
    {
      backgroundColor: colors.surface,
      paddingBottom: insets.bottom + spacing[3],
      borderTopColor: colors.border,
    },
  ]), [colors.surface, colors.border, insets.bottom]);

  const inputStyle = useMemo(() => ([
    styles.expandedInput,
    { color: colors.text, fontFamily: fontFamily.regular, fontSize: fontSize.base },
  ]), [colors.text]);

  const grabBarStyle = useMemo(() => ([
    styles.grabBar, { backgroundColor: colors.border },
  ]), [colors.border]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.expandedBg}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={sheetStyle}>
          <View style={grabBarStyle} />
          <TextInput
            ref={inputRef}
            style={inputStyle}
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
              onSend={handleSendAndClose}
              onStop={onStop}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

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

  useEffect(() => {
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
  // useCallback ile stable referans — simulateUpload'a stale closure geçmemek için
  // updateAttachment'ı fonksiyonel updater (prev =>) olarak kullanıyoruz.

  const addAttachment = useCallback((a: Attachment) => {
    setAttachments((prev) => [...prev, a]);
  }, []);

  const updateAttachment = useCallback((id: string, updates: Partial<Attachment>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // updateAttachment ref'i — interval callback'i her zaman güncel fonksiyonu çağırır
  const updateAttachmentRef = useRef(updateAttachment);
  useEffect(() => {
    updateAttachmentRef.current = updateAttachment;
  }, [updateAttachment]);

  const simulateUpload = useCallback((id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.15 + Math.random() * 0.1;
      if (progress >= 1) {
        clearInterval(interval);
        updateAttachmentRef.current(id, { status: 'done', progress: 1, remoteUrl: 'https://placeholder.url' });
      } else {
        updateAttachmentRef.current(id, { status: 'uploading', progress });
      }
    }, 250);
  }, []);

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
  }, [addAttachment, simulateUpload]);

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
  }, [addAttachment, simulateUpload]);

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
  }, [addAttachment, simulateUpload]);

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

  // --- Derived state (memoized) ---

  const canSend = useMemo(() =>
    !disabled &&
    (text.trim().length > 0 || attachments.length > 0) &&
    !attachments.some((a) => a.status === 'uploading'),
  [disabled, text, attachments]);

  const model = useMemo(() =>
    AI_MODELS.find((m) => m.id === selectedModel),
  [selectedModel]);

  const hasAttachments = attachments.length > 0;

  const imageAttachments = useMemo(() =>
    attachments.filter((a) => a.type === 'image'),
  [attachments]);

  const fileAttachments = useMemo(() =>
    attachments.filter((a) => a.type !== 'image'),
  [attachments]);

  // --- Stable callbacks for toolbar buttons ---

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, { duration: 200 });
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, { duration: 200 });
  }, [focusProgress]);

  const handleContentSizeChange = useCallback((e: any) => {
    const lines = Math.round(e.nativeEvent.contentSize.height / LINE_HEIGHT);
    setLineCount(Math.max(1, lines));
  }, []);

  const handleExpandPress = useCallback(() => {
    haptics.light();
    setExpanded(true);
  }, [haptics]);

  const handleExpandClose = useCallback(() => setExpanded(false), []);

  const handlePickerClose = useCallback(() => setPickerVisible(false), []);

  const handleAttachPress = useCallback(() => {
    haptics.light();
    setPickerVisible(true);
  }, [haptics]);

  // --- Memoized styles ---

  const wrapperStyle = useMemo(() => ([
    styles.wrapper, { backgroundColor: colors.background },
  ]), [colors.background]);

  const cardStyle = useMemo(() => ([
    styles.card,
    { backgroundColor: colors.inputBg, paddingBottom: insets.bottom },
    cardShadow,
  ]), [colors.inputBg, insets.bottom]);

  const inputStyle = useMemo(() => ([
    styles.input,
    { color: colors.text, fontFamily: fontFamily.regular, fontSize: fontSize.base },
  ]), [colors.text]);

  return (
    <View style={wrapperStyle}>
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
      <Animated.View style={[cardStyle, containerBorderStyle]}>
        {/* Expand — top right, animates in after 2 lines */}
        <Animated.View style={[styles.expandBtn, expandAnimStyle]} pointerEvents={expandVisible ? 'auto' : 'none'}>
          <TouchableOpacity
            onPress={handleExpandPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="expand-outline" size={scaleSize(16)} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Text input */}
        <TextInput
          style={inputStyle}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          value={text}
          onChangeText={setText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onContentSizeChange={handleContentSizeChange}
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
              onPress={handleAttachPress}
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
                name={(model?.icon ?? 'flash-outline') as any}
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
        onClose={handlePickerClose}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onDocument={handleDocument}
      />

      <ExpandedInputModal
        visible={expanded}
        value={text}
        onChange={setText}
        onClose={handleExpandClose}
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
