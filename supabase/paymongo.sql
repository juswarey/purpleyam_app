-- =====================================================================
-- PURPLE YAM - PayMongo update
-- Run ONCE in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1) Remember which PayMongo checkout belongs to which payment
alter table public.payments add column if not exists paymongo_session_id   text;
alter table public.payments add column if not exists paymongo_checkout_url text;

create unique index if not exists idx_payments_paymongo_session
  on public.payments (paymongo_session_id)
  where paymongo_session_id is not null;

-- 2) Allow the new payment method 'paymongo'
alter table public.payments drop constraint if exists payments_payment_method_check;
alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method in ('cash', 'gcash', 'bank_transfer', 'paymongo'));

-- 3) Customers must NOT be able to create 'paymongo' payments themselves.
--    Only the server function (service role) creates and verifies those.
drop policy if exists "payments: customer create for own order" on public.payments;

create policy "payments: customer create for own order"
  on public.payments for insert to authenticated
  with check (
    customer_id = auth.uid()
    and payment_status = 'pending'
    and payment_method <> 'paymongo'
    and exists (select 1 from public.orders o
                where o.id = order_id and o.customer_id = auth.uid())
  );

-- The rest (verifying a payment updates the order and notifies the customer)
-- already works through the existing trigger handle_payment_status().
