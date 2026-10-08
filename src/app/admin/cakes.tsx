import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Column, DataTable, T } from '@/components/admin/DataTable';
import { Dialog } from '@/components/admin/Dialog';
import { PageHeader, Toast } from '@/components/admin/PageHeader';
import { Button, CakeThumb, ErrorText, Field, Loading, StatusBadge } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { adminAddCake, adminDeleteCake, adminGetCakes, adminUpdateCake } from '@/lib/api';
import { peso } from '@/lib/pricing';
import type { Cake } from '@/lib/types';
import { useLoad } from '@/lib/useLoad';

interface Form {
  id: string | null;
  name: string;
  description: string;
  price: string;
  image_url: string;
  is_available: boolean;
}
const blank: Form = { id: null, name: '', description: '', price: '', image_url: '', is_available: true };

export default function Cakes() {
  const { data, loading, error, reload } = useLoad(adminGetCakes);
  const [form, setForm] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState<Cake | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  };

  if (loading) return <Loading />;

  const save = async () => {
    if (!form) return;
    const price = Number(form.price);
    if (!form.name.trim()) return setFormError('Give the cake a name.');
    if (!Number.isFinite(price) || price < 0 || form.price.trim() === '') return setFormError('Enter a price of 0 or more.');
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        image_url: form.image_url.trim() || null,
        is_available: form.is_available,
      };
      if (form.id) await adminUpdateCake(form.id, payload);
      else await adminAddCake(payload);
      await reload();
      setForm(null);
      flash(form.id ? 'Cake updated' : 'Cake added');
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (c: Cake) => {
    try {
      await adminUpdateCake(c.id, { is_available: !c.is_available });
      await reload();
      flash(c.is_available ? 'Hidden from customers' : 'Now available to customers');
    } catch (e: any) {
      flash(e.message);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminDeleteCake(deleting.id);
      await reload();
      setDeleting(null);
      flash('Cake deleted');
    } catch (e: any) {
      setDeleting(null);
      flash(e.message);
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<Cake>[] = [
    { title: 'Cake', flex: 2, render: (c) => (
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <CakeThumb uri={c.image_url} size={48} style={{ width: 48 }} />
        <View style={{ flex: 1 }}>
          <Text style={T.primary}>{c.name}</Text>
          <Text style={T.secondary} numberOfLines={1}>{c.description ?? ''}</Text>
        </View>
      </View>
    ) },
    { title: 'Base price', width: 120, render: (c) => <Text style={T.primary}>{peso(c.price)}</Text> },
    { title: 'Visible to customers', width: 190, render: (c) => (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Switch value={c.is_available} onValueChange={() => toggle(c)} trackColor={{ true: colors.mauve, false: '#D8CFDC' }} thumbColor="#fff" />
        <StatusBadge status={c.is_available ? 'paid' : 'cancelled'} label={c.is_available ? 'Available' : 'Hidden'} />
      </View>
    ) },
    { title: 'Actions', width: 170, render: (c) => (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Button title="Edit" variant="soft" small onPress={() => { setFormError(null); setForm({ id: c.id, name: c.name, description: c.description ?? '', price: String(c.price), image_url: c.image_url ?? '', is_available: c.is_available }); }} />
        <Button title="Delete" variant="outline" small onPress={() => setDeleting(c)} />
      </View>
    ) },
  ];

  return (
    <View>
      <PageHeader
        title="Cakes"
        subtitle="The base cakes customers can start from. The price shown is for the 8-inch, 1-tier size."
        right={<Button title="Add cake" icon="plus" small onPress={() => { setFormError(null); setForm(blank); }} />}
      />
      <ErrorText message={error} />
      <DataTable columns={columns} rows={data ?? []} empty="No cakes yet. Add your first one." minWidth={800} />

      <Dialog visible={!!form} title={form?.id ? 'Edit cake' : 'Add a cake'} onClose={() => setForm(null)} confirmLabel="Save cake" onConfirm={save} busy={busy} width={520}>
        {form ? (
          <>
            <Field label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Ube Cream Cake" />
            <Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline placeholder="What makes this cake special" />
            <Field label="Base price (₱)" value={form.price} onChangeText={(price) => setForm({ ...form, price })} keyboardType="numeric" placeholder="850" />
            <Field label="Image link (optional)" value={form.image_url} onChangeText={(image_url) => setForm({ ...form, image_url })} autoCapitalize="none" placeholder="https://..." />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Visible to customers</Text>
              <Switch value={form.is_available} onValueChange={(is_available) => setForm({ ...form, is_available })} trackColor={{ true: colors.mauve, false: '#D8CFDC' }} thumbColor="#fff" />
            </View>
            <ErrorText message={formError} />
          </>
        ) : null}
      </Dialog>

      <Dialog visible={!!deleting} title="Delete this cake?" onClose={() => setDeleting(null)} confirmLabel="Delete cake" confirmVariant="danger" onConfirm={remove} busy={busy}>
        <Text style={styles.text}>
          “{deleting?.name}” will be removed from the menu. Past orders keep their details. To hide a cake without deleting it, switch off “Visible to customers” instead.
        </Text>
      </Dialog>
      <Toast message={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
});
