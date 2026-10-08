import { Redirect } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { Button, Loading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, isWeb } from '@/constants/theme';

/**
 * Entry gate.
 *  - Web    = Bakery/Admin portal
 *  - Mobile = Customer app
 * Anyone who signs in on the wrong platform sees a short explanation here.
 */
export default function Index() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading || (session && !profile)) return <Loading />;

  if (!session) return <Redirect href={isWeb ? '/login' : '/welcome'} />;

  if (isWeb && profile?.role === 'admin') return <Redirect href="/admin" />;
  if (!isWeb && profile?.role === 'customer') return <Redirect href="/home" />;

  const message = isWeb
    ? 'The Purple Yam web portal is for the bakery team only. Customers: please order through the Purple Yam mobile app.'
    : 'Bakery accounts sign in on the Purple Yam web portal. Please open it in your computer’s browser.';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: colors.cream }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.text, textAlign: 'center' }}>
        Wrong place to sign in
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center', maxWidth: 420 }}>
        {message}
      </Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}
