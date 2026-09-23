import { postJson } from './api';
import { auth } from './firebase';
import type { CartLine } from './cart';

/**
 * Placing an order goes through the website's own endpoint, which re-reads
 * every product from the database, recomputes each price, the delivery fee,
 * any promo discount and the total, and takes the stock inside a transaction.
 * The app sends only what was ordered and how many — never a price.
 */

export interface DeliveryAddress {
  label?: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  zone: string;
}

export interface PlacedOrder {
  success: boolean;
  orderId: string;
  total: number;
  cartTotal: number;
  deliveryFee: number;
  discount: number;
}

export interface PlaceOrderInput {
  lines: CartLine[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: DeliveryAddress;
  express: boolean;
  promoCode?: string;
  note?: string;
}

/** What the shopper pays on top of the items, before the server confirms it. */
export const FREE_SHIPPING_THRESHOLD = 50;
export const STANDARD_FEE = 4;
export const EXPRESS_FEE = 8;

export const estimateDelivery = (subtotal: number, express: boolean) =>
  express ? EXPRESS_FEE : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_FEE;

export const placeOrder = async (input: PlaceOrderInput): Promise<PlacedOrder> => {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Please sign in again to place this order.');

  return postJson<PlacedOrder>('/api/orders/create', {
    idToken,
    items: input.lines.map(line => ({
      productId: line.productId,
      quantity: line.quantity,
      selectedSize: line.size,
      selectedColor: line.colour,
    })),
    deliveryMethod: input.express ? 'Express' : 'Standard',
    paymentMethod: 'Cash on Delivery',
    promoCode: input.promoCode?.trim() || null,
    note: input.note?.trim() || '',
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerEmail: input.customerEmail.trim(),
    deliveryAddress: {
      name: input.deliveryAddress.name.trim(),
      phone: input.deliveryAddress.phone.trim(),
      address: input.deliveryAddress.address.trim(),
      city: input.deliveryAddress.city.trim(),
      zone: input.deliveryAddress.zone,
    },
  });
};
