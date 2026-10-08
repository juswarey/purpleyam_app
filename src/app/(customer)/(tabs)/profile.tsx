import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts } from '@/constants/theme';
import { updateMyProfile } from '@/lib/api';

export default function Profile() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setAddress(profile?.address ?? '');
  }, [profile]);

  const save = async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await updateMyProfile(session.user.id, { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() });
      await refreshProfile();
      Alert.alert('Saved', 'Your profile was updated.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <Field label="Full name" value={fullName} onChangeText={setFullName} />
          <Field label="Contact number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Address" value={address} onChangeText={setAddress} multiline />
          <ErrorText message={error} />
          <Button title="Save changes" onPress={save} loading={busy} />
          <View style={{ height: 8 }} />
          <Button title="Log out" variant="outline" onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 20, gap: 14 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.text },
  email: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: 6 },
});
