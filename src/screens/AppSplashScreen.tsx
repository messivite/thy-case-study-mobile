import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
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

  const startExitAnimation = () => {
    logoScale.value = withTiming(8.5, {
      duration: 480,
      easing: Easing.in(Easing.cubic),
    });
    logoOpacity.value = withTiming(0, { duration: 320 });
    setTimeout(onSplashFinished, 500);
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

    const exitTimer = setTimeout(startExitAnimation, 1500);
    return () => {
      clearTimeout(exitTimer);
    };
  }, [fontsLoaded]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.root}>
      <View style={[StyleSheet.absoluteFill, styles.bg]}>
        <Animated.View style={[styles.logoWrap]}>
          <Animated.View style={logoStyle}>
            <Image
              source={require('../../assets/splash-icon.png')}
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
    width: 124,
    height: 124,
    resizeMode: 'contain',
  },
});
