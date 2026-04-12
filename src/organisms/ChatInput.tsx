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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { useHaptics } from '@/hooks/useHaptics';
import { BlurView } from 'expo-blur';
import { THYIcon } from '@/atoms/thy-icon';
import { AI_MODELS, AIModelId } from '@/constants/models';
import { Attachment } from '@/types/chat.types';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';
import { palette } from '@/constants/colors';
import { scale as scaleSize } from '@/lib/responsive';
import { Text } from '@/atoms/Text';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINE_HEIGHT = 22;
const MAX_LINES = 4;
const MAX_INPUT_HEIGHT = LINE_HEIGHT * MAX_LINES;
const MAX_CHARS = 600;
const CHAR_WARN_THRESHOLD = 100; // bu kadar kala counter görünür
const SIZE = scaleSize(42);
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

// ---------------------------------------------------------------------------
// ModelChip — liquid glass chip, model adını gösterir
// ---------------------------------------------------------------------------

interface ModelChipProps {
  modelName: string;
  modelColor: string;
  onPress: () => void;
  isDark: boolean;
}

const ModelChip = memo<ModelChipProps>(({ modelName, modelColor, onPress, isDark }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}
    style={chipStyles.wrap}
  >
    {Platform.OS === 'ios' ? (
      <BlurView
        intensity={isDark ? 28 : 18}
        tint={isDark ? 'dark' : 'light'}
        style={chipStyles.chip}
      >
        <View style={[chipStyles.colorDot, { backgroundColor: modelColor }]} />
        <Animated.Text numberOfLines={1} style={[chipStyles.label, { color: isDark ? '#fff' : '#111' }]}>
          {modelName}
        </Animated.Text>
        <Ionicons name="chevron-down" size={cs(11)} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.3)'} />
      </BlurView>
    ) : (
      <View style={[chipStyles.chip, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' }]}>
        <View style={[chipStyles.colorDot, { backgroundColor: modelColor }]} />
        <Animated.Text numberOfLines={1} style={[chipStyles.label, { color: isDark ? '#fff' : '#111' }]}>
          {modelName}
        </Animated.Text>
        <Ionicons name="chevron-down" size={cs(11)} color={isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.3)'} />
      </View>
    )}
  </TouchableOpacity>
));

const cs = scaleSize;

const chipStyles = StyleSheet.create({
  wrap: {
    borderRadius: cs(20),
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.25)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: cs(5),
    paddingHorizontal: cs(10),
    paddingVertical: cs(5),
    maxWidth: cs(130),
  },
  colorDot: {
    width: cs(7),
    height: cs(7),
    borderRadius: cs(4),
    flexShrink: 0,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: cs(11),
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});


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
  defaultValue: string;
  onChangeText: (t: string) => void;
  onClose: () => void;
  onSend: () => void;
  canSend: boolean;
  isStreaming: boolean;
  onStop: () => void;
  placeholder: string;
}

const ExpandedInputModal = memo<ExpandedInputModalProps>(({
  visible, defaultValue, onChangeText, onClose, onSend, canSend, isStreaming, onStop, placeholder,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [charCount, setCharCount] = useState(defaultValue.length);

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
      backgroundColor: colors.background,
      paddingTop: insets.top + spacing[2],
      paddingBottom: insets.bottom + spacing[3],
    },
  ]), [colors.background, insets.top, insets.bottom]);

  const inputStyle = useMemo(() => ([
    styles.expandedInput,
    { color: colors.text, fontFamily: fontFamily.regular, fontSize: fontSize.base },
  ]), [colors.text]);

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={sheetStyle}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.expandedHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.expandedHeaderRight}>
            <Animated.Text style={[
              growingStyles.counter,
              {
                color: charCount >= MAX_CHARS - 50
                  ? '#e53e3e'
                  : charCount >= MAX_CHARS - 100
                  ? '#dd6b20'
                  : colors.textSecondary + '99',
              },
            ]}>
              {charCount}/{MAX_CHARS}
            </Animated.Text>
            <SendButton
              canSend={canSend}
              isStreaming={isStreaming}
              onSend={handleSendAndClose}
              onStop={onStop}
            />
          </View>
        </View>

        <TextInput
          ref={inputRef}
          style={inputStyle}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          defaultValue={defaultValue}
          maxLength={MAX_CHARS}
          onChangeText={(t) => {
            setCharCount(t.length);
            onChangeText(t);
          }}
          autoCorrect={false}
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// GrowingTextInput — kendi value/height state'ini yönetir, parent'ı re-render etmez
// ---------------------------------------------------------------------------

interface GrowingTextInputHandle {
  getText: () => string;
  clear: () => void;
  focus: () => void;
  syncValue: (v: string) => void;
}

interface GrowingTextInputProps {
  placeholder: string;
  placeholderTextColor: string;
  editable: boolean;
  color: string;
  counterColor: string;
  onHasTextChange: (hasText: boolean) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const GrowingTextInput = React.memo(React.forwardRef<GrowingTextInputHandle, GrowingTextInputProps>(
  ({ placeholder, placeholderTextColor, editable, color, counterColor, onHasTextChange, onFocus, onBlur }, ref) => {
    const inputRef = useRef<TextInput>(null);
    const prevHasText = useRef(false);
    const prevShowCounter = useRef(false);
    const [value, setValue] = useState('');
    const [counterState, setCounterState] = useState<number | null>(null);

    const onHasTextChangeRef = useRef(onHasTextChange);
    useEffect(() => { onHasTextChangeRef.current = onHasTextChange; }, [onHasTextChange]);

    const valueRef = useRef('');

    React.useImperativeHandle(ref, () => ({
      getText: () => valueRef.current,
      clear: () => {
        valueRef.current = '';
        setValue('');
        if (prevShowCounter.current) {
          prevShowCounter.current = false;
          setCounterState(null);
        }
        if (prevHasText.current) {
          prevHasText.current = false;
          onHasTextChangeRef.current(false);
        }
      },
      focus: () => inputRef.current?.focus(),
      syncValue: (v: string) => {
        valueRef.current = v;
        setValue(v);
      },
    }), []);

    const handleChangeText = useCallback((t: string) => {
      valueRef.current = t;
      setValue(t);
      const nowShow = t.length >= MAX_CHARS - CHAR_WARN_THRESHOLD;
      if (nowShow !== prevShowCounter.current) {
        prevShowCounter.current = nowShow;
        setCounterState(nowShow ? t.length : null);
      } else if (nowShow) {
        setCounterState(t.length);
      }
      const nowHas = t.trim().length > 0;
      if (nowHas !== prevHasText.current) {
        prevHasText.current = nowHas;
        onHasTextChangeRef.current(nowHas);
      }
    }, []);

    const counterTextColor = counterState !== null
      ? counterState >= MAX_CHARS - 50
        ? '#e53e3e'
        : counterState >= MAX_CHARS - 100
        ? '#dd6b20'
        : counterColor
      : counterColor;

    return (
      <View>
        <TextInput
          ref={inputRef}
          style={[growingStyles.input, { color }]}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          multiline
          value={value}
          maxLength={MAX_CHARS}
          onChangeText={handleChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="default"
          editable={editable}
          textAlignVertical="top"
          scrollEnabled
          autoCorrect={false}
          spellCheck={false}
        />
        {counterState !== null && (
          <Animated.Text style={[growingStyles.counter, { color: counterTextColor, alignSelf: 'flex-end' }]}>
            {counterState}/{MAX_CHARS}
          </Animated.Text>
        )}
      </View>
    );
  },
));

const growingStyles = StyleSheet.create({
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: spacing[2],
    minHeight: LINE_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  counter: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
});

// ---------------------------------------------------------------------------
// ChatInput — main component
// ---------------------------------------------------------------------------

type Props = {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop?: () => void;
  onModelSelectorPress: () => void;
  selectedModel?: AIModelId;
  selectedAIModelName?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
};

const ChatInputInner: React.FC<Props> = ({
  onSend,
  onStop,
  onModelSelectorPress,
  selectedModel,
  selectedAIModelName,
  disabled = false,
  isStreaming = false,
  placeholder = 'Mesajınızı yazın...',
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  // insets.bottom keyboard açılınca değişmez — bir kez ref'e al, style recompute tetiklemesin
  const bottomInsetRef = useRef(insets.bottom);
  if (insets.bottom > 0) bottomInsetRef.current = insets.bottom;

  const growingInputRef = useRef<GrowingTextInputHandle>(null);
  const [hasText, setHasText] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const focusProgress = useSharedValue(0);

  // String concat worklet içinde değil, colors değişince bir kez hesapla
  const primaryBorder = useMemo(() => colors.primary + '55', [colors.primary]);
  const containerBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(0,0,0,0.06)', primaryBorder],
    ),
  }));

  // --- Send / Stop ---

  const handleSend = useCallback(() => {
    const trimmed = (growingInputRef.current?.getText() ?? '').trim();
    if (!trimmed || disabled) return;
    haptics.medium();
    onSend(trimmed, []);
    growingInputRef.current?.clear();
  }, [disabled, onSend, haptics]);

  const handleStop = useCallback(() => {
    haptics.medium();
    onStop?.();
  }, [onStop, haptics]);

  // --- Derived state (memoized) ---

  const canSend = useMemo(() => !disabled && hasText, [disabled, hasText]);

  const model = useMemo(() =>
    AI_MODELS.find((m) => m.id === selectedModel),
  [selectedModel]);

  // --- Stable callbacks for toolbar buttons ---

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, { duration: 200 });
  }, []);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, { duration: 200 });
  }, []);

  const handleExpandPress = useCallback(() => {
    haptics.light();
    setExpanded(true);
  }, [haptics]);

  const handleExpandClose = useCallback(() => setExpanded(false), []);

  // --- Memoized styles ---

  const wrapperStyle = useMemo(() => ([
    styles.wrapper, { backgroundColor: colors.background },
  ]), [colors.background]);

  const cardStyle = useMemo(() => ([
    styles.card,
    { backgroundColor: colors.inputBg, paddingBottom: bottomInsetRef.current },
    cardShadow,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [colors.inputBg]);

  return (
    <View style={wrapperStyle}>
      {/* Main input card */}
      <Animated.View style={[cardStyle, containerBorderStyle]}>
        {/* Input row: text büyür, expand ikonu sağda sabit */}
        <View style={styles.inputRow}>
          <View style={styles.inputWrap}>
            <GrowingTextInput
              ref={growingInputRef}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              editable={!disabled && !isStreaming}
              color={colors.text}
              counterColor={colors.textSecondary + '99'}
              onHasTextChange={setHasText}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </View>

          {/* Expand — her zaman görünür, onContentSizeChange yükü kalktı */}
          <View style={styles.expandSide}>
            <TouchableOpacity
              onPress={handleExpandPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="expand-outline" size={cs(18)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <Text variant="caption" color={colors.textSecondary} style={styles.modelLabel}>
              {t('assistant.modelPreference')}:
            </Text>
            <ModelChip
              modelName={selectedAIModelName ?? model?.description ?? 'Model'}
              modelColor={model?.color ?? colors.primary}
              onPress={onModelSelectorPress}
              isDark={isDark}
            />
          </View>

          <View style={styles.toolbarRight}>
            <SendButton
              canSend={canSend}
              isStreaming={isStreaming}
              onSend={handleSend}
              onStop={handleStop}
            />
          </View>
        </View>
      </Animated.View>

      <ExpandedInputModal
        visible={expanded}
        defaultValue={growingInputRef.current?.getText() ?? ''}
        onChangeText={(t) => {
          // Modal'daki text değişince ref'i senkronize et
          growingInputRef.current?.syncValue(t);
          const nowHas = t.trim().length > 0;
          setHasText((prev) => prev === nowHas ? prev : nowHas);
        }}
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

export const ChatInput = memo(ChatInputInner);

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
  input: {
    paddingTop: 0,
    paddingBottom: spacing[2],
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
  modelLabel: {
    fontFamily: fontFamily.medium,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginRight: spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWrap: {
    flex: 1,
    marginRight: spacing[2],
  },
  expandSide: {
    paddingBottom: spacing[2],
  },
  // Expanded modal
  expandedSheet: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
  },
  expandedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  expandedInput: {
    flex: 1,
    lineHeight: LINE_HEIGHT,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
});
