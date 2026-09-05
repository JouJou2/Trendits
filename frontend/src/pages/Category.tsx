import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, Star, Loader2, ChevronRight, X } from 'lucide-react';
import { allProducts, ProductType, getDisplayPrice } from '../data/products';
import { ProductCard } from '../components/ProductCard';
import { motion, Variants } from 'motion/react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

interface CategoryMeta {
  title: string;
  subtitle: string;
  subcategories: string[];
}

const defaultMeta = (slug: string): CategoryMeta => ({
  title: slug.charAt(0).toUpperCase() + slug.slice(1),
  subtitle: `Browse our collection of ${slug}`,
  subcategories: [],
});

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const Category = () => {
  const { id } = useParams();

  const [categoryMetaMap, setCategoryMetaMap] = useState<Record<string, CategoryMeta>>({});
  const [meta, setMeta] = useState<CategoryMeta>(defaultMeta(id || ''));
  const currentCategoryKey = id || '';

  // Fetch category metadata from Firestore
  useEffect(() => {
    if (!id) return;
    const fetchCategoryMeta = async () => {
      try {
        const snap = await getDocs(collection(db, 'categories'));
        const cats: Record<string, CategoryMeta> = {};
        snap.docs.forEach(doc => {
          const data = doc.data() as any;
          cats[data.slug] = {
            title: data.name || data.slug,
            subtitle: data.description || `Browse our collection of ${data.slug}`,
            subcategories: data.subcategories || [],
          };
        });
        setCategoryMetaMap(cats);
        setMeta(cats[id] || defaultMeta(id));
      } catch (err) {
        console.error('Failed to fetch category meta:', err);
        setMeta(defaultMeta(id));
      }
    };
    fetchCategoryMeta();
  }, [id]);
  // Filtering & Sorting State
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('popular');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  const [dbProducts, setDbProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync Category Change - Reset filters when ID changes using render-phase check
  const [prevId, setPrevId] = useState(id);
  if (id !== prevId) {
    setPrevId(id);
    setSelectedSubcategory(null);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedMaterials([]);
    setMinPrice('');
    setMaxPrice('');
    setMinRating(null);
    setVisibleCount(6);
    setActiveFilterTab(null);
    setLoading(true);
  }

  useEffect(() => {
    // Fetch products for this category from Firestore
    const q = query(collection(db, 'products'), where('categoryId', '==', currentCategoryKey));
    // Real catalog only — no demo-product fallback.
    const unsub = onSnapshot(q, (snapshot) => {
      setDbProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ProductType)));
      setLoading(false);
    }, (error) => {
      console.error("Category fetch error:", error);
      setDbProducts([]);
      setLoading(false);
    });

    return () => unsub();
  }, [currentCategoryKey]);

  // Derive available brands for this category
  const availableBrands = useMemo(() => {
    const brands = dbProducts.map(p => p.brand);
    return Array.from(new Set(brands)).sort();
  }, [dbProducts]);

  // Derive available colors for this category
  const availableColors = useMemo(() => {
    const colorsSet = new Set<string>();
    dbProducts.forEach(p => {
      if (p.colors && Array.isArray(p.colors)) {
        p.colors.forEach(c => colorsSet.add(c));
      }
    });
    return Array.from(colorsSet).sort();
  }, [dbProducts]);

  // Derive available materials for this category
  const availableMaterials = useMemo(() => {
    const materialsSet = new Set<string>();
    dbProducts.forEach(p => {
      if (p.specs) {
        Object.entries(p.specs).forEach(([k, v]) => {
          if (k.toLowerCase().includes('material') || k.toLowerCase().includes('fabric')) {
            materialsSet.add(v);
          }
        });
      }
      const text = (p.title + ' ' + (p.description || '')).toLowerCase();
      const common = ['Cotton', 'Leather', 'Polyester', 'Metal', 'Plastic', 'Wood', 'Glass', 'Aluminum', 'Steel', 'Gold', 'Silver'];
      common.forEach(m => {
        if (text.includes(m.toLowerCase())) {
          materialsSet.add(m);
        }
      });
    });
    return Array.from(materialsSet).sort();
  }, [dbProducts]);

  const products = useMemo(() => {
    let filtered = [...dbProducts];

    // Apply Brands Filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(p => selectedBrands.includes(p.brand));
    }

    // Apply Colors Filter
    if (selectedColors.length > 0) {
      filtered = filtered.filter(p => {
        if (p.colors && p.colors.some(c => selectedColors.includes(c))) return true;
        const text = (p.title + ' ' + (p.description || '')).toLowerCase();
        return selectedColors.some(c => text.includes(c.toLowerCase()));
      });
    }

    // Apply Materials Filter
    if (selectedMaterials.length > 0) {
      filtered = filtered.filter(p => {
        if (p.specs) {
          const hasMat = Object.entries(p.specs).some(([k, v]) => {
            if (k.toLowerCase().includes('material') || k.toLowerCase().includes('fabric')) {
              return selectedMaterials.includes(v);
            }
            return false;
          });
          if (hasMat) return true;
        }
        const text = (p.title + ' ' + (p.description || '')).toLowerCase();
        return selectedMaterials.some(m => text.includes(m.toLowerCase()));
      });
    }

    // Apply Subcategory Filter based on soft string matching
    if (selectedSubcategory) {
      const sub = selectedSubcategory.toLowerCase();
      filtered = filtered.filter(p => {
        const text = (p.title + ' ' + (p.description || '')).toLowerCase();
        
        // Manual explicit overrides for better mock data matching
        if (sub === 'smartphones') return text.includes('phone');
        if (sub === 'smartwatches') return text.includes('watch');
        if (sub === 'tvs & audio') return text.includes('tv') || text.includes('audio') || text.includes('speaker');
        if (sub === "men's clothing") return text.includes('men');
        if (sub === "women's clothing") return text.includes('women');
        
        // Generic fallback split word match
        const words = sub.split(/[\s&]+/).filter(w => w.length > 3);
        if (words.length > 0) return words.some(w => text.includes(w));
        return text.includes(sub);
      });
    }

    // Apply Price Filter
    if (minPrice) filtered = filtered.filter(p => getDisplayPrice(p.price, p.feePercentage) >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(p => getDisplayPrice(p.price, p.feePercentage) <= parseFloat(maxPrice));

    // Apply Rating Filter
    if (minRating !== null) filtered = filtered.filter(p => p.rating >= minRating);

    // Apply Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'price_asc') return getDisplayPrice(a.price, a.feePercentage) - getDisplayPrice(b.price, b.feePercentage);
      if (sortBy === 'price_desc') return getDisplayPrice(b.price, b.feePercentage) - getDisplayPrice(a.price, a.feePercentage);
      if (sortBy === 'popular') return b.reviews - a.reviews;
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return 0;
    });

    return filtered;
  }, [dbProducts, selectedBrands, selectedColors, selectedMaterials, selectedSubcategory, minPrice, maxPrice, minRating, sortBy]);

  const paginatedProducts = useMemo(() => {
    return products.slice(0, visibleCount);
  }, [products, visibleCount]);

  // Reset infinite scroll in render phase whenever any filters or sorting order change
  const filterKey = `${currentCategoryKey}-${selectedSubcategory || ''}-${selectedBrands.join(',')}-${selectedColors.join(',')}-${selectedMaterials.join(',')}-${minPrice}-${maxPrice}-${minRating || ''}-${sortBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(6);
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && products.length > visibleCount) {
        // Automatically load 6 more items
        setVisibleCount(prev => Math.min(prev + 6, products.length));
      }
    }, {
      rootMargin: '150px',
    });

    observer.observe(currentSentinel);

    return () => {
      if (currentSentinel) {
         observer.unobserve(currentSentinel);
      }
    };
  }, [products.length, visibleCount]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumbs */}
      <motion.nav 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex text-sm text-slate-500 mb-6" aria-label="Breadcrumb"
      >
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          </li>
          <li>
            <div className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-1" />
              <span className="text-gray-900 font-medium capitalize">
                {meta.title}
              </span>
            </div>
          </li>
        </ol>
      </motion.nav>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 font-display mb-3 capitalize tracking-tight">
          {meta.title}.
        </h1>
        <p className="text-gray-600 font-medium max-w-2xl">{meta.subtitle}</p>
      </motion.div>

      {/* Sliding Filter & Sort Bar */}
      <div className="mb-6 sticky top-[4.5rem] md:top-24 z-40 bg-white/90 backdrop-blur-xl p-3 sm:p-4 rounded-[1.5rem] border border-slate-100 shadow-xl shadow-blue-900/5">
        <div className="flex items-center justify-between gap-4 mb-2">
          <p className="text-slate-500 text-[11px] sm:text-xs font-bold pl-1 uppercase tracking-wide">
            Showing <span className="font-extrabold text-slate-950 font-mono">{products.length}</span> items in {meta.title}
          </p>
          {(selectedSubcategory !== null || selectedBrands.length > 0 || selectedColors.length > 0 || selectedMaterials.length > 0 || minPrice !== '' || maxPrice !== '' || minRating !== null) && (
            <button
              onClick={() => {
                setSelectedSubcategory(null);
                setSelectedBrands([]);
                setSelectedColors([]);
                setSelectedMaterials([]);
                setMinPrice('');
                setMaxPrice('');
                setMinRating(null);
                setActiveFilterTab(null);
              }}
              className="text-red-500 hover:text-red-600 text-[11px] sm:text-xs font-bold uppercase tracking-wide transition-colors hover:underline flex items-center gap-1 cursor-pointer"
            >
              Reset All
            </button>
          )}
        </div>

        {/* Sliding filter bar container */}
        <div className="flex items-center gap-2 overflow-x-auto py-1.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-nowrap scroll-smooth">
          {/* SORT PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'sort' ? null : 'sort')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'sort' ? 'bg-primary border-primary text-white shadow-md' : sortBy !== 'popular' ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>Sort By</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'sort' ? 'rotate-180' : ''}`} />
          </button>

          {/* SUBCATEGORY PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'subcategory' ? null : 'subcategory')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'subcategory' ? 'bg-primary border-primary text-white shadow-md' : selectedSubcategory !== null ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>{selectedSubcategory || 'All Items'}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'subcategory' ? 'rotate-180' : ''}`} />
          </button>

          {/* BRAND PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'brand' ? null : 'brand')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'brand' ? 'bg-primary border-primary text-white shadow-md' : selectedBrands.length > 0 ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>Brand {selectedBrands.length > 0 ? `(${selectedBrands.length})` : ''}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'brand' ? 'rotate-180' : ''}`} />
          </button>

          {/* MATERIAL PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'material' ? null : 'material')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'material' ? 'bg-primary border-primary text-white shadow-md' : selectedMaterials.length > 0 ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>Material {selectedMaterials.length > 0 ? `(${selectedMaterials.length})` : ''}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'material' ? 'rotate-180' : ''}`} />
          </button>

          {/* PRICE PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'price' ? null : 'price')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'price' ? 'bg-primary border-primary text-white shadow-md' : (minPrice || maxPrice) ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>
              {minPrice || maxPrice
                ? `${minPrice ? `$${minPrice}` : '$0'} - ${maxPrice ? `$${maxPrice}` : '∞'}`
                : 'Price'}
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'price' ? 'rotate-180' : ''}`} />
          </button>

          {/* COLOR PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'color' ? null : 'color')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'color' ? 'bg-primary border-primary text-white shadow-md' : selectedColors.length > 0 ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>Color {selectedColors.length > 0 ? `(${selectedColors.length})` : ''}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'color' ? 'rotate-180' : ''}`} />
          </button>

          {/* RATING PILL */}
          <button
            onClick={() => setActiveFilterTab(activeFilterTab === 'rating' ? null : 'rating')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-all cursor-pointer whitespace-nowrap select-none ${activeFilterTab === 'rating' ? 'bg-primary border-primary text-white shadow-md' : minRating !== null ? 'bg-blue-50/80 border-blue-200 text-primary' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>Rating {minRating !== null ? `(${minRating}+)` : ''}</span>
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${activeFilterTab === 'rating' ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Floating Dropdown Pane */}
        {activeFilterTab && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-3 z-50 bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-4 sm:p-5"
          >
            <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-slate-100">
              <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide">
                {activeFilterTab === 'sort' && 'Sort Orders'}
                {activeFilterTab === 'subcategory' && 'Select Subcategory'}
                {activeFilterTab === 'brand' && 'Filter by Brand'}
                {activeFilterTab === 'material' && 'Filter by Material'}
                {activeFilterTab === 'price' && 'Set Price Range'}
                {activeFilterTab === 'color' && 'Filter by Color'}
                {activeFilterTab === 'rating' && 'Filter by Rating'}
              </span>
              <button
                onClick={() => setActiveFilterTab(null)}
                className="text-slate-400 hover:text-slate-900 p-1 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeFilterTab === 'sort' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'popular', label: 'Most Popular' },
                  { key: 'price_asc', label: 'Price: Low to High' },
                  { key: 'price_desc', label: 'Price: High to Low' },
                  { key: 'newest', label: 'Newest Arrivals' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setSortBy(opt.key);
                      setActiveFilterTab(null);
                    }}
                    className={`text-center px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${sortBy === opt.key ? 'bg-primary border-primary text-white shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-transparent text-slate-700'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {activeFilterTab === 'subcategory' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedSubcategory(null);
                    setActiveFilterTab(null);
                  }}
                  className={`text-center px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${selectedSubcategory === null ? 'bg-primary border-primary text-white shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-transparent text-slate-700'}`}
                >
                  All Arrivals
                </button>
                {meta.subcategories.map((sub: string) => (
                  <button
                    key={sub}
                    onClick={() => {
                      setSelectedSubcategory(sub);
                      setActiveFilterTab(null);
                    }}
                    className={`text-center px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${selectedSubcategory === sub ? 'bg-primary border-primary text-white shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-transparent text-slate-700'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {activeFilterTab === 'brand' && (
              <div>
                <div className="flex justify-end mb-2">
                  {selectedBrands.length > 0 && (
                    <button onClick={() => setSelectedBrands([])} className="text-primary text-[11px] font-bold uppercase tracking-wider hover:underline cursor-pointer">Clear All</button>
                  )}
                </div>
                {availableBrands.length === 0 ? (
                  <p className="text-xs text-slate-400">No brands found.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {availableBrands.map(brand => (
                      <label key={brand} className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all ${selectedBrands.includes(brand) ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => {
                            const newBrands = selectedBrands.includes(brand)
                              ? selectedBrands.filter(b => b !== brand)
                              : [...selectedBrands, brand];
                            setSelectedBrands(newBrands);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-bold">{brand}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeFilterTab === 'material' && (
              <div>
                <div className="flex justify-end mb-2">
                  {selectedMaterials.length > 0 && (
                    <button onClick={() => setSelectedMaterials([])} className="text-primary text-[11px] font-bold uppercase tracking-wider hover:underline cursor-pointer">Clear All</button>
                  )}
                </div>
                {availableMaterials.length === 0 ? (
                  <p className="text-xs text-slate-400">No materials listed.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {availableMaterials.map(mat => (
                      <label key={mat} className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all ${selectedMaterials.includes(mat) ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={selectedMaterials.includes(mat)}
                          onChange={() => {
                            const newMats = selectedMaterials.includes(mat)
                              ? selectedMaterials.filter(m => m !== mat)
                              : [...selectedMaterials, mat];
                            setSelectedMaterials(newMats);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 font-bold">{mat}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeFilterTab === 'price' && (
              <div className="max-w-md mx-auto">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">$</span>
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full pl-6 pr-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 transition-all font-bold"
                      />
                    </div>
                    <span className="text-slate-300 font-bold">-</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">$</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full pl-6 pr-2 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-blue-100 transition-all font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(minPrice || maxPrice) && (
                      <button
                        onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                        className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Clear Range
                      </button>
                    )}
                    <button
                      onClick={() => setActiveFilterTab(null)}
                      className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md hover:bg-primary/95 transition-all cursor-pointer"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeFilterTab === 'color' && (
              <div>
                <div className="flex justify-end mb-2">
                  {selectedColors.length > 0 && (
                    <button onClick={() => setSelectedColors([])} className="text-primary text-[11px] font-bold uppercase tracking-wider hover:underline cursor-pointer">Clear All</button>
                  )}
                </div>
                {availableColors.length === 0 ? (
                  <p className="text-xs text-slate-400">No color choices.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[250px] overflow-y-auto pr-1">
                    {availableColors.map(color => {
                      const colorLower = color.toLowerCase();
                      let bgHex = 'bg-slate-200';
                      if (colorLower.includes('black')) bgHex = 'bg-black border border-white/25';
                      else if (colorLower.includes('white')) bgHex = 'bg-white border border-slate-300';
                      else if (colorLower.includes('blue') || colorLower.includes('navy')) bgHex = 'bg-blue-600';
                      else if (colorLower.includes('red')) bgHex = 'bg-red-500';
                      else if (colorLower.includes('green') || colorLower.includes('olive')) bgHex = 'bg-emerald-600';
                      else if (colorLower.includes('yellow') || colorLower.includes('gold')) bgHex = 'bg-yellow-400';
                      else if (colorLower.includes('silver') || colorLower.includes('gray')) bgHex = 'bg-slate-400';
                      else if (colorLower.includes('brown') || colorLower.includes('wood')) bgHex = 'bg-amber-800';
                      else if (colorLower.includes('orange')) bgHex = 'bg-orange-500';
                      else if (colorLower.includes('pink')) bgHex = 'bg-pink-400';
                      else if (colorLower.includes('purple')) bgHex = 'bg-purple-600';

                      return (
                        <label key={color} className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all ${selectedColors.includes(color) ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100'}`}>
                          <input
                            type="checkbox"
                            checked={selectedColors.includes(color)}
                            onChange={() => {
                              const newCols = selectedColors.includes(color)
                                ? selectedColors.filter(c => c !== color)
                                : [...selectedColors, color];
                              setSelectedColors(newCols);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                          />
                          <div className={`w-3.5 h-3.5 rounded-full ${bgHex} shadow-sm`} />
                          <span className="text-xs text-slate-700 font-bold">{color}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeFilterTab === 'rating' && (
              <div className="max-w-md mx-auto">
                <div className="flex justify-end mb-2">
                  {minRating !== null && (
                    <button onClick={() => setMinRating(null)} className="text-primary text-[11px] font-bold uppercase tracking-wider hover:underline cursor-pointer">Clear</button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[4, 3, 2, 1].map(rating => (
                    <button
                      key={rating}
                      onClick={() => {
                        setMinRating(rating);
                        setActiveFilterTab(null);
                      }}
                      className={`flex items-center justify-center gap-2 p-3 w-full rounded-xl border transition-all cursor-pointer ${minRating === rating ? 'bg-primary border-primary text-white shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'}`}
                    >
                      <div className="flex text-yellow-400">
                        {React.Children.toArray(Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < rating ? 'fill-current' : 'text-slate-200'}`} />
                        )))}
                      </div>
                      <span className="text-xs font-bold leading-none">& Up</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Main Content (Products Grid) */}
      <section className="w-full">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : (
          <>

          {/* Grid */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {paginatedProducts.map(product => (
               <motion.div key={product.id} variants={itemVariants}>
                 <ProductCard product={product} />
               </motion.div>
            ))}
          </motion.div>

          {/* Infinite Scroll Sentinel */}
          <div ref={sentinelRef} className="w-full h-10 mt-12 flex justify-center items-center">
            {products.length > visibleCount && (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Loading more items...</span>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && products.length === 0 && (
            <div className="text-center py-20 text-gray-500">
                No products found for this category.
            </div>
          )}

        </section>
    </main>
  );
};
//category.tsx