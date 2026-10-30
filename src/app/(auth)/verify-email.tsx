import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, radius } from '@/constants/theme';

const MIN_CODE_LENGTH = 6; // Supabase sends 6 to 10 digits depending on the project's OTP length setting
const MAX_CODE_LENGTH = 10;
const RESEND_SECONDS = 60;

export default function VerifyEmail() {
  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = (emailParam ?? '').trim();
  const { verifyEmail, resendVerification } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS); // a code was just sent

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (code.length < MIN_CODE_LENGTH) return setError('Enter the verification code from your email.');
    setBusy(true);
    try {
      await verifyEmail(email, code);
      router.replace('/'); // session is now active; the entry gate sends them to the app
    } catch (e: any) {
      setError(/expired|invalid/i.test(e.message ?? '') ? 'That code is wrong or has expired. Request a new one.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendVerification(email);
      setCode('');
      setCooldown(RESEND_SECONDS);
      setInfo('A new code is on its way.');
    } catch (e: any) {
      setError(e.message ?? 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.sub}>
            We sent a verification code to{'\n'}
            <Text style={styles.email}>{email || 'your email'}</Text>
          </Text>

          <View style={styles.card}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, MAX_CODE_LENGTH))}
              keyboardType="number-pad"
              maxLength={MAX_CODE_LENGTH}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder="••••••••"
              placeholderTextColor="#A395A8"
              onSubmitEditing={submit}
              style={styles.code}
            />
            <ErrorText message={error} />
            {info ? <Text style={styles.info}>{info}</Text> : null}
            <Button title="Verify" onPress={submit} loading={busy} disabled={code.length < MIN_CODE_LENGTH} />
            <Button
              title={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              variant="outline"
              onPress={resend}
              loading={resending}
              disabled={cooldown > 0}
            />
          </View>

          <Text style={styles.hint}>Can’t find it? Check your spam folder.</Text>
          <Button title="Back to login" variant="ghost" onPress={() => router.replace('/login')} style={{ borderWidth: 0 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.plum900 },
  scroll: { padding: 24, alignItems: 'center', gap: 14, flexGrow: 1, justifyContent: 'center' },
  logo: { width: 110, height: 110 },
  title: { fontFamily: fonts.serif, fontSize: 26, color: colors.gold },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: '#D9C6E3', textAlign: 'center', lineHeight: 21 },
  email: { fontFamily: fonts.semibold, color: '#fff' },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#F4EDF3', borderRadius: 18, padding: 18, gap: 12 },
  code: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    textAlign: 'center',
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: 6,
    color: colors.text,
  },
  info: { fontFamily: fonts.medium, fontSize: 13, color: colors.success, backgroundColor: colors.successBg, padding: 12, borderRadius: 12 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: '#D9C6E3' },
});
