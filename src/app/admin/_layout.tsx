import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, fonts, isWeb } from '@/constants/theme';
import { adminGetNavCounts } from '@/lib/api';

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
const NAV: { href: string; label: string; icon: Icon; badge?: 'orders' | 'pickups'; match: (p: string) => boolean }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'view-dashboard-outline', match: (p) => p === '/admin' },
  { href: '/admin/orders', label: 'Orders', icon: 'clipboard-list-outline', badge: 'orders', match: (p) => p.startsWith('/admin/orders') },
  { href: '/admin/payments', label: 'Payments', icon: 'cash-check', match: (p) => p.startsWith('/admin/payments') },
  { href: '/admin/reservations', label: 'Pickups', icon: 'calendar-clock-outline', badge: 'pickups', match: (p) => p.startsWith('/admin/reservations') },
  { href: '/admin/reports', label: 'Reports', icon: 'chart-box-outline', match: (p) => p.startsWith('/admin/reports') },
  { href: '/admin/cakes', label: 'Cakes', icon: 'cake-variant-outline', match: (p) => p.startsWith('/admin/cakes') },
  { href: '/admin/customers', label: 'Customers', icon: 'account-group-outline', match: (p) => p.startsWith('/admin/customers') },
];

// Admin portal: web only, admins only.
export default function AdminLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const isAdmin = !!session && profile?.role === 'admin';

  // Counts for the sidebar badges; refreshed on every page change and every 30 seconds.
  const [counts, setCounts] = useState({ orders: 0, pickups: 0 });
  const refreshCounts = useCallback(() => {
    adminGetNavCounts().then(setCounts).catch(() => {});
  }, []);
  useEffect(() => {
    if (!isAdmin) return;
    refreshCounts();
    const t = setInterval(refreshCounts, 30000);
    return () => clearInterval(t);
  }, [isAdmin, refreshCounts, pathname]);

  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  if (!isWeb || profile?.role !== 'admin') return <Redirect href="/" />;

  const nav = (
    <>
      {NAV.map((n) => {
        const active = n.match(pathname);
        const count = n.badge ? counts[n.badge] : 0;
        return (
          <View key={n.href} style={{ zIndex: count ? 2 : 1 }}>
            <Pressable
              onPress={() => router.push(n.href as any)}
              style={({ hovered }: any) => [styles.item, compact && styles.itemCompact, active && styles.itemActive, hovered && !active ? { backgroundColor: 'rgba(255,255,255,0.07)' } : null]}
            >
              <MaterialCommunityIcons name={n.icon} size={20} color={active ? colors.plum900 : '#D9C6E3'} />
              <Text style={[styles.itemText, active && { color: colors.plum900, fontFamily: fonts.semibold }]}>{n.label}</Text>
            </Pressable>
            {count > 0 ? (
              <View style={styles.badge} pointerEvents="none">
                <MaterialCommunityIcons name="bell" size={11} color="#fff" />
                <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </>
  );

  return (
    <View style={[styles.root, compact && { flexDirection: 'column' }]}>
      {compact ? (
        <View style={styles.topbar}>
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/images/logo.png')} style={{ width: 32, height: 32 }} />
            <Text style={styles.brand}>Purple Yam</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={signOut}>
              <Text style={styles.signout}>Sign out</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8, paddingRight: 8 }}>
            {nav}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.sidebar}>
          <View style={styles.brandRow}>
            <Image source={require('../../../assets/images/logo.png')} style={{ width: 40, height: 40 }} />
            <View>
              <Text style={styles.brand}>Purple Yam</Text>
              <Text style={styles.brandSub}>Bakery portal</Text>
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 28 }}>{nav}</View>
          <View style={{ flex: 1 }} />
          <View style={styles.user}>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.full_name || 'Bakery admin'}
            </Text>
            <Text style={styles.userMail} numberOfLines={1}>
              {profile?.email}
            </Text>
            <Pressable onPress={signOut} style={{ marginTop: 8 }}>
              <Text style={styles.signout}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, compact && { padding: 18 }]}>
        <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center' }}>
          <Slot />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.cream },
  sidebar: { width: 248, backgroundColor: colors.plum900, padding: 20 },
  topbar: { backgroundColor: colors.plum900, padding: 12, gap: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { fontFamily: fonts.serif, fontSize: 20, color: colors.gold },
  brandSub: { fontFamily: fonts.regular, fontSize: 12, color: '#B79DC6' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  itemCompact: { paddingVertical: 8 },
  itemActive: { backgroundColor: colors.gold },
  itemText: { fontFamily: fonts.medium, fontSize: 14, color: '#D9C6E3' },
  badge: { position: 'absolute', top: -8, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 2, borderColor: colors.plum900 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: '#fff' },
  user: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 14 },
  userName: { fontFamily: fonts.semibold, fontSize: 14, color: '#fff' },
  userMail: { fontFamily: fonts.regular, fontSize: 12, color: '#B79DC6' },
  signout: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  content: { padding: 36 },
});
