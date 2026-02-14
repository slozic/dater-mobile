import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { token } = useAuth();
  const hasToken = Boolean(token);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ff5c8a',
        tabBarInactiveTintColor: '#8b8b96',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
        },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: 16,
          height: 72,
          borderTopColor: '#ececf2',
          backgroundColor: '#fff',
          display: hasToken ? 'flex' : 'none',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dates',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-dates"
        options={{
          title: 'My Dates',
          href: hasToken ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="heart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: hasToken ? undefined : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
