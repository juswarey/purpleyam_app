import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, CakeThumb, Card, EmptyState, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { getMyOrders } from '@/lib/api';
import { formatDate, formatPickupDate, formatPickupTime, ORDER_STATUS_LABEL, shortId } from '@/lib/format';
import { peso } from '@/lib/pricing';
import type { Order } from '@/lib/types';

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOrders(await getMyOrders());
    } catch (e: any) {
      setError(e.message);
      setOrders((p) => p ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!orders) return <Loading />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>My Orders</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No orders yet"
            hint="Design your first custom cake and it will show up here."
            action={<Button title="Design a cake" onPress={() => router.push('/builder')} />}
          />
        }
        renderItem={({ item }) => {
          const res = (item.reservations ?? []).find((r) => r.status !== 'cancelled');
          return (
            <Pressable onPress={() => router.push(`/order/${item.id}`)}>
              <Card style={{ gap: 10 }}>
                <View style={styles.row}>
                  <CakeThumb uri={item.cakes?.image_url} size={56} style={{ width: 56 }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.cakes?.name ?? 'Custom cake'}
                    </Text>
                    <Text style={styles.muted}>
                      {shortId(item.id)} · {formatDate(item.created_at)}
                    </Text>
                    <Text style={styles.total}>{peso(item.total_amount)}</Text>
                  </View>
                </View>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <StatusBadge status={item.status} label={ORDER_STATUS_LABEL[item.status]} />
                  <Text style={styles.muted}>
                    {res ? `Pickup ${formatPickupDate(res.pickup_date)}, ${formatPickupTime(res.pickup_time)}` : 'No pickup set'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.text, paddingHorizontal: 20, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  total: { fontFamily: fonts.bold, fontSize: 15, color: colors.plum700 },
  err: { color: colors.danger, paddingHorizontal: 20, fontFamily: fonts.medium, fontSize: 13 },
});
