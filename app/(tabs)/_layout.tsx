import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostNavigationEnterFade } from '@/components/PostNavigationEnterFade';
import { TabBarItem } from '@/molecules/TabBarItem';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';

const TOP_RADIUS = 26;

export default function TabLayout() {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'ios' ? 10 : 8);

  return (
    <PostNavigationEnterFade>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
      tabBar={(props) => {
        const { state, navigation } = props;

        return (
          <View style={[styles.host, { paddingBottom: bottomPad }]}>
            {/* Gölge: overflow:hidden alt view’da; gölge üst sarmalayıcıda (üst kenara yumuşak düşüş) */}
            <View
              style={[
                styles.shadowPlate,
                Platform.OS === 'ios' && styles.shadowPlateIOS,
                Platform.OS === 'android' && styles.shadowPlateAndroid,
              ]}
            >
              <View
                style={[
                  styles.surface,
                  {
                    borderTopLeftRadius: TOP_RADIUS,
                    borderTopRightRadius: TOP_RADIUS,
                  },
                ]}
              >
                {Platform.OS === 'ios' ? (
                  <>
                    <BlurView
                      intensity={isDark ? 38 : 45}
                      tint={isDark ? 'dark' : 'light'}
                      style={StyleSheet.absoluteFill}
                    />
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: isDark
                            ? 'rgba(22,22,32,0.78)'
                            : 'rgba(255,255,255,0.78)',
                        },
                      ]}
                    />
                  </>
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(26,26,38,0.97)'
                          : 'rgba(255,255,255,0.98)',
                      },
                    ]}
                  />
                )}
                {/* Üst kenar: ekstra ayırıcı derinlik (ref. ekrandaki ince ayrım) */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.topHairline,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)',
                    },
                  ]}
                />
                <View style={styles.row}>
                  <TabBarItem
                    label={t('home.title')}
                    icon="sparkles-outline"
                    iconFocused="sparkles"
                    isFocused={state.index === 0}
                    onPress={() => navigation.navigate('index')}
                  />
                  <TabBarItem
                    label={t('settings.title')}
                    icon="settings-outline"
                    iconFocused="settings"
                    isFocused={state.index === 1}
                    onPress={() => navigation.navigate('settings')}
                  />
                </View>
              </View>
            </View>
          </View>
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="settings" />
    </Tabs>
    </PostNavigationEnterFade>
  );
}

const styles = StyleSheet.create({
  host: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  shadowPlate: {
    borderTopLeftRadius: TOP_RADIUS,
    borderTopRightRadius: TOP_RADIUS,
    backgroundColor: 'transparent',
  },
  shadowPlateIOS: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
  },
  shadowPlateAndroid: {
    elevation: 10,
  },
  surface: {
    overflow: 'hidden',
    minHeight: 56,
  },
  topHairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: StyleSheet.hairlineWidth * 2,
    zIndex: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
    zIndex: 1,
  },
});
