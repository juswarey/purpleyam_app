# Purple Yam – Custom Cake Ordering & Reservation System

One Expo project, two experiences:

| Where it runs | Who uses it | What they see |
|---|---|---|
| **Mobile app** (Expo Go / Android / iOS) | Customers | Browse cakes, cake builder, upload design, pay, pick up time, track orders |
| **Web** (`npx expo start --web`) | Bakery / Admin | Dashboard, production board, payments, pickups, cakes, customers |

The role comes from `profiles.role` in Supabase. A customer who logs in on the web (or an admin on the phone) gets a short message instead of the wrong screens.

## 1. Set up Supabase
1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste `supabase/schema.sql`, click **Run**.
3. **Project Settings → API**: copy the *Project URL* and the *anon public* key.
4. Optional while testing: **Authentication → Providers → Email → turn off "Confirm email"**.

## 2. Install and configure
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage \
  react-native-url-polyfill base64-arraybuffer expo-image-picker expo-font \
  @expo-google-fonts/inter @expo-google-fonts/playfair-display @expo/vector-icons

cp .env.example .env      # then paste your URL + anon key into .env
npx expo start
```
Press `w` for the admin web portal, or scan the QR code with Expo Go for the customer app.
Never put the `service_role` key in this project.

## 3. Create the first admin
1. Supabase → **Authentication → Users → Add user** (tick "Auto Confirm User"), e.g. `bakery@purpleyam.com`.
2. **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin' where email = 'bakery@purpleyam.com';
   ```
3. Open the web portal and sign in with that account.

## 4. Things to edit
- `assets/images/logo.png` – replace the placeholder with the real Purple Yam logo.
- `src/constants/bakery.ts` – GCash number, bank details, address, pickup hours, prep days.
- Cake photos – in the web portal, **Cakes → Edit → Image link**.
- Pricing rules – `src/lib/pricing.ts` **and** the `set_order_amounts()` function in the SQL must match. The database is the one that decides the real price.

## Project map
```
src/app/
  index.tsx                 entry gate (web = admin, mobile = customer)
  (auth)/                   welcome, login (mobile + web versions), register
  (customer)/(tabs)/        home, builder, orders, profile
  (customer)/               upload, summary, payment, schedule, notifications, order/[id]
  admin/                    dashboard, orders (board) + [id], payments, reservations, cakes, customers
src/lib/                    supabase client, api queries, pricing, storage helpers
src/context/                auth + order draft state
supabase/schema.sql         the full database script
```
