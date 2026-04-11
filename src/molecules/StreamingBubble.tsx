import React from 'react';
import { TextInput, View, StyleSheet, TouchableOpacity } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/atoms/Text';
import { useI18n } from '@/hooks/useI18n';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { radius, spacing } from '@/constants/spacing';
import { fontFamily, fontSize } from '@/constants/typography';

// Modül seviyesinde bir kez oluştur — her render'da yeniden yaratılmaz
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

// AI tail — MessageBubble ile aynı
const AiTail = ({ color, borderColor }: { color: string; borderColor: string }) => (
  <Svg width={10} height={20} style={{ marginRight: -1 }}>
    <Path d="M10 0 L10 20 L0 20 Q8 18 10 0 Z" fill={borderColor} />
    <Path d="M10 0 L10 20 L1 20 Q8 17 10 0 Z" fill={color} />
  </Svg>
);

type Props = {
  pendingSV: SharedValue<string>;
  isStreamingDoneSV: SharedValue<boolean>;
  streamResetCountSV: SharedValue<number>;
  onComplete: (finalText: string) => void;
};

const StreamingBubbleInner: React.FC<Props> = ({ pendingSV, isStreamingDoneSV, streamResetCountSV, onComplete }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const completedSV = useSharedValue(false);
  const lastResetCountSV = useSharedValue(0);

  // pendingSV JS side'da throttle edilmiş metin — direkt UI thread'e aktar
  const animatedProps = useAnimatedProps(() => ({
    text: pendingSV.value,
    defaultValue: '',
  }));

  // loading: metin boşken göster
  const loadingStyle = useAnimatedStyle(() => ({
    display: pendingSV.value.length === 0 ? 'flex' : 'none',
  }));
  const textStyle = useAnimatedStyle(() => ({
    display: pendingSV.value.length > 0 ? 'flex' : 'none',
  }));

  useFrameCallback(() => {
    'worklet';
    // Reset: yeni stream başladı
    const resetCount = streamResetCountSV.value;
    if (resetCount !== lastResetCountSV.value) {
      lastResetCountSV.value = resetCount;
      completedSV.value = false;
      return;
    }

    // Done: JS interval bitirdi, tüm metin yazıldı
    if (isStreamingDoneSV.value && !completedSV.value) {
      completedSV.value = true;
      runOnJS(onComplete)(pendingSV.value);
    }
  }, true);

  return (
    <View style={[styles.row, styles.rowLeft]}>
      {/* Loading state: bubble yok, sadece logo + text */}
      <Reanimated.View style={[styles.waitingRow, loadingStyle]}>
        <ActivityThyLoading mode="pulse" size={20} />
        <Text variant="caption" color={colors.textSecondary}>{t('assistant.awaitingResponse')}</Text>
      </Reanimated.View>

      {/* Chunk gelince bubble + typewriter */}
      <Reanimated.View style={[styles.bubbleRow, textStyle]}>
        <AiTail color={colors.surface} borderColor={colors.border} />
        <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AnimatedTextInput
            animatedProps={animatedProps}
            editable={false}
            multiline
            scrollEnabled={false}
            style={[styles.content, { color: colors.text }]}
          />
          {/* footer — opacity:0, yükseklik korunur */}
          <View style={styles.footer} pointerEvents="none">
            <Text variant="micro" color="transparent">00:00</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="volume-high-outline" size={14} color="transparent" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="copy-outline" size={14} color="transparent" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="thumbs-up-outline" size={14} color="transparent" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="thumbs-down-outline" size={14} color="transparent" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
};

export const StreamingBubble = React.memo(StreamingBubbleInner);

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing[1],
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
    marginHorizontal: spacing[4],
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  bubble: {
    flex: 1,
    padding: spacing[3],
    borderWidth: 1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    minWidth: 40,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
  },
  content: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: 22,
    borderWidth: 0,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    opacity: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  actionBtn: {
    padding: 2,
  },
});
