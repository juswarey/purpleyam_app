import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Column, DataTable, T } from '@/components/admin/DataTable';
import { Dialog } from '@/components/admin/Dialog';
import { PageHeader, Toast } from '@/components/admin/PageHeader';
import { Button, Chip, ErrorText, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { AdminPayment, adminGetPayments, adminSetPaymentStatus } from '@/lib/api';
import { formatDateTime, METHOD_LABEL, PAYMENT_RECORD_LABEL, shortId } from '@/lib/format';
import { peso } from '@/lib/pricing';
import { getSignedUrl } from '@/lib/storage';
import { useLoad } from '@/lib/useLoad';

const FILTERS = [
  { key: 'pending', label: 'To verify' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

export default function Payments() {
  const router = useRouter();
  const { data, loading, error, reload } = useLoad(adminGetPayments);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('pending');
  const [open, setOpen] = useState<AdminPayment | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setProof(null);
    if (open?.proof_image_url) getSignedUrl('payment-proofs', open.proof_image_url).then(setProof);
  }, [open]);

  const rows = useMemo(() => (data ?? []).filter((p) => filter === 'all' || p.payment_status === filter), [data, filter]);

  if (loading) return <Loading />;

  const decide = async (status: 'verified' | 'rejected') => {
    if (!open) return;
    setBusy(true);
    setActionError(null);
    try {
      await adminSetPaymentStatus(open.id, status);
      await reload();
      setOpen(null);
      setToast(status === 'verified' ? 'Payment verified' : 'Payment rejected');
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<AdminPayment>[] = [
    { title: 'Received', width: 150, render: (p) => <Text style={T.secondary}>{formatDateTime(p.created_at)}</Text> },
    { title: 'Customer', flex: 1.3, render: (p) => <Text style={T.primary}>{p.profiles?.full_name ?? '—'}</Text> },
    { title: 'Order', width: 110, render: (p) => <Text style={T.text}>{shortId(p.order_id)}</Text> },
    { title: 'Amount', width: 110, render: (p) => <Text style={T.primary}>{peso(p.amount)}</Text> },
    { title: 'Method', width: 130, render: (p) => <Text style={T.text}>{METHOD_LABEL[p.payment_method]}</Text> },
    { title: 'Reference', flex: 1, render: (p) => <Text style={T.secondary}>{p.reference_number ?? '—'}</Text> },
    { title: 'Status', width: 190, render: (p) => <StatusBadge status={p.payment_status} label={PAYMENT_RECORD_LABEL[p.payment_status]} /> },
  ];

  return (
    <View>
      <PageHeader title="Payments" subtitle="Check each proof of payment, then verify or reject it." />
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={`${f.label}${f.key === 'all' ? '' : ` (${(data ?? []).filter((p) => p.payment_status === f.key).length})`}`}
            selected={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>
      <ErrorText message={error} />
      <DataTable columns={columns} rows={rows} onRowPress={setOpen} empty={filter === 'pending' ? 'No payments are waiting for verification.' : 'No payments here.'} minWidth={900} />

      <Dialog visible={!!open} title="Review payment" onClose={() => setOpen(null)} width={520}>
        {open ? (
          <>
            <Text style={styles.big}>{peso(open.amount)}</Text>
            <Text style={styles.muted}>
              {open.profiles?.full_name} · {METHOD_LABEL[open.payment_method]}
              {open.reference_number ? ` · Ref ${open.reference_number}` : ''}
            </Text>
            <Text style={styles.muted}>
              Order {shortId(open.order_id)} · total {peso(open.orders?.total_amount)}
            </Text>
            {proof ? (
              <Pressable onPress={() => Linking.openURL(proof)}>
                <Image source={{ uri: proof }} style={styles.proof} resizeMode="contain" />
              </Pressable>
            ) : (
              <Text style={styles.muted}>{open.proof_image_url ? 'Loading proof…' : 'No proof image was uploaded.'}</Text>
            )}
            <ErrorText message={actionError} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {open.payment_status !== 'verified' ? <Button title="Verify payment" small loading={busy} onPress={() => decide('verified')} /> : null}
              {open.payment_status !== 'rejected' ? <Button title="Reject" variant="outline" small onPress={() => decide('rejected')} /> : null}
              <Button title="Open order" variant="soft" small onPress={() => { const id = open.order_id; setOpen(null); router.push(`/admin/orders/${id}`); }} />
            </View>
          </>
        ) : null}
      </Dialog>
      <Toast message={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  big: { fontFamily: fonts.serif, fontSize: 34, color: colors.plum700 },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  proof: { width: '100%', height: 320, borderRadius: radius.md, backgroundColor: colors.lilac },
});
