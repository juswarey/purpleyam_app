import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';

// Alert.alert() does nothing on web, so the admin portal uses this dialog instead.
export function Dialog({
  visible,
  title,
  children,
  onClose,
  confirmLabel,
  onConfirm,
  confirmVariant = 'primary',
  busy,
  width = 460,
}: {
  visible: boolean;
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'danger' | 'gold';
  busy?: boolean;
  width?: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.box, { maxWidth: width }]} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <View style={{ gap: 12 }}>{children}</View>
          <View style={styles.actions}>
            <Button title={onConfirm ? 'Cancel' : 'Close'} variant="ghost" small onPress={onClose} />
            {onConfirm ? <Button title={confirmLabel ?? 'Confirm'} variant={confirmVariant} small onPress={onConfirm} loading={busy} /> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(30,8,44,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: { width: '100%', backgroundColor: colors.cream, borderRadius: radius.lg, padding: 24, gap: 16 },
  title: { fontFamily: fonts.serif, fontSize: 22, color: colors.text },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
