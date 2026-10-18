import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Dialog } from '@/components/admin/Dialog';
import { PageHeader, Toast } from '@/components/admin/PageHeader';
import { Button, Card, ErrorText, Field, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { adminSetPaymentStatus, adminSetReservationStatus, adminUpdateOrder, getOrder } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatPickupDate,
  formatPickupTime,
  isAwaitingOnline,
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
import { useLoad } from '@/lib/useLoad';

// What the next production step is for each status
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  approved: { to: 'in_production', label: 'Start production' },
  in_production: { to: 'ready_for_pickup', label: 'Mark ready for pickup' },
  ready_for_pickup: { to: 'completed', label: 'Mark completed' },
};

export default function AdminOrderDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, loading, error, reload } = useLoad(() => getOrder(id), [id]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [proofs, setProofs] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (!order) return;
    let alive = true;
    (async () => {
      const imgs = await Promise.all((order.order_images ?? []).map((i) => getSignedUrl('order-images', i.storage_path)));
      const pairs = await Promise.all(
        (order.payments ?? []).map(async (p) => [p.id, await getSignedUrl('payment-proofs', p.proof_image_url)] as const)
      );
      if (!alive) return;
      setPhotos(imgs.filter(Boolean) as string[]);
      setProofs(Object.fromEntries(pairs.filter(([, u]) => !!u)) as Record<string, string>);
    })();
    return () => {
      alive = false;
    };
  }, [order]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await reload();
      flash(done);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error || !order) return <ErrorText message={error ?? 'Order not found.'} />;

  const next = NEXT[order.status];
  const pendingPayments = (order.payments ?? []).filter((p) => p.payment_status === 'pending' && !isAwaitingOnline(p)).length;

  return (
    <View>
      <Pressable onPress={() => router.replace('/admin/orders')} style={{ marginBottom: 10 }}>
        <Text style={styles.back}>‹ All orders</Text>
      </Pressable>
      <PageHeader
        title={`Order ${shortId(order.id)}`}
        subtitle={`Placed ${formatDateTime(order.created_at)} by ${order.profiles?.full_name ?? 'a customer'}`}
        right={<StatusBadge status={order.status} label={ORDER_STATUS_LABEL[order.status]} />}
      />
      <ErrorText message={actionError} />

      {/* Actions */}
      {order.status === 'pending' || next ? (
        <Card style={styles.actions}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={styles.h3}>{order.status === 'pending' ? 'Review this order' : 'Next step'}</Text>
            <Text style={styles.muted}>
              {order.status === 'pending'
                ? 'The customer is notified as soon as you approve or reject.'
                : 'Moving the order forward notifies the customer.'}
            </Text>
          </View>
          {order.status === 'pending' ? (
            <>
              <Button title="Reject" variant="outline" small onPress={() => { setReason(''); setReasonError(null); setRejecting(true); }} />
              <Button title="Approve order" variant="gold" small loading={busy} onPress={() => run(() => adminUpdateOrder(order.id, { status: 'approved' }), 'Order approved')} />
            </>
          ) : next ? (
            <Button title={next.label} small loading={busy} onPress={() => run(() => adminUpdateOrder(order.id, { status: next.to }), ORDER_STATUS_LABEL[next.to])} />
          ) : null}
        </Card>
      ) : null}

      {order.status === 'rejected' ? (
        <View style={styles.rejected}>
          <Text style={styles.rejectedTitle}>Rejected</Text>
          <Text style={styles.text}>{order.rejection_reason || 'No reason recorded.'}</Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {/* Left column */}
        <View style={styles.col}>
          <Card style={{ gap: 10 }}>
            <Text style={styles.h3}>Cake</Text>
            <Row k="Base cake" v={order.cakes?.name ?? 'Custom cake'} />
            <Row k="Size" v={order.cake_size} />
            <Row k="Flavor" v={order.flavor} />
            <Row k="Frosting" v={order.filling} />
            <Row k="Quantity" v={String(order.quantity)} />
            <Row k="Style" v={order.design_description} />
            <Row k="Message on cake" v={order.custom_message} />
            <Row k="Baker’s notes" v={order.additional_instructions} />
          </Card>

          <Card style={{ gap: 10 }}>
            <Text style={styles.h3}>Inspiration photos</Text>
            {photos.length === 0 ? <Text style={styles.muted}>The customer didn’t attach any photos.</Text> : null}
            <View style={styles.photoRow}>
              {photos.map((u) => (
                <Pressable key={u} onPress={() => Linking.openURL(u)}>
                  <Image source={{ uri: u }} style={styles.photo} resizeMode="cover" />
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {/* Right column */}
        <View style={styles.col}>
          <Card style={{ gap: 10 }}>
            <Text style={styles.h3}>Customer</Text>
            <Row k="Name" v={order.profiles?.full_name} />
            <Row k="Phone" v={order.profiles?.phone} />
            <Row k="Email" v={order.profiles?.email} />
          </Card>

          <Card style={{ gap: 10 }}>
            <View style={styles.between}>
              <Text style={styles.h3}>Payments</Text>
              <StatusBadge status={order.payment_status} label={PAYMENT_STATUS_LABEL[order.payment_status]} />
            </View>
            <Row k="Total" v={peso(order.total_amount)} />
            <Row k="Down payment due" v={peso(order.down_payment)} />
            <Row k="Balance remaining" v={peso(order.remaining_balance)} />
            {pendingPayments ? <Text style={styles.warn}>{pendingPayments} payment(s) waiting for you to verify.</Text> : null}

            {(order.payments ?? []).length === 0 ? <Text style={styles.muted}>No payment submitted yet.</Text> : null}
            {(order.payments ?? []).map((p) => (
              <View key={p.id} style={styles.payment}>
                <View style={styles.between}>
                  <Text style={styles.primary}>
                    {peso(p.amount)} · {METHOD_LABEL[p.payment_method]}
                  </Text>
                  <StatusBadge status={p.payment_status} label={paymentRecordLabel(p)} />
                </View>
                <Text style={styles.muted}>
                  {p.reference_number ? `Ref ${p.reference_number} · ` : ''}
                  {formatDateTime(p.created_at)}
                </Text>
                {proofs[p.id] ? (
                  <Pressable onPress={() => Linking.openURL(proofs[p.id])}>
                    <Image source={{ uri: proofs[p.id] }} style={styles.proof} resizeMode="cover" />
                    <Text style={styles.link}>Open full size</Text>
                  </Pressable>
                ) : null}
                {isAwaitingOnline(p) ? (
                  <Text style={styles.muted}>Waiting for the customer to finish paying on PayMongo. This updates by itself once they pay.</Text>
                ) : null}
                {p.payment_status === 'pending' && !isAwaitingOnline(p) ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button title="Verify payment" small loading={busy} onPress={() => run(() => adminSetPaymentStatus(p.id, 'verified'), 'Payment verified')} />
                    <Button title="Reject" variant="outline" small onPress={() => run(() => adminSetPaymentStatus(p.id, 'rejected'), 'Payment rejected')} />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>

          <Card style={{ gap: 10 }}>
            <Text style={styles.h3}>Pickup</Text>
            {(order.reservations ?? []).length === 0 ? <Text style={styles.muted}>The customer hasn’t chosen a pickup time yet.</Text> : null}
            {(order.reservations ?? []).map((r) => (
              <View key={r.id} style={styles.payment}>
                <View style={styles.between}>
                  <Text style={styles.primary}>
                    {formatPickupDate(r.pickup_date)} at {formatPickupTime(r.pickup_time)}
                  </Text>
                  <StatusBadge status={r.status} label={RESERVATION_LABEL[r.status]} />
                </View>
                {r.notes ? <Text style={styles.muted}>“{r.notes}”</Text> : null}
                {r.status === 'reserved' || r.status === 'confirmed' ? (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {r.status === 'reserved' ? (
                      <Button title="Confirm pickup" small onPress={() => run(() => adminSetReservationStatus(r.id, 'confirmed'), 'Pickup confirmed')} />
                    ) : null}
                    <Button title="Mark picked up" variant="soft" small onPress={() => run(() => adminSetReservationStatus(r.id, 'completed'), 'Pickup completed')} />
                    <Button title="Cancel" variant="outline" small onPress={() => run(() => adminSetReservationStatus(r.id, 'cancelled'), 'Pickup cancelled')} />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        </View>
      </View>

      <Dialog
        visible={rejecting}
        title="Reject this order"
        onClose={() => setRejecting(false)}
        confirmLabel="Reject order"
        confirmVariant="danger"
        busy={busy}
        onConfirm={async () => {
          if (!reason.trim()) return setReasonError('Write a short reason so the customer knows why.');
          await run(() => adminUpdateOrder(order.id, { status: 'rejected', rejection_reason: reason.trim() }), 'Order rejected');
          setRejecting(false);
        }}
      >
        <Text style={styles.muted}>The customer will see this reason in the app.</Text>
        <Field value={reason} onChangeText={setReason} multiline placeholder="e.g. We are fully booked for that date." error={reasonError} />
      </Dialog>
      <Toast message={toast} />
    </View>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <View style={styles.between}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { fontFamily: fonts.semibold, fontSize: 14, color: colors.plum700 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16, backgroundColor: '#FFF9E6', borderColor: colors.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  col: { flexGrow: 1, flexBasis: 420, gap: 16 },
  h3: { fontFamily: fonts.serif, fontSize: 19, color: colors.text },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  k: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  v: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, flex: 1, textAlign: 'right' },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  primary: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  warn: { fontFamily: fonts.medium, fontSize: 13, color: colors.warn, backgroundColor: colors.warnBg, padding: 10, borderRadius: radius.sm },
  link: { fontFamily: fonts.medium, fontSize: 12, color: colors.plum700, marginTop: 4 },
  payment: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1EAF3' },
  proof: { width: 180, height: 120, borderRadius: radius.sm, backgroundColor: colors.lilac },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 150, height: 150, borderRadius: radius.md, backgroundColor: colors.lilac },
  rejected: { backgroundColor: colors.dangerBg, borderRadius: radius.md, padding: 14, gap: 4, marginBottom: 16 },
  rejectedTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
});
