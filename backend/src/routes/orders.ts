import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../firebaseAdmin.js';

// Orders are priced here, never by the client. The browser only says *what* and
// *how many*; every unit price, fee, discount and total below is read from
// Firestore and recomputed server-side. Firestore rules block clients from
// writing order documents directly, so this is the only way an order is created.

const router = Router();

const FREE_SHIPPING_THRESHOLD = 50;
const EXPRESS_FEE = 8.0;
const STANDARD_FEE = 4.0;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Commission is taken out of the price, not added on top: the shopper pays the
 * product's price, Trendit keeps `feePercentage` of it, and the vendor receives
 * the rest. Mirrors frontend/src/utils/commission.ts.
 */
const commissionPercentOf = (feePercentage?: number) =>
  typeof feePercentage === 'number' && Number.isFinite(feePercentage) && feePercentage > 0 ? feePercentage : 0;

interface IncomingItem {
  productId?: string;
  quantity?: number;
  selectedColor?: string;
  selectedSize?: string;
}

interface OrderRequestBody {
  idToken?: string;
  items?: IncomingItem[];
  deliveryMethod?: string;
  paymentMethod?: string;
  promoCode?: string;
  note?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryAddress?: Record<string, string>;
}

interface StoredVariant {
  id: string;
  size?: string;
  price?: number | null;
  stock: number;
  sku?: string;
}

interface StoredProduct {
  title?: string;
  price?: number;
  feePercentage?: number;
  stock?: number;
  image?: string;
  images?: string[];
  vendorId?: string;
  sizeOptions?: string[];
  variants?: StoredVariant[];
}

/** A request-level error whose message is safe to show the shopper. */
class OrderError extends Error {}

router.post('/create', async (req, res) => {
  const body = req.body as OrderRequestBody;
  const { idToken, items, deliveryMethod, paymentMethod, promoCode } = body;

  if (!idToken) return res.status(401).json({ error: 'Not signed in.' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  if (items.length > 100) {
    return res.status(400).json({ error: 'Too many items in one order.' });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  // Validate the shape of every line before touching the database.
  const lines: { productId: string; quantity: number; size: string; color: string }[] = [];
  for (const item of items) {
    const productId = String(item.productId || '').trim();
    const quantity = Math.floor(Number(item.quantity));
    if (!productId) return res.status(400).json({ error: 'Cart contains an item with no product.' });
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).json({ error: 'Invalid quantity.' });
    }
    lines.push({
      productId,
      quantity,
      size: String(item.selectedSize || '').trim(),
      color: String(item.selectedColor || '').trim(),
    });
  }

  const orderNumber = `TRD-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();
  const isExpress = deliveryMethod === 'Express';

  try {
    // One transaction reads the stock it is about to spend and writes the new
    // levels atomically. Before this, the stock check and the decrement were
    // separate steps, so two simultaneous orders could both pass the check and
    // sell the same last unit.
    const result = await adminDb.runTransaction(async tx => {
      // ── Reads (Firestore requires every read before any write) ──────────
      const uniqueIds = [...new Set(lines.map(l => l.productId))];
      const productRefs = uniqueIds.map(id => adminDb.collection('products').doc(id));
      const productSnaps = await Promise.all(productRefs.map(ref => tx.get(ref)));
      const products = new Map<string, StoredProduct>();
      productSnaps.forEach((snap, index) => {
        if (!snap.exists) throw new OrderError('A product in your cart is no longer available.');
        products.set(uniqueIds[index], snap.data() as StoredProduct);
      });

      // Work on a copy of each product's variants so several lines against the
      // same product (e.g. an M and an L of one shirt) all draw down one array.
      const workingVariants = new Map<string, StoredVariant[]>();
      const workingStock = new Map<string, number>();
      for (const [id, p] of products) {
        workingVariants.set(id, (p.variants || []).map(v => ({ ...v })));
        workingStock.set(id, typeof p.stock === 'number' ? p.stock : Number.POSITIVE_INFINITY);
      }

      const resolved: {
        productId: string;
        productName: string;
        productImage: string | null;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        variant: string;
        size: string | null;
        vendorId: string | null;
        commissionPercent: number;
        commissionAmount: number;
        vendorAmount: number;
      }[] = [];

      for (const line of lines) {
        const p = products.get(line.productId)!;
        const name = p.title || 'An item';

        if (typeof p.price !== 'number' || p.price < 0) {
          throw new OrderError('A product in your cart has an invalid price.');
        }

        const variants = workingVariants.get(line.productId)!;
        const hasSizes = variants.length > 0 && (p.sizeOptions?.length || 0) > 0;

        // The price the shopper was shown: a size can override the base price.
        let basePrice = p.price;

        if (hasSizes) {
          if (!line.size) throw new OrderError(`Choose a size for "${name}".`);
          const variant = variants.find(v => v.size === line.size);
          if (!variant) throw new OrderError(`Size ${line.size} of "${name}" is no longer available.`);
          if ((variant.stock ?? 0) < line.quantity) {
            throw new OrderError(
              variant.stock > 0
                ? `Only ${variant.stock} left of "${name}" in size ${line.size}.`
                : `"${name}" is sold out in size ${line.size}.`,
            );
          }
          variant.stock -= line.quantity;
          if (typeof variant.price === 'number' && variant.price >= 0) basePrice = variant.price;
        } else {
          const available = workingStock.get(line.productId)!;
          if (available < line.quantity) {
            throw new OrderError(`"${name}" does not have enough stock.`);
          }
          workingStock.set(line.productId, available - line.quantity);
        }

        const unitPrice = round2(basePrice);
        const subtotal = round2(unitPrice * line.quantity);
        // Recorded at the moment of sale so a later change to the store's rate
        // never rewrites what was earned on this order.
        const commissionPercent = commissionPercentOf(p.feePercentage);
        const commissionAmount = round2(subtotal * commissionPercent / 100);
        resolved.push({
          productId: line.productId,
          productName: p.title || 'Product',
          productImage: p.image || p.images?.[0] || null,
          quantity: line.quantity,
          unitPrice,
          subtotal,
          variant: `${line.color || 'N/A'} / ${line.size || 'N/A'}`,
          size: line.size || null,
          vendorId: p.vendorId || null,
          commissionPercent,
          commissionAmount,
          vendorAmount: round2(subtotal - commissionAmount),
        });
      }

      const cartTotal = round2(resolved.reduce((sum, r) => sum + r.subtotal, 0));
      const deliveryFee = isExpress ? EXPRESS_FEE : cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_FEE;

      // ── Promo: re-validated from Firestore, including the per-account lock ──
      let discount = 0;
      let appliedCode: string | null = null;
      let promoId: string | null = null;
      let promoDiscountPercent = 0;

      if (promoCode && promoCode.trim()) {
        const code = promoCode.trim().toUpperCase();
        const promoSnap = await tx.get(
          adminDb.collection('promos').where('code', '==', code).where('status', '==', 'Active').limit(1),
        );

        if (!promoSnap.empty) {
          const promoDoc = promoSnap.docs[0];
          const promo = promoDoc.data() as {
            discountPercent?: number;
            maxDiscountAmount?: number;
            lockedToEmail?: string;
          };

          let usable = true;
          if (promo.lockedToEmail) {
            usable = !!email && promo.lockedToEmail.toLowerCase() === email.toLowerCase();
            if (usable) {
              const already = await tx.get(
                adminDb.collection('promoRedemptions')
                  .where('promoId', '==', promoDoc.id)
                  .where('userId', '==', uid)
                  .limit(1),
              );
              usable = already.empty;
            }
          }

          if (usable && typeof promo.discountPercent === 'number' && promo.discountPercent > 0) {
            promoDiscountPercent = promo.discountPercent;
            const raw = (cartTotal * promo.discountPercent) / 100;
            const capped =
              typeof promo.maxDiscountAmount === 'number' ? Math.min(raw, promo.maxDiscountAmount) : raw;
            // Never let a discount push the payable total below zero.
            discount = round2(Math.min(capped, cartTotal + deliveryFee));
            appliedCode = code;
            promoId = promoDoc.id;
          }
        }
      }

      const total = round2(cartTotal + deliveryFee - discount);
      const vendorIds = [...new Set(resolved.map(r => r.vendorId).filter((v): v is string => !!v))];
      // Commission is on item prices before any promo code. Promo codes are
      // issued by Trendit, so Trendit absorbs the discount rather than the vendor.
      const commissionTotal = round2(resolved.reduce((sum, r) => sum + r.commissionAmount, 0));

      const orderData = {
        orderNumber,
        status: 'pending',
        createdAt: nowIso,
        timestamp: FieldValue.serverTimestamp(),
        customerName: body.customerName || '',
        customerPhone: body.customerPhone || '',
        customerEmail: email || body.customerEmail || '',
        deliveryAddress: body.deliveryAddress || {},
        deliveryMethod: isExpress ? 'Express' : 'Standard',
        paymentMethod: paymentMethod || 'Cash on Delivery',
        paymentStatus: 'unpaid',
        orderTotal: cartTotal,
        deliveryFee,
        total,
        commissionTotal,
        promoCode: appliedCode,
        promoDiscount: promoDiscountPercent,
        customerNote: body.note || '',
        customerId: uid,
        userId: uid,
        vendorIds,
        items: resolved,
      };

      // ── Writes ──────────────────────────────────────────────────────────
      const globalRef = adminDb.collection('orders').doc();
      tx.set(globalRef, orderData);
      tx.set(adminDb.collection('users').doc(uid).collection('orders').doc(orderNumber), orderData);

      const vendorSubtotals: Record<string, number> = {};
      const vendorCommissions: Record<string, number> = {};
      const vendorPayouts: Record<string, number> = {};
      for (const r of resolved) {
        if (!r.vendorId) continue;
        vendorSubtotals[r.vendorId] = round2((vendorSubtotals[r.vendorId] || 0) + r.subtotal);
        vendorCommissions[r.vendorId] = round2((vendorCommissions[r.vendorId] || 0) + r.commissionAmount);
        vendorPayouts[r.vendorId] = round2((vendorPayouts[r.vendorId] || 0) + r.vendorAmount);
      }

      for (const vid of vendorIds) {
        tx.set(adminDb.collection('vendors').doc(vid).collection('orders').doc(orderNumber), {
          ...orderData,
          vendorId: vid,
          globalOrderId: globalRef.id,
          // This vendor's slice of a possibly multi-vendor order.
          vendorSubtotal: vendorSubtotals[vid] || 0,
          vendorCommission: vendorCommissions[vid] || 0,
          vendorPayout: vendorPayouts[vid] || 0,
        });
        // merge rather than update: a vendor document that has not been created
        // yet must not be able to block a customer's checkout.
        tx.set(adminDb.collection('vendors').doc(vid), {
          totalSales: FieldValue.increment(vendorSubtotals[vid] || 0),
          orderCount: FieldValue.increment(1),
          updatedAt: nowIso,
        }, { merge: true });
      }

      if (promoId && appliedCode) {
        tx.set(adminDb.collection('promoRedemptions').doc(), {
          promoId,
          code: appliedCode,
          userId: uid,
          redeemedAt: nowIso,
        });
      }

      // Stock: size products get their per-size counts rewritten, and the total
      // is recomputed from them so the two can never disagree.
      for (const [index, id] of uniqueIds.entries()) {
        const p = products.get(id)!;
        const variants = workingVariants.get(id)!;
        const hasSizes = variants.length > 0 && (p.sizeOptions?.length || 0) > 0;

        if (hasSizes) {
          tx.update(productRefs[index], {
            variants,
            stock: variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
            updatedAt: nowIso,
          });
        } else if (typeof p.stock === 'number') {
          tx.update(productRefs[index], { stock: workingStock.get(id)!, updatedAt: nowIso });
        }
      }

      return { globalOrderId: globalRef.id, total, cartTotal, deliveryFee, discount };
    });

    return res.json({ success: true, orderId: orderNumber, ...result });
  } catch (error) {
    if (error instanceof OrderError) {
      return res.status(400).json({ error: error.message });
    }
    console.error('create-order error:', error);
    return res.status(500).json({ error: 'Could not place the order. Please try again.' });
  }
});

export const ordersRouter = router;
