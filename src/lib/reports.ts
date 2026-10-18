import type { AdminPayment } from './api';
import { METHOD_LABEL, ORDER_STATUS_LABEL, toLocalISODate } from './format';
import type { Order, OrderStatus } from './types';

export type RangeKey = 'today' | '7d' | '30d' | 'month' | 'year' | 'all';

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

/** Start of the range (local time), or null for "all time". */
export function rangeStart(key: RangeKey, now = new Date()): Date | null {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case 'today':
      return d;
    case '7d':
      d.setDate(d.getDate() - 6);
      return d;
    case '30d':
      d.setDate(d.getDate() - 29);
      return d;
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export interface Bar {
  label: string;
  value: number;
}
export interface Ranked {
  name: string;
  orders: number;
  value: number;
}

export interface Report {
  totalOrders: number;
  activeOrders: number; // everything except rejected / cancelled
  completedOrders: number;
  cancelledOrders: number; // rejected + cancelled
  orderValue: number; // value of active orders
  income: number; // verified payments received in the range
  paymentsCount: number;
  avgOrder: number;
  outstanding: number; // remaining balance on active orders
  byStatus: (Bar & { status: OrderStatus })[];
  byMethod: Bar[];
  series: Bar[];
  seriesUnit: 'day' | 'month';
  topCakes: Ranked[];
  topCustomers: Ranked[];
  rows: Order[];
}

const STATUS_ORDER: OrderStatus[] = ['pending', 'approved', 'in_production', 'ready_for_pickup', 'completed', 'rejected', 'cancelled'];

export function buildReport(orders: Order[], payments: AdminPayment[], key: RangeKey): Report {
  const start = rangeStart(key);
  const inRange = (iso: string) => !start || new Date(iso) >= start;

  const rows = orders.filter((o) => inRange(o.created_at));
  const active = rows.filter((o) => o.status !== 'rejected' && o.status !== 'cancelled');
  const verified = payments.filter((p) => p.payment_status === 'verified' && inRange(p.created_at));

  const income = verified.reduce((s, p) => s + Number(p.amount), 0);
  const orderValue = active.reduce((s, o) => s + Number(o.total_amount), 0);

  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    label: ORDER_STATUS_LABEL[status],
    value: rows.filter((o) => o.status === status).length,
  }));

  const methodTotals = new Map<string, number>();
  verified.forEach((p) => methodTotals.set(p.payment_method, (methodTotals.get(p.payment_method) ?? 0) + Number(p.amount)));
  const byMethod = [...methodTotals.entries()]
    .map(([m, value]) => ({ label: METHOD_LABEL[m] ?? m, value }))
    .sort((a, b) => b.value - a.value);

  // Income over time: per day for short ranges, per month otherwise (latest 12 buckets).
  const seriesUnit: 'day' | 'month' = key === 'today' || key === '7d' || key === '30d' || key === 'month' ? 'day' : 'month';
  const buckets = new Map<string, number>();
  if (seriesUnit === 'day') {
    const from = start ?? new Date();
    const cursor = new Date(from);
    const end = new Date();
    while (cursor <= end) {
      buckets.set(toLocalISODate(cursor), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  verified.forEach((p) => {
    const d = new Date(p.created_at);
    const k = seriesUnit === 'day' ? toLocalISODate(d) : toLocalISODate(d).slice(0, 7);
    buckets.set(k, (buckets.get(k) ?? 0) + Number(p.amount));
  });
  let series = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => ({
    label:
      seriesUnit === 'day'
        ? new Date(k + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        : new Date(k + '-01T00:00:00').toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }),
    value,
  }));
  series = series.slice(-12 * (seriesUnit === 'day' ? 3 : 1));

  const rank = (keyOf: (o: Order) => string): Ranked[] => {
    const m = new Map<string, Ranked>();
    active.forEach((o) => {
      const name = keyOf(o);
      const r = m.get(name) ?? { name, orders: 0, value: 0 };
      r.orders += 1;
      r.value += Number(o.total_amount);
      m.set(name, r);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  };

  return {
    totalOrders: rows.length,
    activeOrders: active.length,
    completedOrders: rows.filter((o) => o.status === 'completed').length,
    cancelledOrders: rows.length - active.length,
    orderValue,
    income,
    paymentsCount: verified.length,
    avgOrder: active.length ? orderValue / active.length : 0,
    outstanding: active.reduce((s, o) => s + Number(o.remaining_balance), 0),
    byStatus,
    byMethod,
    series,
    seriesUnit,
    topCakes: rank((o) => o.cakes?.name ?? 'Custom cake'),
    topCustomers: rank((o) => o.profiles?.full_name ?? 'Customer'),
    rows,
  };
}

const csvCell = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ordersToCsv(rows: Order[]) {
  const head = ['Order', 'Date', 'Customer', 'Cake', 'Qty', 'Size', 'Status', 'Payment', 'Total', 'Down payment', 'Balance'];
  const lines = rows.map((o) =>
    [o.id.slice(0, 8).toUpperCase(), o.created_at.slice(0, 10), o.profiles?.full_name, o.cakes?.name ?? 'Custom cake', o.quantity, o.cake_size, o.status, o.payment_status, o.total_amount, o.down_payment, o.remaining_balance]
      .map(csvCell)
      .join(',')
  );
  return [head.join(','), ...lines].join('\n');
}
