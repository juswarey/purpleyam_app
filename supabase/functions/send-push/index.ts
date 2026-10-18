// Sends a push notification to the customer's phone(s) whenever a row is added to `notifications`.
// Triggered by a Supabase Database Webhook (table: notifications, event: INSERT).
//
// Deploy WITHOUT login check (the webhook is not a logged-in user; it is protected by a secret header):
//   npx supabase functions deploy send-push --no-verify-jwt
// Secret needed:   npx supabase secrets set PUSH_WEBHOOK_SECRET=<a long random string>
// The webhook must send the header:   x-webhook-secret: <the same string>
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret) {
    console.error('PUSH_WEBHOOK_SECRET is not set');
    return json({ error: 'Not configured' }, 500);
  }
  if (req.headers.get('x-webhook-secret') !== secret) return json({ error: 'Unauthorized' }, 401);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }
  if (payload?.type !== 'INSERT' || payload?.table !== 'notifications') return json({ ignored: true });

  const n = payload.record;
  if (!n?.user_id || !n?.title) return json({ ignored: 'no user/title' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: rows, error } = await admin.from('push_tokens').select('token').eq('user_id', n.user_id);
  if (error) {
    console.error('Could not read tokens', error);
    return json({ error: 'Database error' }, 500);
  }
  const tokens = (rows ?? []).map((r: { token: string }) => r.token);
  if (tokens.length === 0) return json({ sent: 0, note: 'no registered phones' });

  const messages = tokens.map((to: string) => ({
    to,
    title: n.title,
    body: n.message,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
    data: { order_id: n.order_id ?? null, notification_id: n.id },
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    console.error('Expo push service error', res.status, await res.text());
    return json({ error: 'Push service error' }, 502); // lets the webhook be retried
  }
  const { data: tickets } = await res.json();

  // Phones that uninstalled the app / revoked permission: forget their tokens.
  const dead: string[] = [];
  (tickets ?? []).forEach((t: any, i: number) => {
    if (t?.status === 'error') {
      console.error('Push ticket error', t.message, t.details);
      if (t.details?.error === 'DeviceNotRegistered') dead.push(tokens[i]);
    }
  });
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);

  return json({ sent: tokens.length - dead.length, removed: dead.length });
});
