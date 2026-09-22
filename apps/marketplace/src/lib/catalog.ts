import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import {
  byDisplayOrder, childrenOf, productInCategory, topLevelCategories, type CategoryRecord,
} from '@shared/categories';
import { db } from './firebase';

/**
 * The live catalog, read straight from the website's Firestore. Nothing is
 * cached or copied: a vendor's edit on the website shows in the app as soon
 * as it is saved.
 */

export interface ProductVariant {
  id: string;
  size?: string;
  price?: number | null;
  stock: number;
}

/** The product fields the app reads — a subset of the website's ProductType. */
export interface Product {
  id: string;
  title: string;
  brand?: string;
  price: number;
  oldPrice?: number | null;
  image?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
  stock?: number;
  featured?: boolean;
  categoryId: string;
  categoryIds?: string[];
  vendorId?: string;
  sizeOptions?: string[];
  variants?: ProductVariant[];
  colors?: string[];
  variantGroupId?: string;
  variantColor?: string;
  createdAt?: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl?: string;
  title?: string;
  focalX?: number;
  focalY?: number;
}

const PRODUCT_LIMIT = 300;

interface LiveList<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

/** Subscribes to a Firestore query and always ends loading, even on failure. */
const useLiveList = <T,>(build: () => ReturnType<typeof query> | ReturnType<typeof collection>, map: (id: string, data: Record<string, unknown>) => T) => {
  const [state, setState] = useState<LiveList<T>>({ items: [], loading: true, error: null });
  useEffect(() => {
    const unsub = onSnapshot(
      build(),
      snap => setState({ items: snap.docs.map(d => map(d.id, d.data() as Record<string, unknown>)), loading: false, error: null }),
      err => {
        console.error('Catalog read failed:', err);
        setState(prev => ({ ...prev, loading: false, error: 'Could not load. Check your connection.' }));
      },
    );
    return unsub;
    // The query is fixed for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
};

export const useProducts = () =>
  useLiveList<Product>(
    () => query(collection(db, 'products'), limit(PRODUCT_LIMIT)),
    (id, d) => ({ ...(d as unknown as Product), id, price: Number(d.price || 0) }),
  );

export const useBanners = () => {
  const state = useLiveList<Banner & { active?: boolean }>(
    () => query(collection(db, 'banners'), orderBy('order', 'asc')),
    (id, d) => ({ ...(d as unknown as Banner & { active?: boolean }), id }),
  );
  return { ...state, items: state.items.filter(b => b.active !== false && b.imageUrl) };
};

export const useCategoryRecords = () =>
  useLiveList<CategoryRecord>(
    () => collection(db, 'categories'),
    (id, d) => ({ ...(d as unknown as CategoryRecord), id, name: String(d.name || id), slug: String(d.slug || id), parentId: (d.parentId as string | null) ?? null }),
  );

/**
 * Categories the way the website shows them to shoppers: in the admin's
 * order, and only those with products — an empty one would lead to an empty
 * screen. Uses the website's own category rules (@shared/categories), so a
 * product filed under a subcategory also counts for its parent.
 */
export const useShopCategories = (products: Product[]) => {
  const { items: all, loading } = useCategoryRecords();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of all) counts[cat.slug] = products.filter(p => productInCategory(p, cat.slug, all)).length;
    const hasProducts = (c: CategoryRecord) => (counts[c.slug] || 0) > 0;
    return {
      loading,
      all,
      counts,
      topLevel: topLevelCategories(all).filter(hasProducts).sort(byDisplayOrder),
      childrenOf: (cat: CategoryRecord) => childrenOf(cat, all).filter(hasProducts).sort(byDisplayOrder),
    };
  }, [all, products, loading]);
};

/**
 * Every colour a product family comes in. Colours are separate listings
 * linked by variantGroupId, so a card shows its siblings' colours too.
 */
export const colourFamilies = (products: Product[]) => {
  const families = new Map<string, string[]>();
  for (const p of products) {
    if (!p.variantGroupId || !p.variantColor) continue;
    const list = families.get(p.variantGroupId) || [];
    if (!list.some(c => c.toLowerCase() === p.variantColor!.toLowerCase())) list.push(p.variantColor);
    families.set(p.variantGroupId, list);
  }
  return (p: Product): string[] =>
    (p.variantGroupId && families.get(p.variantGroupId)) || (p.variantColor ? [p.variantColor] : p.colors || []);
};

export const formatPrice = (value: number) => `$${value.toFixed(2)}`;
