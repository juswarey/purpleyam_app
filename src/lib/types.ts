export type Role = 'customer' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'in_production'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentRecordStatus = 'pending' | 'verified' | 'rejected';
export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer';
export type ReservationStatus = 'reserved' | 'confirmed' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Cake {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  order_id: string;
  customer_id: string;
  pickup_date: string;
  pickup_time: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentRecordStatus;
  reference_number: string | null;
  proof_image_url: string | null;
  created_at: string;
}

export interface OrderImage {
  id: string;
  order_id: string;
  image_url: string | null;
  storage_path: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  cake_id: string | null;
  quantity: number;
  cake_size: string | null;
  flavor: string | null;
  filling: string | null;
  design_description: string | null;
  custom_message: string | null;
  additional_instructions: string | null;
  total_amount: number;
  down_payment: number;
  remaining_balance: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  cakes?: Pick<Cake, 'name' | 'image_url'> | null;
  profiles?: Pick<Profile, 'full_name' | 'phone' | 'email'> | null;
  order_images?: OrderImage[];
  payments?: Payment[];
  reservations?: Reservation[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  order_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
