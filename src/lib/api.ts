import { supabase } from './supabase';
import type {
  AppNotification,
  Cake,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentRecordStatus,
  Profile,
  Reservation,
  ReservationStatus,
} from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------------------------------------------------------------- customer
export async function getAvailableCakes() {
  return check(
    await supabase.from('cakes').select('*').eq('is_available', true).order('name')
  ) as Cake[];
}

export interface NewOrderInput {
  cake_id: string;
  quantity: number;
  cake_size: string;
  flavor: string;
  filling: string;
  design_description: string | null;
  custom_message: string | null;
  additional_instructions: string | null;
}

// total_amount / down_payment / remaining_balance are computed by the database trigger.
export async function createOrder(input: NewOrderInput) {
  return check(await supabase.from('orders').insert(input).select().single()) as Order;
}

export async function addOrderImage(orderId: string, path: string) {
  check(
    await supabase
      .from('order_images')
      .insert({ order_id: orderId, image_url: path, storage_path: path })
      .select()
      .single()
  );
}

export async function createPayment(input: {
  order_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  proof_image_url: string | null;
}) {
  return check(await supabase.from('payments').insert(input).select().single());
}

export async function createReservation(input: {
  order_id: string;
  customer_id: string;
  pickup_date: string;
  pickup_time: string;
  notes: string | null;
}) {
  return check(await supabase.from('reservations').insert(input).select().single()) as Reservation;
}

// Asks the server (Supabase Edge Function) to create a PayMongo checkout page for this order.
export async function startOnlinePayment(orderId: string): Promise<{ checkout_url: string }> {
  const { data, error } = await supabase.functions.invoke('create-paymongo-checkout', {
    body: { order_id: orderId },
  });
  if (error) {
    let message = error.message;
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  if (!data?.checkout_url) throw new Error(data?.error ?? 'Could not start the online payment.');
  return data as { checkout_url: string };
}

export async function getMyOrders() {
  return check(
    await supabase
      .from('orders')
      .select('*, cakes(name, image_url), reservations(*)')
      .order('created_at', { ascending: false })
  ) as Order[];
}

export async function getOrder(orderId: string) {
  return check(
    await supabase
      .from('orders')
      .select('*, cakes(name, image_url), profiles(full_name, phone, email), order_images(*), payments(*), reservations(*)')
      .eq('id', orderId)
      .single()
  ) as Order;
}

export async function cancelOrder(orderId: string) {
  check(await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId).select().single());
}

export async function getMyNotifications() {
  return check(
    await supabase.from('notifications').select('*').order('created_at', { ascending: false })
  ) as AppNotification[];
}

export async function getUnreadCount() {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  check(await supabase.from('notifications').update({ is_read: true }).eq('id', id).select().single());
}

export async function updateMyProfile(userId: string, patch: Partial<Pick<Profile, 'full_name' | 'phone' | 'address'>>) {
  check(await supabase.from('profiles').update(patch).eq('id', userId).select().single());
}

// ------------------------------------------------------------------- admin
export async function adminGetOrders() {
  return check(
    await supabase
      .from('orders')
      .select('*, profiles(full_name, phone, email), cakes(name, image_url), reservations(*)')
      .order('created_at', { ascending: false })
  ) as Order[];
}

export async function adminUpdateOrder(
  orderId: string,
  patch: { status: OrderStatus; rejection_reason?: string | null }
) {
  check(await supabase.from('orders').update(patch).eq('id', orderId).select().single());
}

export async function adminGetPayments() {
  return check(
    await supabase
      .from('payments')
      .select('*, profiles(full_name, phone), orders(id, total_amount, status)')
      .order('created_at', { ascending: false })
  ) as unknown as AdminPayment[];
}

export interface AdminPayment {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentRecordStatus;
  reference_number: string | null;
  proof_image_url: string | null;
  created_at: string;
  profiles: { full_name: string | null; phone: string | null } | null;
  orders: { id: string; total_amount: number; status: OrderStatus } | null;
}

// The database then updates the order's payment_status/remaining_balance and notifies the customer.
export async function adminSetPaymentStatus(paymentId: string, status: PaymentRecordStatus) {
  check(await supabase.from('payments').update({ payment_status: status }).eq('id', paymentId).select().single());
}

export type CakeInput = {
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

export async function adminGetCakes() {
  return check(await supabase.from('cakes').select('*').order('created_at', { ascending: false })) as Cake[];
}
export async function adminAddCake(input: CakeInput) {
  check(await supabase.from('cakes').insert(input).select().single());
}
export async function adminUpdateCake(id: string, patch: Partial<CakeInput>) {
  check(await supabase.from('cakes').update(patch).eq('id', id).select().single());
}
export async function adminDeleteCake(id: string) {
  const { error } = await supabase.from('cakes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface AdminReservation extends Reservation {
  profiles: { full_name: string | null; phone: string | null } | null;
  orders: { status: OrderStatus; total_amount: number; cake_size: string | null; cakes: { name: string } | null } | null;
}
export async function adminGetReservations() {
  return check(
    await supabase
      .from('reservations')
      .select('*, profiles(full_name, phone), orders(status, total_amount, cake_size, cakes(name))')
      .order('pickup_date', { ascending: true })
      .order('pickup_time', { ascending: true })
  ) as unknown as AdminReservation[];
}
export async function adminSetReservationStatus(id: string, status: ReservationStatus) {
  check(await supabase.from('reservations').update({ status }).eq('id', id).select().single());
}

export async function adminGetCustomers() {
  return check(
    await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false })
  ) as Profile[];
}
