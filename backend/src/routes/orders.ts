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

/** Mirrors the storefront's getDisplayPrice: list price plus platform fee. */
const displayPrice = (price: number, feePercentage?: number) =>
  !feePercentage || feePercentage <= 0 ? price : price * (1 + feePercentage / 100);

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

  try {
    // ── Resolve every line item against the real product document ──
    const resolved: {
      productId: string;
      productName: string;
      productImage: string | null;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      variant: string;
      vendorId: string | null;
    }[] = [];

    for (const item of items) {
      const productId = String(item.productId || '').trim();
      const quantity = Math.floor(Number(item.quantity));

      if (!productId) return res.status(400).json({ error: 'Cart contains an item with no product.' });
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({ error: 'Invalid quantity.' });
      }

      const snap = await adminDb.collection('products').doc(productId).get();
      if (!snap.exists) {
        return res.status(400).json({ error: `A product in your cart is no longer available.` });
      }
      const p = snap.data() as {
        title?: string;
        price?: number;
        feePercentage?: number;
        stock?: number;
        image?: string;
        images?: string[];
        vendorId?: string;
      };

      if (typeof p.price !== 'number' || p.price < 0) {
        return res.status(400).json({ error: 'A product in your cart has an invalid price.' });
      }
      if (typeof p.stock === 'number' && p.stock < quantity) {
        return res.status(400).json({ error: `"${p.title || 'An item'}" does not have enough stock.` });
      }

      const unitPrice = round2(displayPrice(p.price, p.feePercentage));
      resolved.push({
        productId,
        productName: p.title || 'Product',
        productImage: p.image || p.images?.[0] || null,
        quantity,
        unitPrice,
        subtotal: round2(unitPrice * quantity),
        variant: `${item.selectedColor || 'N/A'} / ${item.selectedSize || 'N/A'}`,
        vendorId: p.vendorId || null,
      });
    }

    const cartTotal = round2(resolved.reduce((sum, r) => sum + r.subtotal, 0));

    // ── Delivery fee (server decides, not the client) ──
    const isExpress = deliveryMethod === 'Express';
    const deliveryFee = isExpress
      ? EXPRESS_FEE
      : cartTotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : STANDARD_FEE;

    // ── Promo: re-validated from Firestore, including the per-account lock ──
    let discount = 0;
    let appliedCode: string | null = null;
    let promoId: string | null = null;
    let promoDiscountPercent = 0;

    if (promoCode && promoCode.trim()) {
      const code = promoCode.trim().toUpperCase();
      const promoSnap = await adminDb
        .collection('promos')
        .where('code', '==', code)
        .where('status', '==', 'Active')
        .limit(1)
        .get();

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
            const already = await adminDb
              .collection('promoRedemptions')
              .where('promoId', '==', promoDoc.id)
              .where('userId', '==', uid)
              .limit(1)
              .get();
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

    const orderNumber = `TRD-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

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
      promoCode: appliedCode,
      promoDiscount: promoDiscountPercent,
      customerNote: body.note || '',
      customerId: uid,
      userId: uid,
      vendorIds,
      items: resolved,
    };

    const batch = adminDb.batch();

    const globalRef = adminDb.collection('orders').doc();
    batch.set(globalRef, orderData);
    batch.set(adminDb.collection('users').doc(uid).collection('orders').doc(orderNumber), orderData);

    const vendorSubtotals: Record<string, number> = {};
    for (const r of resolved) {
      if (r.vendorId) {
        vendorSubtotals[r.vendorId] = round2((vendorSubtotals[r.vendorId] || 0) + r.subtotal);
      }
    }

    for (const vid of vendorIds) {
      batch.set(adminDb.collection('vendors').doc(vid).collection('orders').doc(orderNumber), {
        ...orderData,
        vendorId: vid,
        globalOrderId: globalRef.id,
      });
      batch.update(adminDb.collection('vendors').doc(vid), {
        totalSales: FieldValue.increment(vendorSubtotals[vid] || 0),
        orderCount: FieldValue.increment(1),
        updatedAt: nowIso,
      });
    }

    if (promoId && appliedCode) {
      batch.set(adminDb.collection('promoRedemptions').doc(), {
        promoId,
        code: appliedCode,
        userId: uid,
        redeemedAt: nowIso,
      });
    }

    // Decrement stock so the same unit can't be oversold.
    for (const r of resolved) {
      batch.update(adminDb.collection('products').doc(r.productId), {
        stock: FieldValue.increment(-r.quantity),
      });
    }

    await batch.commit();

    return res.json({
      success: true,
      orderId: orderNumber,
      globalOrderId: globalRef.id,
      total,
      cartTotal,
      deliveryFee,
      discount,
    });
  } catch (error) {
    console.error('create-order error:', error);
    return res.status(500).json({ error: 'Could not place the order. Please try again.' });
  }
});

export const ordersRouter = router;
