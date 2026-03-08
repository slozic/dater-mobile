import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

type OptionsPopoverProps = {
  visible: boolean;
  onClose: () => void;
  topOffset: number;
  width: number;
  children: ReactNode;
};

export function OptionsPopover({ visible, onClose, topOffset, width, children }: OptionsPopoverProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.anchor, { marginTop: topOffset }]}>
          <View style={[styles.menu, { width }]}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  anchor: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ececf2',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
