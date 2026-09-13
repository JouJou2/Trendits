import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * How money is split on Trendit.
 *
 * The price on a product is the price shoppers pay — commission is never added
 * on top. Trendit's commission is taken OUT of that price, and the vendor
 * receives the rest. A $10 product at 8% sells for $10: Trendit earns $0.80
 * and the vendor receives $9.20.
 *
 * The rate is set per store by an admin (vendor `commissionRate`) and copied
 * onto each product as `feePercentage`, which an admin may override. Vendors
 * never choose their own; Firestore rules enforce that on create.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Firestore rules read `commissionRate` with a default of 0 when checking a
 * vendor's new product, so this must default to 0 as well or a vendor whose
 * store has no rate set could not create products.
 */
export const commissionRateOf = (vendor: { commissionRate?: unknown } | null | undefined): number => {
  const rate = Number(vendor?.commissionRate);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0;
};

/**
 * Reads the rate from the stored vendor document rather than any cached copy,
 * because the rules compare against what is stored at the moment of writing.
 */
export const fetchVendorCommission = async (vendorId: string | null | undefined): Promise<number> => {
  if (!vendorId) return 0;
  const snap = await getDoc(doc(db, 'vendors', vendorId));
  return commissionRateOf(snap.exists() ? snap.data() : null);
};

/** Splits an amount the shopper pays into Trendit's commission and the vendor's share. */
export const splitSale = (amount: number, commissionPercent: number) => {
  const pct = Number.isFinite(commissionPercent) && commissionPercent > 0 ? commissionPercent : 0;
  const commission = round2(amount * pct / 100);
  return { commission, vendorAmount: round2(amount - commission) };
};

/**
 * Commission and vendor share for one line of an order.
 *
 * Orders placed since commission began being recorded carry `commissionAmount`
 * and `vendorAmount` from the moment of sale, so changing a store's rate later
 * never rewrites past earnings. Older orders predate that, so they fall back to
 * the store's current rate — the same figure the finance page always showed.
 */
export const orderItemSplit = (
  item: { subtotal?: unknown; commissionAmount?: unknown; vendorAmount?: unknown },
  fallbackRatePercent: number,
) => {
  const subtotal = Number(item.subtotal || 0);
  if (typeof item.commissionAmount === 'number') {
    const vendorAmount = typeof item.vendorAmount === 'number'
      ? item.vendorAmount
      : round2(subtotal - item.commissionAmount);
    return { commission: item.commissionAmount, vendorAmount };
  }
  return splitSale(subtotal, fallbackRatePercent);
};
