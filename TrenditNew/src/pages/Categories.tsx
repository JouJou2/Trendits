import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, Variants } from 'motion/react';

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

const mainCategories = [
  { 
    id: 'women', 
    name: 'Women', 
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    path: '/category/fashion' 
  },
  { 
    id: 'men', 
    name: 'Men', 
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&q=80',
    path: '/category/fashion'
  },
  { 
    id: 'children', 
    name: 'Children', 
    image: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd865c0?w=800&q=80',
    path: '/category/fashion'
  }
];

const otherCategories = [
  { 
    id: 'electronics', 
    name: 'Electronics', 
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
    path: '/category/electronics'
  },
  { 
    id: 'home-living', 
    name: 'Home & Living', 
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80',
    path: '/category/home-living'
  },
  /* { 
    id: 'groceries', 
    name: 'Groceries', 
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
    path: '/category/groceries'
  }, */
  { 
    id: 'beauty', 
    name: 'Beauty', 
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
    path: '/category/beauty'
  }
];

export const CategoriesPage = () => {
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
                      <span className="text-[10px] font-black tracking-[0.2em] uppercase opacity-70 mb-2 block">Lifestyle</span>
                      <h2 className="text-3xl font-black font-display italic tracking-tight">{cat.name.toUpperCase()}</h2>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                      <ArrowRight className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mb-8 flex items-center gap-4"
      >
        <h2 className="text-2xl font-black text-slate-900 font-display italic tracking-tight uppercase">More Categories</h2>
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
              <span className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs tracking-widest italic">
                {cat.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
};
