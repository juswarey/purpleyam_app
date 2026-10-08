import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, isWeb } from '@/constants/theme';

/**
 * One route, two looks:
 *  - Mobile  -> customer login (matches the "screen-login" design)
 *  - Web     -> bakery/admin portal login
 */
export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (e: any) {
      setError(e.message === 'Invalid login credentials' ? 'Wrong email or password.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  if (isWeb) {
    return (
      <View style={web.root}>
        <View style={web.side}>
          <Image source={require('../../../assets/images/logo.png')} style={web.logo} resizeMode="contain" />
          <Text style={web.sideTitle}>Purple Yam{'\n'}Bakery Portal</Text>
          <Text style={web.sideText}>Review orders, verify payments and keep the oven schedule in one place.</Text>
        </View>
        <View style={web.formWrap}>
          <View style={web.form}>
            <Text style={web.heading}>Sign in</Text>
            <Text style={web.sub}>Use the bakery account.</Text>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="bakery@email.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" onSubmitEditing={submit} />
            <ErrorText message={error} />
            <Button title="Sign in" onPress={submit} loading={busy} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.card}>
            <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@email.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" onSubmitEditing={submit} />
            <ErrorText message={error} />
          </View>
          <View style={styles.row}>
            <Button title="Login" variant="gold" onPress={submit} loading={busy} style={styles.half} />
            <Button title="Register" variant="gold" onPress={() => router.push('/register')} style={styles.half} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.plum900 },
  scroll: { padding: 24, alignItems: 'center', gap: 18, flexGrow: 1, justifyContent: 'center' },
  logo: { width: 170, height: 170 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#F4EDF3', borderRadius: 18, padding: 18, gap: 12 },
  row: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 440 },
  half: { flex: 1, borderColor: '#D9C6E3' },
});

const web = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.cream },
  side: { flex: 1, backgroundColor: colors.plum900, padding: 64, justifyContent: 'center', gap: 20 },
  logo: { width: 120, height: 120 },
  sideTitle: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 52, color: colors.gold },
  sideText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: '#D9C6E3', maxWidth: 380 },
  formWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  form: { width: '100%', maxWidth: 380, gap: 14 },
  heading: { fontFamily: fonts.serif, fontSize: 30, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginBottom: 6 },
});
