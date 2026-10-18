import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button, Card, ErrorText, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { cancelOrder, getOrder } from '@/lib/api';
import {
  formatDate,
  formatPickupDate,
  formatPickupTime,
  METHOD_LABEL,
  ORDER_STATUS_LABEL,
  paymentRecordLabel,
  PAYMENT_STATUS_LABEL,
  RESERVATION_LABEL,
  shortId,
} from '@/lib/format';
import { peso } from '@/lib/pricing';
import { getSignedUrl } from '@/lib/storage';
import type { Order, OrderStatus } from '@/lib/types';

const STEPS: OrderStatus[] = ['pending', 'approved', 'in_production', 'ready_for_pickup', 'completed'];

export default function OrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setOrder(await getOrder(id));
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const urls = await Promise.all((order?.order_images ?? []).map((i) => getSignedUrl('order-images', i.storage_path)));
      if (alive) setPhotos(urls.filter(Boolean) as string[]);
    })();
    return () => {
      alive = false;
    };
  }, [order?.order_images]);

  if (!order) {
    return (
      <SafeAreaView style={styles.root}>
        <BackHeader title="Order" />
        {error ? <View style={{ padding: 20 }}><ErrorText message={error} /></View> : <Loading />}
      </SafeAreaView>
    );
  }

  const closed = order.status === 'rejected' || order.status === 'cancelled';
  // A manual payment the bakery is still checking (an unfinished online checkout doesn't count)
  const waitingForBakery = (order.payments ?? []).some((p) => p.payment_method !== 'paymongo' && p.payment_status === 'pending');
  const reservation = (order.reservations ?? []).find((r) => r.status !== 'cancelled');
  const stepIndex = STEPS.indexOf(order.status);

  const confirmCancel = () =>
    Alert.alert('Cancel this order?', 'You can only cancel before the bakery approves it.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelOrder(order.id);
            await load();
          } catch (e: any) {
            Alert.alert('Could not cancel', e.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title={shortId(order.id)} onBack={() => router.replace('/orders')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
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
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cake}>{order.cakes?.name ?? 'Custom cake'}</Text>
          <StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />
        </View>
        <Text style={styles.muted}>Placed {formatDate(order.created_at)}</Text>

        {order.status === 'rejected' ? (
          <View style={styles.rejected}>
            <Text style={styles.rejectedTitle}>The bakery couldn’t take this order</Text>
            <Text style={styles.rejectedText}>{order.rejection_reason || 'No reason was given. Please contact the bakery.'}</Text>
          </View>
        ) : null}

        {!closed ? (
          <Card style={{ gap: 14 }}>
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              return (
                <View key={s} style={styles.step}>
                  <View style={[styles.stepDot, done && styles.stepDotOn]}>
                    {done ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={[styles.stepText, done && { color: colors.text, fontFamily: fonts.semibold }]}>{ORDER_STATUS_LABEL[s]}</Text>
                </View>
              );
            })}
          </Card>
        ) : null}

        <Text style={styles.h}>Your cake</Text>
        <Card style={{ gap: 8 }}>
          <Row k="Size" v={order.cake_size} />
          <Row k="Flavor" v={order.flavor} />
          <Row k="Frosting" v={order.filling} />
          <Row k="Style" v={order.design_description} />
          <Row k="Message on cake" v={order.custom_message} />
          <Row k="Notes" v={order.additional_instructions} />
        </Card>
        {photos.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {photos.map((u) => (
              <Image key={u} source={{ uri: u }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.h}>Payment</Text>
        <Card style={{ gap: 8 }}>
          <Row k="Total" v={peso(order.total_amount)} />
          <Row k="Down payment (50%)" v={peso(order.down_payment)} />
          <Row k="Balance to pay" v={peso(order.remaining_balance)} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.k}>Payment status</Text>
            <StatusBadge status={order.payment_status} label={PAYMENT_STATUS_LABEL[order.payment_status]} />
          </View>
          {(order.payments ?? []).map((p) => (
            <View key={p.id} style={styles.sub}>
              <Text style={styles.subText}>
                {peso(p.amount)} · {METHOD_LABEL[p.payment_method]} · {formatDate(p.created_at)}
              </Text>
              <StatusBadge status={p.payment_status} label={paymentRecordLabel(p)} />
            </View>
          ))}
          {!closed && order.payment_status !== 'paid' && !waitingForBakery ? (
            <Button title={order.payment_status === 'unpaid' ? 'Pay down payment' : 'Pay balance'} small onPress={() => router.push({ pathname: '/payment', params: { orderId: order.id } })} />
          ) : null}
        </Card>

        <Text style={styles.h}>Pickup</Text>
        <Card style={{ gap: 8 }}>
          {reservation ? (
            <>
              <Row k="Date" v={formatPickupDate(reservation.pickup_date)} />
              <Row k="Time" v={formatPickupTime(reservation.pickup_time)} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.k}>Status</Text>
                <StatusBadge status={reservation.status} label={RESERVATION_LABEL[reservation.status]} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.muted}>No pickup time chosen yet.</Text>
              {!closed ? (
                <Button title="Choose pickup time" small onPress={() => router.push({ pathname: '/schedule', params: { orderId: order.id } })} />
              ) : null}
            </>
          )}
        </Card>

        {order.status === 'pending' ? (
          <Button title="Cancel order" variant="outline" onPress={confirmCancel} loading={busy} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  cake: { fontFamily: fonts.serif, fontSize: 22, color: colors.text, flex: 1, marginRight: 8 },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  h: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, marginTop: 6 },
  k: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  v: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, flex: 1, textAlign: 'right' },
  photo: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.lilac },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotOn: { backgroundColor: colors.plum700, borderColor: colors.plum700 },
  stepText: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  sub: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  subText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flex: 1 },
  rejected: { backgroundColor: colors.dangerBg, borderRadius: radius.md, padding: 14, gap: 4 },
  rejectedTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  rejectedText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
});
