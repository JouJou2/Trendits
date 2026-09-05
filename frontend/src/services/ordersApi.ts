// ?? (not ||) so an explicitly-empty string — same-origin calls through the
// Hosting rewrite to Cloud Functions in production — isn't overridden.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

export interface PlaceOrderItem {
  productId: string;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface PlaceOrderInput {
  idToken: string;
  items: PlaceOrderItem[];
  deliveryMethod: string;
  paymentMethod: string;
  promoCode?: string | null;
  note?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: Record<string, string>;
}

export interface PlaceOrderResult {
  success: boolean;
  orderId: string;
  globalOrderId: string;
  total: number;
  cartTotal: number;
  deliveryFee: number;
  discount: number;
}

/**
 * Sends only product ids and quantities — the server reads real prices from
 * Firestore and computes every total, so a tampered cart can't change what the
 * customer is charged.
 */
export const placeOrder = async (input: PlaceOrderInput): Promise<PlaceOrderResult> => {
  const res = await fetch(`${BACKEND_URL}/api/orders/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Could not place the order.');
  return data as PlaceOrderResult;
};
