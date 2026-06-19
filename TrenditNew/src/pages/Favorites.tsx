import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../contexts/CartContext';
import { allProducts, ProductType } from '../data/products';
import { Link, Navigate } from 'react-router-dom';
import { 
  Heart, 
  Trash2, 
  ShoppingCart, 
  ShoppingBag, 
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const Favorites = () => {
  const { user } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [dbProducts, setDbProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Firestore products in case some favorites are newly added dynamic items
  useEffect(() => {
    const q = collection(db, 'products');
    const unsub = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ProductType));
      setDbProducts(prods);
      setLoading(false);
    }, (error) => {
      console.error("Error reading db products in favorites:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Merge static and dynamic products
  const combinedProducts = React.useMemo(() => {
    const map = new Map<string, ProductType>();
    allProducts.forEach(p => map.set(p.id.toString(), p));
    dbProducts.forEach(p => map.set(p.id.toString(), p));
    return Array.from(map.values());
  }, [dbProducts]);

  // Filter out saved items based on wishlist
  const wishlistedItems = React.useMemo(() => {
    return combinedProducts.filter(p => isInWishlist(p.id));
  }, [combinedProducts, isInWishlist]);

  // Enforce auth if workspace prefers authenticated wishlist, or let users view public wishlist (graceful fallback)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mb-20">
      {/* Header Info */}
      <header className="mb-10 border-b border-slate-100 pb-8">
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest mb-2.5">
          <Heart className="w-4 h-4 fill-current" />
          <span>Curated List</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              My Saved Favorites
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-2">
              All items you have favorited across our catalog, gathered in one exclusive location.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="text-xs font-black px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl uppercase tracking-wider font-mono">
              {wishlistedItems.length} {wishlistedItems.length === 1 ? 'Item' : 'Items'} Saved
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      {loading && wishlistedItems.length === 0 ? (
        <div className="py-24 text-center text-slate-400 font-semibold text-sm animate-pulse flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          Loading your curated collection...
        </div>
      ) : wishlistedItems.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-12 sm:p-16 border border-slate-100 text-center shadow-sm max-w-2xl mx-auto"
        >
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Your Saved Favorites is Empty</h2>
          <p className="text-sm text-slate-500 font-medium max-w-md mx-auto mt-2 leading-relaxed">
            Tap the heart icon on any products while browsing the shop, and they will appear here beautifully arranged for quick checkout.
          </p>
          <div className="mt-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-slate-950 hover:bg-red-500 text-white font-extrabold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-colors duration-250 shadow-md"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore Marketplace
            </Link>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          <AnimatePresence mode="popLayout">
            {wishlistedItems.map(item => (
              <motion.div 
                key={item.id} 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-white/80 backdrop-blur-xl rounded-xl p-2.5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 hover:shadow-red-400/5 transition-all duration-200 relative flex flex-col justify-between group"
              >
                <div>
                  <Link to={`/product/${item.id}`} className="block relative">
                    {item.oldPrice && item.oldPrice > item.price && (
                      <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 bg-red-500 text-white font-bold text-[7.5px] rounded-md tracking-wider uppercase">
                        Sale
                      </span>
                    )}

                    <div className="h-24 md:h-28 bg-slate-50/50 rounded-lg p-2 mb-2.5 relative overflow-hidden flex items-center justify-center group-hover:bg-white transition-colors duration-250">
                      <img 
                        src={item.image} 
                        className="max-h-full max-w-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300" 
                        alt={item.title} 
                      />
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">{item.brand}</span>
                    <h4 className="text-[11px] font-extrabold text-slate-800 tracking-tight line-clamp-1 mb-0.5 group-hover:text-red-500 transition-colors">
                      {item.title}
                    </h4>
                  </Link>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-black text-slate-900 font-mono">${item.price.toFixed(2)}</span>
                    {item.oldPrice && (
                      <span className="text-[10px] text-slate-400 line-through font-mono">${item.oldPrice.toFixed(2)}</span>
                    )}
                  </div>
                </div>

                <div className="mt-3.5 flex gap-1.5 pt-1.5 border-t border-slate-50">
                  <button 
                    onClick={() => addToCart({
                      productId: item.id,
                      title: item.title,
                      price: item.price,
                      image: item.image,
                      quantity: 1
                    })}
                    className="flex-1 bg-slate-900 hover:bg-red-500 text-white font-bold py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1 shadow-sm"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    Add
                  </button>
                  <button 
                    onClick={() => toggleWishlist(item.id)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-100 hover:border-red-100 rounded-lg text-red-500 hover:bg-red-50/50 transition-colors shrink-0"
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
};
