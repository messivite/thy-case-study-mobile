import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  const logoOpacity = useSharedValue(1); // native splash ile hizalı — fade-in yok
  const pulseScale = useSharedValue(1);

  const startExitAnimation = () => {
    cancelAnimation(pulseScale);
    logoOpacity.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.ease) }, (finished) => {
      'worklet';
      if (finished) runOnJS(onSplashFinished)();
    });
  };

  useEffect(() => {
    if (!fontsLoaded) return;
    SplashScreen.hideAsync();

    // Tek pulse turu — sonra exit
    pulseScale.value = withSequence(
      withTiming(1.05, { duration: 400, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
    );

    const exitTimer = setTimeout(startExitAnimation, 600);
    return () => {
      clearTimeout(exitTimer);
      cancelAnimation(pulseScale);
      cancelAnimation(logoOpacity);
    };
  }, [fontsLoaded]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: pulseScale.value }],
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
