import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type OptionsMenuItemProps = {
  label: string;
  onPress: () => void;
  iconName?: ComponentProps<typeof MaterialIcons>['name'];
  iconColor?: string;
  active?: boolean;
  destructive?: boolean;
  disabled?: boolean;
};

export function OptionsMenuItem({
  label,
  onPress,
  iconName,
  iconColor = '#1b1b1f',
  active = false,
  destructive = false,
  disabled = false,
}: OptionsMenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.item, active && styles.itemActive, pressed && styles.itemPressed]}
      onPress={onPress}
      disabled={disabled}
    >
      {iconName ? <MaterialIcons name={iconName} size={16} color={iconColor} /> : null}
      <Text style={[styles.itemText, destructive && styles.itemTextDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  itemActive: {
    backgroundColor: '#fff4f8',
  },
  itemPressed: {
    backgroundColor: '#f7f7fb',
  },
  itemText: {
    color: '#1b1b1f',
    fontWeight: '500',
  },
  itemTextDanger: {
    color: '#c1121f',
  },
});
