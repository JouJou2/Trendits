import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Clock, 
  BadgePercent, 
  Headphones,
  ShoppingBasket,
  Tag,
  Sparkles,
  Shirt,
  Armchair,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { allProducts, ProductType } from '../data/products';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import { motion } from 'motion/react';
import { SEO } from '../components/SEO';

const Hero = () => {
  return (
    <section className="relative pt-0.5 min-h-[130px] md:min-h-[170px] flex items-center mb-0.5 bg-transparent overflow-hidden">
      {/* Background Hero Picture */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <picture>
          <source media="(max-w: 768px)" srcSet="/hero-bg-mobile.png" />
          <img 
            src="/hero-bg.png" 
            alt="Hero Background" 
            className="w-full h-full object-cover object-center" 
          />
        </picture>
      </div>
      
      {/* Main decorative image of products/phone */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2/5 h-full hidden lg:flex items-center justify-end z-10 pointer-events-none">
        <motion.img 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          src="/hero-new.png" 
          alt="Marketplace Showcase" 
          className="h-[55%] object-contain object-right transform translate-x-12" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 w-full relative z-20 py-1 pb-1.5">
        <div className="max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl md:text-[2.5rem] font-display font-black text-slate-900 leading-[0.95] mb-2 tracking-[-0.03em]"
          >
            Lebanon’s<br/>
            <span className="text-[#2563EB]">smart</span> marketplace
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[10px] md:text-xs text-slate-500 mb-2.5 max-w-sm leading-relaxed font-medium"
          >
            Shop electronics, fashion, beauty, home, and daily essentials from trusted local sellers — with fast delivery across Lebanon.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-2 mb-3.5"
          >
            <Link 
              to="/categories"
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-black py-1.5 px-4 rounded-lg shadow-md shadow-blue-200 transition-all active:scale-95 text-[8px] uppercase tracking-widest font-display flex items-center gap-1"
            >
              Shop Now <ArrowRight className="w-3 h-3 flex-shrink-0" />
            </Link>
            <Link 
              to="/search?q=sale"
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-100 font-black py-1.5 px-4 rounded-lg shadow-sm shadow-slate-100 transition-all active:scale-95 text-[8px] uppercase tracking-widest font-display flex items-center gap-1"
            >
              Explore Deals <BadgePercent className="w-3" />
            </Link>
          </motion.div>

          {/* Trust Badges Row */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="hidden md:flex items-center gap-3 p-1.5 px-3 bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)] rounded-[0.75rem] border border-slate-50 max-w-fit"
          >
            {[
              { icon: Truck, label: 'Fast delivery', sub: 'Across Lebanon', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: User, label: 'Trusted sellers', sub: 'Verified & rated', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: ShieldCheck, label: 'Secure checkout', sub: 'Safe & protected', color: 'text-cyan-600', bg: 'bg-cyan-50' },
              { icon: BadgePercent, label: 'Best deals', sub: 'Every day', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((badge, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <div className={`w-5 h-5 ${badge.bg} rounded flex items-center justify-center shrink-0`}>
                  <badge.icon className={`w-3 h-3 ${badge.color}`} />
                </div>
                <div>
                  <h4 className="text-[7.5px] font-black text-slate-900 uppercase tracking-tight leading-none mb-0.5">{badge.label}</h4>
                  <p className="text-[6.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">{badge.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const CategoryRow = () => {
  const displayCats = [
    { name: 'Electronics', icon: Headphones, image: '/icon-electronics.jpeg', color: 'text-blue-500', bg: 'bg-blue-50', id: 'electronics' },
    { name: 'Fashion', icon: Shirt, image: '/icon-fashion.jpeg', color: 'text-pink-500', bg: 'bg-pink-50', id: 'fashion' },
    { name: 'Beauty', icon: Sparkles, image: '/icon-beauty.jpeg', color: 'text-purple-500', bg: 'bg-purple-50', id: 'beauty-cosmetics' },
    { name: 'Home', icon: Armchair, image: '/icon-home.jpeg', color: 'text-emerald-500', bg: 'bg-emerald-50', id: 'furniture' },
    { name: 'Grocery', icon: ShoppingBasket, image: '/icon-grocery.jpeg', color: 'text-orange-500', bg: 'bg-orange-50', id: 'groceries' },
    { name: 'Offers', icon: Tag, image: '/icon-offers.jpeg', color: 'text-rose-500', bg: 'bg-rose-50', id: 'offers' },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-1.5 md:mt-2.5 relative z-30 mb-2">
      <div className="bg-white rounded-2xl p-2.5 md:p-3.5 grid grid-cols-6 gap-0.5 md:gap-2 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-50">
        {displayCats.map((cat, idx) => (
          <Link 
            key={idx}
            to={cat.id === 'offers' ? '/search?q=sale' : `/category/${cat.id}`}
            className="flex flex-col items-center gap-1.5 group text-center"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-slate-100">
              <div className={`w-full h-full ${cat.bg} rounded-xl flex items-center justify-center overflow-hidden`}>
                {cat.image ? (
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                ) : (
                  <cat.icon className={`w-4.5 h-4.5 md:w-5 md:h-5 ${cat.color}`} />
                )}
              </div>
            </div>
            <span className="text-[8px] md:text-[9px] font-black text-slate-900 uppercase tracking-tight group-hover:text-[#2563EB] transition-colors truncate max-w-full px-1">{cat.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const FlashDeals = () => {
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 15, s: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-3.5">
      <div className="bg-red-600 rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group shadow-lg shadow-red-200/50">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 translate-x-1/4 pointer-events-none"></div>
        
        <div className="max-w-md relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/20 mb-3">
            <Clock className="w-2.5 h-2.5 text-white animate-pulse" />
            <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Limited Time Offer</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white leading-[0.95] tracking-tighter mb-4 uppercase">
            HOT FLASH<br/>DEALS.
          </h2>
          <div className="flex items-center gap-2 justify-center md:justify-start">
             <div className="flex items-center gap-1 p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl min-w-[56px] justify-center">
                <span className="text-xl font-black text-white font-mono">{timeLeft.h.toString().padStart(2, '0')}</span>
                <span className="text-[7px] font-black text-white/50 uppercase vertical-text">HRS</span>
             </div>
             <div className="text-lg font-black text-white animate-pulse">:</div>
             <div className="flex items-center gap-1 p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl min-w-[56px] justify-center">
                <span className="text-xl font-black text-white font-mono">{timeLeft.m.toString().padStart(2, '0')}</span>
                <span className="text-[7px] font-black text-white/50 uppercase vertical-text">MIN</span>
             </div>
             <div className="text-lg font-black text-white animate-pulse">:</div>
             <div className="flex items-center gap-1 p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl min-w-[56px] justify-center">
                <span className="text-xl font-black text-white font-mono">{timeLeft.s.toString().padStart(2, '0')}</span>
                <span className="text-[7px] font-black text-white/50 uppercase vertical-text">SEC</span>
             </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 group cursor-pointer">
           <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }} 
                transition={{ repeat: Infinity, duration: 4 }}
                className="w-32 h-32 bg-white/10 rounded-full blur-2xl absolute inset-0"
              />
              <img 
                src="https://images.unsplash.com/photo-1627384113743-6bd5a479fffd?w=800&q=80" 
                alt="Flash Sale" 
                className="w-36 md:w-44 h-auto object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.3)] transform group-hover:scale-105 transition-transform duration-700 hover:rotate-3"
              />
           </div>
           <Link 
            to="/search?q=sale"
            className="bg-white text-red-600 font-black py-2.5 px-8 rounded-xl shadow-md shadow-black/10 transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
           >
              Shop the Drop
           </Link>
        </div>
      </div>
    </section>
  );
};

const ProductGridSection = ({ title, products, loading, isCompact = false }: { title: string, subtitle?: string, products: ProductType[], loading?: boolean, isCompact?: boolean }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-3.5">
      <div className="flex justify-between items-end mb-2.5">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 font-display tracking-tight uppercase">{title}.</h2>
        </div>
        <Link to="/categories" className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className={isCompact ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 md:gap-3" : "grid grid-cols-2 lg:grid-cols-4 gap-6"}>
        {loading ? (
          Array(isCompact ? 8 : 4).fill(0).map((_, i) => <ProductCardSkeleton key={i} isCompact={isCompact} />)
        ) : (
          products.map(p => <ProductCard key={p.id} product={p} isCompact={isCompact} />)
        )}
      </div>
    </section>
  );
};

const TopVendors = () => {
  const vendors = [
    { id: 'beirut-tech', name: 'Beirut Tech', category: 'PREMIUM ELECTRONICS', image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&fit=crop' },
    { id: 'cedar-style', name: 'Cedar Style', category: 'LUXURY BOUTIQUE', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&fit=crop' },
    { id: 'trendit-home', name: 'Trendit Home', category: 'MODERN DESIGNS', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&fit=crop' },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-3 mb-1.5">
      <div className="flex justify-between items-end mb-2">
        <div className="space-y-0.5">
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-display tracking-tight uppercase">Top Vendors.</h2>
          <p className="text-[10px] text-slate-500 font-medium">Official and verified boutiques.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {vendors.map(v => (
          <Link 
            key={v.id}
            to={`/vendors/${v.id}`}
            className="group relative h-24 md:h-28 rounded-xl overflow-hidden bg-slate-900 shadow-md shadow-slate-100"
          >
            <img 
              src={v.image || 'https://placehold.co/600x600?text=No+Image'} 
              alt={v.name} 
              className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-2" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent p-3 md:p-4 flex flex-col justify-end">
               <div className="flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[7px] font-black text-white/70 uppercase tracking-[0.2em]">{v.category}</span>
               </div>
               <h3 className="text-sm md:text-base font-black text-white font-display leading-[0.8] tracking-tighter mb-1.5 uppercase">{v.name}</h3>
               <div className="w-6 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-500"></div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const CustomerTrust = () => {
  return (
    <section className="bg-slate-50 py-3.5 md:py-5 mb-1.5">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-3">
             <h2 className="text-lg md:text-xl font-black text-slate-900 font-display tracking-tight uppercase mb-1">Why Shop on Trendit.</h2>
             <p className="text-[10px] md:text-xs text-slate-500 font-medium max-w-md mx-auto">Connecting Lebanon with verified local merchants through a smarter, more secure ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
             <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-md shadow-slate-200/50 mb-2 group-hover:bg-blue-600 transition-colors duration-500">
                   <Shield className="w-4.5 h-4.5 md:w-5 md:h-5 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 font-display uppercase tracking-tight mb-1">Verified Sellers</h3>
                <p className="text-[10px] md:text-xs text-slate-500 leading-normal px-2">Every merchant is manually vetted for quality and authenticity.</p>
             </div>
             
             <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-md shadow-slate-200/50 mb-2 group-hover:bg-blue-600 transition-colors duration-500">
                   <Truck className="w-4.5 h-4.5 md:w-5 md:h-5 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 font-display uppercase tracking-tight mb-1">Fast Logistics</h3>
                <p className="text-[10px] md:text-xs text-slate-500 leading-normal px-2">Local drivers focused on quick delivery across Lebanon.</p>
             </div>

             <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-md shadow-slate-200/50 mb-2 group-hover:bg-blue-600 transition-colors duration-500">
                   <Clock className="w-4.5 h-4.5 md:w-5 md:h-5 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 font-display uppercase tracking-tight mb-1">Tracking Row</h3>
                <p className="text-[10px] md:text-xs text-slate-500 leading-normal px-2">Real-time status updates from prepare to delivery.</p>
             </div>

             <div className="flex flex-col items-center text-center group">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-md shadow-slate-200/50 mb-2 group-hover:bg-blue-600 transition-colors duration-500">
                   <BadgePercent className="w-4.5 h-4.5 md:w-5 md:h-5 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 font-display uppercase tracking-tight mb-1">Best Pricing</h3>
                <p className="text-[10px] md:text-xs text-slate-500 leading-normal px-2">Transparent fees and heavy discounts on premium items.</p>
             </div>
          </div>
       </div>
    </section>
  );
};

const TrustBanner = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 mb-4">
      <div className="bg-blue-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
         <div className="flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-blue-400" />
            <div>
               <h4 className="text-white font-black uppercase text-sm tracking-widest">Buyer Protection</h4>
               <p className="text-blue-200/60 text-xs font-bold">Safe transactions guaranteed</p>
            </div>
         </div>
         <div className="w-px h-12 bg-white/10 hidden md:block"></div>
         <div className="flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <div>
               <h4 className="text-white font-black uppercase text-sm tracking-widest">Easy Returns</h4>
               <p className="text-blue-200/60 text-xs font-bold">14-day hassle free policy</p>
            </div>
         </div>
         <div className="w-px h-12 bg-white/10 hidden md:block"></div>
         <div className="flex items-center gap-4">
            <Truck className="w-10 h-10 text-orange-400" />
            <div>
               <h4 className="text-white font-black uppercase text-sm tracking-widest">Islandwide Ship</h4>
               <p className="text-blue-200/60 text-xs font-bold">Covering all of Lebanon</p>
            </div>
         </div>
      </div>
    </section>
  );
};

const DeliveryCoverage = () => {
  const zones = ['Beirut', 'Mount Lebanon', 'North', 'South', 'Bekaa'];
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4.5 mb-2 border-t border-slate-100">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center">
          <div>
             <h2 className="text-lg md:text-xl font-black text-slate-900 font-display tracking-tight uppercase leading-[0.9] mb-2.5">
                Coverage<br/>Across entire<br/>Lebanon<span className="text-blue-600">.</span>
             </h2>
             <p className="text-slate-500 font-medium text-[10px] md:text-xs leading-normal mb-3 max-w-sm">
                Our logistics network covers every major zone to ensure your orders reach you wherever you are.
             </p>
             <div className="flex flex-wrap gap-1.5">
               {zones.map(z => (
                 <div key={z} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-blue-600" />
                    <span className="text-[10px] font-bold text-slate-700 tracking-tight">{z}</span>
                 </div>
               ))}
             </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-blue-600/5 blur-xl rounded-full"></div>
             <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" 
              alt="Lebanon Map Placeholder" 
              referrerPolicy="no-referrer"
              className="relative z-10 w-full h-[140px] md:h-[160px] object-cover rounded-xl shadow-lg"
             />
             <div className="absolute -bottom-3 -left-3 bg-white p-2.5 rounded-xl shadow-lg border border-slate-50 z-20 flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                   <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                   <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Avg Delivery</p>
                   <p className="text-sm font-black text-slate-900 tracking-tighter leading-none mt-0.5">24 HOURS</p>
                </div>
             </div>
          </div>
       </div>
    </section>
  );
};

export const Home = () => {
  const [trendingItems, setTrendingItems] = useState<ProductType[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<ProductType[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch products from Firestore
    const q = query(collection(db, 'products'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ProductType));
        // Distribute for categories
        setTrendingItems(prods.slice(0, 12));
        setRecommendedItems(prods.slice(12, 24));
        setNewArrivals(prods.slice(24, 36));
      } else {
        // Fallback to static data
        setTrendingItems(allProducts.slice(0, 12));
        setRecommendedItems(allProducts.slice(12, 24));
        setNewArrivals(allProducts.slice(24, 36));
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setTrendingItems(allProducts.slice(0, 12));
      setRecommendedItems(allProducts.slice(12, 24));
      setNewArrivals(allProducts.slice(24, 36));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="pb-24">
      <SEO />
      <Hero />
      <CategoryRow />
      <ProductGridSection 
        title="Trending" 
        subtitle="Lebanon's most wanted items right now." 
        products={trendingItems}
        loading={loading}
        isCompact={true}
      />
      <FlashDeals />
      <ProductGridSection 
        title="Just For You" 
        subtitle="AI-curated recommendations based on your taste." 
        products={recommendedItems}
        loading={loading}
        isCompact={true}
      />
      <TopVendors />
      <ProductGridSection 
        title="Newest Drops" 
        subtitle="The latest arrivals in our marketplace." 
        products={newArrivals}
        loading={loading}
        isCompact={true}
      />
      <CustomerTrust />
      <DeliveryCoverage />
      <TrustBanner />
    </main>
  );
};
