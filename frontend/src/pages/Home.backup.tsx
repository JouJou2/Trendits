import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  User,
  X
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { allProducts, ProductType, Vendor, LEBANON_ZONES } from '../data/products';
import { collection, onSnapshot, query, limit, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeletons';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';

const shuffleArray = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const Hero = () => {
  return (
    <section className="relative -mt-17 pt-4 min-h-[280px] md:min-h-[380px] flex items-center bg-transparent overflow-hidden">
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

      <div className="max-w-[1920px] mx-auto px-4 md:px-8 lg:px-12 w-full relative z-20">
        <div className="max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-slate-900 leading-[1.05] mb-4 tracking-[-0.03em]"
          >
            Lebanon's<br/>
            <span className="text-[#2563EB]">smart</span> marketplace
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-slate-500 mb-5 max-w-md leading-relaxed font-medium"
          >
            Shop electronics, fashion, beauty, home, and daily essentials from trusted local sellers — with fast delivery across Lebanon.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3 mb-5"
          >
            <Link 
              to="/categories"
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 text-xs uppercase tracking-widest font-display flex items-center gap-2"
            >
              Shop Now <ArrowRight className="w-4 h-4 flex-shrink-0" />
            </Link>
            <Link 
              to="/search?q=sale"
              className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 font-black py-3 px-6 rounded-xl shadow-sm transition-all active:scale-95 text-xs uppercase tracking-widest font-display flex items-center gap-2"
            >
              Explore Deals <BadgePercent className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Trust Badges Row */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="hidden md:flex items-center gap-4 p-3 px-5 bg-white shadow-lg shadow-slate-100/50 rounded-2xl border border-slate-100 max-w-fit"
          >
            {[
              { icon: Truck, label: 'Fast delivery', sub: 'Across Lebanon', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: User, label: 'Trusted sellers', sub: 'Verified & rated', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: ShieldCheck, label: 'Secure checkout', sub: 'Safe & protected', color: 'text-cyan-600', bg: 'bg-cyan-50' },
              { icon: BadgePercent, label: 'Best deals', sub: 'Every day', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <div className={`w-9 h-9 ${badge.bg} rounded-lg flex items-center justify-center shrink-0`}>
                  <badge.icon className={`w-5 h-5 ${badge.color}`} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none mb-0.5">{badge.label}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{badge.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FlashDeals = ({ products }: { products: ProductType[] }) => {
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

  // Re-shuffle only when the underlying product list actually changes (not on every render)
  const featured = useMemo(() => {
    const withDeals = products.filter(p => p.oldPrice && p.oldPrice > p.price);
    return shuffleArray(withDeals)[0] || null;
  }, [products]);

  if (!featured) return null;

  const discount = featured.oldPrice ? Math.round(((featured.oldPrice - featured.price) / featured.oldPrice) * 100) : null;

  return (
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-2 md:py-3.5">
      <div className="bg-red-600 rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group shadow-lg shadow-red-200/50">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 translate-x-1/4 pointer-events-none"></div>

        <div className="max-w-md relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/20 mb-3">
            <Clock className="w-2.5 h-2.5 text-white animate-pulse" />
            <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">Limited Time Offer</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white leading-[0.95] tracking-tighter mb-2 uppercase">
            HOT FLASH<br/>DEALS.
          </h2>
          <p className="text-white/80 text-xs md:text-sm font-bold mb-4 line-clamp-1">
            {featured.title}{discount ? ` — ${discount}% OFF` : ''}
          </p>
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

        <Link to={`/product/${featured.id}`} className="relative z-10 flex flex-col items-center gap-3 group cursor-pointer">
           <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="w-32 h-32 bg-white/10 rounded-full blur-2xl absolute inset-0"
              />
              <img
                src={featured.image || featured.images?.[0] || 'https://placehold.co/600x600?text=No+Image'}
                alt={featured.title}
                className="w-36 md:w-44 h-auto object-contain mix-blend-multiply drop-shadow-[0_10px_25px_rgba(0,0,0,0.3)] transform group-hover:scale-105 transition-transform duration-700 hover:rotate-3"
              />
           </div>
           <span className="bg-white text-red-600 font-black py-2.5 px-8 rounded-xl shadow-md shadow-black/10 transition-all group-hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest">
              Shop the Drop
           </span>
        </Link>
      </div>
    </section>
  );
};

const ProductGridSection = ({ title, products, loading, isCompact = false, isRow = false }: { title: string, subtitle?: string, products: ProductType[], loading?: boolean, isCompact?: boolean, isRow?: boolean }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      return () => el.removeEventListener('scroll', checkScroll);
    }
  }, [products]);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  if (isRow) {
    return (
      <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-2 md:py-3.5">
        <div className="flex justify-between items-end mb-2.5">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 font-display tracking-tight uppercase">{title}.</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all ${canScrollLeft ? 'bg-white text-slate-700 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 cursor-default'}`}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={() => scroll('right')}
              className={`w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center transition-all ${canScrollRight ? 'bg-white text-slate-700 hover:bg-slate-50' : 'bg-slate-50 text-slate-300 cursor-default'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[200px]">
                  <ProductCardSkeleton isCompact={true} />
                </div>
              ))
            ) : (
              <>
                {products.slice(0, 12).map(p => (
                  <div key={p.id} className="flex-shrink-0 w-[160px] md:w-[200px]">
                    <ProductCard product={p} isCompact={true} />
                  </div>
                ))}
                {/* See More card */}
                <Link
                  to="/categories"
                  className="flex-shrink-0 w-[120px] md:w-[160px] h-full min-h-[240px] md:min-h-[280px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest">See More</span>
                </Link>
              </>
            )}
          </div>
          {/* Fade edges */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-2 md:py-3.5">
      <div className="flex justify-between items-end mb-2.5">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 font-display tracking-tight uppercase">{title}.</h2>
        </div>
        <Link to="/categories" className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
          View All <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className={isCompact ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"}>
        {loading ? (
          Array(isCompact ? 8 : 4).fill(0).map((_, i) => <ProductCardSkeleton key={i} isCompact={isCompact} />)
        ) : (
          products.map(p => <ProductCard key={p.id} product={p} isCompact={isCompact} />)
        )}
      </div>
    </section>
  );
};

const TopVendors = ({ vendors, loading }: { vendors: Vendor[]; loading: boolean }) => {
  if (!loading && vendors.length === 0) return null;

  return (
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-2 md:py-3 mb-1.5">
      <div className="flex justify-between items-end mb-2">
        <div className="space-y-0.5">
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-display tracking-tight uppercase">Top Vendors.</h2>
          <p className="text-[10px] text-slate-500 font-medium">Our best-selling stores, ranked by orders.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 md:h-28 rounded-xl bg-slate-100 animate-pulse" />
          ))
        ) : (
          vendors.map(v => (
            <Link
              key={v.id}
              to={`/vendor/${v.id}`}
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
                    <span className="text-[7px] font-black text-white/70 uppercase tracking-[0.2em]">{v.category || 'STORE'}</span>
                 </div>
                 <h3 className="text-sm md:text-base font-black text-white font-display leading-[0.8] tracking-tighter mb-1.5 uppercase">{v.name}</h3>
                 <div className="w-6 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-500"></div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
};

const CustomerTrust = () => {
  return (
    <section className="bg-slate-50 py-3.5 md:py-5 mb-1.5">
       <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6">
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
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-4 mb-4">
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
  const zones = LEBANON_ZONES;
  return (
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-3 md:py-4.5 mb-2 border-t border-slate-100">
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

const CustomerService = () => {
  return (
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-6 md:py-8">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 text-center md:text-left max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-4">
            <Headphones className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">We're here to help</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight mb-2">Need a hand with anything?</h2>
          <p className="text-slate-400 text-sm font-medium">Order issues, returns, or questions about a product — our support team typically replies within a few hours.</p>
        </div>
        <div className="relative z-10 shrink-0">
          <Link
            to="/account?tab=settings"
            className="block bg-white text-slate-900 font-black px-8 py-4 rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-xl shadow-white/5 text-center"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  );
};

// ── FILTERED CATEGORY VIEW ──
const FilteredCategoryView = ({ categorySlug, categoryName, products, loading }: {
  categorySlug: string;
  categoryName: string;
  products: ProductType[];
  loading: boolean;
}) => {
  return (
    <section className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 py-4 md:py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 font-display tracking-tight uppercase">
            {categoryName}.
          </h2>
          <p className="text-xs text-slate-500 font-medium">{products.length} products found</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {Array(12).fill(0).map((_, i) => <ProductCardSkeleton key={i} isCompact={true} />)}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} isCompact={true} />)}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBasket className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-1">No products yet</h3>
          <p className="text-sm text-slate-500">Check back soon for new {categoryName.toLowerCase()} arrivals.</p>
        </div>
      )}
    </section>
  );
};

export const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('cat');

  const [trendingItems, setTrendingItems] = useState<ProductType[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<ProductType[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductType[]>([]);
  const [allProductsList, setAllProductsList] = useState<ProductType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductType[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(!!activeCategory);
  const [topVendors, setTopVendors] = useState<Vendor[]>([]);
  const [topVendorsLoading, setTopVendorsLoading] = useState(true);

  // Fetch all products from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'products'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ProductType));
        setAllProductsList(prods);
        setTrendingItems(prods.slice(0, 12));
        setRecommendedItems(prods.slice(12, 24));
        setNewArrivals(prods.slice(24, 36));
      } else {
        setAllProductsList(allProducts);
        setTrendingItems(allProducts.slice(0, 12));
        setRecommendedItems(allProducts.slice(12, 24));
        setNewArrivals(allProducts.slice(24, 36));
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setAllProductsList(allProducts);
      setTrendingItems(allProducts.slice(0, 12));
      setRecommendedItems(allProducts.slice(12, 24));
      setNewArrivals(allProducts.slice(24, 36));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter products when active category changes
  useEffect(() => {
    if (!activeCategory) {
      setFilteredProducts([]);
      setCategoryName('');
      setFilterLoading(false);
      return;
    }

    setFilterLoading(true);

    const fetchCategoryAndFilter = async () => {
      // Try to get category name from Firestore
      try {
        const catsSnap = await getDocs(collection(db, 'categories'));
        const cats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const matched = cats.find((c: any) => c.slug === activeCategory);
        setCategoryName(matched?.name || activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1));
      } catch {
        setCategoryName(activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1));
      }

      // Filter products by category slug (check categoryId, category, tags, or slug match)
      const filtered = allProductsList.filter(p => {
        const slug = activeCategory.toLowerCase();
        const prodCategory = (p.categoryId || '').toLowerCase();
        const prodName = (p.name || p.title || '').toLowerCase();
        const prodTags = (p.tags || []).map((t: string) => t.toLowerCase());
        const prodDesc = (p.description || '').toLowerCase();

        return (
          prodCategory === slug ||
          prodCategory.includes(slug) ||
          slug.includes(prodCategory) ||
          prodName.includes(slug) ||
          prodTags.some((t: string) => t.includes(slug) || slug.includes(t)) ||
          prodDesc.includes(slug)
        );
      });

      setFilteredProducts(filtered);
      setFilterLoading(false);
    };

    fetchCategoryAndFilter();
  }, [activeCategory, allProductsList]);

  // Top vendors, ranked by real orders sold at checkout
  useEffect(() => {
    const q = query(collection(db, 'vendors'), orderBy('orderCount', 'desc'), limit(3));
    const unsub = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        setTopVendors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Vendor)));
        setTopVendorsLoading(false);
        return;
      }
      // No vendor has any orders yet (fresh site) — fall back to showing any vendors
      try {
        const fallbackSnap = await getDocs(query(collection(db, 'vendors'), limit(3)));
        setTopVendors(fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Vendor)));
      } catch (e) {
        console.error('Vendor fallback query error:', e);
      } finally {
        setTopVendorsLoading(false);
      }
    }, (error) => {
      console.error('Top vendors query error:', error);
      setTopVendorsLoading(false);
    });
    return () => unsub();
  }, []);

  // Newest products from the top-selling vendors only
  const newestFromTopVendors = useMemo(() => {
    if (topVendors.length === 0) return newArrivals;
    const topVendorIds = new Set(topVendors.map(v => v.id));
    const filtered = [...allProductsList]
      .filter(p => p.vendorId && topVendorIds.has(p.vendorId))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return filtered.length > 0 ? filtered : newArrivals;
  }, [allProductsList, topVendors, newArrivals]);

  // Personalized picks based on the visitor's own recent searches
  const justForYou = useMemo(() => {
    let recentSearches: string[] = [];
    try {
      const saved = localStorage.getItem('trendit_recent_searches');
      recentSearches = saved ? JSON.parse(saved) : [];
    } catch {
      recentSearches = [];
    }

    if (recentSearches.length === 0) return recommendedItems;

    const terms = recentSearches.map(t => t.toLowerCase());
    const matched = allProductsList.filter(p => {
      const title = (p.name || p.title || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      const category = (p.categoryId || '').toLowerCase();
      const tags = (p.tags || []).map(t => t.toLowerCase());
      return terms.some(term =>
        title.includes(term) || brand.includes(term) || category.includes(term) ||
        tags.some(tag => tag.includes(term) || term.includes(tag))
      );
    });

    return matched.length > 0 ? matched : recommendedItems;
  }, [allProductsList, recommendedItems]);

  const clearFilter = () => {
    setSearchParams({}, { replace: true });
  };

  // If a category is selected, show filtered view
  if (activeCategory) {
    return (
      <main className="pb-24">
        <SEO />

        <FilteredCategoryView
          categorySlug={activeCategory}
          categoryName={categoryName || activeCategory}
          products={filteredProducts}
          loading={loading || filterLoading}
        />

        {/* Still show some other sections below */}
        <FlashDeals products={allProductsList} />
        <TopVendors vendors={topVendors} loading={topVendorsLoading} />
        <CustomerTrust />
        <DeliveryCoverage />
        <TrustBanner />
        <CustomerService />
      </main>
    );
  }

  // Default full homepage
  return (
    <main className="pb-24">
      <SEO />
      <Hero />

      <ProductGridSection
        title="Trending"
        products={trendingItems}
        loading={loading}
        isCompact={true}
        isRow={true}
      />
      <FlashDeals products={allProductsList} />
      <ProductGridSection
        title="Just For You"
        products={justForYou}
        loading={loading}
        isCompact={true}
        isRow={true}
      />
      <TopVendors vendors={topVendors} loading={topVendorsLoading} />
      <ProductGridSection
        title="Newest Drops"
        products={newestFromTopVendors}
        loading={loading || topVendorsLoading}
        isCompact={true}
        isRow={true}
      />
      <CustomerTrust />
      <DeliveryCoverage />
      <TrustBanner />
      <CustomerService />
    </main>
  );
};