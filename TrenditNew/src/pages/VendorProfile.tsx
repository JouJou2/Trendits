import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Package, Star, MessageSquare, Share2, Filter, Grid, List as ListIcon, X, ChevronDown, Loader2 } from 'lucide-react';
import { vendors, getDisplayPrice, ProductType } from '../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

export const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [realProducts, setRealProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');

  const vendor = vendors.find(v => v.id === id);

  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'products'),
      where('vendorId', '==', id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProductType[];
      setRealProducts(products);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const baseProducts = realProducts;

  // Derive brands available for this vendor
  const availableBrands = useMemo(() => {
    return Array.from(new Set(baseProducts.map(p => p.brand))).sort();
  }, [baseProducts]);

  const filteredProducts = useMemo(() => {
    let filtered = [...baseProducts];

    if (minPrice) filtered = filtered.filter(p => getDisplayPrice(p.price, p.feePercentage) >= parseFloat(minPrice));
    if (maxPrice) filtered = filtered.filter(p => getDisplayPrice(p.price, p.feePercentage) <= parseFloat(maxPrice));
    if (selectedBrands.length > 0) filtered = filtered.filter(p => selectedBrands.includes(p.brand));

    filtered.sort((a, b) => {
      if (sortBy === 'price_asc') return getDisplayPrice(a.price, a.feePercentage) - getDisplayPrice(b.price, b.feePercentage);
      if (sortBy === 'price_desc') return getDisplayPrice(b.price, b.feePercentage) - getDisplayPrice(a.price, a.feePercentage);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0; // newest/default
    });

    return filtered;
  }, [baseProducts, minPrice, maxPrice, selectedBrands, sortBy]);

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Vendor not found</h2>
        <Link to="/" className="mt-4 text-blue-600 hover:underline inline-block">Return Home</Link>
      </div>
    );
  }

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedBrands([]);
  };

  const activeFilterCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + selectedBrands.length;

  return (
    <div className="min-h-screen pb-16">
      {/* Banner */}
      <div className="h-60 md:h-80 w-full relative overflow-hidden">
        <img 
          src={vendor.bannerImage} 
          alt={vendor.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Profile Info Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-end">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white shrink-0 -mt-20 md:mt-0">
            <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
          </div>
          
          <div className="flex-grow">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 font-display">{vendor.name}</h1>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                Verified Seller
              </span>
            </div>
            
            <p className="text-gray-500 font-medium mb-4 flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> {vendor.rating} (Rating)</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {vendor.location}</span>
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Joined {vendor.joinedDate}</span>
              <span className="flex items-center gap-1"><Package className="h-4 w-4" /> {vendor.totalProducts}+ Products</span>
            </p>

            <p className="text-gray-600 max-w-3xl leading-relaxed">
              {vendor.description}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors" title="Share profile">
              <Share2 className="h-5 w-5 text-gray-600" />
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat with Seller
            </button>
          </div>
        </div>
      </div>

      {/* Tabs & Products */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
            Store Products
            <span className="text-sm font-normal text-gray-400">({filteredProducts.length})</span>
          </h2>

          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}
              >
                <ListIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg py-2 pl-4 pr-10 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${showFilters || activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <Filter className="h-4 w-4" /> 
              Filter
              {activeFilterCount > 0 && <span className="ml-1 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* Filter Bar (Expandable) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Price Range */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 text-sm">Price Range</h4>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input 
                        type="number" 
                        placeholder="Min" 
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <span className="text-gray-300">-</span>
                    <div className="relative flex-grow">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                      <input 
                        type="number" 
                        placeholder="Max" 
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                </div>

                {/* Brands */}
                <div className="col-span-1 md:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-sm">Brands</h4>
                    {selectedBrands.length > 0 && (
                      <button onClick={() => setSelectedBrands([])} className="text-blue-600 text-xs font-bold hover:underline">Clear Brands</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableBrands.map(brand => (
                      <button
                        key={brand}
                        onClick={() => {
                          if (selectedBrands.includes(brand)) setSelectedBrands(selectedBrands.filter(b => b !== brand));
                          else setSelectedBrands([...selectedBrands, brand]);
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedBrands.includes(brand) ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={clearFilters} className="text-gray-500 text-sm font-bold hover:text-gray-900 mr-6">Clear All Filters</button>
                <button 
                  onClick={() => setShowFilters(false)}
                  className="bg-gray-900 text-white text-sm font-bold py-2 px-6 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 font-medium">Scanning vendor inventory...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
            {filteredProducts.map((product) => (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={viewMode === 'grid' ? 'group' : 'flex gap-6 border-b border-gray-100 pb-6 group'}
              >
                <Link to={`/product/${product.id}`} className={viewMode === 'grid' ? 'block mb-3' : 'w-48 h-48 shrink-0 relative rounded-xl overflow-hidden'}>
                  <div className={`${viewMode === 'grid' ? 'aspect-square mb-3' : 'w-full h-full'} relative rounded-2xl overflow-hidden bg-gray-100`}>
                    <img 
                      src={product.image || product.images?.[0]} 
                      alt={product.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {product.badgeLeft && (
                      <span className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {product.badgeLeft}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">{product.brand}</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                      <Star className="h-3 w-3 fill-yellow-500" /> {product.rating}
                    </div>
                  </div>
                  
                  <Link to={`/product/${product.id}`} className="block group-hover:text-blue-600 transition-colors mb-2">
                    <h3 className="font-bold text-gray-900 leading-tight line-clamp-2">{product.title}</h3>
                  </Link>
                  
                  {viewMode === 'list' && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">${getDisplayPrice(product.price, product.feePercentage).toFixed(2)}</span>
                    {product.oldPrice && (
                      <span className="text-sm text-gray-400 line-through">${getDisplayPrice(product.oldPrice, product.feePercentage).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <X className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No products match your filters</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters to find what you're looking for.</p>
            <button onClick={clearFilters} className="text-blue-600 font-bold hover:underline">Clear all filters</button>
          </div>
        )}
      </main>
    </div>
  );
};

