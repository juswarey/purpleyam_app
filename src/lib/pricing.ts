// IMPORTANT: these rules are duplicated in the SQL function public.set_order_amounts().
// The database is the source of truth (customers can't fake prices);
// this file only lets the app SHOW the same breakdown before the order is placed.

export const SIZES = ['6"', '8"', '10"', '12"'] as const;
export const TIERS = [1, 2, 3] as const;
export const FLAVORS = ['Ube', 'Chocolate', 'Vanilla', 'Red Velvet'] as const;
export const FROSTINGS = ['Buttercream', 'Fondant', 'Ganache'] as const;
export const STYLE_TAGS = ['Minimalist', 'Floral', 'Rustic', 'Elegant', 'Whimsical'] as const;

export const SIZE_ADJUSTMENT: Record<string, number> = { '6"': -300, '8"': 0, '10"': 400, '12"': 800 };
export const TIER_ADJUSTMENT: Record<number, number> = { 1: 0, 2: 600, 3: 1200 };
export const CUSTOM_DESIGN_FEE = 250;
export const DOWN_PAYMENT_RATE = 0.5;

export interface PriceBreakdown {
  base: number;
  sizeAdjustment: number;
  tierUpgrade: number;
  designFee: number;
  unitTotal: number;
  total: number;
  downPayment: number;
}

export function calculatePrice(args: {
  basePrice: number;
  size: string;
  tiers: number;
  hasCustomDesign: boolean;
  quantity?: number;
}): PriceBreakdown {
  const quantity = args.quantity ?? 1;
  const sizeAdjustment = SIZE_ADJUSTMENT[args.size] ?? 0;
  const tierUpgrade = TIER_ADJUSTMENT[args.tiers] ?? 0;
  const designFee = args.hasCustomDesign ? CUSTOM_DESIGN_FEE : 0;
  const unitTotal = args.basePrice + sizeAdjustment + tierUpgrade + designFee;
  const total = unitTotal * quantity;
  return {
    base: args.basePrice,
    sizeAdjustment,
    tierUpgrade,
    designFee,
    unitTotal,
    total,
    downPayment: Math.round(total * DOWN_PAYMENT_RATE * 100) / 100,
  };
}

export const peso = (n: number | null | undefined) =>
  '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
