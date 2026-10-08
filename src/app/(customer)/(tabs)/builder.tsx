import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, CakeThumb, Chip } from '@/components/ui';
import { useOrderDraft } from '@/context/OrderDraftContext';
import { colors, fonts, radius } from '@/constants/theme';
import { getAvailableCakes } from '@/lib/api';
import { FLAVORS, FROSTINGS, SIZES, TIERS } from '@/lib/pricing';
import type { Cake } from '@/lib/types';

const FLAVOR_COLOR: Record<string, string> = {
  Ube: '#8A4B87',
  Chocolate: '#5B3A29',
  Vanilla: '#E8D3A5',
  'Red Velvet': '#A8323E',
};

// "screen-customizer" in the design: the Cake Builder
export default function Builder() {
  const router = useRouter();
  const { draft, update } = useOrderDraft();
  const [cakes, setCakes] = useState<Cake[]>([]);

  useEffect(() => {
    getAvailableCakes()
      .then((list) => {
        setCakes(list);
        // Nothing chosen yet? Preselect the first cake so the builder always has a base price.
        if (!draft.cake && list.length) update({ cake: list[0] });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layerColor = FLAVOR_COLOR[draft.flavor] ?? colors.mauve;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Cake Builder</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Preview */}
        <View style={styles.preview}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{draft.cake ? `${draft.cake.name} selected` : 'Pick a base cake'}</Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <View style={styles.topper} />
            {Array.from({ length: draft.tiers }).map((_, i) => {
              // i = 0 is the top (smallest) tier; each tier below is wider
              const width = 70 + i * 36 + sizeBoost(draft.size);
              return (
                <View
                  key={i}
                  style={[
                    styles.tier,
                    { width, backgroundColor: layerColor, opacity: 1 - (draft.tiers - 1 - i) * 0.12 },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Section title="Base cake">
          <FlatList
            horizontal
            data={cakes}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              const on = draft.cake?.id === item.id;
              return (
                <Pressable onPress={() => update({ cake: item })} style={[styles.baseCake, on && styles.baseCakeOn]}>
                  <CakeThumb uri={item.image_url} size={64} />
                  <Text style={styles.baseCakeName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </Section>

        <Section title="1. Choose Size">
          <Row>
            {SIZES.map((s) => (
              <Option key={s} label={s} on={draft.size === s} onPress={() => update({ size: s })} />
            ))}
          </Row>
        </Section>

        <Section title="2. Tiers / Layers">
          <Row>
            {TIERS.map((t) => (
              <Option key={t} label={`${t} Tier`} on={draft.tiers === t} onPress={() => update({ tiers: t })} />
            ))}
          </Row>
        </Section>

        <Section title="3. Flavor">
          <Row wrap>
            {FLAVORS.map((f) => (
              <Chip key={f} label={f} selected={draft.flavor === f} onPress={() => update({ flavor: f })} />
            ))}
          </Row>
        </Section>

        <Section title="4. Frosting Type">
          <Row>
            {FROSTINGS.map((f) => (
              <Option key={f} label={f} on={draft.frosting === f} onPress={() => update({ frosting: f })} />
            ))}
          </Row>
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Proceed with Configuration"
          disabled={!draft.cake}
          onPress={() => router.push('/upload')}
        />
      </View>
    </SafeAreaView>
  );
}

const sizeBoost = (size: string) => ({ '6"': 0, '8"': 14, '10"': 28, '12"': 42 } as Record<string, number>)[size] ?? 0;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Row({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
  return <View style={{ flexDirection: 'row', gap: 10, flexWrap: wrap ? 'wrap' : 'nowrap' }}>{children}</View>;
}
function Option({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, on && styles.optionOn]} accessibilityState={{ selected: on }}>
      <Text style={[styles.optionText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: fonts.serif, fontSize: 18, color: colors.text },
  scroll: { padding: 20, gap: 22, paddingBottom: 30 },
  preview: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, minHeight: 200 },
  badge: { alignSelf: 'flex-end', borderWidth: 1, borderColor: colors.gold, backgroundColor: '#FFF6D9', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.medium, fontSize: 11, color: colors.warn },
  topper: { width: 38, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginBottom: 2 },
  tier: { height: 38, borderRadius: 6, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  option: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },
  optionOn: { backgroundColor: colors.plum700, borderColor: colors.plum700 },
  optionText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  baseCake: { width: 96, gap: 4, padding: 6, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent' },
  baseCakeOn: { borderColor: colors.plum700, backgroundColor: colors.lilac },
  baseCakeName: { fontFamily: fonts.medium, fontSize: 11, color: colors.text },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cream },
});
