import { ProductType } from '../data/products';

// Graduated search relevance.
//
// A flat `keywords.some(...)` match treats "bt720 JBL Headphones" as one bucket,
// so a generic pair of headphones ranks level with the exact model. Instead we
// score every product and drop it into a relevance tier, so results read:
//   BT720  →  BT700 (same series)  →  other JBL headphones  →  other headphones
//   →  other JBL products.

export const TIER = {
  EXACT: 0,
  SERIES: 1,
  BRAND_TYPE: 2,
  TYPE: 3,
  BRAND: 4,
} as const;

export interface RankedGroup {
  tier: number;
  label: string;
  products: ProductType[];
}

const tokenize = (value: string): string[] =>
  value.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);

/** "bt720" / "700" — tokens that look like a model or series designator. */
const isModelToken = (token: string) => /\d/.test(token);

const splitModel = (token: string) => {
  const match = token.match(/^([a-z]*)(\d+)/);
  return match ? { alpha: match[1], digits: match[2] } : null;
};

/**
 * Same product family? "bt720" vs "bt700" → yes (shared "bt" + leading "7").
 * "bt720" vs "gt720" → no (different letters).
 */
const isSameSeries = (a: string, b: string) => {
  const left = splitModel(a);
  const right = splitModel(b);
  if (!left || !right) return false;
  if (left.alpha !== right.alpha) return false;
  if (left.digits === right.digits) return true;
  // Share at least the leading digit, e.g. 7xx vs 7xx.
  const shared = left.digits.length > 2 && right.digits.length > 2;
  return shared && left.digits[0] === right.digits[0];
};

const productText = (p: ProductType) =>
  [p.title, p.name, p.brand, p.description, p.categoryId, ...(p.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

export interface RankOptions {
  /** Known catalog brands, used to tell "jbl" apart from "headphones". */
  brands?: string[];
}

export function rankSearchResults(
  queryText: string,
  products: ProductType[],
  options: RankOptions = {}
): RankedGroup[] {
  const queryTokens = tokenize(queryText);
  if (queryTokens.length === 0) return [];

  const knownBrands = (options.brands || []).map(b => b.toLowerCase()).filter(Boolean);
  const catalogBrandTokens = new Set(knownBrands.flatMap(tokenize));

  const brandTokens = queryTokens.filter(t => catalogBrandTokens.has(t));
  const modelTokens = queryTokens.filter(t => isModelToken(t) && !brandTokens.includes(t));
  const typeTokens = queryTokens.filter(t => !brandTokens.includes(t) && !modelTokens.includes(t));

  const buckets = new Map<number, { product: ProductType; score: number }[]>();
  // Display name for the brand, taken from the catalog so labels read "JBL",
  // not the lowercased query token "jbl".
  let brandLabel = '';

  for (const product of products) {
    const haystack = productText(product);
    const haystackTokens = new Set(tokenize(haystack));
    const productBrand = (product.brand || '').toLowerCase();

    const matched = queryTokens.filter(t => haystack.includes(t));
    const brandMatch =
      brandTokens.length > 0 && brandTokens.some(t => productBrand.includes(t) || haystack.includes(t));
    const typeMatched = typeTokens.filter(t => haystack.includes(t)).length;
    const modelMatched = modelTokens.filter(t => haystack.includes(t)).length;

    const seriesMatch =
      modelMatched === 0 &&
      modelTokens.some(mt => Array.from(haystackTokens).some(ht => isModelToken(ht) && isSameSeries(mt, ht)));

    if (!brandLabel && brandMatch && product.brand) {
      brandLabel = product.brand;
    }

    let tier: number | null = null;
    if (matched.length === queryTokens.length) {
      tier = TIER.EXACT;
    } else if (seriesMatch && (brandMatch || brandTokens.length === 0)) {
      tier = TIER.SERIES;
    } else if (brandMatch && typeMatched > 0) {
      tier = TIER.BRAND_TYPE;
    } else if (typeMatched > 0) {
      tier = TIER.TYPE;
    } else if (brandMatch) {
      tier = TIER.BRAND;
    }

    if (tier === null) continue;

    // Within a tier, more matched words and title hits rank first.
    const titleText = (product.title || '').toLowerCase();
    const titleHits = queryTokens.filter(t => titleText.includes(t)).length;
    const score = matched.length * 10 + titleHits * 5 + (product.rating || 0);

    if (!buckets.has(tier)) buckets.set(tier, []);
    buckets.get(tier)!.push({ product, score });
  }

  const typeLabel = typeTokens.join(' ');
  const displayBrand = brandLabel || brandTokens[0] || '';

  const labelFor = (tier: number): string => {
    switch (tier) {
      case TIER.EXACT:
        return 'Best matches';
      case TIER.SERIES:
        return 'Same series';
      case TIER.BRAND_TYPE:
        return typeLabel && displayBrand
          ? `More ${displayBrand} ${typeLabel}`
          : displayBrand
            ? `More from ${displayBrand}`
            : 'Closely related';
      case TIER.TYPE:
        return typeLabel ? `Other ${typeLabel}` : 'Related products';
      case TIER.BRAND:
        return displayBrand ? `Other ${displayBrand} products` : 'You might also like';
      default:
        return 'Related';
    }
  };

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([tier, entries]) => ({
      tier,
      label: labelFor(tier),
      products: entries.sort((a, b) => b.score - a.score).map(e => e.product),
    }))
    .filter(group => group.products.length > 0);
}
