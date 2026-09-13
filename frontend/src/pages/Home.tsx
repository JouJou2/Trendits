import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Truck,
  MapPin,
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
  X
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { allProducts, ProductType, Vendor, LEBANON_ZONES } from '../data/products';
import { collection, onSnapshot, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { type CategoryRecord, topLevelCategories, productInCategory } from '../utils/categories';
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

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  focalX?: number;
  focalY?: number;
  zoom?: number;
}

const isInternalLink = (url: string) => url.startsWith('/');

const HeroCarousel = ({ banners }: { banners: Banner[] }) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  // Keep the index valid if the banner list shrinks (e.g. one gets hidden/deleted)
  useEffect(() => {
    if (index >= banners.length) setIndex(0);
  }, [banners.length, index]);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const timer = setInterval(() => {
      setDirection(1);
      setIndex(i => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, paused]);

  if (banners.length === 0) return null;

  const goTo = (i: number) => {
    const wrapped = (i + banners.length) % banners.length;
    setDirection(wrapped > index || (index === banners.length - 1 && wrapped === 0) ? 1 : -1);
    setIndex(wrapped);
  };
  const current = banners[index];

  const focalX = current.focalX ?? 50;
  const focalY = current.focalY ?? 50;
  const zoom = current.zoom ?? 1;
  const imageEl = (
    <img
      src={current.imageUrl}
      alt={current.title || 'Promotional banner'}
      className="w-full h-full object-cover"
      style={{ objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${zoom})`, transformOrigin: `${focalX}% ${focalY}%` }}
    />
  );

  return (
    <section className="w-full pb-2">
      <div
        className="relative w-full h-[240px] sm:h-[320px] md:h-[420px] lg:h-[480px] overflow-hidden bg-slate-100 group"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={current.id}
            initial={{ x: direction > 0 ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: direction > 0 ? '-100%' : '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {isInternalLink(current.linkUrl) ? (
              <Link to={current.linkUrl} className="block w-full h-full">{imageEl}</Link>
            ) : (
              <a href={current.linkUrl} target="_blank" rel="noreferrer" className="block w-full h-full">{imageEl}</a>
            )}
          </motion.div>
        </AnimatePresence>

        {banners.length > 1 && (
          <>
            <button
              onClick={() => goTo(index - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-slate-900" />
            </button>
            <button
              onClick={() => goTo(index + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Next"
            >
              <ChevronRight className="w-5 h-5 text-slate-900" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => goTo(i)}
                  className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                  title={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

// A curated pastel rotation — each category tile gets its own color so the
// row reads as vibrant/welcoming, while staying tasteful (not a random mix).
const CATEGORY_RING_COLORS = [
  'border-blue-100 bg-blue-50',
  'border-rose-100 bg-rose-50',
  'border-amber-100 bg-amber-50',
  'border-emerald-100 bg-emerald-50',
  'border-purple-100 bg-purple-50',
  'border-cyan-100 bg-cyan-50',
  'border-orange-100 bg-orange-50',
  'border-pink-100 bg-pink-50',
];

const CategoryCircles = ({ categories, counts }: { categories: { id: string; name: string; slug: string; image?: string }[]; counts: Record<string, number> }) => {
  if (categories.length === 0) return null;

  return (
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">
      <div className="bg-gradient-to-br from-primary/5 via-white to-secondary/5 rounded-3xl md:rounded-[2.5rem] border border-slate-100 py-5 md:p-8">
        <div className="flex items-center justify-between px-4 md:px-0 mb-4 md:mb-7">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 font-display tracking-tight">Shop by Category</h2>
          <Link to="/categories" className="text-[11px] md:text-xs font-bold text-primary hover:underline shrink-0">See all</Link>
        </div>
        {/* Edge-to-edge scroller on mobile: the row bleeds to the screen edge so a
            partially-visible tile signals there's more to swipe through. */}
        <div className="flex gap-4 md:gap-10 overflow-x-auto no-scrollbar px-4 md:px-0 pb-1 snap-x snap-mandatory">
          {categories.map((cat, idx) => (
            <Link
              key={cat.id}
              to={`/?cat=${cat.slug}`}
              className="flex flex-col items-center gap-2 shrink-0 group w-[70px] md:w-28 snap-start"
            >
              <div className={`w-[70px] h-[70px] md:w-28 md:h-28 rounded-full overflow-hidden border-4 ${CATEGORY_RING_COLORS[idx % CATEGORY_RING_COLORS.length]} group-hover:border-primary transition-colors shadow-sm`}>
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><Tag className="w-7 h-7 md:w-8 md:h-8" /></div>
                )}
              </div>
              <div className="text-center w-full">
                <p className="text-[11px] md:text-sm font-bold text-slate-800 group-hover:text-primary transition-colors truncate leading-tight">{cat.name}</p>
                <p className="text-[11px] md:text-[11px] text-slate-400 leading-tight">{counts[cat.slug] || 0} items</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

const FlashDeals = ({ products }: { products: ProductType[] }) => {
  // Re-shuffle only when the underlying product list actually changes (not on every render)
  const featured = useMemo(() => {
    const withDeals = products.filter(p => p.oldPrice && p.oldPrice > p.price);
    return shuffleArray(withDeals)[0] || null;
  }, [products]);

  if (!featured) return null;

  const discount = featured.oldPrice ? Math.round(((featured.oldPrice - featured.price) / featured.oldPrice) * 100) : null;

  return (
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-11">
      <div className="bg-secondary rounded-3xl p-4 md:p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group shadow-lg shadow-secondary/30">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 translate-x-1/4 pointer-events-none"></div>

        <div className="max-w-md relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-full border border-white/20 mb-3">
            <Clock className="w-2.5 h-2.5 text-white animate-pulse" />
            <span className="text-[8px] font-bold text-white uppercase tracking-[0.2em]">Limited Time Offer</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white leading-[0.95] tracking-tighter mb-2 uppercase">
            HOT FLASH<br/>DEALS
          </h2>
          <p className="text-white/80 text-xs md:text-sm font-bold">
            {featured.title}{discount ? ` — ${discount}% OFF` : ''}
          </p>
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
           <span className="bg-white text-secondary font-bold py-2.5 px-8 rounded-xl shadow-md shadow-black/10 transition-all group-hover:scale-105 active:scale-95 text-[11px] uppercase tracking-wide">
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
      <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-11">
        <div className="flex justify-between items-end mb-5 md:mb-7">
          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 font-display tracking-tight">{title}</h2>
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
                <div key={i} className="flex-shrink-0 w-[160px] md:w-[220px]">
                  <ProductCardSkeleton isCompact={true} />
                </div>
              ))
            ) : (
              <>
                {products.slice(0, 12).map(p => (
                  <div key={p.id} className="flex-shrink-0 w-[160px] md:w-[220px]">
                    <ProductCard product={p} isCompact={true} />
                  </div>
                ))}
                {/* See More card */}
                <Link
                  to="/categories"
                  className="flex-shrink-0 w-[120px] md:w-[160px] h-full min-h-[240px] md:min-h-[280px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide">See More</span>
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
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-11">
      <div className="flex justify-between items-end mb-5 md:mb-7">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 font-display tracking-tight">{title}</h2>
        </div>
        <Link to="/categories" className="text-primary font-bold text-xs uppercase tracking-wide hover:underline flex items-center gap-1">
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
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-11">
      <div className="flex justify-between items-end mb-5 md:mb-7">
        <div className="space-y-0.5">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-display tracking-tight">Top Vendors</h2>
          <p className="text-xs text-slate-500 font-medium">Our best-selling stores, ranked by orders.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
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
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                    <span className="text-[7px] font-bold text-white/70 uppercase tracking-[0.2em]">{v.category || 'STORE'}</span>
                 </div>
                 <h3 className="text-base md:text-lg font-bold text-white font-display leading-tight tracking-tight mb-1.5">{v.name}</h3>
                 <div className="w-6 h-0.5 bg-primary group-hover:w-full transition-all duration-500"></div>
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
    <section className="bg-white py-12 md:py-16">
       <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-10">
             <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-display tracking-tight mb-2">Why Shop on Trendit</h2>
             <p className="text-xs md:text-sm text-slate-500 font-medium max-w-md mx-auto">Connecting Lebanon with verified local merchants through a smarter, more secure ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10">
             <div className="flex flex-col items-center text-center group">
                <div className="w-11 h-11 md:w-13 md:h-13 bg-white rounded-xl flex items-center justify-center shadow-sm shadow-slate-200/50 mb-3 group-hover:bg-primary transition-colors duration-500">
                   <Shield className="w-5 h-5 text-primary group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-display mb-1.5">Verified Sellers</h3>
                <p className="text-xs text-slate-500 leading-normal px-2">Every merchant is manually vetted for quality and authenticity.</p>
             </div>

             <div className="flex flex-col items-center text-center group">
                <div className="w-11 h-11 md:w-13 md:h-13 bg-white rounded-xl flex items-center justify-center shadow-sm shadow-slate-200/50 mb-3 group-hover:bg-primary transition-colors duration-500">
                   <Truck className="w-5 h-5 text-primary group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-display mb-1.5">Fast Logistics</h3>
                <p className="text-xs text-slate-500 leading-normal px-2">Local drivers focused on quick delivery across Lebanon.</p>
             </div>

             <div className="flex flex-col items-center text-center group">
                <div className="w-11 h-11 md:w-13 md:h-13 bg-white rounded-xl flex items-center justify-center shadow-sm shadow-slate-200/50 mb-3 group-hover:bg-primary transition-colors duration-500">
                   <Clock className="w-5 h-5 text-primary group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-display mb-1.5">Live Tracking</h3>
                <p className="text-xs text-slate-500 leading-normal px-2">Real-time status updates from prepare to delivery.</p>
             </div>

             <div className="flex flex-col items-center text-center group">
                <div className="w-11 h-11 md:w-13 md:h-13 bg-white rounded-xl flex items-center justify-center shadow-sm shadow-slate-200/50 mb-3 group-hover:bg-primary transition-colors duration-500">
                   <BadgePercent className="w-5 h-5 text-primary group-hover:text-white" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 font-display mb-1.5">Best Pricing</h3>
                <p className="text-xs text-slate-500 leading-normal px-2">Transparent fees and heavy discounts on premium items.</p>
             </div>
          </div>
       </div>
    </section>
  );
};

const TrustBanner = () => {
  return (
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-11">
      <div className="bg-slate-900 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
         <div className="flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-blue-300" />
            <div>
               <h4 className="text-white font-bold uppercase text-sm tracking-wide">Buyer Protection</h4>
               <p className="text-slate-400 text-xs font-bold">Safe transactions guaranteed</p>
            </div>
         </div>
         <div className="w-px h-12 bg-white/10 hidden md:block"></div>
         <div className="flex items-center gap-4">
            <CheckCircle2 className="w-10 h-10 text-blue-300" />
            <div>
               <h4 className="text-white font-bold uppercase text-sm tracking-wide">Easy Returns</h4>
               <p className="text-slate-400 text-xs font-bold">14-day hassle free policy</p>
            </div>
         </div>
         <div className="w-px h-12 bg-white/10 hidden md:block"></div>
         <div className="flex items-center gap-4">
            <Truck className="w-10 h-10 text-blue-300" />
            <div>
               <h4 className="text-white font-bold uppercase text-sm tracking-wide">Islandwide Ship</h4>
               <p className="text-slate-400 text-xs font-bold">Covering all of Lebanon</p>
            </div>
         </div>
      </div>
    </section>
  );
};

const DeliveryCoverage = () => {
  const zones = LEBANON_ZONES;
  return (
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 border-t border-slate-100">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
             <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-display tracking-tight leading-tight mb-3">
                Coverage across all of Lebanon
             </h2>
             <p className="text-slate-500 font-medium text-xs md:text-sm leading-relaxed mb-4 max-w-sm">
                Our logistics network covers every major zone to ensure your orders reach you wherever you are.
             </p>
             <div className="flex flex-wrap gap-1.5">
               {zones.map(z => (
                 <div key={z} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[11px] font-bold text-slate-700 tracking-tight">{z}</span>
                 </div>
               ))}
             </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full"></div>
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
                   <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wide leading-none">Avg Delivery</p>
                   <p className="text-sm font-bold text-slate-900 tracking-tighter leading-none mt-0.5">24 HOURS</p>
                </div>
             </div>
          </div>
       </div>
    </section>
  );
};

const CustomerService = () => {
  return (
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
      <div className="bg-slate-900 rounded-3xl p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="relative z-10 text-center md:text-left max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-4">
            <Headphones className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">We're here to help</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-display tracking-tight mb-2">Need a hand with anything?</h2>
          <p className="text-slate-400 text-sm font-medium">Order issues, returns, or questions about a product — our support team typically replies within a few hours.</p>
        </div>
        <div className="relative z-10 shrink-0">
          <Link
            to="/account?tab=settings"
            className="block bg-white text-slate-900 font-bold px-8 py-4 rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-primary hover:text-white transition-all active:scale-95 shadow-xl shadow-white/5 text-center"
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
    <section className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-7 md:py-11">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Tag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl md:text-4xl font-bold text-slate-900 font-display tracking-tight">
            {categoryName}
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
          <h3 className="text-lg font-bold text-slate-900 mb-1">No products yet</h3>
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
  const [categoryList, setCategoryList] = useState<CategoryRecord[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  // Categories for the "Shop by Category" row
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategoryList(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => console.error('Categories fetch error:', error));
    return () => unsub();
  }, []);

  // Admin-managed promotional banners for the hero carousel.
  // Sorted/filtered client-side (rather than where+orderBy on different fields)
  // to avoid needing a composite index for such a small collection.
  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner & { active?: boolean }));
      setBanners(all.filter(b => b.active !== false));
    }, (error) => console.error('Banners fetch error:', error));
    return () => unsub();
  }, []);

  // Fetch all products from Firestore
  useEffect(() => {
    setLoading(true);
    // Soft cap — not true pagination, but comfortably covers the catalog for now.
    // Firestore orderBy('createdAt') isn't used here because older docs may lack that field
    // entirely, which would silently drop them from every homepage section.
    const q = query(collection(db, 'products'), limit(300));
    const applyResults = (prods: ProductType[]) => {
      setAllProductsList(prods);
      const byNewest = [...prods].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setTrendingItems(prods.slice(0, 12));
      setRecommendedItems(prods.slice(12, 24));
      setNewArrivals(byNewest.slice(0, 12));
    };
    // Only ever show real catalog data — an empty store should read as empty,
    // not silently fall back to demo products.
    const unsub = onSnapshot(q, (snapshot) => {
      applyResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as ProductType)));
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      applyResults([]);
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
      let activeCats: CategoryRecord[] = categoryList;
      // Try to get category name from Firestore
      try {
        const catsSnap = await getDocs(collection(db, 'categories'));
        const cats = catsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const matched = cats.find((c: any) => c.slug === activeCategory);
        activeCats = cats as CategoryRecord[];
        setCategoryName(matched?.name || activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1));
      } catch {
        setCategoryName(activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1));
      }

      // A main category also includes everything filed under its subcategories.
      const filtered = allProductsList.filter(p => productInCategory(p.categoryId, activeCategory, activeCats));

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

  // How many products sit in each category, for the "Shop by Category" row.
  // A main category's number includes its subcategories, so "Electronics" does
  // not read 0 items when everything is filed under Electronics › Men.
  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of categoryList) {
      counts[cat.slug] = allProductsList.filter(p => productInCategory(p.categoryId, cat.slug, categoryList)).length;
    }
    return counts;
  }, [allProductsList, categoryList]);

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

  // Admin-curated picks (AdminOverview's "Feature on homepage" sets product.featured)
  const featuredItems = useMemo(() => allProductsList.filter(p => p.featured === true), [allProductsList]);

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
      <HeroCarousel banners={banners} />
      <CategoryCircles categories={topLevelCategories(categoryList)} counts={categoryProductCounts} />

      {featuredItems.length > 0 && (
        <ProductGridSection
          title="Featured"
          products={featuredItems}
          loading={loading}
          isCompact={true}
          isRow={true}
        />
      )}
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