import React, { createContext, useContext, useMemo, useState } from 'react';

import type { PickedImage } from '@/lib/storage';
import type { Cake } from '@/lib/types';

export interface OrderDraft {
  cake: Cake | null;
  size: string;
  tiers: number;
  flavor: string;
  frosting: string;
  images: PickedImage[];
  styleTags: string[];
  notes: string;
  message: string;
}

const emptyDraft: OrderDraft = {
  cake: null,
  size: '8"',
  tiers: 2,
  flavor: 'Ube',
  frosting: 'Buttercream',
  images: [],
  styleTags: [],
  notes: '',
  message: '',
};

interface Value {
  draft: OrderDraft;
  update: (patch: Partial<OrderDraft>) => void;
  reset: () => void;
}

const Ctx = createContext<Value | null>(null);

export function OrderDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const value = useMemo<Value>(
    () => ({
      draft,
      update: (patch) => setDraft((d) => ({ ...d, ...patch })),
      reset: () => setDraft(emptyDraft),
    }),
    [draft]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrderDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOrderDraft must be used inside <OrderDraftProvider>');
  return ctx;
}
