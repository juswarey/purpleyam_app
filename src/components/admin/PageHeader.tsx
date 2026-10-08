import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 22, flexWrap: 'wrap' },
  title: { fontFamily: fonts.serif, fontSize: 32, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  toast: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: colors.plum900, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, zIndex: 50 },
  toastText: { color: '#fff', fontFamily: fonts.medium, fontSize: 14 },
});
