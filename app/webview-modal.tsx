/**
 * WebViewModal — Expo Router formSheet sunumu
 *
 * Açılış: router.push({ pathname: '/webview-modal', params: { url, title } })
 *
 * Params:
 *   url     — Açılacak tam URL (zorunlu)
 *   title   — AppHeader'da gösterilecek başlık (opsiyonel, yoksa URL host kullanılır)
 *
 * Davranış:
 *   • Yarı-ekran sheet olarak açılır (detent: 0.92)
 *   • Sayfa yüklenirken THY logo pulse animasyonu gösterilir
 *   • AppHeader: sol = geri/kapat, orta = title/URL, sağ = tarayıcıda aç
 *   • Hata durumunda retry butonu
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/organisms/AppHeader';
import { Text } from '@/atoms/Text';
import { ActivityThyLoading } from '@/atoms/ActivityThyLoading';
import { palette } from '@/constants/colors';
import { spacing, radius } from '@/constants/spacing';
import { scale } from '@/lib/responsive';
import { fontFamily } from '@/constants/typography';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WebViewModalParams = {
  url: string;
  title?: string;
};

// ---------------------------------------------------------------------------
// THY loader — proje genelindeki ActivityThyLoading
// ---------------------------------------------------------------------------

const LogoLoader: React.FC<{ uiScale?: (n: number) => number }> = ({ uiScale }) => (
  <Animated.View entering={FadeIn.duration(200)} style={loaderStyles.container}>
    <ActivityThyLoading
      mode="pulse"
      size={uiScale ? uiScale(72) : scale(72)}
      fill={palette.primary}
      fillSecondary={palette.white}
    />
  </Animated.View>
);

const loaderStyles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
});

// ---------------------------------------------------------------------------
// Error view
// ---------------------------------------------------------------------------

const ErrorView: React.FC<{ onRetry: () => void; uiScale?: (n: number) => number }> = ({ onRetry, uiScale }) => (
  <Animated.View entering={FadeIn.duration(200)} style={errorStyles.container}>
    <Ionicons name="wifi-outline" size={uiScale ? uiScale(48) : scale(48)} color={palette.gray300} />
    <Text style={[errorStyles.title, uiScale && { fontSize: uiScale(17) }]}>Sayfa yüklenemedi</Text>
    <Text style={[errorStyles.sub, uiScale && { fontSize: uiScale(13), lineHeight: uiScale(20) }]}>
      Bağlantınızı kontrol edip tekrar deneyin.
    </Text>
    <TouchableOpacity onPress={onRetry} style={errorStyles.btn} activeOpacity={0.8}>
      <Ionicons
        name="refresh-outline"
        size={uiScale ? uiScale(16) : scale(16)}
        color={palette.white}
        style={{ marginRight: 6 }}
      />
      <Text style={[errorStyles.btnText, uiScale && { fontSize: uiScale(14) }]}>Tekrar Dene</Text>
    </TouchableOpacity>
  </Animated.View>
);

const errorStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    paddingHorizontal: spacing[8],
    gap: spacing[3],
    zIndex: 10,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(17),
    color: palette.gray800,
    marginTop: spacing[2],
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: scale(13),
    color: palette.gray400,
    textAlign: 'center',
    lineHeight: scale(20),
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    marginTop: spacing[2],
  },
  btnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: scale(14),
    color: palette.white,
  },
});

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress * 100, { duration: 150 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as `${number}%`,
  }));

  if (progress >= 1) return null;

  return (
    <View style={progressStyles.track}>
      <Animated.View style={[progressStyles.bar, barStyle]} />
    </View>
  );
};

const progressStyles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: 'rgba(232,25,50,0.15)',
    overflow: 'hidden',
  },
  bar: {
    height: 3,
    backgroundColor: palette.primary,
    borderRadius: 999,
  },
});

// ---------------------------------------------------------------------------
// Helper — URL'den okunabilir host çıkar
// ---------------------------------------------------------------------------

function extractHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function WebViewModal() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { url, title } = useLocalSearchParams<WebViewModalParams>();

  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(url ?? '');

  const safeUrl = url ?? '';
  const headerTitle = title ?? extractHost(safeUrl);
  const webScale = Platform.OS === 'web'
    ? Math.min(windowWidth > 0 ? windowWidth : 390, 390) / 390
    : 1;
  const uiScale = (n: number) => Math.round(n * webScale);

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  const handleOpenInBrowser = useCallback(() => {
    if (safeUrl) Linking.openURL(safeUrl);
  }, [safeUrl]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    if (nav.url && !nav.url.startsWith('about:')) {
      setCurrentUrl(nav.url);
    }
  }, []);

  if (!safeUrl) {
    return (
      <View style={[styles.root, { paddingBottom: insets.bottom }]}>
        <AppHeader title="Hata" isBack onBack={handleClose} safeAreaTop={false} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>URL parametresi eksik.</Text>
        </View>
      </View>
    );
  }

  const showLoadingOverlay = isLoading && !hasError;

  return (
    <View
      style={[
        styles.root,
        {
          paddingBottom: insets.bottom,
          // Form sheet detenti (_layout sheetAllowedDetents) ile uyumlu taban; flex bazen 0 kalıyordu
          minHeight: Math.round(windowHeight * 0.92),
        },
      ]}
    >
      {/* Header */}
      <AppHeader
        title={headerTitle}
        subtitle={currentUrl !== safeUrl ? extractHost(currentUrl) : undefined}
        isBack
        safeAreaTop={false}
        onBack={handleClose}
        rightIcons={[
          {
            name: 'open-outline',
            onPress: handleOpenInBrowser,
            accessibilityLabel: 'Tarayıcıda aç',
          },
        ]}
      />

      {/* Progress bar */}
      <ProgressBar progress={loadProgress} />

      {/* WebView + tam yükseklikte beyaz yükleme katmanı */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: safeUrl }}
          style={[styles.webview, showLoadingOverlay && styles.webviewWhileLoading]}
          onLoadStart={() => { setIsLoading(true); setHasError(false); }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => { setHasError(true); setIsLoading(false); }}
          onLoadProgress={({ nativeEvent }) => setLoadProgress(nativeEvent.progress)}
          onNavigationStateChange={handleNavigationChange}
          allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
          allowsInlineMediaPlayback
          startInLoadingState={false}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
        />

        {showLoadingOverlay ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <LogoLoader uiScale={Platform.OS === 'web' ? uiScale : undefined} />
          </View>
        ) : null}

        {hasError ? (
          <ErrorView onRetry={handleRetry} uiScale={Platform.OS === 'web' ? uiScale : undefined} />
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: palette.white,
  },
  webviewContainer: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
    backgroundColor: palette.white,
  },
  webview: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: palette.white,
  },
  webviewWhileLoading: {
    opacity: 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: palette.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: scale(14),
    color: palette.gray500,
    textAlign: 'center',
  },
});
