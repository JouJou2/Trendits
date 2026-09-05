import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import { allProducts, ProductType } from '../data/products';
import { Link, Navigate } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProductCard } from '../components/ProductCard';

export const Favorites = () => {
  const { user } = useAuth();
  const { isInWishlist } = useWishlist();
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

  const combinedProducts = React.useMemo(() => {
    const map = new Map<string, ProductType>();
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
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wide mb-2.5">
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
            <span className="text-xs font-bold px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl uppercase tracking-wider font-mono">
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
          <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Your Saved Favorites is Empty</h2>
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
              >
                <ProductCard product={item} isCompact={true} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
};