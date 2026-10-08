import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/BackHeader';
import { Button, CakeThumb, Card, ErrorText } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOrderDraft } from '@/context/OrderDraftContext';
import { BAKERY } from '@/constants/bakery';
import { colors, fonts, radius } from '@/constants/theme';
import { addOrderImage, createOrder } from '@/lib/api';
import { calculatePrice, peso } from '@/lib/pricing';
import { uploadToBucket } from '@/lib/storage';

// "screen-summary" in the design
export default function Summary() {
  const router = useRouter();
  const { session } = useAuth();
  const { draft, reset } = useOrderDraft();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createdId = useRef<string | null>(null); // avoids creating a second order if the user retries

  const cake = draft.cake;
  if (!cake) {
    return (
      <SafeAreaView style={styles.root}>
        <BackHeader title="Order Summary" />
        <View style={styles.center}>
          <Text style={styles.muted}>Your cake design was cleared. Go back to the builder to start again.</Text>
          <Button title="Open builder" onPress={() => router.replace('/builder')} />
        </View>
      </SafeAreaView>
    );
  }

  // Same rule as the database: style tags or baker's notes add the custom design fee.
  const hasCustomDesign = !!draft.notes.trim() || draft.styleTags.length > 0;
  const price = calculatePrice({ basePrice: cake.price, size: draft.size, tiers: draft.tiers, hasCustomDesign });

  const place = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      let orderId = createdId.current;
      if (!orderId) {
        const order = await createOrder({
          cake_id: cake.id,
          quantity: 1,
          cake_size: `${draft.size} / ${draft.tiers} ${draft.tiers === 1 ? 'Tier' : 'Tiers'}`,
          flavor: draft.flavor,
          filling: draft.frosting, // the design asks for "Frosting Type", stored in the filling column
          design_description: draft.styleTags.length ? `Style: ${draft.styleTags.join(', ')}` : null,
          custom_message: draft.message.trim() || null,
          additional_instructions: draft.notes.trim() || null,
        });
        orderId = order.id;
        createdId.current = orderId;
      }
      // Upload the inspiration photos (the order already exists, so a failed photo won't lose it)
      for (const img of draft.images) {
        const path = await uploadToBucket('order-images', session.user.id, orderId, img);
        await addOrderImage(orderId, path);
      }
      reset();
      router.replace({ pathname: '/payment', params: { orderId } });
    } catch (e: any) {
      setError(
        createdId.current
          ? `Your order was created, but a photo failed to upload: ${e.message}. Tap again to retry.`
          : e.message ?? 'Could not place your order.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackHeader title="Order Summary" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.cakeRow}>
          <CakeThumb uri={cake.image_url} size={70} style={{ width: 70 }} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.cakeName}>{cake.name}</Text>
            <Text style={styles.muted}>
              {draft.size} size • {draft.tiers} {draft.tiers === 1 ? 'Tier' : 'Tiers'} • {draft.flavor}
            </Text>
            <Text style={styles.muted}>{draft.frosting} frosting</Text>
          </View>
        </Card>

        <Text style={styles.h}>Cost Breakdown</Text>
        <Card style={{ gap: 10 }}>
          <Line label={`Base cake cost (8")`} value={peso(price.base)} />
          {price.sizeAdjustment !== 0 ? (
            <Line label={`Size adjustment (${draft.size})`} value={`${price.sizeAdjustment < 0 ? '−' : ''}${peso(Math.abs(price.sizeAdjustment))}`} />
          ) : null}
          {price.tierUpgrade > 0 ? <Line label={`Tier upgrade (${draft.tiers} layers)`} value={peso(price.tierUpgrade)} /> : null}
          {price.designFee > 0 ? <Line label="Custom design fee" value={peso(price.designFee)} /> : null}
          <View style={styles.divider} />
          <Line label="Total cake value" value={peso(price.total)} bold />
        </Card>

        <View style={styles.down}>
          <View>
            <Text style={styles.downLabel}>DOWN PAYMENT (50%)</Text>
            <Text style={styles.downAmount}>{peso(price.downPayment)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.downLabel}>Est. Prep Time</Text>
            <Text style={styles.prep}>{BAKERY.prepDays}</Text>
          </View>
        </View>

        {draft.images.length ? <Text style={styles.muted}>{draft.images.length} reference photo(s) will be sent to the baker.</Text> : null}
        {draft.notes.trim() ? <Text style={styles.muted}>Notes: {draft.notes.trim()}</Text> : null}
        {draft.message.trim() ? <Text style={styles.muted}>Message on cake: “{draft.message.trim()}”</Text> : null}
        <Text style={styles.fine}>
          The final price is confirmed by the bakery system when you place the order. The bakery reviews every order before approving it.
        </Text>
        <ErrorText message={error} />
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Proceed to Payment" onPress={place} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, bold && { fontFamily: fonts.bold, color: colors.text }]}>{label}</Text>
      <Text style={[styles.lineValue, bold && { fontFamily: fonts.bold, fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 16, paddingBottom: 30 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  cakeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cakeName: { fontFamily: fonts.serif, fontSize: 17, color: colors.text },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  h: { fontFamily: fonts.serif, fontSize: 18, color: colors.text },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, flex: 1 },
  lineValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  down: { backgroundColor: colors.plum700, borderRadius: radius.lg, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  downLabel: { fontFamily: fonts.medium, fontSize: 11, color: '#D9C6E3', letterSpacing: 0.6 },
  downAmount: { fontFamily: fonts.serif, fontSize: 26, color: colors.gold, marginTop: 2 },
  prep: { fontFamily: fonts.semibold, fontSize: 15, color: '#fff', marginTop: 2 },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
