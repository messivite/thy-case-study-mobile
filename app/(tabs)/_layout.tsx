import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { TabBarItem } from '@/molecules/TabBarItem';
import { useTheme } from '@/hooks/useTheme';
import { useI18n } from '@/hooks/useI18n';
import { spacing } from '@/constants/spacing';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        const { state, navigation } = props;

        return (
          <View
            style={[
              styles.tabBar,
              {
                backgroundColor: colors.tabBarBg,
                borderTopColor: colors.tabBarBorder,
              },
            ]}
          >
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
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[2],
    paddingTop: spacing[2],
  },
});
