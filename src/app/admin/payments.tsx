import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Column, DataTable, T } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { Chip, ErrorText, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { adminGetPayments } from '@/lib/api';
import { formatDateTime, METHOD_LABEL, PAYMENT_STATUS_LABEL, shortId } from '@/lib/format';
import { peso } from '@/lib/pricing';
import { useLoad } from '@/lib/useLoad';
import type { PaymentStatus } from '@/lib/types';

// Read-only view of money that has been received. Verifying / rejecting a payment
// is done on the order's own page.
interface OrderRow {
  id: string; // order id
  customerId: string;
  customer: string;
  paid: number;
  total: number;
  payments: number;
  last: string;
  methods: string[];
}
interface CustomerRow {
  id: string; // customer id
  customer: string;
  paid: number;
  orders: number;
  payments: number;
  last: string;
}

const VIEWS = [
  { key: 'orders', label: 'By order' },
  { key: 'customers', label: 'By customer' },
] as const;

export default function Payments() {
  const router = useRouter();
  const { data, loading, error } = useLoad(adminGetPayments);
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('orders');

  const { orderRows, customerRows, totalPaid, count } = useMemo(() => {
    const verified = (data ?? []).filter((p) => p.payment_status === 'verified');
    const byOrder = new Map<string, OrderRow>();
    const byCustomer = new Map<string, CustomerRow & { orderIds: Set<string> }>();
    for (const p of verified) {
      const name = p.profiles?.full_name ?? 'Customer';
      const o: OrderRow = byOrder.get(p.order_id) ?? { id: p.order_id, customerId: p.customer_id, customer: name, paid: 0, total: Number(p.orders?.total_amount ?? 0), payments: 0, last: p.created_at, methods: [] };
      o.paid += Number(p.amount);
      o.payments += 1;
      if (p.created_at > o.last) o.last = p.created_at;
      const m = METHOD_LABEL[p.payment_method] ?? p.payment_method;
      if (!o.methods.includes(m)) o.methods.push(m);
      byOrder.set(p.order_id, o);

      const c: CustomerRow & { orderIds: Set<string> } = byCustomer.get(p.customer_id) ?? { id: p.customer_id, customer: name, paid: 0, orders: 0, payments: 0, last: p.created_at, orderIds: new Set<string>() };
      c.paid += Number(p.amount);
      c.payments += 1;
      c.orderIds.add(p.order_id);
      c.orders = c.orderIds.size;
      if (p.created_at > c.last) c.last = p.created_at;
      byCustomer.set(p.customer_id, c);
    }
    const byLast = <T extends { last: string }>(a: T, b: T) => b.last.localeCompare(a.last);
    return {
      orderRows: [...byOrder.values()].sort(byLast),
      customerRows: [...byCustomer.values()].sort(byLast),
      totalPaid: verified.reduce((s, p) => s + Number(p.amount), 0),
      count: verified.length,
    };
  }, [data]);

  if (loading) return <Loading />;

  const balanceStatus = (o: OrderRow): PaymentStatus => (o.paid >= o.total && o.total > 0 ? 'paid' : 'partially_paid');

  const orderColumns: Column<OrderRow>[] = [
    { title: 'Last payment', width: 150, render: (o) => <Text style={T.secondary}>{formatDateTime(o.last)}</Text> },
    { title: 'Customer', flex: 1.3, render: (o) => <Text style={T.primary}>{o.customer}</Text> },
    { title: 'Order', width: 110, render: (o) => <Text style={T.text}>{shortId(o.id)}</Text> },
    { title: 'Verified paid', width: 130, render: (o) => <Text style={T.primary}>{peso(o.paid)}</Text> },
    { title: 'Order total', width: 120, render: (o) => <Text style={T.text}>{peso(o.total)}</Text> },
    { title: 'Method', flex: 1, render: (o) => <Text style={T.secondary}>{o.methods.join(', ')}</Text> },
    { title: 'Status', width: 140, render: (o) => <StatusBadge status={balanceStatus(o)} label={PAYMENT_STATUS_LABEL[balanceStatus(o)]} /> },
  ];

  const customerColumns: Column<CustomerRow>[] = [
    { title: 'Customer', flex: 1.4, render: (c) => <Text style={T.primary}>{c.customer}</Text> },
    { title: 'Orders paid', width: 120, render: (c) => <Text style={T.text}>{c.orders}</Text> },
    { title: 'Payments', width: 110, render: (c) => <Text style={T.text}>{c.payments}</Text> },
    { title: 'Total verified', width: 140, render: (c) => <Text style={T.primary}>{peso(c.paid)}</Text> },
    { title: 'Last payment', width: 150, render: (c) => <Text style={T.secondary}>{formatDateTime(c.last)}</Text> },
  ];

  return (
    <View>
      <PageHeader title="Payments" subtitle="Verified payments received from each customer and order." />

      <View style={styles.summary}>
        <View style={styles.tile}>
          <Text style={styles.tileL}>Total verified</Text>
          <Text style={styles.tileN}>{peso(totalPaid)}</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileL}>Verified payments</Text>
          <Text style={styles.tileN}>{count}</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileL}>Paying customers</Text>
          <Text style={styles.tileN}>{customerRows.length}</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {VIEWS.map((v) => (
          <Chip key={v.key} label={v.label} selected={view === v.key} onPress={() => setView(v.key)} />
        ))}
      </View>
      <ErrorText message={error} />
      {view === 'orders' ? (
        <DataTable columns={orderColumns} rows={orderRows} onRowPress={(o) => router.push(`/admin/orders/${o.id}`)} empty="No verified payments yet." minWidth={900} />
      ) : (
        <DataTable columns={customerColumns} rows={customerRows} empty="No verified payments yet." minWidth={700} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 18 },
  tile: { flexGrow: 1, flexBasis: 200, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 18, gap: 2 },
  tileL: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  tileN: { fontFamily: fonts.serif, fontSize: 30, color: colors.plum700 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
});
