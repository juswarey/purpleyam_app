import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { Column, DataTable, T } from '@/components/admin/DataTable';
import { PageHeader, Toast } from '@/components/admin/PageHeader';
import { Button, Chip, ErrorText, Loading, StatusBadge } from '@/components/ui';
import { AdminReservation, adminGetReservations, adminSetReservationStatus } from '@/lib/api';
import { formatPickupDate, formatPickupTime, RESERVATION_LABEL, shortId, toLocalISODate } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import type { ReservationStatus } from '@/lib/types';

const FILTERS: { key: 'upcoming' | 'today' | 'past' | 'all'; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'today', label: 'Today' },
  { key: 'past', label: 'Past & closed' },
  { key: 'all', label: 'All' },
];

export default function Reservations() {
  const router = useRouter();
  const { data, loading, error, reload } = useLoad(adminGetReservations);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('upcoming');
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = toLocalISODate(new Date());
  const rows = useMemo(
    () =>
      (data ?? []).filter((r) => {
        const open = r.status === 'reserved' || r.status === 'confirmed';
        if (filter === 'upcoming') return open && r.pickup_date >= today;
        if (filter === 'today') return open && r.pickup_date === today;
        if (filter === 'past') return !open || r.pickup_date < today;
        return true;
      }),
    [data, filter, today]
  );

  if (loading) return <Loading />;

  const set = async (id: string, status: ReservationStatus) => {
    setActionError(null);
    try {
      await adminSetReservationStatus(id, status);
      await reload();
      setToast(`Pickup ${RESERVATION_LABEL[status].toLowerCase()}`);
      setTimeout(() => setToast(null), 2500);
    } catch (e: any) {
      setActionError(e.message);
    }
  };

  const columns: Column<AdminReservation>[] = [
    {
      title: 'Pickup',
      width: 190,
      render: (r) => (
        <View>
          <Text style={T.primary}>{formatPickupDate(r.pickup_date)}</Text>
          <Text style={T.secondary}>{formatPickupTime(r.pickup_time)}</Text>
        </View>
      ),
    },
    {
      title: 'Customer',
      flex: 1.2,
      render: (r) => (
        <View>
          <Text style={T.primary}>{r.profiles?.full_name ?? '—'}</Text>
          <Text style={T.secondary}>{r.profiles?.phone ?? ''}</Text>
        </View>
      ),
    },
    {
      title: 'Cake',
      flex: 1.2,
      render: (r) => (
        <View>
          <Text style={T.text}>{r.orders?.cakes?.name ?? 'Custom cake'}</Text>
          <Text style={T.secondary}>
            {shortId(r.order_id)} · {r.orders?.cake_size}
          </Text>
        </View>
      ),
    },
    { title: 'Status', width: 120, render: (r) => <StatusBadge status={r.status} label={RESERVATION_LABEL[r.status]} /> },
    {
      title: 'Actions',
      width: 300,
      render: (r) =>
        r.status === 'reserved' || r.status === 'confirmed' ? (
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {r.status === 'reserved' ? <Button title="Confirm" small onPress={() => set(r.id, 'confirmed')} /> : null}
            <Button title="Picked up" variant="soft" small onPress={() => set(r.id, 'completed')} />
            <Button title="Cancel" variant="outline" small onPress={() => set(r.id, 'cancelled')} />
          </View>
        ) : (
          <Text style={T.secondary}>—</Text>
        ),
    },
  ];

  return (
    <View>
      <PageHeader title="Pickups" subtitle="Customers’ reserved pickup times, soonest first." />
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </View>
      <ErrorText message={error ?? actionError} />
      <DataTable columns={columns} rows={rows} onRowPress={(r) => router.push(`/admin/orders/${r.order_id}`)} empty="No pickups in this view." minWidth={940} />
      <Toast message={toast} />
    </View>
  );
}

const styles = StyleSheet.create({ filters: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' } });
