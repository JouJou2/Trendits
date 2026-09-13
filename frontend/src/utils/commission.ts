import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Trendit's commission on a product is set per store, by an admin, on the
 * vendor document (`commissionRate`). A vendor never chooses their own.
 *
 * Firestore rules enforce the same thing on create (see ownsIncomingProduct),
 * reading `commissionRate` with a default of 0 — so this must default to 0 as
 * well, or a vendor whose store has no rate set could not create products.
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

/** The price shoppers see: the vendor's price plus the commission on top. */
export const finalPrice = (vendorPrice: number, commissionPercent: number) =>
  Math.round(vendorPrice * (1 + (commissionPercent > 0 ? commissionPercent : 0) / 100) * 100) / 100;
