import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts } from '@/constants/theme';

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) return setError('Please fill in every field.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp({ email, password, fullName, phone });
      if (needsConfirmation) {
        setInfo('Account created. Check your email to confirm it, then log in.');
      } else {
        router.replace('/');
      }
    } catch (e: any) {
      setError(e.message ?? 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Create your account</Text>
          <View style={styles.card}>
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Juan Dela Cruz" />
            <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@email.com" />
            <Field label="Contact number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="09XX XXX XXXX" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
            <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Type it again" />
            <ErrorText message={error} />
            {info ? <Text style={styles.info}>{info}</Text> : null}
            <Button title="Register" onPress={submit} loading={busy} />
          </View>
          <Button title="I already have an account" variant="ghost" onPress={() => router.replace('/login')} style={{ borderWidth: 0 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.plum900 },
  scroll: { padding: 24, alignItems: 'center', gap: 14 },
  logo: { width: 110, height: 110 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.gold, marginBottom: 4 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#F4EDF3', borderRadius: 18, padding: 18, gap: 12 },
  info: { fontFamily: fonts.medium, fontSize: 13, color: colors.success, backgroundColor: colors.successBg, padding: 12, borderRadius: 12 },
});
