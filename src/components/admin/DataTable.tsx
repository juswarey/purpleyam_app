import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';

export interface Column<T> {
  title: string;
  flex?: number;
  width?: number;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowPress,
  empty = 'Nothing here yet.',
  minWidth = 760,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowPress?: (row: T) => void;
  empty?: string;
  minWidth?: number;
}) {
  const cellStyle = (c: Column<T>) => (c.width ? { width: c.width } : { flex: c.flex ?? 1 });
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.wrap} contentContainerStyle={{ minWidth, flexGrow: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={[styles.row, styles.head]}>
          {columns.map((c) => (
            <Text key={c.title} style={[styles.headText, cellStyle(c)]}>
              {c.title}
            </Text>
          ))}
        </View>
        {rows.length === 0 ? <Text style={styles.empty}>{empty}</Text> : null}
        {rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={onRowPress ? () => onRowPress(r) : undefined}
            style={({ hovered }: any) => [styles.row, styles.body, hovered && onRowPress ? { backgroundColor: '#FBF6FD' } : null]}
          >
            {columns.map((c) => (
              <View key={c.title} style={[cellStyle(c), { justifyContent: 'center' }]}>
                {c.render(r)}
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export const T = StyleSheet.create({
  primary: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  secondary: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
});

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  head: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#FAF6FB', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  headText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  body: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1EAF3' },
  empty: { padding: 28, textAlign: 'center', fontFamily: fonts.regular, color: colors.muted },
});
