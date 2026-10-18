import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { registerForPushAsync } from '@/lib/push';

// Mounted once inside <AuthProvider>. Renders nothing:
//  - registers a signed-in customer's phone for push notifications
//  - opens the order when a notification is tapped (also when it opened the app from closed)
// (The web portal uses PushRegistrar.web.tsx, which does nothing.)
export function PushRegistrar() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const customerId = profile?.role === 'customer' ? session?.user.id : undefined;

  useEffect(() => {
    if (customerId) registerForPushAsync().catch((e) => console.warn('Push setup failed:', e?.message ?? e));
  }, [customerId]);

  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!customerId || !last || last.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const orderId = last.notification.request.content.data?.order_id;
    router.push(typeof orderId === 'string' ? `/order/${orderId}` : '/notifications');
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [last, customerId, router]);

  return null;
}
