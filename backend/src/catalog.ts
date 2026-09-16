import { adminDb } from './firebaseAdmin.js';

/**
 * The catalog, as the AI routes see it.
 *
 * Product facts are read here rather than taken from the browser: a request
 * body can say anything, and the prompt is built from these values. Cached
 * briefly because a chat message would otherwise cost a catalog read each time.
 */
export interface CatalogItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  categoryId: string;
  description: string;
}

const CACHE_MS = 5 * 60_000;
const CATALOG_SIZE = 200;

let cache: { items: CatalogItem[]; at: number } | null = null;

const toItem = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): CatalogItem => {
  const d = doc.data() || {};
  return {
    id: doc.id,
    title: String(d.title || ''),
    brand: String(d.brand || ''),
    price: Number(d.price || 0),
    categoryId: String(d.categoryId || ''),
    description: String(d.description || ''),
  };
};

export const getCatalog = async (): Promise<CatalogItem[]> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const snap = await adminDb.collection('products')
    .select('title', 'brand', 'price', 'categoryId', 'description')
    .limit(CATALOG_SIZE)
    .get();
  cache = { items: snap.docs.map(toItem), at: Date.now() };
  return cache.items;
};

export const getProduct = async (productId: string): Promise<CatalogItem | null> => {
  const cached = cache?.items.find(p => p.id === productId);
  if (cached && Date.now() - (cache?.at ?? 0) < CACHE_MS) return cached;
  const doc = await adminDb.collection('products').doc(productId).get();
  return doc.exists ? toItem(doc) : null;
};

/**
 * The products worth putting in front of the model for this question — keyword
 * matches first, then a small sample so an opening "hello" still has context.
 */
export const relevantProducts = (catalog: CatalogItem[], message: string, max = 12): CatalogItem[] => {
  const words = message.toLowerCase().split(/[^a-z0-9]+/i).filter(w => w.length > 2);
  if (!words.length) return catalog.slice(0, max);

  const scored = catalog
    .map(p => ({ p, score: words.filter(w => `${p.title} ${p.brand} ${p.categoryId}`.toLowerCase().includes(w)).length }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored.slice(0, max).map(x => x.p) : catalog.slice(0, 8);
};
