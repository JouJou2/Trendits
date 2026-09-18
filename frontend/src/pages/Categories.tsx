import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Tag } from 'lucide-react';
import { motion, Variants } from 'motion/react';
import { useShopCategories } from '../hooks/useShopCategories';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

// Tint behind a category that has no photo, so it reads as a designed tile
// rather than a broken "No Image" placeholder.
const TILE_TINTS = [
  'from-blue-50 to-indigo-100 text-blue-300',
  'from-rose-50 to-pink-100 text-rose-300',
  'from-amber-50 to-orange-100 text-amber-300',
  'from-emerald-50 to-teal-100 text-emerald-300',
  'from-violet-50 to-purple-100 text-violet-300',
  'from-cyan-50 to-sky-100 text-cyan-300',
];

/** How many subcategory names a card lists before "+N more". */
const SUBCATEGORY_PREVIEW = 4;

export const CategoriesPage = () => {
  // Only categories with products — an empty one would lead to a page that
  // says "No products found". Every card is drawn the same way; there used to
  // be giant photo boxes for "main" categories and small cards for the rest.
  const { ready, counts, visibleTopLevel, visibleChildrenOf } = useShopCategories();

  if (!ready) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading categories...</p>
      </main>
    );
  }

  if (visibleTopLevel.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <p className="font-bold text-slate-500 mb-1">No categories yet</p>
        <p className="text-sm text-slate-400">Check back soon — new collections are on the way.</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-8 md:mb-10"
      >
        <p className="text-slate-500 font-medium text-lg">Explore our curated collections of premium goods.</p>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {visibleTopLevel.map((cat, idx) => {
          const path = `/category/${cat.slug}`;
          const subs = visibleChildrenOf(cat);
          const count = counts[cat.slug] || 0;
          return (
            <motion.div
              key={cat.id}
              variants={itemVariants}
              className="group bg-white rounded-3xl border border-slate-100 overflow-hidden flex flex-col hover:border-blue-100 hover:shadow-xl hover:shadow-blue-900/5 transition-all"
            >
              <Link to={path} className="block">
                <div className="aspect-[4/3] relative overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${TILE_TINTS[idx % TILE_TINTS.length]} flex items-center justify-center`}>
                      <Tag className="w-10 h-10 md:w-12 md:h-12" />
                    </div>
                  )}
                </div>
                <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-bold text-slate-900 text-sm md:text-base leading-tight truncate group-hover:text-blue-600 transition-colors">
                      {cat.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {count} {count === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                  <span className="w-8 h-8 shrink-0 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>

              {subs.length > 0 && (
                <p className="px-4 pb-4 text-xs text-slate-500 leading-relaxed">
                  {subs.slice(0, SUBCATEGORY_PREVIEW).map((sub, i) => (
                    <React.Fragment key={sub.id}>
                      {i > 0 && <span className="text-slate-300"> · </span>}
                      <Link to={`/category/${sub.slug}`} className="hover:text-blue-600 transition-colors">
                        {sub.name}
                      </Link>
                    </React.Fragment>
                  ))}
                  {subs.length > SUBCATEGORY_PREVIEW && (
                    <Link to={path} className="text-blue-600 font-semibold whitespace-nowrap">
                      {' '}+{subs.length - SUBCATEGORY_PREVIEW} more
                    </Link>
                  )}
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </main>
  );
};
//categories.tsx
