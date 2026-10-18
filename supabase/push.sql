-- =====================================================================
-- PURPLE YAM - Push notifications
-- Run ONCE in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- 1) One row per phone that can receive notifications
create table if not exists public.push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  token       text not null unique,
  platform    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_push_tokens_user_id on public.push_tokens (user_id);

-- Nobody can read or edit tokens directly (RLS on, no policies).
-- The app uses the two functions below; the Edge Function uses the service role.
alter table public.push_tokens enable row level security;

-- 2) The app saves its token here. Security definer so that a phone that changes owner
--    (someone else logs in on it) is re-assigned instead of blocked by RLS.
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

-- 3) Called on logout
create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text)   from public, anon;
revoke all on function public.unregister_push_token(text)       from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text)     to authenticated;

-- 4) Sending is done by the `send-push` Edge Function, triggered by a Database Webhook
--    on INSERT into public.notifications (Dashboard > Database > Webhooks).
