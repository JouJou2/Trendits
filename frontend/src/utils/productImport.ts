import type { ProductType, ProductVariant } from '../data/products';
import {
  type CategoryRecord, categoryOptions, effectiveVariantTypes, slugify,
} from './categories';

/**
 * Turns spreadsheet rows into the product documents the site actually uses,
 * and products back into rows for export. Pure functions only — no Firestore,
 * no React — so the rules below can be tested directly.
 *
 * How variations map onto the site's data model:
 *   - Rows sharing a Group are one product family.
 *   - Within a family, each Colour becomes its own listing (a separate product
 *     document), linked to the others by a shared variantGroupId. That is how
 *     the product page already shows colours.
 *   - Within a listing, each Size becomes a row in `variants`, with its own
 *     stock and, if it differs, its own price.
 *   - Sizes are only kept when the category allows sizes, and colours only when
 *     it allows colours. The product form drops those fields on save otherwise,
 *     so storing them anyway would get them silently deleted on the next edit.
 */

// ── Spreadsheet row, after header matching and cell unwrapping ──────────────

export interface SheetRow {
  rowNumber: number;
  group: string;
  id: string;
  title: string;
  brand: string;
  color: string;
  size: string;
  price: number | null;
  fees: number | null;
  oldPrice: number | null;
  description: string;
  category: string;
  imageUrl: string;
  stock: number | null;
  featured: boolean | null;
  vendorId: string;
  rating: number | null;
  reviews: number | null;
}

export const EXAMPLE_TITLE_PREFIX = 'EXAMPLE';

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toBool = (value: unknown): boolean | null => {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return null;
  return ['yes', 'y', 'true', '1'].includes(v);
};

/**
 * Builds a SheetRow from a header-keyed record. Header spellings drift —
 * "Image URL", "ImageURL", "image url" — so lookups ignore case and punctuation.
 */
export const toSheetRow = (record: Record<string, unknown>, rowNumber: number): SheetRow => {
  const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalized = new Map<string, unknown>();
  for (const [rawKey, value] of Object.entries(record)) {
    const k = key(rawKey);
    if (!normalized.has(k)) normalized.set(k, value);
  }
  const pick = (...names: string[]) => {
    for (const name of names) {
      const value = normalized.get(key(name));
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return undefined;
  };
  const text = (...names: string[]) => String(pick(...names) ?? '').trim();

  return {
    rowNumber,
    group: text('Group', 'Variant Group', 'Handle'),
    id: text('ID', 'Product ID', 'ProductID'),
    title: text('Title', 'Name'),
    brand: text('Brand'),
    color: text('Color', 'Colour'),
    size: text('Size'),
    price: toNumber(pick('Price', 'Vendor Price', 'Price (USD)', 'Original Price')),
    fees: toNumber(pick('Commission %', 'Commission', 'Fees %', 'Fees', 'Fee %', 'feePercentage')),
    oldPrice: toNumber(pick('Old Price', 'OldPrice', 'Compare at Price')),
    description: text('Description'),
    category: text('Category', 'CategoryID', 'Category Id'),
    imageUrl: text('Image URL', 'ImageURL', 'Image'),
    stock: toNumber(pick('Stock', 'Quantity', 'Qty')),
    featured: toBool(pick('Featured')),
    vendorId: text('Vendor ID', 'VendorID', 'vendor_id'),
    rating: toNumber(pick('Rating')),
    reviews: toNumber(pick('Reviews')),
  };
};

// ── Import planning ─────────────────────────────────────────────────────────

export interface ImportContext {
  categories: CategoryRecord[];
  /** Products the importer can already see, used to tell updates from creates. */
  existingProducts: Pick<ProductType, 'id' | 'variantGroupId'>[];
  /** Admins may set commission, rating and reviews; vendors may not. */
  isStaff: boolean;
  /** For a vendor, every row is filed under their own store regardless of the sheet. */
  lockedVendorId?: string;
  /** Store commission rate by vendor id, read from the vendor documents. */
  commissionByVendor: Record<string, number>;
  /** Maps a source image link to the copy stored in our bucket ('' if it failed). */
  storedImage: (sourceUrl: string) => string;
  newId: () => string;
  now: string;
}

export interface PlannedWrite {
  id: string;
  isNew: boolean;
  data: Record<string, unknown>;
  rows: number[];
}

export interface ImportPlan {
  writes: PlannedWrite[];
  /** Row-level problems that stopped a row from importing. */
  errors: string[];
  /** Things that imported, but not quite as written. */
  warnings: string[];
}

const resolveCategory = (value: string, categories: CategoryRecord[]): string | null => {
  if (!value) return null;
  const wanted = value.trim().toLowerCase();
  const options = categoryOptions(categories);
  return (
    options.find(o => o.slug.toLowerCase() === wanted)?.slug
    ?? options.find(o => o.label.toLowerCase() === wanted)?.slug
    // "Electronics > Men" typed with a plain angle bracket
    ?? options.find(o => o.label.toLowerCase().replace(/\s*›\s*/g, '>') === wanted.replace(/\s*>\s*/g, '>'))?.slug
    ?? categories.find(c => c.name.toLowerCase() === wanted && !c.parentId)?.slug
    ?? options.find(o => o.slug.toLowerCase() === slugify(value))?.slug
    ?? null
  );
};

export const planImport = (rawRows: SheetRow[], ctx: ImportContext): ImportPlan => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const existingIds = new Set(ctx.existingProducts.map(p => String(p.id)));
  const existingGroupIds = new Set(ctx.existingProducts.map(p => p.variantGroupId).filter(Boolean) as string[]);

  // 1. Keep rows that carry real content and are not the template's examples.
  const rows = rawRows.filter(r => {
    const hasContent = r.title || r.brand || r.description || r.imageUrl || (r.price ?? 0) > 0;
    if (!hasContent) return false;
    if (r.title.toUpperCase().startsWith(EXAMPLE_TITLE_PREFIX)) {
      warnings.push(`Row ${r.rowNumber}: skipped the template's example row.`);
      return false;
    }
    return true;
  });

  // 2. Validate each row on its own.
  const valid: (SheetRow & { categorySlug: string })[] = [];
  for (const r of rows) {
    const problems: string[] = [];
    if (!r.title) problems.push('Title is empty');
    if (r.price === null) problems.push('Price is empty or not a number');
    else if (r.price < 0) problems.push('Price cannot be negative');
    const categorySlug = resolveCategory(r.category, ctx.categories);
    if (!categorySlug) problems.push(r.category ? `Category "${r.category}" does not exist` : 'Category is empty');
    if (r.stock !== null && (r.stock < 0 || !Number.isInteger(r.stock))) problems.push('Stock must be a whole number, 0 or more');
    // Mirrors isValidId() in firestore.rules. One bad id would make Firestore
    // reject the entire batch it was written in, taking good rows with it.
    if (r.id && !/^[a-zA-Z0-9_-]{1,128}$/.test(r.id)) problems.push('ID may only contain letters, numbers, - and _');
    if (!ctx.isStaff && !ctx.lockedVendorId) problems.push('Your account is not linked to a store');
    if (ctx.isStaff && !r.vendorId) problems.push('Vendor ID is empty');

    if (problems.length) {
      errors.push(`Row ${r.rowNumber}${r.title ? ` ("${r.title}")` : ''}: ${problems.join('; ')}.`);
    } else {
      valid.push({ ...r, categorySlug: categorySlug! });
    }
  }

  // 3. Families: rows sharing a Group, or an ID, or a lone row.
  const families = new Map<string, typeof valid>();
  for (const r of valid) {
    const familyKey = r.group ? `g:${r.group.toLowerCase()}` : r.id ? `i:${r.id}` : `r:${r.rowNumber}`;
    if (!families.has(familyKey)) families.set(familyKey, []);
    families.get(familyKey)!.push(r);
  }

  const writes: PlannedWrite[] = [];

  for (const familyRows of families.values()) {
    const first = familyRows[0];
    const category = ctx.categories.find(c => c.slug === first.categorySlug);
    const axes = effectiveVariantTypes(category, ctx.categories);
    const allowSizes = axes.includes('size');
    const allowColors = axes.includes('color');
    const label = `"${first.title}"`;

    if (!allowColors && familyRows.some(r => r.color)) {
      warnings.push(`${label}: colours were ignored — the "${category?.name ?? first.categorySlug}" category does not use colours.`);
    }
    if (!allowSizes && familyRows.some(r => r.size)) {
      warnings.push(`${label}: sizes were ignored — the "${category?.name ?? first.categorySlug}" category does not use sizes.`);
    }

    // 4. One listing per colour (or a single listing when colours are off).
    const listings = new Map<string, typeof valid>();
    for (const r of familyRows) {
      const colorKey = allowColors ? r.color.toLowerCase() : '';
      if (!listings.has(colorKey)) listings.set(colorKey, []);
      listings.get(colorKey)!.push(r);
    }
    const colourCount = [...listings.keys()].filter(Boolean).length;
    const linkColours = allowColors && listings.size > 1;

    // Reuse an existing family link when re-importing an export, so colours
    // stay attached to the listings they were already grouped with.
    let groupId: string | undefined;
    if (linkColours) {
      const fromSheet = first.group && existingGroupIds.has(first.group) ? first.group : undefined;
      const fromExisting = familyRows
        .map(r => ctx.existingProducts.find(p => String(p.id) === r.id)?.variantGroupId)
        .find(Boolean);
      groupId = fromSheet ?? fromExisting ?? ctx.newId();
    }

    for (const [colorKey, listingRows] of listings) {
      const lead = listingRows[0];
      const color = colorKey ? lead.color : '';

      // Document id: an ID in the sheet updates that product; otherwise create.
      const ids = [...new Set(listingRows.map(r => r.id).filter(Boolean))];
      if (ids.length > 1) {
        warnings.push(`${label}${color ? ` (${color})` : ''}: rows carried different IDs; used ${ids[0]}.`);
      }
      const id = ids[0] || ctx.newId();
      const isNew = !existingIds.has(id);

      // Sizes → variants.
      const basePrice = lead.price!;
      let variants: ProductVariant[] = [];
      let sizeOptions: string[] = [];
      let stock: number;

      if (allowSizes && listingRows.some(r => r.size)) {
        const bySize = new Map<string, ProductVariant>();
        for (const r of listingRows) {
          if (!r.size) {
            warnings.push(`Row ${r.rowNumber}: no Size given for ${label}, which has sizes on other rows — skipped.`);
            continue;
          }
          const sizeKey = r.size.toLowerCase();
          const existing = bySize.get(sizeKey);
          if (existing) {
            warnings.push(`${label}: size ${r.size} appeared twice${color ? ` in ${color}` : ''}; stock was added together.`);
            existing.stock += r.stock ?? 0;
            continue;
          }
          bySize.set(sizeKey, {
            id: r.size,
            size: r.size,
            stock: r.stock ?? 0,
            // Only store a price on the size when it differs from the listing's.
            price: r.price !== null && r.price !== basePrice ? r.price : null,
          });
        }
        variants = [...bySize.values()];
        sizeOptions = variants.map(v => v.size!);
        stock = variants.reduce((sum, v) => sum + v.stock, 0);
      } else {
        if (listingRows.length > 1) {
          warnings.push(`${label}${color ? ` (${color})` : ''}: ${listingRows.length} rows describe the same item with no sizes; used the first.`);
        }
        stock = lead.stock ?? 0;
      }

      // Colours shown as separate listings need the colour in the title to be
      // told apart in a grid — the same "BLACK - Title" convention the form uses.
      const title = linkColours && color && !lead.title.toLowerCase().includes(color.toLowerCase())
        ? `${color.toUpperCase()} - ${lead.title}`
        : lead.title;

      const vendorId = ctx.lockedVendorId || lead.vendorId;
      const image = ctx.storedImage(listingRows.map(r => r.imageUrl).find(Boolean) ?? '');

      const data: Record<string, unknown> = {
        title,
        brand: lead.brand,
        price: basePrice,
        oldPrice: lead.oldPrice,
        description: lead.description,
        categoryId: lead.categorySlug,
        stock,
        sizeOptions,
        sizes: sizeOptions,
        variants,
        colors: color ? [color] : [],
        variantColor: color,
        updatedAt: ctx.now,
      };
      if (groupId) data.variantGroupId = groupId;

      // Image: an empty cell on an update keeps the current photo and gallery.
      if (image) data.image = image;
      if (isNew) data.images = image ? [image] : [];
      if (lead.imageUrl && !image) {
        warnings.push(`${label}${color ? ` (${color})` : ''}: the image could not be imported${isNew ? ', so it was created without one' : ', so its current photo was kept'}.`);
      }

      if (isNew) {
        data.vendorId = vendorId;
        data.createdAt = ctx.now;
        data.specs = {};
        data.featured = lead.featured ?? false;
        // Commission: a vendor's store rate, or an admin's explicit figure.
        data.feePercentage = ctx.isStaff && lead.fees !== null
          ? lead.fees
          : ctx.commissionByVendor[vendorId] ?? 0;
        data.rating = ctx.isStaff ? lead.rating ?? 0 : 0;
        data.reviews = ctx.isStaff ? lead.reviews ?? 0 : 0;
      } else {
        // On an update, leave platform-owned fields alone unless an admin set
        // them. Rules refuse a vendor changing commission or owner, and writing
        // blanks here used to reset real ratings and review counts to zero.
        if (lead.featured !== null) data.featured = lead.featured;
        if (ctx.isStaff) {
          if (lead.vendorId) data.vendorId = lead.vendorId;
          if (lead.fees !== null) data.feePercentage = lead.fees;
          if (lead.rating !== null) data.rating = lead.rating;
          if (lead.reviews !== null) data.reviews = lead.reviews;
        }
      }

      writes.push({ id, isNew, data, rows: listingRows.map(r => r.rowNumber) });
    }

    if (linkColours && colourCount < listings.size) {
      warnings.push(`${label}: some rows had no colour while others did, so they became a separate listing.`);
    }
  }

  return { writes, errors, warnings };
};

// ── Export ──────────────────────────────────────────────────────────────────

export interface ExportRow {
  group: string;
  id: string;
  title: string;
  brand: string;
  color: string;
  size: string;
  price: number | string;
  fees: number | string;
  /** Trendit's commission on this row's price. */
  commissionAmount: number | string;
  /** What the vendor receives from this row's price after commission. */
  vendorAmount: number | string;
  oldPrice: number | string;
  description: string;
  category: string;
  imageUrl: string;
  stock: number | string;
  featured: string;
  vendorId: string;
  rating: number | string;
  reviews: number | string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Commission comes out of the price. Same arithmetic as splitSale in
 * utils/commission.ts, kept local so this module stays free of Firestore.
 */
const splitColumns = (price: number, fee: number) => {
  const commissionAmount = round2(price * (fee > 0 ? fee : 0) / 100);
  return { commissionAmount, vendorAmount: round2(price - commissionAmount) };
};

/**
 * One row per size (or one row for a product without sizes). Colour listings
 * share a Group, so the same file imports straight back as the same family.
 */
export const productsToRows = (
  products: ProductType[],
  categories: CategoryRecord[],
  lockedVendorId?: string,
): ExportRow[] => {
  const labels = new Map(categoryOptions(categories).map(o => [o.slug, o.label]));
  const rows: ExportRow[] = [];

  for (const p of products) {
    const fee = Number(p.feePercentage || 0);
    const base = {
      group: p.variantGroupId || '',
      id: String(p.id),
      title: p.title || '',
      brand: p.brand || '',
      color: p.variantColor || '',
      fees: fee,
      oldPrice: p.oldPrice ?? '',
      description: p.description || '',
      category: labels.get(p.categoryId) || p.categoryId || '',
      imageUrl: p.image || '',
      featured: p.featured ? 'Yes' : 'No',
      vendorId: lockedVendorId || p.vendorId || '',
      rating: Number(p.rating || 0),
      reviews: Number(p.reviews || 0),
    };

    const variants = (p.sizeOptions?.length || 0) > 0 ? (p.variants || []) : [];
    if (variants.length) {
      // A product with sizes needs a Group so its size rows stay together.
      const group = base.group || String(p.id);
      for (const v of variants) {
        const price = typeof v.price === 'number' ? v.price : Number(p.price || 0);
        rows.push({ ...base, group, size: v.size || '', price, ...splitColumns(price, fee), stock: Number(v.stock || 0) });
      }
    } else {
      const price = Number(p.price || 0);
      rows.push({ ...base, size: '', price, ...splitColumns(price, fee), stock: Number(p.stock || 0) });
    }
  }
  return rows;
};
