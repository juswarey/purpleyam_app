// Creates a PayMongo Hosted Checkout session for ONE order and returns its URL.
// Runs on Supabase's servers, so the PayMongo secret key never reaches the app.
//
// Secrets needed (npx supabase secrets set NAME=value):
//   PAYMONGO_SECRET_KEY   sk_test_...  (later sk_live_...)
//   SITE_URL              https://urot-purpleyam.expo.app   (your hosted web address)
//   PAYMONGO_METHODS      optional, e.g. gcash,qrph,card,paymaya
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Please log in again.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paymongoKey = Deno.env.get('PAYMONGO_SECRET_KEY');
    const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
    if (!paymongoKey || !siteUrl) return json({ error: 'Online payment is not configured yet.' }, 500);

    // Who is calling? (uses the customer's own login, so row security applies)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'Please log in again.' }, 401);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: 'Missing order_id.' }, 400);

    // Row security means this only finds the caller's own order
    const { data: order, error: orderErr } = await userClient
      .from('orders')
      .select('id, customer_id, status, payment_status, total_amount, down_payment, remaining_balance, cakes(name)')
      .eq('id', order_id)
      .single();
    if (orderErr || !order) return json({ error: 'Order not found.' }, 404);

    if (['rejected', 'cancelled', 'completed'].includes(order.status)) {
      return json({ error: 'This order is closed, so it cannot be paid.' }, 400);
    }
    if (order.payment_status === 'paid') return json({ error: 'This order is already fully paid.' }, 400);

    // Unpaid -> the down payment. Partially paid -> the remaining balance.
    const amount = Number(order.payment_status === 'unpaid' ? order.down_payment : order.remaining_balance);
    if (!(amount >= 20)) return json({ error: 'The amount is too small for online payment.' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // Reuse a recent unfinished checkout instead of creating duplicates
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from('payments')
      .select('paymongo_checkout_url, amount')
      .eq('order_id', order.id)
      .eq('payment_method', 'paymongo')
      .eq('payment_status', 'pending')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1);
    if (existing?.[0]?.paymongo_checkout_url && Number(existing[0].amount) === amount) {
      return json({ checkout_url: existing[0].paymongo_checkout_url, reused: true });
    }

    const cakeName = (order as any).cakes?.name ?? 'Custom cake';
    const methods = (Deno.env.get('PAYMONGO_METHODS') ?? 'gcash,qrph,card,paymaya')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const res = await fetch('https://api.paymongo.com/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(paymongoKey + ':'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                name: `${order.payment_status === 'unpaid' ? 'Down payment' : 'Balance'} - ${cakeName}`,
                amount: Math.round(amount * 100), // PayMongo uses centavos
                currency: 'PHP',
                quantity: 1,
              },
            ],
            payment_method_types: methods,
            success_url: `${siteUrl}/pay-result?status=success`,
            cancel_url: `${siteUrl}/pay-result?status=cancelled`,
            reference_number: order.id,
          },
        },
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('PayMongo error', res.status, JSON.stringify(body));
      const detail = body?.errors?.[0]?.detail ?? 'PayMongo could not create the payment page.';
      return json({ error: detail }, 502);
    }

    const sessionId: string = body.data.id;
    const checkoutUrl: string = body.data.attributes.checkout_url;

    const { error: insertErr } = await admin.from('payments').insert({
      order_id: order.id,
      customer_id: user.id,
      amount,
      payment_method: 'paymongo',
      payment_status: 'pending',
      paymongo_session_id: sessionId,
      paymongo_checkout_url: checkoutUrl,
    });
    if (insertErr) {
      console.error('Insert payment failed', insertErr);
      return json({ error: 'Could not save the payment. Please try again.' }, 500);
    }

    return json({ checkout_url: checkoutUrl });
  } catch (e) {
    console.error(e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
