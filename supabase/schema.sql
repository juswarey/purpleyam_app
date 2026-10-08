-- =====================================================================
-- PURPLE YAM - Custom Cake Ordering & Reservation System
-- Supabase / PostgreSQL schema (7 tables, 2 storage buckets)
-- Paste into: Supabase Dashboard > SQL Editor > New Query > Run
-- =====================================================================


-- =====================================================================
-- 1. TABLES
-- =====================================================================

-- 1) PROFILES (extra info + role for each auth user) -------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  address     text,
  role        text not null default 'customer'
              check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Helper: is the current logged-in user an admin?
-- (SECURITY DEFINER so it can read profiles without causing RLS loops)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2) CAKES ---------------------------------------------------------------
create table public.cakes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  price         numeric(10,2) not null check (price >= 0),
  image_url     text,
  is_available  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3) ORDERS --------------------------------------------------------------
-- Customization fields live directly in this table (on purpose).
create table public.orders (
  id                       uuid primary key default gen_random_uuid(),
  customer_id              uuid not null default auth.uid()
                           references public.profiles (id) on delete cascade,
  cake_id                  uuid references public.cakes (id) on delete set null,
  quantity                 integer not null default 1 check (quantity > 0),
  cake_size                text,
  flavor                   text,
  filling                  text,
  design_description       text,
  custom_message           text,
  additional_instructions  text,
  total_amount             numeric(10,2) not null default 0 check (total_amount >= 0),
  down_payment             numeric(10,2) not null default 0 check (down_payment >= 0),
  remaining_balance        numeric(10,2) not null default 0 check (remaining_balance >= 0),
  status                   text not null default 'pending'
                           check (status in ('pending','approved','rejected','in_production',
                                             'ready_for_pickup','completed','cancelled')),
  payment_status           text not null default 'unpaid'
                           check (payment_status in ('unpaid','partially_paid','paid')),
  rejection_reason         text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (down_payment <= total_amount)
);

-- 4) ORDER_IMAGES (inspiration photos; file itself is in Storage) ---------
create table public.order_images (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  image_url     text,
  storage_path  text,
  created_at    timestamptz not null default now()
);

-- 5) PAYMENTS -------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  customer_id       uuid not null default auth.uid()
                    references public.profiles (id) on delete cascade,
  amount            numeric(10,2) not null check (amount > 0),
  payment_method    text not null
                    check (payment_method in ('cash','gcash','bank_transfer')),
  payment_status    text not null default 'pending'
                    check (payment_status in ('pending','verified','rejected')),
  reference_number  text,
  proof_image_url   text,
  created_at        timestamptz not null default now()
);

-- 6) RESERVATIONS (pickup schedule) ---------------------------------------
create table public.reservations (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  customer_id   uuid not null default auth.uid()
                references public.profiles (id) on delete cascade,
  pickup_date   date not null,
  pickup_time   time not null,
  status        text not null default 'reserved'
                check (status in ('reserved','confirmed','completed','cancelled')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- 7) NOTIFICATIONS ---------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete cascade,
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);


-- =====================================================================
-- 2. INDEXES
-- =====================================================================
create index idx_orders_customer_id      on public.orders (customer_id);
create index idx_orders_status           on public.orders (status);
create index idx_orders_created_at       on public.orders (created_at desc);
create index idx_payments_order_id       on public.payments (order_id);
create index idx_reservations_pickup_date on public.reservations (pickup_date);
create index idx_notifications_user_id   on public.notifications (user_id);


-- =====================================================================
-- 3. FUNCTIONS & TRIGGERS
-- =====================================================================

-- 3a) Keep updated_at fresh -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_cakes_updated_at before update on public.cakes
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- 3b) Auto-create a profile when someone registers ---------------------------
-- The role is ALWAYS 'customer' here (it ignores anything sent by the app).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3c) Customers can NOT change their own role --------------------------------
-- (auth.uid() is null when you run SQL in the dashboard, so you can still
--  promote an admin manually from the SQL Editor.)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'You are not allowed to change the role.';
  end if;
  return new;
end;
$$;

create trigger trg_protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- 3d) Server-side order amounts (customers can't fake the price) ---------------
-- Pricing rules (keep in sync with src/lib/pricing.ts in the app):
--   cake price in the cakes table = price of the 8" / 1 tier cake
--   size adjustment : 6" = -300 | 8" = 0 | 10" = +400 | 12" = +800
--   tier upgrade    : 1 tier = 0 | 2 tiers = +600 | 3 tiers = +1200
--   custom design fee: +250 when the customer added style tags or baker's notes
--   total = (price + adjustments + fee) x quantity | down payment = 50%
-- The app sends cake_size as text like:  8" / 2 Tiers
create or replace function public.set_order_amounts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price     numeric;
  v_size_adj  numeric := 0;
  v_tiers     integer := 1;
  v_tier_adj  numeric := 0;
  v_fee       numeric := 0;
  v_unit      numeric;
begin
  select price into v_price from public.cakes where id = new.cake_id;

  v_size_adj := case split_part(coalesce(new.cake_size, ''), ' / ', 1)
                  when '6"'  then -300
                  when '10"' then 400
                  when '12"' then 800
                  else 0 end;

  v_tiers := coalesce(nullif(substring(coalesce(new.cake_size, '') from '/ (\d)'), '')::integer, 1);
  v_tier_adj := case v_tiers when 2 then 600 when 3 then 1200 else 0 end;

  if btrim(coalesce(new.design_description, '')) <> ''
     or btrim(coalesce(new.additional_instructions, '')) <> '' then
    v_fee := 250;
  end if;

  v_unit := greatest(coalesce(v_price, 0) + v_size_adj + v_tier_adj + v_fee, 0);

  new.total_amount      := v_unit * new.quantity;
  new.down_payment      := round(new.total_amount * 0.50, 2);
  new.remaining_balance := new.total_amount;
  return new;
end;
$$;

create trigger trg_set_order_amounts
  before insert on public.orders
  for each row execute function public.set_order_amounts();

-- 3e) Customers can only CANCEL their own pending orders ----------------------
create or replace function public.guard_order_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if old.status <> 'pending' or new.status <> 'cancelled' then
      raise exception 'Customers can only cancel pending orders.';
    end if;
    if (to_jsonb(new) - 'status' - 'updated_at')
       <> (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Customers cannot edit order details.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_order_update
  before update on public.orders
  for each row execute function public.guard_order_update();

-- 3f) Notify the customer when the order status changes -----------------------
create or replace function public.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title   text;
  v_message text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  case new.status
    when 'approved' then
      v_title := 'Order approved';
      v_message := 'Your order has been approved.';
    when 'rejected' then
      v_title := 'Order rejected';
      v_message := 'Your order was rejected.'
                   || coalesce(' Reason: ' || new.rejection_reason, '');
    when 'in_production' then
      v_title := 'Cake in production';
      v_message := 'Your cake is now in production.';
    when 'ready_for_pickup' then
      v_title := 'Ready for pickup';
      v_message := 'Your cake is ready for pickup.';
    when 'completed' then
      v_title := 'Order completed';
      v_message := 'Your order is completed. Thank you for choosing Purple Yam!';
    else
      return new;  -- pending / cancelled: no notification
  end case;

  insert into public.notifications (user_id, order_id, title, message)
  values (new.customer_id, new.id, v_title, v_message);
  return new;
end;
$$;

create trigger trg_notify_order_status
  after update of status on public.orders
  for each row execute function public.notify_order_status();

-- 3g) When a payment is verified/rejected: update the order + notify ----------
create or replace function public.handle_payment_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid  numeric;
  v_total numeric;
begin
  if tg_op = 'UPDATE' and new.payment_status is not distinct from old.payment_status then
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where order_id = new.order_id and payment_status = 'verified';

  select total_amount into v_total from public.orders where id = new.order_id;

  update public.orders
  set payment_status = case
        when v_total > 0 and v_paid >= v_total then 'paid'
        when v_paid > 0 then 'partially_paid'
        else 'unpaid' end,
      remaining_balance = greatest(v_total - v_paid, 0)
  where id = new.order_id;

  if new.payment_status = 'verified' then
    insert into public.notifications (user_id, order_id, title, message)
    values (new.customer_id, new.order_id, 'Payment verified',
            'Your payment has been verified.');
  elsif new.payment_status = 'rejected' then
    insert into public.notifications (user_id, order_id, title, message)
    values (new.customer_id, new.order_id, 'Payment rejected',
            'Your payment could not be verified. Please upload a clear proof of payment.');
  end if;

  return new;
end;
$$;

create trigger trg_handle_payment_status
  after insert or update of payment_status on public.payments
  for each row execute function public.handle_payment_status();


-- =====================================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.cakes         enable row level security;
alter table public.orders        enable row level security;
alter table public.order_images  enable row level security;
alter table public.payments      enable row level security;
alter table public.reservations  enable row level security;
alter table public.notifications enable row level security;

-- ---- PROFILES -----------------------------------------------------------
create policy "profiles: view own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- (Role changes are blocked by the protect_profile_role trigger.)

-- ---- CAKES --------------------------------------------------------------
create policy "cakes: view available (admin sees all)"
  on public.cakes for select to authenticated
  using (is_available = true or public.is_admin());

create policy "cakes: admin manage"
  on public.cakes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- ORDERS -------------------------------------------------------------
create policy "orders: view own or admin"
  on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

create policy "orders: customer create own"
  on public.orders for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'pending'
    and payment_status = 'unpaid'
    and rejection_reason is null
  );

create policy "orders: customer update own (cancel only, enforced by trigger)"
  on public.orders for update to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create policy "orders: admin update"
  on public.orders for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- ORDER_IMAGES -------------------------------------------------------
create policy "order_images: view own or admin"
  on public.order_images for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o
               where o.id = order_id and o.customer_id = auth.uid())
  );

create policy "order_images: add to own order"
  on public.order_images for insert to authenticated
  with check (
    exists (select 1 from public.orders o
            where o.id = order_id and o.customer_id = auth.uid())
  );

-- ---- PAYMENTS -----------------------------------------------------------
create policy "payments: view own or admin"
  on public.payments for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

create policy "payments: customer create for own order"
  on public.payments for insert to authenticated
  with check (
    customer_id = auth.uid()
    and payment_status = 'pending'
    and exists (select 1 from public.orders o
                where o.id = order_id and o.customer_id = auth.uid())
  );

create policy "payments: admin verify/reject"
  on public.payments for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- RESERVATIONS -------------------------------------------------------
create policy "reservations: view own or admin"
  on public.reservations for select to authenticated
  using (customer_id = auth.uid() or public.is_admin());

create policy "reservations: customer create for own order"
  on public.reservations for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'reserved'
    and exists (select 1 from public.orders o
                where o.id = order_id and o.customer_id = auth.uid())
  );

create policy "reservations: admin update"
  on public.reservations for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- NOTIFICATIONS ------------------------------------------------------
create policy "notifications: view own or admin"
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "notifications: mark own as read"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications: admin create"
  on public.notifications for insert to authenticated
  with check (public.is_admin());

-- Users may only change the is_read column of a notification
revoke update on public.notifications from authenticated;
grant  update (is_read) on public.notifications to authenticated;


-- =====================================================================
-- 5. STORAGE BUCKETS (both PRIVATE) + POLICIES
-- File path convention:  <user_id>/<file name>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('order-images',   'order-images',   false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- order-images
create policy "order-images: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'order-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "order-images: view own folder or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'order-images'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- payment-proofs
create policy "payment-proofs: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "payment-proofs: view own folder or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );


-- =====================================================================
-- 6. SAMPLE DATA
-- =====================================================================
insert into public.cakes (name, description, price, is_available) values
  ('Purple Yam Birthday Cake', 'Soft ube sponge with creamy purple yam frosting, perfect for birthdays.', 850.00, true),
  ('Ube Cream Cake',           'Light chiffon layered with sweet ube cream.',                              750.00, true),
  ('Custom Celebration Cake',  'Fully customizable cake for weddings, debuts and special events.',        1500.00, true),
  ('Chocolate Ube Cake',       'Rich chocolate cake with ube filling and ganache.',                        950.00, true);


-- =====================================================================
-- 7. HOW TO MAKE ONE ACCOUNT AN ADMIN (run AFTER that person registers)
-- Run this separately in the SQL Editor:
--
--   update public.profiles
--   set role = 'admin'
--   where email = 'bakery-owner@example.com';
--
-- =====================================================================
