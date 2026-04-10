import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PostNavigationEnterFade } from '@/components/PostNavigationEnterFade';
import { TabBarItem } from '@/molecules/TabBarItem';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';

export default function TabLayout() {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPad = Math.max(insets.bottom, 8);

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
          <View style={styles.host}>
            <View style={[styles.surface, { paddingBottom: bottomPad }]}>
              {Platform.OS === 'ios' ? (
                <>
                  <BlurView
                    intensity={isDark ? 44 : 52}
                    tint={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        backgroundColor: isDark
                          ? 'rgba(20,20,34,0.86)'
                          : 'rgba(255,255,255,0.88)',
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
                        ? 'rgba(24,24,36,0.97)'
                        : 'rgba(255,255,255,0.97)',
                    },
                  ]}
                />
              )}
              <View style={styles.row}>
                <TabBarItem
                  label={t('assistant.title')}
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
    width: '100%',
  },
  surface: {
    overflow: 'hidden',
    minHeight: 64,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
    zIndex: 1,
  },
});
