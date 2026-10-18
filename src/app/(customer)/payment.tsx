import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button, Card, Chip, ErrorText, Field, Loading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { BAKERY } from '@/constants/bakery';
import { colors, fonts, radius } from '@/constants/theme';
import { createPayment, getOrder, startOnlinePayment } from '@/lib/api';
import { METHOD_LABEL } from '@/lib/format';
import { peso } from '@/lib/pricing';
import { PickedImage, pickImages, uploadToBucket } from '@/lib/storage';
import type { Order, PaymentMethod } from '@/lib/types';

const METHODS: PaymentMethod[] = ['paymongo', 'gcash', 'bank_transfer', 'cash'];
const LABEL: Record<string, string> = { ...METHOD_LABEL, paymongo: 'Pay online' };

const verifiedCount = (o: Order) => (o.payments ?? []).filter((p) => p.payment_status === 'verified').length;

export default function Payment() {
  const router = useRouter();
  const { session } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('paymongo');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notConfirmed, setNotConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrder(orderId)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [orderId]);

  if (!order) return error ? <ErrorScreen message={error} /> : <Loading />;

  const fullyPaid = order.payment_status === 'paid';
  // Unpaid -> the down payment. Partially paid -> the remaining balance.
  const amountDue = order.payment_status === 'unpaid' ? order.down_payment : order.remaining_balance;
  const manualPending = (order.payments ?? []).some((p) => p.payment_method !== 'paymongo' && p.payment_status === 'pending');
  const online = method === 'paymongo';
  const needsProof = method === 'gcash' || method === 'bank_transfer';
  const hasReservation = (order.reservations ?? []).some((r) => r.status !== 'cancelled');

  const goNext = () =>
    hasReservation
      ? router.replace(`/order/${order.id}`)
      : router.replace({ pathname: '/schedule', params: { orderId: order.id } });

  // After the customer returns from PayMongo, wait a few seconds for the confirmation (webhook).
  const waitForConfirmation = async (before: number) => {
    setChecking(true);
    setNotConfirmed(false);
    try {
      for (let i = 0; i < 12; i++) {
        const fresh = await getOrder(order.id);
        setOrder(fresh);
        if (verifiedCount(fresh) > before) {
          Alert.alert('Payment received', 'Thank you! Your payment was confirmed.');
          goNext();
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      setNotConfirmed(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const payOnline = async () => {
    setError(null);
    setBusy(true);
    try {
      const before = verifiedCount(order);
      const { checkout_url } = await startOnlinePayment(order.id);
      await WebBrowser.openBrowserAsync(checkout_url); // returns when the customer closes the page
      setBusy(false);
      await waitForConfirmation(before);
    } catch (e: any) {
      setError(e.message ?? 'Could not open the payment page.');
    } finally {
      setBusy(false);
    }
  };

  const choosePhoto = async () => {
    try {
      const [img] = await pickImages(1);
      if (img) setProof(img);
    } catch (e: any) {
      Alert.alert('Could not open photos', e.message);
    }
  };

  const submitManual = async () => {
    if (!session) return;
    setError(null);
    if (needsProof && !reference.trim() && !proof) return setError('Add the reference number or a screenshot of your payment.');
    setBusy(true);
    try {
      const proofPath = proof ? await uploadToBucket('payment-proofs', session.user.id, order.id, proof) : null;
      await createPayment({
        order_id: order.id,
        customer_id: session.user.id,
        amount: amountDue,
        payment_method: method,
        reference_number: reference.trim() || null,
        proof_image_url: proofPath,
      });
      goNext();
    } catch (e: any) {
      setError(e.message ?? 'Could not save your payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title="Payment" onBack={() => router.replace(`/order/${order.id}`)} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>{order.payment_status === 'unpaid' ? 'Down payment to send' : 'Balance to pay'}</Text>
          <Text style={styles.amountValue}>{peso(amountDue)}</Text>
          <Text style={styles.amountSub}>of {peso(order.total_amount)} total</Text>
        </View>

        {fullyPaid ? (
          <Card>
            <Text style={styles.cardTitle}>This order is fully paid. Thank you!</Text>
          </Card>
        ) : (
          <>
            {manualPending ? (
              <Text style={styles.note}>You already sent a payment that the bakery is still checking. You don’t need to pay again.</Text>
            ) : null}

            <Text style={styles.h}>How are you paying?</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {METHODS.map((m) => (
                <Chip key={m} label={LABEL[m]} selected={method === m} onPress={() => { setMethod(m); setError(null); }} />
              ))}
            </View>

            {online ? (
              <Card style={{ gap: 4 }}>
                <Text style={styles.cardTitle}>Pay securely online</Text>
                <Text style={styles.cardText}>
                  You’ll open PayMongo’s secure page and can pay with GCash, QR Ph, Maya or a card. Your payment is confirmed automatically, so no screenshot is needed.
                </Text>
              </Card>
            ) : (
              <Card style={{ gap: 4 }}>
                {method === 'gcash' ? (
                  <>
                    <Text style={styles.cardTitle}>Send via GCash</Text>
                    <Text style={styles.cardText}>{BAKERY.gcash.name}</Text>
                    <Text style={styles.cardNumber}>{BAKERY.gcash.number}</Text>
                  </>
                ) : method === 'bank_transfer' ? (
                  <>
                    <Text style={styles.cardTitle}>Bank transfer · {BAKERY.bank.bank}</Text>
                    <Text style={styles.cardText}>{BAKERY.bank.name}</Text>
                    <Text style={styles.cardNumber}>{BAKERY.bank.number}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardTitle}>Pay in cash at the bakery</Text>
                    <Text style={styles.cardText}>{BAKERY.address}</Text>
                    <Text style={styles.cardText}>The bakery marks your payment as received when you hand it over.</Text>
                  </>
                )}
              </Card>
            )}

            {needsProof ? (
              <>
                <Field label="Reference number" value={reference} onChangeText={setReference} placeholder="e.g. 1234 567 890" autoCapitalize="characters" />
                <View style={{ gap: 8 }}>
                  <Text style={styles.label}>Payment screenshot</Text>
                  <Pressable style={styles.proof} onPress={choosePhoto}>
                    {proof ? <Image source={{ uri: proof.uri }} style={styles.proofImg} resizeMode="cover" /> : <Text style={styles.cardText}>Tap to upload proof of payment</Text>}
                  </Pressable>
                </View>
              </>
            ) : null}

            {checking ? <Text style={styles.note}>Waiting for PayMongo to confirm your payment…</Text> : null}
            {notConfirmed ? (
              <View style={{ gap: 8 }}>
                <Text style={styles.note}>
                  We haven’t received the confirmation yet. If you finished paying, it usually arrives within a minute. If you closed the page before paying, just tap “Pay online” again.
                </Text>
                <Button title="Check again" variant="soft" small onPress={() => waitForConfirmation(verifiedCount(order))} />
              </View>
            ) : null}
          </>
        )}

        <ErrorText message={error} />
      </ScrollView>

      <View style={styles.footer}>
        {fullyPaid ? (
          <Button title="Continue" onPress={goNext} />
        ) : online ? (
          <Button title={`Pay ${peso(amountDue)} online`} onPress={payOnline} loading={busy || checking} />
        ) : (
          <Button title={method === 'cash' ? 'Confirm cash payment' : 'Submit payment'} onPress={submitManual} loading={busy} />
        )}
        {!fullyPaid ? <Button title="Pay later" variant="ghost" onPress={goNext} /> : null}
      </View>
    </SafeAreaView>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.root}>
      <BackHeader title="Payment" />
      <View style={{ padding: 20 }}>
        <ErrorText message={message} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 16, paddingBottom: 30 },
  amount: { backgroundColor: colors.plum700, borderRadius: radius.lg, padding: 20, alignItems: 'center', gap: 2 },
  amountLabel: { fontFamily: fonts.medium, fontSize: 12, color: '#D9C6E3' },
  amountValue: { fontFamily: fonts.serif, fontSize: 36, color: colors.gold },
  amountSub: { fontFamily: fonts.regular, fontSize: 13, color: '#E3D2EC' },
  note: { fontFamily: fonts.medium, fontSize: 13, color: colors.warn, backgroundColor: colors.warnBg, padding: 12, borderRadius: radius.md },
  h: { fontFamily: fonts.serif, fontSize: 18, color: colors.text },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  cardText: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  cardNumber: { fontFamily: fonts.bold, fontSize: 20, color: colors.plum700, marginTop: 2 },
  proof: { height: 150, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#FFFDF6' },
  proofImg: { width: '100%', height: '100%' },
  footer: { padding: 16, gap: 4, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
