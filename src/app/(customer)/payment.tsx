import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button, Card, Chip, ErrorText, Field, Loading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { BAKERY } from '@/constants/bakery';
import { colors, fonts, radius } from '@/constants/theme';
import { createPayment, getOrder } from '@/lib/api';
import { METHOD_LABEL } from '@/lib/format';
import { peso } from '@/lib/pricing';
import { PickedImage, pickImages, uploadToBucket } from '@/lib/storage';
import type { Order, PaymentMethod } from '@/lib/types';

const METHODS: PaymentMethod[] = ['gcash', 'bank_transfer', 'cash'];

export default function Payment() {
  const router = useRouter();
  const { session } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<PickedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrder(orderId)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [orderId]);

  if (!order) return error ? <ErrorScreen message={error} /> : <Loading />;

  const alreadyPending = (order.payments ?? []).some((p) => p.payment_status !== 'rejected');
  const amountDue = order.down_payment;
  const needsProof = method !== 'cash';

  const choosePhoto = async () => {
    try {
      const [img] = await pickImages(1);
      if (img) setProof(img);
    } catch (e: any) {
      Alert.alert('Could not open photos', e.message);
    }
  };

  const submit = async () => {
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
      router.replace({ pathname: '/schedule', params: { orderId: order.id } });
    } catch (e: any) {
      setError(e.message ?? 'Could not save your payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title="Down Payment" onBack={() => router.replace(`/order/${order.id}`)} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.amount}>
          <Text style={styles.amountLabel}>Down payment to send</Text>
          <Text style={styles.amountValue}>{peso(amountDue)}</Text>
          <Text style={styles.amountSub}>of {peso(order.total_amount)} total</Text>
        </View>

        {alreadyPending ? (
          <Text style={styles.note}>You already sent a payment for this order. You can send another one only if the first was rejected.</Text>
        ) : null}

        <Text style={styles.h}>How are you paying?</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {METHODS.map((m) => (
            <Chip key={m} label={METHOD_LABEL[m]} selected={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>

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

        {needsProof ? (
          <>
            <Field label="Reference number" value={reference} onChangeText={setReference} placeholder="e.g. 1234 567 890" autoCapitalize="characters" />
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>Payment screenshot</Text>
              <Pressable style={styles.proof} onPress={choosePhoto}>
                {proof ? (
                  <Image source={{ uri: proof.uri }} style={styles.proofImg} resizeMode="cover" />
                ) : (
                  <Text style={styles.cardText}>Tap to upload proof of payment</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : null}

        <ErrorText message={error} />
      </ScrollView>
      <View style={styles.footer}>
        <Button title={method === 'cash' ? 'Confirm cash payment' : 'Submit payment'} onPress={submit} loading={busy} />
        <Button title="Pay later" variant="ghost" onPress={() => router.replace({ pathname: '/schedule', params: { orderId: order.id } })} />
      </View>
    </SafeAreaView>
  );
}

const sumVerified = (o: Order) => (o.payments ?? []).filter((p) => p.payment_status === 'verified').reduce((s, p) => s + Number(p.amount), 0);

function ErrorScreen({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.root}>
      <BackHeader title="Down Payment" />
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
