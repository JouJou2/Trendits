import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, ShoppingBag, SlidersHorizontal, Grid, List as ListIcon, Loader2,
  Star, ChevronDown, X, Filter, Truck, ShieldCheck,
  Tag, BadgePercent, Store, Eye
} from 'lucide-react';
import { getDisplayPrice, ProductType } from '../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProductCard } from '../components/ProductCard';
import { rankSearchResults } from '../utils/searchRanking';

interface FilterState {
  brands: string[];
  categories: string[];
  minPrice: number | '';
  maxPrice: number | '';
  onSale: boolean;
}

// ── SKELETON COMPONENTS ──
const ProductCardSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex gap-5 bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
        <div className="w-40 h-40 shrink-0 rounded-xl bg-slate-200" />
        <div className="flex-1 py-1 space-y-3">
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-5 w-3/4 bg-slate-200 rounded" />
          <div className="h-3 w-32 bg-slate-200 rounded" />
          <div className="h-3 w-full bg-slate-200 rounded" />
          <div className="flex items-center justify-between mt-4">
            <div className="h-8 w-24 bg-slate-200 rounded-xl" />
            <div className="h-10 w-28 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-200" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2.5 w-16 bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-200 rounded" />
        <div className="h-4 w-3/4 bg-slate-200 rounded" />
        <div className="h-3 w-24 bg-slate-200 rounded" />
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="space-y-1.5">
            <div className="h-5 w-20 bg-slate-200 rounded" />
            <div className="h-2.5 w-16 bg-slate-200 rounded" />
          </div>
          <div className="h-10 w-10 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

interface FilterSidebarProps {
  isMobile?: boolean;
  loading: boolean;
  categories: { id: string; name: string; slug: string }[];
  brands: string[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  toggleCategory: (slug: string) => void;
  toggleBrand: (brand: string) => void;
  activeFiltersCount: number;
}

const FilterSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {[1, 2, 3].map(i => (
      <div key={i}>
        <div className="h-4 w-24 bg-slate-200 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(j => (
            <div key={j} className="flex items-center gap-2.5">
              <div className="w-4 h-4 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const FilterSidebar = ({
  isMobile = false,
  loading,
  categories,
  brands,
  filters,
  setFilters,
  toggleCategory,
  toggleBrand,
  activeFiltersCount,
}: FilterSidebarProps) => (
  <div className={`${isMobile ? '' : 'w-64 flex-shrink-0'}`}>
    {loading ? (
      <FilterSkeleton />
    ) : (
      <>
        {/* Categories */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" /> Category
          </h3>
          <div className="space-y-2">
            {categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  filters.categories.includes(cat.slug) 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-slate-300 group-hover:border-blue-400'
                }`}>
                  {filters.categories.includes(cat.slug) && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={filters.categories.includes(cat.slug)}
                  onChange={() => toggleCategory(cat.slug)}
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Brands */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Brand
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {brands.map(brand => (
              <label key={brand} className="flex items-center gap-2.5 cursor-pointer group">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  filters.brands.includes(brand) 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-slate-300 group-hover:border-blue-400'
                }`}>
                  {filters.brands.includes(brand) && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BadgePercent className="w-4 h-4" /> Price
          </h3>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value ? Number(e.target.value) : '' }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">-</span>
            <input 
              type="number" 
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value ? Number(e.target.value) : '' }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Deals */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Deals</h3>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
              filters.onSale ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'
            }`}>
              {filters.onSale && <div className="w-2 h-2 bg-white rounded-sm" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden"
              checked={filters.onSale}
              onChange={(e) => setFilters(prev => ({ ...prev, onSale: e.target.checked }))}
            />
            <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">On Sale</span>
          </label>
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={() => setFilters({ brands: [], categories: [], minPrice: '', maxPrice: '', onSale: false })}
            className="w-full py-2.5 text-sm font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            Clear All Filters ({activeFiltersCount})
          </button>
        )}
      </>
    )}
  </div>
);

export const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const catParam = searchParams.get('cat') || '';
  const dealParam = searchParams.get('deal') === 'true';

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [realProducts, setRealProducts] = useState<ProductType[]>([]);
  const [categories, setCategories] = useState<{id: string; name: string; slug: string}[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
  const [vendors, setVendors] = useState<{id: string; name: string; image?: string; category?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'price-low' | 'price-high' | 'rating' | 'newest'>('relevant');

  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    categories: catParam ? [catParam] : [],
    minPrice: '',
    maxPrice: '',
    onSale: dealParam
  });

  // Fetch products and categories
  useEffect(() => {
    setLoading(true);
    let unsub: (() => void) | undefined;

    const fetchData = async () => {
      try {
        // Fetch categories
        const catSnap = await getDocs(query(collection(db, 'categories'), limit(50)));
        setCategories(catSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name,
          slug: d.data().slug
        })));
                // Fetch vendors
        const vendorsSnap = await getDocs(query(collection(db, 'vendors'), limit(100)));
        setVendors(vendorsSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name || 'Unknown Seller',
          image: d.data().image,
          category: d.data().category
        })));
        // Fetch products
        const q = query(collection(db, 'products'), limit(200));
        unsub = onSnapshot(q, (snapshot) => {
          const prods = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ProductType));
          setRealProducts(prods);

          // Extract unique brands
          const uniqueBrands = [...new Set(prods.map(p => p.brand).filter(Boolean))];
          setBrands(uniqueBrands.sort());

          setLoading(false);
        }, () => setLoading(false));
      } catch {
        setLoading(false);
      }
    };

    fetchData();
    return () => { if (unsub) unsub(); };
  }, []);

  // Relevance-tiered search: exact model → same series → same brand+type →
  // same type other brands → other products from the brand.
  const rankedGroups = useMemo(() => {
    if (!queryParam.trim()) return [];
    return rankSearchResults(queryParam, realProducts, { brands });
  }, [queryParam, realProducts, brands]);

  // Typo/plural tolerant fallback so a search never dead-ends on a bare
  // "no results" page when nothing matched at all.
  const fallbackProducts = useMemo(() => {
    if (!queryParam.trim() || rankedGroups.length > 0) return [];
    const haystackOf = (p: ProductType) =>
      [p.title, p.name, p.brand, p.description, p.categoryId, ...(p.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    const looseKeywords = queryParam
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(kw => kw.slice(0, Math.max(3, kw.length - 2)))
      .filter(kw => kw.length >= 3);
    if (looseKeywords.length === 0) return [];
    return realProducts.filter(p => looseKeywords.some(kw => haystackOf(p).includes(kw)));
  }, [queryParam, realProducts, rankedGroups]);

  const searchTierResult = useMemo(() => {
    if (!queryParam.trim()) return { products: realProducts, tier: 'exact' as const };
    if (rankedGroups.length > 0) {
      return { products: rankedGroups.flatMap(g => g.products), tier: 'exact' as const };
    }
    if (fallbackProducts.length > 0) return { products: fallbackProducts, tier: 'similar' as const };
    return { products: realProducts, tier: 'other' as const };
  }, [queryParam, realProducts, rankedGroups, fallbackProducts]);

  const matchingVendors = useMemo(() => {
    if (!queryParam.trim()) return [];
    const q = queryParam.toLowerCase();
    return vendors.filter(v => v.name.toLowerCase().includes(q));
  }, [queryParam, vendors]);

  // Filter and sort results
  const results = useMemo(() => {
    let filtered = searchTierResult.products;

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(p => filters.categories.includes(p.categoryId));
    }

    // Brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(p => filters.brands.includes(p.brand));
    }

    // Price filter — compare against the price actually shown to the shopper (post-fee), not the raw stored price
    if (filters.minPrice !== '') {
      filtered = filtered.filter(p => getDisplayPrice(p.price, p.feePercentage) >= Number(filters.minPrice));
    }
    if (filters.maxPrice !== '') {
      filtered = filtered.filter(p => getDisplayPrice(p.price, p.feePercentage) <= Number(filters.maxPrice));
    }

    // On sale filter
    if (filters.onSale) {
      filtered = filtered.filter(p => p.oldPrice && p.oldPrice > p.price);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => getDisplayPrice(a.price, a.feePercentage) - getDisplayPrice(b.price, b.feePercentage));
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => getDisplayPrice(b.price, b.feePercentage) - getDisplayPrice(a.price, a.feePercentage));
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
    }

    return filtered;
  }, [searchTierResult, filters, sortBy]);

  // Relevance groups survive filtering by intersecting with `results`. An explicit
  // sort (price/rating/newest) means the shopper wants one global ordering, so we
  // fall back to the flat list in that case.
  const groupedResults = useMemo(() => {
    if (sortBy !== 'relevant' || rankedGroups.length === 0) return null;
    const allowed = new Set(results.map(p => p.id));
    const groups = rankedGroups
      .map(g => ({ ...g, products: g.products.filter(p => allowed.has(p.id)) }))
      .filter(g => g.products.length > 0);
    // A single group adds a header for no benefit — render it flat instead.
    return groups.length > 1 ? groups : null;
  }, [rankedGroups, results, sortBy]);

  const toggleBrand = (brand: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand) 
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const toggleCategory = (slug: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(slug)
        ? prev.categories.filter(c => c !== slug)
        : [...prev.categories, slug]
    }));
  };

  const activeFiltersCount = filters.brands.length + filters.categories.length + 
    (filters.minPrice !== '' ? 1 : 0) + (filters.maxPrice !== '' ? 1 : 0) +
    (filters.onSale ? 1 : 0);
  const getVendorName = (vendorId?: string) => {
    return vendors.find(v => v.id === vendorId)?.name || 'Trendit Store';
  };

  // Shared by the grouped (relevance-tiered) and flat result views.
  const renderProduct = (product: ProductType) => {
    const displayPrice = getDisplayPrice(product.price, product.feePercentage);

    if (viewMode === 'list') {
      const isOutOfStock = product.stock === 0;
      return (
        <motion.div
          layout
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-5 bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-lg transition-shadow"
        >
          <Link to={`/product/${product.id}`} className="relative w-40 h-40 shrink-0 rounded-xl overflow-hidden bg-slate-50">
            <img
              src={product.image || product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'}
              alt={product.title}
              className="w-full h-full object-contain p-2"
            />
            {isOutOfStock && (
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wide rounded-lg">
                Out of Stock
              </span>
            )}
          </Link>
          <div className="flex-1 min-w-0 py-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.brand}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">{getVendorName(product.vendorId)}</span>
            </div>
            <Link to={`/product/${product.id}`}>
              <h3 className="font-bold text-slate-900 text-lg mt-1 hover:text-blue-600 transition-colors">{product.title}</h3>
            </Link>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                ))}
              </div>
              <span className="text-xs text-slate-500">({product.reviews || 0})</span>
            </div>
            <p className="text-sm text-slate-500 mt-2 line-clamp-2">{product.description}</p>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">${displayPrice.toFixed(2)}</span>
                {product.oldPrice && (
                  <span className="text-sm text-slate-400 line-through">${getDisplayPrice(product.oldPrice, product.feePercentage).toFixed(2)}</span>
                )}
              </div>
              <Link
                to={`/product/${product.id}`}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors active:scale-95 inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4" /> {isOutOfStock ? 'View (Out of Stock)' : 'View Product'}
              </Link>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div layout key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <ProductCard product={product} />
      </motion.div>
    );
  };

  return (
    <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-600">Search</span>
          {queryParam && (
            <>
              <span>/</span>
              <span className="text-slate-900 font-bold">"{queryParam}"</span>
            </>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
              {queryParam ? (
                <>Results for <span className="text-blue-600">"{queryParam}"</span></>
              ) : catParam ? (
                <>Category: <span className="text-blue-600">{categories.find(c => c.slug === catParam)?.name || catParam}</span></>
              ) : dealParam ? (
                <>Hot <span className="text-blue-600">Deals</span></>
              ) : (
                "All Products"
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {loading ? 'Loading products...' : `${results.length} item${results.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {/* Sort & View Toggle */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                disabled={loading}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
              >
                <option value="relevant">Most Relevant</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                disabled={loading}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-50`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                disabled={loading}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-50`}
              >
                <ListIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Filter Button */}
            <button 
              onClick={() => setMobileFiltersOpen(true)}
              disabled={loading}
              className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="ml-1 w-5 h-5 bg-blue-500 rounded-full text-[11px] flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Matching Vendors */}
      {!loading && matchingVendors.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">Stores matching "{queryParam}"</p>
          <div className="flex flex-wrap gap-3">
            {matchingVendors.map(v => (
              <Link
                key={v.id}
                to={`/vendor/${v.id}`}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl pl-2 pr-4 py-2 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                  {v.image
                    ? <img src={v.image} alt={v.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-300"><Store className="w-5 h-5" /></div>}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm leading-tight">{v.name}</p>
                  {v.category && <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{v.category}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Tags */}
      {!loading && activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.brands.map(brand => (
            <button 
              key={brand}
              onClick={() => toggleBrand(brand)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              {brand} <X className="w-3 h-3" />
            </button>
          ))}
          {filters.categories.map(cat => (
            <button 
              key={cat}
              onClick={() => toggleCategory(cat)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              {categories.find(c => c.slug === cat)?.name || cat} <X className="w-3 h-3" />
            </button>
          ))}
          {filters.onSale && (
            <button 
              onClick={() => setFilters(prev => ({ ...prev, onSale: false }))}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              On Sale <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <FilterSidebar
            loading={loading}
            categories={categories}
            brands={brands}
            filters={filters}
            setFilters={setFilters}
            toggleCategory={toggleCategory}
            toggleBrand={toggleBrand}
            activeFiltersCount={activeFiltersCount}
          />
        </aside>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileFiltersOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 overflow-y-auto p-6 lg:hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Filters</h2>
                  <button 
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterSidebar
                  isMobile
                  loading={loading}
                  categories={categories}
                  brands={brands}
                  filters={filters}
                  setFilters={setFilters}
                  toggleCategory={toggleCategory}
                  toggleBrand={toggleBrand}
                  activeFiltersCount={activeFiltersCount}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {!loading && queryParam.trim() && searchTierResult.tier !== 'exact' && results.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
              <Search className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                {searchTierResult.tier === 'similar' ? (
                  <>We couldn't find exact matches for <strong>"{queryParam}"</strong> — here are some similar items.</>
                ) : (
                  <>We couldn't find exact matches for <strong>"{queryParam}"</strong> — here's what else we have.</>
                )}
              </p>
            </div>
          )}
          {loading ? (
            // ── SKELETON LOADING STATE ──
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {Array(8).fill(0).map((_, i) => (
                <ProductCardSkeleton key={i} viewMode={viewMode} />
              ))}
            </div>
          ) : results.length > 0 ? (
            groupedResults ? (
              <div className="space-y-10">
                {groupedResults.map(group => (
                  <section key={group.tier}>
                    <div className="flex items-baseline gap-3 mb-4">
                      <h2 className="text-lg font-bold text-slate-900 font-display tracking-tight">{group.label}</h2>
                      <span className="text-xs font-bold text-slate-400">
                        {group.products.length} item{group.products.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                    <div className={`grid gap-4 ${
                      viewMode === 'grid'
                        ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        : 'grid-cols-1'
                    }`}>
                      {group.products.map(product => renderProduct(product))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
            <div className={`grid gap-4 ${
              viewMode === 'grid'
                ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            }`}>
              {results.map(product => renderProduct(product))}
            </div>
            )
          ) : (
            <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <ShoppingBag className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-8">
                We couldn't find anything matching your criteria. Try adjusting your filters or search terms.
              </p>
              <button 
                onClick={() => {
                  setFilters({ brands: [], categories: [], minPrice: '', maxPrice: '', onSale: false });
                  setSearchParams({});
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-100 inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};