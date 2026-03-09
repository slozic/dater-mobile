import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchNotifications } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const { token } = useAuth();
  const hasToken = Boolean(token);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    if (!hasToken) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    const loadUnread = async () => {
      try {
        const data = await fetchNotifications();
        if (active) {
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    };
    loadUnread();
    const intervalId = setInterval(loadUnread, 15000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [hasToken]);

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
          tabBarIcon: ({ color }) => (
            <View style={styles.iconWrap}>
              <IconSymbol size={28} name="person.fill" color={color} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    position: 'relative',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#ff5c8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
