import type { OrderStatus, PaymentRecordStatus, PaymentStatus, ReservationStatus } from './types';
import { colors } from '@/constants/theme';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  in_production: 'In production',
  ready_for_pickup: 'Ready for pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
};

export const PAYMENT_RECORD_LABEL: Record<PaymentRecordStatus, string> = {
  pending: 'Waiting for verification',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const RESERVATION_LABEL: Record<ReservationStatus, string> = {
  reserved: 'Reserved',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  bank_transfer: 'Bank transfer',
  paymongo: 'Online (PayMongo)',
};

// A PayMongo payment stays 'pending' until the customer actually pays on the PayMongo page.
export const isAwaitingOnline = (p: { payment_method: string; payment_status: string }) =>
  p.payment_method === 'paymongo' && p.payment_status === 'pending';

export const paymentRecordLabel = (p: { payment_method: string; payment_status: PaymentRecordStatus }) =>
  isAwaitingOnline(p) ? 'Online payment not completed' : PAYMENT_RECORD_LABEL[p.payment_status];

type Tone = { fg: string; bg: string };
const neutral: Tone = { fg: colors.muted, bg: '#F1EBF3' };
const good: Tone = { fg: colors.success, bg: colors.successBg };
const warn: Tone = { fg: colors.warn, bg: colors.warnBg };
const bad: Tone = { fg: colors.danger, bg: colors.dangerBg };
const info: Tone = { fg: colors.info, bg: colors.infoBg };
const brand: Tone = { fg: colors.plum700, bg: colors.lilac };

export const statusTone = (s: string): Tone =>
  (
    {
      pending: warn,
      approved: info,
      in_production: brand,
      ready_for_pickup: good,
      completed: good,
      rejected: bad,
      cancelled: neutral,
      unpaid: bad,
      partially_paid: warn,
      paid: good,
      verified: good,
      reserved: warn,
      confirmed: info,
    } as Record<string, Tone>
  )[s] ?? neutral;

export const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

// 'YYYY-MM-DD' (date column) -> "Sat, Oct 25"
export const formatPickupDate = (d?: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';

// 'HH:MM:SS' (time column) -> "2:30 PM"
export const formatPickupTime = (t?: string | null) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const shortId = (id: string) => '#' + id.slice(0, 8).toUpperCase();

export const toLocalISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
