import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Column, DataTable, T } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { ErrorText, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { adminGetOrders } from '@/lib/api';
import { formatDate, formatPickupDate, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, shortId } from '@/lib/format';
import { peso } from '@/lib/pricing';
import type { Order, OrderStatus } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

// The production board: one column per stage a cake moves through.
const BOARD: { status: OrderStatus; hint: string }[] = [
  { status: 'pending', hint: 'Review and approve or reject' },
  { status: 'approved', hint: 'Waiting to start baking' },
  { status: 'in_production', hint: 'Being baked and decorated' },
  { status: 'ready_for_pickup', hint: 'Waiting for the customer' },
];

export default function Orders() {
  const router = useRouter();
  const { data, loading, error } = useLoad(adminGetOrders);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter(
      (o) => !s || `${o.profiles?.full_name ?? ''} ${o.cakes?.name ?? ''} ${o.id}`.toLowerCase().includes(s)
    );
  }, [data, q]);

  if (loading) return <Loading />;

  const closed = filtered.filter((o) => ['completed', 'rejected', 'cancelled'].includes(o.status));

  const columns: Column<Order>[] = [
    { title: 'Order', width: 110, render: (o) => <Text style={T.primary}>{shortId(o.id)}</Text> },
    { title: 'Customer', flex: 1.4, render: (o) => <Text style={T.text}>{o.profiles?.full_name ?? '—'}</Text> },
    { title: 'Cake', flex: 1.4, render: (o) => <Text style={T.text}>{o.cakes?.name ?? 'Custom cake'}</Text> },
    { title: 'Total', width: 110, render: (o) => <Text style={T.text}>{peso(o.total_amount)}</Text> },
    { title: 'Placed', width: 120, render: (o) => <Text style={T.secondary}>{formatDate(o.created_at)}</Text> },
    { title: 'Status', width: 150, render: (o) => <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} /> },
  ];

  return (
    <View>
      <PageHeader
        title="Orders"
        subtitle="Each column is a stage. Open an order to move it forward."
        right={
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search customer, cake or order #"
            placeholderTextColor="#A395A8"
            style={styles.search}
          />
        }
      />
      <ErrorText message={error} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
        {BOARD.map((col) => {
          const items = filtered.filter((o) => o.status === col.status);
          return (
            <View key={col.status} style={styles.column}>
              <View style={styles.colHead}>
                <Text style={styles.colTitle}>{ORDER_STATUS_LABEL[col.status]}</Text>
                <View style={styles.count}>
                  <Text style={styles.countText}>{items.length}</Text>
                </View>
              </View>
              <Text style={styles.colHint}>{col.hint}</Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {items.length === 0 ? <Text style={styles.none}>Nothing here</Text> : null}
                {items.map((o) => {
                  const res = (o.reservations ?? []).find((r) => r.status !== 'cancelled');
                  return (
                    <Pressable key={o.id} onPress={() => router.push(`/admin/orders/${o.id}`)} style={({ hovered }: any) => [styles.card, hovered && { borderColor: colors.mauve }]}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardId}>{shortId(o.id)}</Text>
                        <Text style={styles.cardTotal}>{peso(o.total_amount)}</Text>
                      </View>
                      <Text style={styles.cardName}>{o.profiles?.full_name ?? 'Customer'}</Text>
                      <Text style={styles.cardCake} numberOfLines={1}>
                        {o.cakes?.name ?? 'Custom cake'} · {o.cake_size}
                      </Text>
                      <View style={styles.cardBottom}>
                        <StatusBadge status={o.payment_status} label={PAYMENT_STATUS_LABEL[o.payment_status]} />
                        <Text style={styles.cardPickup}>{res ? `Pickup ${formatPickupDate(res.pickup_date)}` : 'No pickup set'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Text style={styles.sectionTitle}>Closed orders</Text>
      <DataTable columns={columns} rows={closed} onRowPress={(o) => router.push(`/admin/orders/${o.id}`)} empty="No completed, rejected or cancelled orders." />
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    width: 300,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  board: { gap: 16, paddingBottom: 8 },
  column: { width: 290, backgroundColor: '#F4EDF3', borderRadius: radius.lg, padding: 14 },
  colHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colTitle: { fontFamily: fonts.serif, fontSize: 17, color: colors.plum900 },
  count: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.plum700, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  colHint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  none: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
  card: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardId: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  cardTotal: { fontFamily: fonts.bold, fontSize: 13, color: colors.plum700 },
  cardName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  cardCake: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardPickup: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, marginTop: 30, marginBottom: 12 },
});
