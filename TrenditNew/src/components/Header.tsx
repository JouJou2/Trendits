import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Package, ShoppingCart, ShieldCheck, Loader2, Globe, Tag, Truck, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductType } from '../data/products';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';

export const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductType[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isVendor, isSuperAdmin } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const { wishlist } = useWishlist();
  const wishlistCount = wishlist.length;

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setSearching(true);
      try {
        const q = query(collection(db, 'products'), limit(20));
        const snap = await getDocs(q);
        const allProds = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductType));
        
        const filtered = allProds.filter(p => 
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          p.brand.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5);

        setSuggestions(filtered);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (productId: number | string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    }
  };

  return (
    <header className="fixed top-0 md:top-2.5 left-1/2 -translate-x-1/2 w-full md:w-[90%] max-w-6xl z-50">
      <div className="bg-white/80 backdrop-blur-2xl border-b md:border border-white/40 shadow-xl shadow-slate-900/10 md:rounded-2xl h-[50px] px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300">
        
        {/* Logo Section */}
        <div className="flex items-center gap-10">
          <Link to="/" className="flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-tr-[0.9rem] rounded-bl-[0.9rem] bg-gradient-to-br from-blue-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
             </div>
             <div className="flex flex-col">
                <span className="font-display font-black text-[21px] tracking-tighter text-slate-900 leading-none">Trendit</span>
             </div>
          </Link>

          {/* New Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 border-l border-slate-100 pl-8">
            <Link to="/categories" className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest hover:text-blue-600 transition-colors">
              <Package className="w-4 h-4" />
              Categories
            </Link>
            <Link to="/search?q=sale" className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest hover:text-blue-600 transition-colors">
              <Tag className="w-4 h-4 text-red-500" />
              Deals
            </Link>
            <Link to="/categories" className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest hover:text-blue-600 transition-colors">
              <Globe className="w-4 h-4 text-emerald-500" />
              Stores
            </Link>
            <Link to="/account?tab=orders" className="flex items-center gap-2 text-[11px] font-black text-slate-900 uppercase tracking-widest hover:text-blue-600 transition-colors">
              <Truck className="w-4 h-4 text-blue-500" />
              Track Order
            </Link>
          </nav>
        </div>

        {/* Dynamic Search */}
        <div className="flex-1 max-w-md mx-6 hidden md:flex relative" ref={searchRef}>
          <form className="relative w-full flex items-center" onSubmit={handleSearchSubmit}>
            <Search className="absolute left-5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="block w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-100 rounded-full leading-5 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 sm:text-xs font-bold transition-all"
              placeholder="Search products, brands, or stores..."
            />
          </form>

          <AnimatePresence>
            {showSuggestions && searchQuery.trim().length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 right-0 mt-4 bg-white/90 backdrop-blur-2xl rounded-[2rem] shadow-[0px_40px_80px_rgba(0,0,0,0.15)] border border-white overflow-hidden z-50 p-4"
              >
                {searching ? (
                  <div className="px-4 py-10 flex flex-col items-center justify-center gap-4">
                     <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Inventory...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Matches</p>
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSuggestionClick(p.id)}
                        className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-4 rounded-xl transition-all group"
                      >
                         <div className="w-12 h-12 bg-slate-50 rounded-lg p-2 mix-blend-multiply group-hover:scale-110 transition-transform">
                            <img src={p.image || 'https://placehold.co/600x600?text=No+Image'} className="w-full h-full object-contain" alt="" />
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <h4 className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{p.title}</h4>
                            <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase">{p.brand}</p>
                         </div>
                         <p className="text-xs font-black text-blue-600 italic tracking-tighter">${p.price}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-10 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Protocol Match</p>
                    <p className="text-xs font-bold text-slate-900 mt-2">No products found for "{searchQuery}"</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Nav */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="hidden sm:flex items-center gap-8">
            {isVendor && (
              <Link to="/admin" className="relative group">
                 <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl shadow-slate-200 group-hover:scale-110 transition-all flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest pr-1">Admin</span>
                 </div>
                 {isSuperAdmin && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" />}
              </Link>
            )}
            
            <Link to={user ? "/favorites" : "/login"} className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-100 hover:border-red-500 transition-colors group relative" title="Saved Favorites">
               <Heart className="h-[18px] w-[18px] text-slate-400 group-hover:text-red-500 hover:fill-red-500 transition-all duration-200" />
               {wishlistCount > 0 && (
                 <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[7.5px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white">
                   {wishlistCount}
                 </span>
               )}
            </Link>

            <Link to={user ? "/account" : "/login"} className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-100 hover:border-blue-600 transition-colors group" title="My Account">
               <User className="h-[18px] w-[18px] text-slate-400 group-hover:text-blue-600 transition-colors" />
            </Link>
          </div>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative group w-10 h-10 bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-200 transition-all active:scale-90 hover:bg-slate-900 flex items-center justify-center"
          >
            <ShoppingCart className="h-[18px] w-[18px]" />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black h-4.5 w-4.5 flex items-center justify-center rounded-full border border-white shadow-lg"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
};
