/**
 * One place that knows how categories nest.
 *
 * A product stores a single `categoryId` — the slug of the most specific
 * category it belongs to. A subcategory records its parent's document id in
 * `parentId`. Everything that lists, counts or filters by category goes
 * through here so a parent page, its product count and every menu agree on
 * what "in Electronics" means.
 *
 * Nesting is deliberately one level deep (Main → Sub). That covers
 * "Electronics → Men / Women" without the menus and filters needed for an
 * arbitrarily deep tree.
 */

export type VariantType = 'size' | 'color';

export interface CategoryRecord {
  id: string;
  name: string;
  slug: string;
  image?: string;
  type?: 'main' | 'other';
  parentId?: string | null;
  variantTypes?: VariantType[];
  productCount?: number;
  description?: string;
}

/**
 * Must match what existing categories were created with — changing this would
 * make older slugs unreachable from the spreadsheet importer.
 */
export const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '-');

/**
 * A subcategory's slug is prefixed with its parent's, so "Men" under Electronics
 * and "Men" under Fashion become electronics-men and fashion-men. Products
 * reference categories by slug, so two identical slugs would be indistinguishable.
 */
export const subcategorySlug = (parentSlug: string, name: string) => `${parentSlug}-${slugify(name)}`;

export const isTopLevel = (cat: CategoryRecord) => !cat.parentId;

export const topLevelCategories = <T extends CategoryRecord>(all: T[]) => all.filter(isTopLevel);

export const childrenOf = <T extends CategoryRecord>(parent: CategoryRecord, all: T[]) =>
  all.filter(c => c.parentId === parent.id);

export const findBySlug = <T extends CategoryRecord>(slug: string, all: T[]) =>
  all.find(c => c.slug.toLowerCase() === slug.toLowerCase());

export const parentOf = <T extends CategoryRecord>(cat: CategoryRecord, all: T[]) =>
  cat.parentId ? all.find(c => c.id === cat.parentId) : undefined;

/** "Electronics › Men" for a subcategory, just "Electronics" for a main one. */
export const categoryLabel = (cat: CategoryRecord, all: CategoryRecord[]) => {
  const parent = parentOf(cat, all);
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
};

/**
 * Every slug a category page should include: its own, plus its subcategories'.
 * Viewing Electronics shows products filed directly under it and under
 * Electronics › Men and Electronics › Women.
 */
export const slugsWithin = (slug: string, all: CategoryRecord[]): string[] => {
  const cat = findBySlug(slug, all);
  if (!cat) return [slug.toLowerCase()];
  return [cat.slug, ...childrenOf(cat, all).map(c => c.slug)].map(s => s.toLowerCase());
};

/** Does a product with this categoryId belong on this category's page? */
export const productInCategory = (productCategoryId: string | undefined, slug: string, all: CategoryRecord[]) => {
  if (!productCategoryId) return false;
  return slugsWithin(slug, all).includes(productCategoryId.toLowerCase());
};

/**
 * A subcategory that leaves its variant options empty inherits its parent's, so
 * creating "Fashion › Men" does not quietly remove the size picker.
 */
export const effectiveVariantTypes = (cat: CategoryRecord | undefined, all: CategoryRecord[]): VariantType[] => {
  if (!cat) return [];
  if (cat.variantTypes && cat.variantTypes.length > 0) return cat.variantTypes;
  return parentOf(cat, all)?.variantTypes || [];
};

/**
 * Categories ordered for a dropdown: each main category followed by its
 * subcategories, with labels that show the nesting.
 */
export const categoryOptions = (all: CategoryRecord[]) => {
  const byName = (a: CategoryRecord, b: CategoryRecord) => a.name.localeCompare(b.name);
  const options: { slug: string; label: string; depth: 0 | 1 }[] = [];
  for (const parent of topLevelCategories(all).sort(byName)) {
    options.push({ slug: parent.slug, label: parent.name, depth: 0 });
    for (const child of childrenOf(parent, all).sort(byName)) {
      options.push({ slug: child.slug, label: `${parent.name} › ${child.name}`, depth: 1 });
    }
  }
  // A subcategory whose parent was removed still needs to be selectable.
  for (const orphan of all.filter(c => c.parentId && !all.some(p => p.id === c.parentId))) {
    options.push({ slug: orphan.slug, label: orphan.name, depth: 0 });
  }
  return options;
};
