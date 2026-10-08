import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, CakeThumb, Chip, EmptyState, Loading } from '@/components/ui';
import { useOrderDraft } from '@/context/OrderDraftContext';
import { colors, fonts, radius } from '@/constants/theme';
import { getAvailableCakes, getUnreadCount } from '@/lib/api';
import { peso } from '@/lib/pricing';
import type { Cake } from '@/lib/types';

const CATEGORIES = ['All', 'Birthday', 'Wedding', 'Anniversary'];

export default function Home() {
  const router = useRouter();
  const { update, reset } = useOrderDraft();
  const [cakes, setCakes] = useState<Cake[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [c, n] = await Promise.all([getAvailableCakes(), getUnreadCount()]);
      setCakes(c);
      setUnread(n);
    } catch (e: any) {
      setError(e.message);
      setCakes((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (cakes ?? []).filter((c) => {
      const text = `${c.name} ${c.description ?? ''}`.toLowerCase();
      const matchQ = !q || text.includes(q);
      const matchCat = category === 'All' || text.includes(category.toLowerCase());
      return matchQ && matchCat;
    });
  }, [cakes, query, category]);

  const startDesign = (cake?: Cake) => {
    reset();
    if (cake) update({ cake });
    router.push('/builder');
  };

  if (!cakes) return <Loading />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={shown}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 14, paddingHorizontal: 20 }}
        contentContainerStyle={{ paddingBottom: 24, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 18 }}>
            <View style={styles.header}>
              <View>
                <Text style={styles.brand}>Purple Yam</Text>
                <Text style={styles.sub}>ARTISANAL PATISSERIE</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
                  <MaterialCommunityIcons name="bell-outline" size={22} color={colors.plum700} />
                  {unread > 0 ? <View style={styles.dot} /> : null}
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={() => router.push('/profile')} accessibilityLabel="Profile">
                  <MaterialCommunityIcons name="account-outline" size={22} color={colors.plum700} />
                </Pressable>
              </View>
            </View>

            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Crafting Your Dream Celebrations</Text>
              <Text style={styles.heroText}>Custom artisanal ube & specialty cakes baked fresh.</Text>
              <Button title="Design Your Cake" variant="gold" small onPress={() => startDesign()} style={{ alignSelf: 'flex-start' }} />
            </View>

            <View style={styles.search}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search cakes, flavors, decorators..."
                placeholderTextColor="#A395A8"
                style={styles.searchInput}
              />
            </View>

            <View style={{ gap: 10 }}>
              <Text style={styles.h2}>Popular Celebrations</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={CATEGORIES}
                keyExtractor={(c) => c}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => <Chip label={item} selected={item === category} onPress={() => setCategory(item)} />}
              />
            </View>

            <Text style={styles.h2}>Featured Creations</Text>
            {error ? <Text style={styles.err}>Couldn’t load cakes: {error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No cakes found" hint="Try a different search, or design your own cake from scratch." />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.cake} onPress={() => startDesign(item)}>
            <CakeThumb uri={item.image_url} />
            <Text style={styles.cakeName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.cakePrice}>From {peso(item.price)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 },
  brand: { fontFamily: fonts.serif, fontSize: 24, color: colors.plum700 },
  sub: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.2, color: colors.mauve },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.gold, borderWidth: 1.5, borderColor: colors.lilac },
  hero: {
    marginHorizontal: 20,
    borderRadius: radius.lg,
    backgroundColor: colors.plum700,
    padding: 20,
    gap: 8,
  },
  heroTitle: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: '#fff' },
  heroText: { fontFamily: fonts.regular, fontSize: 13, color: '#E3D2EC', marginBottom: 6 },
  search: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  h2: { fontFamily: fonts.serif, fontSize: 19, color: colors.text, paddingHorizontal: 20 },
  cake: { flex: 1, gap: 4 },
  cakeName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginTop: 6 },
  cakePrice: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  err: { marginHorizontal: 20, color: colors.danger, fontFamily: fonts.medium, fontSize: 13 },
});
