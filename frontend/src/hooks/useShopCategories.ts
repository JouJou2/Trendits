import { useSyncExternalStore } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  type CategoryRecord, byDisplayOrder, childrenOf, productInCategory, topLevelCategories,
} from '../utils/categories';

/**
 * The categories shoppers are shown, with live product counts.
 *
 * A category with nothing in it is hidden everywhere a shopper picks one —
 * the header, the menu, the homepage row, the Categories page, search
 * filters — so nobody clicks through to "No products found". A main category
 * counts everything in its subcategories too, so it stays visible while any
 * subcategory has stock. Admin screens read Firestore directly and still see
 * every category, empty or not.
 *
 * One Firestore subscription is shared by every component that uses this, and
 * it closes when the last of them unmounts.
 */

type ProductCategoryFields = { categoryId?: string; categoryIds?: unknown };

interface ShopCategoriesState {
  ready: boolean;
  categories: CategoryRecord[];
  /** Products per category slug, a main category including its subcategories. */
  counts: Record<string, number>;
}

const PRODUCT_LIMIT = 1000;

let state: ShopCategoriesState = { ready: false, categories: [], counts: {} };
let categoriesLoaded = false;
let productsLoaded = false;
let categories: CategoryRecord[] = [];
let products: ProductCategoryFields[] = [];

const listeners = new Set<() => void>();
let unsubscribers: (() => void)[] = [];

const recompute = () => {
  const counts: Record<string, number> = {};
  for (const cat of categories) {
    counts[cat.slug] = products.filter(p => productInCategory(p, cat.slug, categories)).length;
  }
  state = { ready: categoriesLoaded && productsLoaded, categories, counts };
  listeners.forEach(l => l());
};

const start = () => {
  unsubscribers = [
    onSnapshot(collection(db, 'categories'), snap => {
      categories = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        name: String(d.data().name || d.id),
        slug: String(d.data().slug || d.id),
        parentId: d.data().parentId ?? null,
      } as CategoryRecord));
      categoriesLoaded = true;
      recompute();
    }, err => {
      console.error('Categories fetch error:', err);
      categoriesLoaded = true;
      recompute();
    }),
    onSnapshot(query(collection(db, 'products'), limit(PRODUCT_LIMIT)), snap => {
      products = snap.docs.map(d => ({ categoryId: d.data().categoryId, categoryIds: d.data().categoryIds }));
      productsLoaded = true;
      recompute();
    }, err => {
      console.error('Category counts fetch error:', err);
      productsLoaded = true;
      recompute();
    }),
  ];
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribers.forEach(u => u());
      unsubscribers = [];
      categoriesLoaded = false;
      productsLoaded = false;
    }
  };
};

const getSnapshot = () => state;


/**
 * Derived lists, rebuilt only when the store changes. They must keep the same
 * identity between renders: components put them in effect dependency lists,
 * and a fresh array each render would re-run those effects forever.
 */
const derive = (snapshot: ShopCategoriesState) => {
  const { ready, categories: all, counts } = snapshot;
  const hasProducts = (slug: string) => (counts[slug] || 0) > 0;

  /** Main categories that have products, in the order an admin set. */
  const visibleTopLevel = topLevelCategories(all)
    .filter(c => hasProducts(c.slug))
    .sort(byDisplayOrder);

  /** Subcategories of a category that have products, in the order an admin set. */
  const visibleChildrenOf = (cat: CategoryRecord) =>
    childrenOf(cat, all).filter(c => hasProducts(c.slug)).sort(byDisplayOrder);

  /** Every category (main or sub) that has products. */
  const visibleAll = all.filter(c => hasProducts(c.slug));

  return { ready, all, counts, hasProducts, visibleTopLevel, visibleChildrenOf, visibleAll };
};

let derived: { from: ShopCategoriesState; value: ReturnType<typeof derive> } | null = null;

export const useShopCategories = () => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!derived || derived.from !== snapshot) derived = { from: snapshot, value: derive(snapshot) };
  return derived.value;
};
