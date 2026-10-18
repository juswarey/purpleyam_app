// Push notifications (Android / iOS). The web portal uses push.web.ts, which does nothing.
//
// How it works:
//   1. After a customer logs in, this phone gets an "Expo push token" and saves it in the
//      database (table push_tokens, through the register_push_token function).
//   2. Whenever the database creates a row in `notifications` (order approved, payment verified,
//      ...), the `send-push` Edge Function sends the same message to that customer's phones.
//   3. Tapping the notification opens the order (handled in components/PushRegistrar.tsx).
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { colors } from '@/constants/theme';
import { supabase } from './supabase';

const TOKEN_KEY = 'purpleyam.pushToken';
const CHANNEL_ID = 'default';

// Show notifications that arrive while the app is open, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Asks permission (once), gets this phone's push token and saves it for the signed-in customer. */
export async function registerForPushAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null; // emulators can't receive push

  // Android 13+ only shows the permission prompt after a channel exists.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Order updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: colors.gold,
    });
  }

  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
  if (error) throw new Error(error.message);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return token;
}

/** Call BEFORE signing out so the next person on this phone doesn't get this customer's alerts. */
export async function unregisterPushAsync() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc('unregister_push_token', { p_token: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // never block logging out
  }
}
