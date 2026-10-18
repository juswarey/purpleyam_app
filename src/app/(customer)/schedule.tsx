import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button, Chip, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { BAKERY } from '@/constants/bakery';
import { colors, fonts } from '@/constants/theme';
import { createReservation } from '@/lib/api';
import { formatPickupDate, formatPickupTime, toLocalISODate } from '@/lib/format';

export default function Schedule() {
  const router = useRouter();
  const { session } = useAuth();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const out: string[] = [];
    for (let i = BAKERY.minLeadDays; i <= BAKERY.maxAdvanceDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push(toLocalISODate(d));
    }
    return out;
  }, []);

  const submit = async () => {
    if (!session || !date || !time) return setError('Pick a pickup date and time.');
    setBusy(true);
    setError(null);
    try {
      await createReservation({
        order_id: orderId,
        customer_id: session.user.id,
        pickup_date: date,
        pickup_time: time,
        notes: notes.trim() || null,
      });
      router.replace(`/order/${orderId}`);
    } catch (e: any) {
      setError(e.message ?? 'Could not save your pickup schedule.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title="Pickup Schedule" onBack={() => router.replace(`/order/${orderId}`)} />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sub}>
          Cakes need about {BAKERY.prepDays} to prepare, so the earliest pickup is {formatPickupDate(dates[0])}.
        </Text>

        <Text style={styles.h}>Pickup date</Text>
        <View style={styles.wrap}>
          {dates.map((d) => (
            <Chip key={d} label={formatPickupDate(d)} selected={date === d} onPress={() => setDate(d)} />
          ))}
        </View>

        <Text style={styles.h}>Pickup time</Text>
        <View style={styles.wrap}>
          {BAKERY.pickupSlots.map((t) => (
            <Chip key={t} label={formatPickupTime(t)} selected={time === t} onPress={() => setTime(t)} />
          ))}
        </View>

        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Someone else will pick it up, call before arriving..." multiline />
        <ErrorText message={error} />
      </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <Button title="Reserve pickup" onPress={submit} loading={busy} />
        <Button title="Choose later" variant="ghost" onPress={() => router.replace(`/order/${orderId}`)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 14, paddingBottom: 30 },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  h: { fontFamily: fonts.serif, fontSize: 18, color: colors.text, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { padding: 16, gap: 4, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
