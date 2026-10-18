// Receives PayMongo's "checkout_session.payment.paid" webhook and marks the payment verified.
// The existing database trigger then updates the order and notifies the customer.
//
// Deploy WITHOUT login check (PayMongo is not a logged-in user):
//   npx supabase functions deploy paymongo-webhook --no-verify-jwt
// Secret needed:  PAYMONGO_WEBHOOK_SECRET  (whsk_..., shown when you create the webhook in PayMongo)
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureIsValid(rawBody: string, header: string | null, secret: string, livemode: boolean) {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const piece of header.split(',')) {
    const [k, ...v] = piece.split('=');
    parts[k.trim()] = v.join('=').trim();
  }
  const timestamp = parts['t'];
  const expected = livemode ? parts['li'] : parts['te'];
  if (!timestamp || !expected) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  return safeEqual(toHex(sig), expected);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const rawBody = await req.text();
  const secret = Deno.env.get('PAYMONGO_WEBHOOK_SECRET');
  if (!secret) {
    console.error('PAYMONGO_WEBHOOK_SECRET is not set');
    return json({ error: 'Webhook not configured' }, 500);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Bad JSON' }, 400);
  }

  // PayMongo wraps the event; read it defensively.
  const root = payload?.data;
  const attrs = root?.attributes ?? root;
  const eventType: string | undefined = attrs?.type ?? root?.type;
  const resource = attrs?.data ?? root?.data;
  const livemode: boolean = Boolean(attrs?.livemode ?? resource?.attributes?.livemode);

  const valid = await signatureIsValid(rawBody, req.headers.get('paymongo-signature'), secret, livemode);
  if (!valid) {
    console.error('Invalid PayMongo signature');
    return json({ error: 'Invalid signature' }, 401);
  }

  if (eventType !== 'checkout_session.payment.paid') {
    return json({ received: true, ignored: eventType ?? 'unknown' });
  }

  const sessionId: string | undefined = resource?.id;
  if (!sessionId) {
    console.error('No checkout session id in event', rawBody);
    return json({ received: true, note: 'no session id' });
  }
  const paymongoPaymentId: string = resource?.attributes?.payments?.[0]?.id ?? sessionId;

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // Only flip pending -> verified (safe if PayMongo sends the event twice)
  const { data, error } = await admin
    .from('payments')
    .update({ payment_status: 'verified', reference_number: paymongoPaymentId })
    .eq('paymongo_session_id', sessionId)
    .eq('payment_status', 'pending')
    .select('id');

  if (error) {
    console.error('Update failed', error);
    return json({ error: 'Database error' }, 500); // PayMongo will retry
  }
  console.log(`Session ${sessionId}: ${data?.length ?? 0} payment(s) verified`);
  return json({ received: true, verified: data?.length ?? 0 });
});
