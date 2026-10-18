import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

// PayMongo sends the customer here after paying (or cancelling). Public page, no login needed.
export default function PayResult() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const ok = status === 'success';
  return (
    <View style={styles.root}>
      <View style={[styles.badge, { backgroundColor: ok ? colors.successBg : colors.warnBg }]}>
        <Text style={{ fontSize: 34 }}>{ok ? '✓' : '!'}</Text>
      </View>
      <Text style={styles.title}>{ok ? 'Payment received' : 'Payment not completed'}</Text>
      <Text style={styles.text}>
        {ok
          ? 'Thank you! You can close this page and go back to the Purple Yam app. Your order will update in a moment.'
          : 'No payment was made. Close this page and go back to the Purple Yam app to try again.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: colors.cream },
  badge: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.serif, fontSize: 28, color: colors.text, textAlign: 'center' },
  text: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: 'center', maxWidth: 380, lineHeight: 22 },
});
