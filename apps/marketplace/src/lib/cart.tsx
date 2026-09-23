import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * The shopper's basket, kept on the phone until checkout.
 *
 * Prices here are only for showing a running total: the server re-reads every
 * product at checkout and charges its own figures, so a stale or tampered
 * price in this list cannot change what is paid.
 */

const STORAGE_KEY = 'trendit.cart.v1';

export interface CartLine {
  /** Product plus size — the same product in two sizes is two lines. */
  key: string;
  productId: string;
  title: string;
  image?: string;
  /** Unit price when it was added, for the running total only. */
  price: number;
  size?: string;
  colour?: string;
  vendorId?: string;
  quantity: number;
  /** What was in stock when it was added, to cap the quantity stepper. */
  maxQuantity: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (line: Omit<CartLine, 'key' | 'quantity'>, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export const lineKey = (productId: string, size?: string) => `${productId}::${size || ''}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  // Load once, then save on every change — the basket survives closing the app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setLines(JSON.parse(raw) as CartLine[]); })
      .catch(err => console.error('Could not read the saved cart:', err))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
      .catch(err => console.error('Could not save the cart:', err));
  }, [lines, ready]);

  const add: CartValue['add'] = useCallback((line, quantity = 1) => {
    setLines(prev => {
      const key = lineKey(line.productId, line.size);
      const existing = prev.find(l => l.key === key);
      if (existing) {
        return prev.map(l => l.key === key
          ? { ...l, ...line, quantity: Math.min(l.quantity + quantity, line.maxQuantity || l.maxQuantity) }
          : l);
      }
      return [...prev, { ...line, key, quantity }];
    });
  }, []);

  const setQuantity: CartValue['setQuantity'] = useCallback((key, quantity) => {
    setLines(prev => quantity <= 0
      ? prev.filter(l => l.key !== key)
      : prev.map(l => (l.key === key ? { ...l, quantity: Math.min(quantity, l.maxQuantity) } : l)));
  }, []);

  const remove: CartValue['remove'] = useCallback(key => setLines(prev => prev.filter(l => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100,
    ready,
    add,
    setQuantity,
    remove,
    clear,
  }), [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
