import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

import { colors, fonts } from '@/constants/theme';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
const tab = (title: string, icon: Icon, iconOn: Icon) => ({
  title,
  tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
    <MaterialCommunityIcons name={focused ? iconOn : icon} size={24} color={color} />
  ),
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.plum700,
        tabBarInactiveTintColor: '#A395A8',
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.border, height: 62, paddingBottom: 8, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="home" options={tab('Home', 'home-outline', 'home')} />
      <Tabs.Screen name="builder" options={tab('Design', 'tune-variant', 'tune-variant')} />
      <Tabs.Screen name="orders" options={tab('Orders', 'cake-variant-outline', 'cake-variant')} />
      <Tabs.Screen name="profile" options={tab('Profile', 'account-outline', 'account')} />
    </Tabs>
  );
}
