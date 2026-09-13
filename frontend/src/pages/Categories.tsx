import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, Variants } from 'motion/react';
import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};



export const CategoriesPage = () => {
  const [categories, setCategories] = useState<{id: string; name: string; image: string; slug: string; type?: 'main' | 'other'; parentId?: string | null}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoading(false);
      setError(false);
    }, (err) => {
      console.error('Failed to load categories:', err);
      setLoading(false);
      setError(true);
    });
    return () => unsub();
  }, [retryKey]);

// Only main categories get their own card; subcategories are listed on it.
const topLevel = categories.filter(c => !c.parentId);
const subcategoriesOf = (parentId: string) =>
  categories
    .filter(c => c.parentId === parentId)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map(c => ({ ...c, path: `/category/${c.slug}` }));
const mainCategories = topLevel.filter(c => c.type === 'main').map(c => ({ ...c, path: `/category/${c.slug}` }));
const otherCategories = topLevel.filter(c => c.type === 'other' || !c.type).map(c => ({ ...c, path: `/category/${c.slug}` }));

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading categories...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="font-bold text-slate-700">Couldn't load categories</p>
        <p className="text-sm text-slate-400 max-w-sm">Something went wrong while fetching categories. Please check your connection and try again.</p>
        <button
          onClick={() => setRetryKey(k => k + 1)}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </main>
    );
  }

  if (categories.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="font-bold text-slate-500 mb-1">No categories yet</p>
        <p className="text-sm text-slate-400">Check back soon — new collections are on the way.</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-12"
      >
        <p className="text-slate-500 font-medium text-lg">Explore our curated collections of premium goods.</p>
      </motion.div>

      {/* Top Main Categories */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
      >
        {mainCategories.map((cat) => (
          <motion.div key={cat.id} variants={itemVariants}>
            <Link 
              to={cat.path} 
              className="relative h-80 rounded-[3rem] overflow-hidden group shadow-2xl shadow-blue-900/5 block"
            >
              <img 
                src={cat.image || 'https://placehold.co/600x600?text=No+Image'} 
                alt={cat.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex items-end p-8">
                <div className="text-white w-full">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-70 mb-2 block">Lifestyle</span>
                      <h2 className="text-3xl font-bold font-display italic tracking-tight">{cat.name.toUpperCase()}</h2>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      <ArrowRight className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
            {subcategoriesOf(cat.id).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 px-2">
                {subcategoriesOf(cat.id).map(sub => (
                  <Link
                    key={sub.id}
                    to={sub.path}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-8 flex items-center gap-4"
      >
        <h2 className="text-2xl font-bold text-slate-900 font-display italic tracking-tight uppercase">More Categories</h2>
        <div className="h-px bg-slate-100 flex-1"></div>
      </motion.div>
      
      {/* Other Categories Grid */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        {otherCategories.map((cat) => (
          <motion.div key={cat.id} variants={itemVariants}>
            <Link 
              to={cat.path} 
              className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white p-5 flex flex-col items-center justify-center hover:shadow-2xl hover:shadow-blue-600/5 transition-all group border-transparent hover:border-blue-100"
            >
              <div className="w-full h-40 mb-5 overflow-hidden rounded-[1.5rem] relative">
                <img 
                  src={cat.image || 'https://placehold.co/600x600?text=No+Image'} 
                  alt={cat.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-wide italic">
                {cat.name}
              </span>
            </Link>
            {subcategoriesOf(cat.id).length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {subcategoriesOf(cat.id).map(sub => (
                  <Link
                    key={sub.id}
                    to={sub.path}
                    className="px-2.5 py-1 rounded-full bg-slate-50 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
};
//categories.tsx