import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { palette } from '@/constants/colors';

type AppSplashScreenProps = {
  fontsLoaded: boolean;
  onSplashFinished: () => void;
};

export function AppSplashScreen({
  fontsLoaded,
  onSplashFinished,
}: AppSplashScreenProps) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.88);
  const pulseScale = useSharedValue(1);

  const startExitAnimation = () => {
    cancelAnimation(pulseScale);
    pulseScale.value = 1;

    logoScale.value = withTiming(8.5, {
      duration: 480,
      easing: Easing.in(Easing.cubic),
    });
    // Opacity bitince hemen yönlendir — setTimeout ile beyaz boş ekran kalmasın
    logoOpacity.value = withTiming(0, { duration: 320 }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(onSplashFinished)();
      }
    });
  };

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();

    logoOpacity.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });

    // Pulse starts after the entrance animation settles
    const pulseTimer = setTimeout(() => {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
    }, 350);

    const exitTimer = setTimeout(startExitAnimation, 1500);
    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(exitTimer);
      cancelAnimation(pulseScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoScale);
    };
  }, [fontsLoaded]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value * pulseScale.value }],
  }));

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.bg]}>
        <Animated.View style={[styles.logoWrap]}>
          <Animated.View style={logoStyle}>
            <Image
              source={require('../../assets/svg/compact-logo.png')}
              style={styles.logoImage}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.white,
  },
  bg: {
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
  },
  logoImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});
