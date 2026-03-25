import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppColors } from '@/constants/app';

type ActionPillButtonProps = {
  label: string;
  onPress: () => void;
  iconName?: ComponentProps<typeof MaterialIcons>['name'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function ActionPillButton({
  label,
  onPress,
  iconName = 'more-vert',
  accessibilityLabel,
  accessibilityHint,
}: ActionPillButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      <MaterialIcons name={iconName} size={18} color="#fff" />
      <Text style={styles.triggerText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  triggerText: {
    color: '#fff',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
