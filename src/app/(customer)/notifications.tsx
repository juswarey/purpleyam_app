import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Card, EmptyState, Loading } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { getMyNotifications, markNotificationRead } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { AppNotification } from '@/lib/types';

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getMyNotifications());
    } catch {
      setItems([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const open = async (n: AppNotification) => {
    if (!n.is_read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null);
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.order_id) router.push(`/order/${n.order_id}`);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title="Notifications" />
      {!items ? (
        <Loading />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState icon="bell-outline" title="You’re all caught up" hint="Updates about your orders and payments will appear here." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)}>
              <Card style={[{ gap: 4 }, !item.is_read && styles.unread]}>
                <View style={styles.row}>
                  <Text style={styles.t}>{item.title}</Text>
                  {!item.is_read ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.m}>{item.message}</Text>
                <Text style={styles.d}>{formatDateTime(item.created_at)}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  unread: { borderColor: colors.mauve, backgroundColor: '#FBF6FD' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  t: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  m: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  d: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.gold },
});
