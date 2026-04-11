import React, { useCallback, useEffect, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/constants/colors';
import { useHaptics } from '@/hooks/useHaptics';
import { useI18n } from '@/hooks/useI18n';
import { stripTextForSpeech, speechLocaleForAppLang } from '@/lib/chatSpeech';
import { toast } from '@/lib/toast';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const DEFAULT_SIZE = 56;

/** THY kırmızı tonları — üst sol daha koyu, alt sağ daha açık */
const DEFAULT_GRADIENT = [
  palette.primaryDark,
  palette.primary,
  palette.primaryLight,
] as const;

type Props = {
  /** Seslendirilecek metin (boşsa buton devre dışı) */
  textToSpeak: string;
  width?: number;
  height?: number;
  /** LinearGradient `colors`; varsayılan THY kırmızı geçişi */
  gradientColors?: readonly [string, string, ...string[]];
  /** `expo-speech` rate, ~1.0 normal */
  speechRate?: number;
  /** BCP-47; verilmezse uygulama dili */
  speechLanguage?: string;
  disabled?: boolean;
  hapticFeedback?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export const SpeechRoundButton: React.FC<Props> = ({
  textToSpeak,
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE,
  gradientColors = DEFAULT_GRADIENT,
  speechRate = 0.96,
  speechLanguage: speechLanguageProp,
  disabled = false,
  hapticFeedback = true,
  onPlaybackStart,
  onPlaybackEnd,
  style,
  testID,
}) => {
  const haptics = useHaptics();
  const { t, currentLanguage } = useI18n();
  const [isPlaying, setIsPlaying] = useState(false);
  const scale = useSharedValue(1);

  const plain = stripTextForSpeech(textToSpeak);
  const canSpeak = plain.trim().length > 0 && !disabled;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    return () => {
      void Speech.stop();
    };
  }, []);

  useEffect(() => {
    void Speech.stop();
    setIsPlaying(false);
  }, [textToSpeak]);

  const notifyEnd = useCallback(() => {
    setIsPlaying(false);
    onPlaybackEnd?.();
  }, [onPlaybackEnd]);

  const handlePress = useCallback(() => {
    if (!canSpeak) return;
    if (hapticFeedback) haptics.light();

    if (isPlaying) {
      void Speech.stop();
      return;
    }

    void Speech.stop();
    const locale =
      speechLanguageProp ?? speechLocaleForAppLang(currentLanguage);

    setIsPlaying(true);
    onPlaybackStart?.();

    Speech.speak(plain, {
      language: locale,
      rate: speechRate,
      onDone: notifyEnd,
      onStopped: notifyEnd,
      onError: () => {
        notifyEnd();
        toast.error(t('toast.speechError'));
      },
    });
  }, [
    canSpeak,
    hapticFeedback,
    haptics,
    isPlaying,
    plain,
    speechLanguageProp,
    currentLanguage,
    speechRate,
    onPlaybackStart,
    onPlaybackEnd,
    notifyEnd,
    t,
  ]);

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 16 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 16 });
  };

  const dim = Math.min(width, height);
  const iconSize = Math.round(dim * 0.38);

  return (
    <AnimatedTouchable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!canSpeak}
      activeOpacity={1}
      style={[
        styles.touchWrap,
        { width, height },
        !canSpeak && styles.touchDisabled,
        animatedStyle,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? t('assistant.stopSpeaking') : t('assistant.speak')}
    >
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { width, height, borderRadius: dim / 2 }]}
      >
        <Ionicons
          name={isPlaying ? 'stop' : 'play'}
          size={iconSize}
          color={palette.white}
          style={isPlaying ? undefined : styles.playIconNudge}
        />
      </LinearGradient>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  touchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchDisabled: {
    opacity: 0.45,
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  /** Play üçgeni optik olarak ortada dursun */
  playIconNudge: {
    marginLeft: 2,
  },
});
