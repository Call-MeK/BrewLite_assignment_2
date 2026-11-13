'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { addOrMergeCartItem, replaceCartItem } from '@/lib/cart-items';
import type { CartItemDraft } from '@/types/product';

export interface CartState {
  items: CartItemDraft[];
  addItem: (item: CartItemDraft) => void;
  replaceItem: (index: number, item: CartItemDraft) => void;
  setQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
}

/** Vẫn lưu đúng mảng JSON ở key cũ để `pending-order` và trang checkout đọc được. */
const cartStorage: PersistStorage<CartState> = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(name) || 'null');
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.state?.items) ? parsed.state.items : [];
      return { state: { items } as CartState, version: 1 };
    } catch {
      return null;
    }
  },
  setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value.state.items)),
  removeItem: (name) => localStorage.removeItem(name),
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set({ items: addOrMergeCartItem(get().items, item) }),
      replaceItem: (index, item) => set({ items: replaceCartItem(get().items, index, item) }),
      setQuantity: (index, quantity) =>
        set({ items: get().items.map((item, position) => (position === index ? { ...item, quantity } : item)) }),
      removeItem: (index) => set({ items: get().items.filter((_, position) => position !== index) }),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'brewlite-cart', storage: cartStorage, version: 1, skipHydration: true },
  ),
);

/** Đọc giỏ từ LocalStorage sau khi mount để HTML server và client khớp nhau. */
export function useCartReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.resolve(useCartStore.persist.rehydrate()).finally(() => setReady(true));
  }, []);

  return ready;
}