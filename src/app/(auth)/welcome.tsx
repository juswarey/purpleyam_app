import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';

// "screen-app" in the design: splash with logo + Get Started
export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.brand}>Purple Yam</Text>
        <Text style={styles.tag}>Custom cakes, baked fresh for your celebration</Text>
      </View>
      <View style={styles.footer}>
        <Button title="Get started" variant="gold" onPress={() => router.push('/login')} style={styles.cta} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.plum900 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  logo: { width: 190, height: 190 },
  brand: { fontFamily: fonts.serif, fontSize: 34, color: colors.gold, marginTop: 6 },
  tag: { fontFamily: fonts.regular, fontSize: 14, color: '#D9C6E3', textAlign: 'center' },
  footer: { padding: 28 },
  cta: { borderColor: '#D9C6E3' },
});
