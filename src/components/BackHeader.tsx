import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export function BackHeader({ title, right, onBack }: { title: string; right?: React.ReactNode; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <Pressable
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color={colors.plum700} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lilac },
  title: { flex: 1, textAlign: 'center', fontFamily: fonts.serif, fontSize: 18, color: colors.text },
  right: { width: 40, alignItems: 'flex-end' },
});
