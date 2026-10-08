import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PageHeader } from '@/components/admin/PageHeader';
import { Card, ErrorText, Loading, StatusBadge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, radius } from '@/constants/theme';
import { adminGetOrders, adminGetPayments, adminGetReservations } from '@/lib/api';
import { formatDate, formatPickupDate, formatPickupTime, ORDER_STATUS_LABEL, shortId, toLocalISODate } from '@/lib/format';
import { peso } from '@/lib/pricing';
import { useLoad } from '@/lib/useLoad';

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data, loading, error } = useLoad(async () => {
    const [orders, payments, reservations] = await Promise.all([adminGetOrders(), adminGetPayments(), adminGetReservations()]);
    return { orders, payments, reservations };
  });

  const stats = useMemo(() => {
    if (!data) return null;
    const today = toLocalISODate(new Date());
    const active = data.reservations.filter((r) => r.status === 'reserved' || r.status === 'confirmed');
    return {
      pending: data.orders.filter((o) => o.status === 'pending').length,
      toVerify: data.payments.filter((p) => p.payment_status === 'pending').length,
      inProduction: data.orders.filter((o) => o.status === 'in_production').length,
      pickupsToday: active.filter((r) => r.pickup_date === today),
      upcoming: active.filter((r) => r.pickup_date >= today).slice(0, 6),
      recent: data.orders.slice(0, 6),
      revenue: data.payments.filter((p) => p.payment_status === 'verified').reduce((s, p) => s + Number(p.amount), 0),
    };
  }, [data]);

  if (loading) return <Loading />;
  if (error || !stats) return <ErrorText message={error} />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (profile?.full_name ?? '').split(' ')[0];

  return (
    <View>
      <PageHeader title={`${greeting}${firstName ? ', ' + firstName : ''}`} subtitle="Here is what needs the bakery today." />

      <View style={styles.tiles}>
        <Tile n={stats.pending} label="Orders waiting for review" tone={stats.pending ? 'hot' : 'calm'} onPress={() => router.push('/admin/orders')} />
        <Tile n={stats.toVerify} label="Payments to verify" tone={stats.toVerify ? 'hot' : 'calm'} onPress={() => router.push('/admin/payments')} />
        <Tile n={stats.pickupsToday.length} label="Pickups today" tone="calm" onPress={() => router.push('/admin/reservations')} />
        <Tile n={stats.inProduction} label="Cakes in production" tone="calm" onPress={() => router.push('/admin/orders')} />
      </View>

      <View style={styles.cols}>
        <Card style={styles.col}>
          <Text style={styles.h}>Upcoming pickups</Text>
          {stats.upcoming.length === 0 ? <Text style={styles.muted}>No pickups scheduled.</Text> : null}
          {stats.upcoming.map((r) => (
            <Pressable key={r.id} style={styles.line} onPress={() => router.push(`/admin/orders/${r.order_id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.primary}>{r.profiles?.full_name ?? 'Customer'}</Text>
                <Text style={styles.muted}>{r.orders?.cakes?.name ?? 'Custom cake'} · {r.orders?.cake_size}</Text>
              </View>
              <Text style={styles.when}>
                {formatPickupDate(r.pickup_date)}, {formatPickupTime(r.pickup_time)}
              </Text>
            </Pressable>
          ))}
        </Card>

        <Card style={styles.col}>
          <Text style={styles.h}>Recent orders</Text>
          {stats.recent.length === 0 ? <Text style={styles.muted}>No orders yet.</Text> : null}
          {stats.recent.map((o) => (
            <Pressable key={o.id} style={styles.line} onPress={() => router.push(`/admin/orders/${o.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.primary}>
                  {shortId(o.id)} · {o.profiles?.full_name ?? 'Customer'}
                </Text>
                <Text style={styles.muted}>
                  {formatDate(o.created_at)} · {peso(o.total_amount)}
                </Text>
              </View>
              <StatusBadge status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
            </Pressable>
          ))}
        </Card>
      </View>

      <Text style={[styles.muted, { marginTop: 18 }]}>Verified payments received so far: {peso(stats.revenue)}</Text>
    </View>
  );
}

function Tile({ n, label, tone, onPress }: { n: number; label: string; tone: 'hot' | 'calm'; onPress: () => void }) {
  const hot = tone === 'hot';
  return (
    <Pressable onPress={onPress} style={[styles.tile, hot && styles.tileHot]}>
      <Text style={[styles.tileN, hot && { color: colors.plum900 }]}>{n}</Text>
      <Text style={[styles.tileL, hot && { color: colors.plum900 }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 22 },
  tile: { flexGrow: 1, flexBasis: 200, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 20, gap: 4 },
  tileHot: { backgroundColor: colors.gold, borderColor: colors.gold },
  tileN: { fontFamily: fonts.serif, fontSize: 44, color: colors.plum700 },
  tileL: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  col: { flexGrow: 1, flexBasis: 420, gap: 4 },
  h: { fontFamily: fonts.serif, fontSize: 20, color: colors.text, marginBottom: 6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1EAF3' },
  primary: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  when: { fontFamily: fonts.medium, fontSize: 13, color: colors.plum700 },
});
