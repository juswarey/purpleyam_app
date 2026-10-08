import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { Loading } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { colors, isWeb } from '@/constants/theme';

// Customer area: mobile app only, customers only.
export default function CustomerLayout() {
  const { session, profile, loading } = useAuth();
  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/" />;
  if (isWeb || profile?.role !== 'customer') return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
  );
}
