import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Package, Star, Share2, Filter, Grid, List as ListIcon, X, ChevronDown, Loader2, BadgeCheck, Heart, Eye } from 'lucide-react';
import { getDisplayPrice, ProductType } from '../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface VendorData {
  id: string;
  name: string;
  description: string;
  image: string;
  bannerImage: string;
  location: string;
  joinedDate: string;
  totalProducts: number;
  rating: number;
  category: string;
  ownerName: string;
  email: string;
  verified?: boolean;
}

export const VendorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { user, vendorId: myVendorId, vendorProfile: myVendorProfile } = useAuth();
  // The store's owner, previewing it from the dashboard's "View my store".
  const isOwnStore = Boolean(id && myVendorId && id === myVendorId);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [realProducts, setRealProducts] = useState<ProductType[]>([]);
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [vendorLoading, setVendorLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Filter State
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');

  // Fetch vendor from Firestore
  useEffect(() => {
    if (!id) return;

    const fetchVendor = async () => {
      setVendorLoading(true);
      try {
        const vendorDoc = await getDoc(doc(db, 'vendors', id));
        if (vendorDoc.exists()) {
          const data = vendorDoc.data();
          setVendor({
            id: vendorDoc.id,
            name: data.name || 'Unknown Store',
            description: data.description || '',
            image: data.image || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&q=80',
            bannerImage: data.bannerImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
            location: data.location || 'Unknown',
            joinedDate: data.joinedDate || 'Recently',
            totalProducts: data.totalProducts || 0,
            rating: data.rating || 0,
            category: data.category || 'Store',
            ownerName: data.ownerName || 'Store Owner',
            email: data.email || '',
            verified: data.verified || false,
          });
        } else {
          setVendor(null);
        }
      } catch (error) {
        console.error('Error fetching vendor:', error);
        setVendor(null);
      } finally {
        setVendorLoading(false);
      }
    };

    fetchVendor();
  }, [id]);

  // Track whether the current user follows this store
  useEffect(() => {
    if (!user || !id) {
      setIsFollowing(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', user.id, 'following', id), (snap) => {
      setIsFollowing(snap.exists());
    }, (error) => console.error('Follow status error:', error));
    return () => unsub();
  }, [user, id]);

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error('Log in to follow this store.');
      return;
    }
    if (!id || !vendor) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'users', user.id, 'following', id));
        await deleteDoc(doc(db, 'vendors', id, 'followers', user.id));
        toast.success(`Unfollowed ${vendor.name}.`);
      } else {
        const followedAt = new Date().toISOString();
        await setDoc(doc(db, 'users', user.id, 'following', id), {
          vendorId: id,
          vendorName: vendor.name,
          vendorImage: vendor.image,
          followedAt,
        });
        await setDoc(doc(db, 'vendors', id, 'followers', user.id), {
          userId: user.id,
          followedAt,
        });
        toast.success(`Following ${vendor.name}!`);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Fetch products from Firestore
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
      setProductsLoading(false);
    }, () => {
      setProductsLoading(false);
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
      if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      return 0;
    });

    return filtered;
  }, [baseProducts, minPrice, maxPrice, selectedBrands, sortBy]);

  if (vendorLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading vendor profile...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Vendor not found</h2>
        <p className="text-gray-500 mt-2">This store doesn't exist or has been removed.</p>
        <Link to="/" className="mt-4 text-blue-600 hover:underline inline-block">Return Home</Link>
      </div>
    );
  }

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSelectedBrands([]);
  };

  const handleShareProfile = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Store link copied to clipboard!');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const activeFilterCount = (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + selectedBrands.length;

  return (
    <div className="min-h-screen pb-16">
      {/* Owner preview bar — only the store's owner sees this; customers get
          the page exactly as below it. */}
      {isOwnStore && (
        <div className="bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p className="text-sm flex-1 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                This is how customers see your store.
                {myVendorProfile?.status && myVendorProfile.status !== 'active' && (
                  <span className="text-amber-300"> It is awaiting approval, so customers can't buy from it yet.</span>
                )}
              </span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/admin/profile" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                Edit profile
              </Link>
              <Link to="/admin" className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white shrink-0 -mt-16 md:-mt-20">
              <img src={vendor.image} alt={vendor.name} className="w-full h-full object-cover" />
            </div>

            <div className="flex-grow min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-display truncate">{vendor.name}</h1>
                    {vendor.verified && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shrink-0" title="Verified Store">
                        <BadgeCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider">
                    {vendor.category}
                  </span>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={handleShareProfile}
                    className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
                    title="Share profile"
                  >
                    <Share2 className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 whitespace-nowrap ${
                      isFollowing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                    }`}
                  >
                    {followLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />}
                    {isFollowing ? 'Following' : 'Follow Store'}
                  </button>
                </div>
              </div>

              <p className="text-gray-600 max-w-3xl leading-relaxed mt-4">
                {vendor.description}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            {[
              { icon: Star, label: 'Rating', value: vendor.rating, bg: 'bg-yellow-50', color: 'text-yellow-500' },
              { icon: MapPin, label: 'Location', value: vendor.location, bg: 'bg-blue-50', color: 'text-blue-500' },
              { icon: Calendar, label: 'Joined', value: vendor.joinedDate, bg: 'bg-purple-50', color: 'text-purple-500' },
              { icon: Package, label: 'Products', value: `${vendor.totalProducts}+`, bg: 'bg-emerald-50', color: 'text-emerald-500' },
            ].map(({ icon: Icon, label, value, bg, color }) => (
              <div key={label} className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
                </div>
              </div>
            ))}
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
              {activeFilterCount > 0 && <span className="ml-1 bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[11px]">{activeFilterCount}</span>}
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

        {productsLoading ? (
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
                      <span className="absolute top-2 left-2 bg-secondary text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase">
                        {product.badgeLeft}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs text-gray-400 uppercase tracking-wide font-bold">{product.brand}</span>
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
                    <span className="text-lg font-bold text-blue-600">${getDisplayPrice(product.price || 0, product.feePercentage).toFixed(2)}</span>
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