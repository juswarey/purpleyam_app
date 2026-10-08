import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Column, DataTable, T } from '@/components/admin/DataTable';
import { PageHeader } from '@/components/admin/PageHeader';
import { ErrorText, Loading } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { adminGetCustomers } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Profile } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

export default function Customers() {
  const { data, loading, error } = useLoad(adminGetCustomers);
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((c) => !s || `${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(s));
  }, [data, q]);

  if (loading) return <Loading />;

  const columns: Column<Profile>[] = [
    { title: 'Name', flex: 1.2, render: (c) => <Text style={T.primary}>{c.full_name || '—'}</Text> },
    { title: 'Email', flex: 1.4, render: (c) => <Text style={T.text}>{c.email ?? '—'}</Text> },
    { title: 'Phone', flex: 1, render: (c) => <Text style={T.text}>{c.phone || '—'}</Text> },
    { title: 'Address', flex: 1.6, render: (c) => <Text style={T.secondary}>{c.address || '—'}</Text> },
    { title: 'Joined', width: 130, render: (c) => <Text style={T.secondary}>{formatDate(c.created_at)}</Text> },
  ];

  return (
    <View>
      <PageHeader
        title="Customers"
        subtitle={`${data?.length ?? 0} registered customers`}
        right={<TextInput value={q} onChangeText={setQ} placeholder="Search name, email or phone" placeholderTextColor="#A395A8" style={styles.search} />}
      />
      <ErrorText message={error} />
      <DataTable columns={columns} rows={rows} empty="No customers match." />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { width: 300, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
});
