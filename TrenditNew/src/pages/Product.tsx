import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AIElevatorPitch } from '../components/AIElevatorPitch';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailSkeleton } from '../components/Skeletons';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/SEO';
import { 
  Star, 
  ChevronRight, 
  Heart, 
  ShieldCheck, 
  Truck, 
  RotateCcw,
  Minus,
  Plus,
  CheckCircle2,
  Package,
  Clock,
  ArrowRight,
  ShieldAlert,
  Gem
} from 'lucide-react';
import { allProducts, ProductType, vendors, getDisplayPrice } from '../data/products';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../contexts/CartContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const Product = () => {
  const { id } = useParams();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'products', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as unknown as ProductType;
        setProduct(data);
        setMainImage(data.images?.[0] || data.image);
        setSelectedColor(data.colors?.[0] || '');
        setSelectedSize(data.sizes?.[0] || '');
      } else {
        const staticProd = allProducts.find(p => p.id.toString() === id);
        if (staticProd) {
          setProduct(staticProd);
          setMainImage(staticProd.images?.[0] || staticProd.image);
          setSelectedColor(staticProd.colors?.[0] || '');
          setSelectedSize(staticProd.sizes?.[0] || '');
        } else {
          setProduct(null);
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y });
  };

  const isWishlisted = product ? isInWishlist(product.id) : false;
  const vendor = product ? (vendors.find(v => v.id === product.vendorId) || vendors[0]) : null;
  const relatedProducts = product ? allProducts.filter(p => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4) : [];

  if (loading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white m-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-slate-300" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight mb-2">Product not found.</h2>
        <p className="text-slate-500 font-medium mb-8">It might have been removed or the link is incorrect.</p>
        <Link to="/" className="bg-blue-600 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-blue-100">Return to Home</Link>
      </div>
    );
  }

  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
        <SEO 
          title={product.title} 
          description={product.description} 
          image={product.image || 'https://placehold.co/600x600?text=No+Image'}
          url={window.location.href}
          type="product"
        />
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/category/${product.categoryId}`} className="hover:text-blue-600">{product.categoryId.replace('-', ' ')}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 truncate max-w-[150px]">{product.title}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 mb-12 max-w-5xl mx-auto">
        {/* Gallery Section */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnails */}
            <div className="flex md:flex-col gap-3 overflow-x-auto md:w-24 no-scrollbar">
              {product.images?.map((img, idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setMainImage(img)}
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${mainImage === img ? 'border-blue-600 ring-4 ring-blue-100' : 'border-slate-100'}`}
                >
                  <img src={img || 'https://placehold.co/600x600?text=No+Image'} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Display */}
            <div 
              className="relative aspect-square w-full max-w-sm md:max-w-md mx-auto rounded-[2.5rem] bg-slate-50 overflow-hidden cursor-zoom-in group"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img 
                src={mainImage || 'https://placehold.co/600x600?text=No+Image'} 
                alt={product.title} 
                className={`w-full h-full object-contain p-20 mix-blend-multiply transition-transform duration-200 ease-out ${isZoomed ? 'scale-150' : 'scale-100'}`}
                style={isZoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
              />
              
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                {discount && <span className="bg-red-500 text-white font-black text-xs px-3 py-1 rounded-xl shadow-lg">-{discount}% OFF</span>}
                <span className="bg-white/80 backdrop-blur-md text-slate-900 font-black text-xs px-3 py-1 rounded-xl shadow-lg border border-white">VERIFIED SELLER</span>
              </div>

              <button 
                onClick={() => toggleWishlist(product.id)}
                className={`absolute top-6 right-6 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center transition-all ${isWishlisted ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
              >
                <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-4">
             <div className="flex text-yellow-400">
               {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Math.round(product.rating) ? 'fill-current' : 'text-slate-200'}`} />)}
             </div>
             <span className="text-sm font-black text-slate-900">{product.rating}</span>
             <span className="text-sm font-medium text-slate-400">({product.reviews} Reviews)</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 leading-[0.9] tracking-tighter mb-4 uppercase">
            {product.title}
          </h1>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
            <Link to={`/vendor/${vendor?.id}`} className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-xl overflow-hidden group-hover:border-blue-600 transition-colors">
                <img src={vendor?.image || 'https://placehold.co/600x600?text=No+Image'} alt={vendor?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Sold By</p>
                <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{vendor?.name}</p>
              </div>
            </Link>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Verified Merchant</span>
            </div>
          </div>

          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-5xl font-black text-slate-900 tracking-tighter">${getDisplayPrice(product.price, product.feePercentage).toFixed(2)}</span>
            {product.oldPrice && (
              <span className="text-xl text-slate-400 line-through font-bold">${getDisplayPrice(product.oldPrice, product.feePercentage).toFixed(2)}</span>
            )}
            <div className="ml-auto hidden sm:flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-2xl">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
               In Stock
            </div>
          </div>

          {/* AI SMART SUMMARY */}
          <AIElevatorPitch 
            productTitle={product.title}
            productDescription={product.description}
            brand={product.brand}
          />

          {/* Options */}
          <div className="space-y-8 mb-10">
            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Color: <span className="text-slate-900">{selectedColor}</span></p>
                </div>
                <div className="flex gap-3">
                  {product.colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${selectedColor === color ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-100'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shadow-inner ${color === 'White' ? 'bg-white border' : 'bg-slate-900'}`} style={{ backgroundColor: color.toLowerCase().replace(' ', '') }}></div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Size: <span className="text-slate-900">{selectedSize}</span></p>
                  <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Size Guide</button>
                </div>
                <div className="flex gap-3">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[50px] h-12 px-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${selectedSize === size ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-600 hover:border-slate-300'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</p>
                  <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl w-32 border border-slate-200">
                    <button 
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-center font-black text-sm">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               
               <div className="flex-1 pt-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-[2rem]">
                     <Clock className="w-5 h-5 text-blue-600" />
                     <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-0.5">Fastest Delivery</p>
                        <p className="text-xs font-bold text-slate-700">Tomorrow, May 14</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Action BTNs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
             <button 
              onClick={() => addToCart({
                productId: product.id,
                title: product.title,
                price: getDisplayPrice(product.price, product.feePercentage),
                image: product.image || 'https://placehold.co/600x600?text=No+Image',
                selectedColor,
                selectedSize,
                quantity
              })}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-red-200 transition-all active:scale-95 text-sm uppercase tracking-widest font-display"
             >
                Add to Cart
             </button>
             <button className="flex-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border-2 border-blue-100 font-black py-6 rounded-[2rem] transition-all active:scale-95 text-sm uppercase tracking-widest font-display">
                Buy It Now
             </button>
          </div>

          {/* Trust Points */}
          <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
             <div className="flex items-start gap-4">
                <Truck className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Fast Shipping</h5>
                  <p className="text-[10px] text-slate-500 font-medium">Islandwide delivery in 24-48h.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <RotateCcw className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">14 Day Returns</h5>
                  <p className="text-[10px] text-slate-500 font-medium">Hassle-free Lebanese returns.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Authentic Gear</h5>
                  <p className="text-[10px] text-slate-500 font-medium">Verified original and quality check.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <Package className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Cash On Delivery</h5>
                  <p className="text-[10px] text-slate-500 font-medium">Pay safe at your doorstep.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-20">
         <div className="flex border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
            {['description', 'specs', 'shipping'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'}`}
              >
                {tab}
                {activeTab === tab && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
              </button>
            ))}
         </div>

         <div className="max-w-3xl">
            <AnimatePresence mode="wait">
               {activeTab === 'description' && (
                 <motion.div 
                    key="desc"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="prose prose-slate max-w-none"
                 >
                    <p className="text-slate-600 leading-relaxed font-medium mb-6">
                      {product.description}
                    </p>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 font-display">Key Highlights</h4>
                    <ul className="space-y-3">
                       <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          Handpicked quality materials for long-lasting usage
                       </li>
                       <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          Crafted by expert designers following latest trends
                       </li>
                       <li className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          Authentic {product.brand} product with official warranty
                       </li>
                    </ul>
                 </motion.div>
               )}

               {activeTab === 'specs' && (
                 <motion.div 
                    key="specs"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                 >
                    {Object.entries(product.specs).map(([k, v]) => (
                      <div key={k} className="flex justify-between py-4 border-b border-slate-50 last:border-0">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{k}</span>
                         <span className="text-sm font-extrabold text-slate-900">{v}</span>
                      </div>
                    ))}
                 </motion.div>
               )}

               {activeTab === 'shipping' && (
                  <motion.div 
                    key="shipping"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                 >
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4">
                       <Truck className="w-8 h-8 text-blue-600 shrink-0" />
                       <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">Standard Lebanon Shipping</h4>
                          <p className="text-xs text-slate-500 font-medium mb-3">Free shipping on orders over $50. Flat $4 fee for smaller orders.</p>
                          <div className="flex gap-2">
                             <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">Beirut: 24h</div>
                             <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600">Provinces: 48h</div>
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4">
                       <RotateCcw className="w-8 h-8 text-red-500 shrink-0" />
                       <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">Hassle-Free Returns</h4>
                          <p className="text-xs text-slate-500 font-medium">14-day money back guarantee if the item is in original condition with tags. We'll pick it up from your place for free!</p>
                       </div>
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      </div>

      {/* Frequently bought together - Conceptual */}
      <div className="mb-20">
         <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight uppercase mb-8 flex items-center gap-2">
            AI Choice: <span className="text-blue-600">Perfect Pairing.</span>
         </h2>
         <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
            <div className="flex items-center gap-4 relative z-10">
               <div className="w-32 h-32 bg-white rounded-3xl p-4 shadow-2xl">
                  <img src={product.image || 'https://placehold.co/600x600?text=No+Image'} className="w-full h-full object-contain mix-blend-multiply" alt="" />
               </div>
               <Plus className="w-6 h-6 text-white" />
               <div className="w-32 h-32 bg-white rounded-3xl p-4 shadow-2xl relative">
                  <img src={relatedProducts[0]?.image || 'https://placehold.co/600x600?text=No+Image'} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-2 border-slate-900">
                     <Gem className="w-5 h-5" />
                  </div>
               </div>
            </div>
            <div className="flex-1 relative z-10 text-center md:text-left">
               <h4 className="text-white font-black text-2xl uppercase tracking-tighter leading-tight mb-2">Buy the Bundle & Save 10%</h4>
               <p className="text-slate-400 font-medium text-sm mb-6">Our AI suggested this combo for your lifestyle. Complete your outfit with this curated match.</p>
               <button className="bg-white text-slate-900 font-black px-10 py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-xl shadow-white/5">
                  Get Bundle $ {(getDisplayPrice(product.price, product.feePercentage) + getDisplayPrice(relatedProducts[0]?.price || 0, relatedProducts[0]?.feePercentage || 0) * 0.9).toFixed(2)}
               </button>
            </div>
            
            {/* Background blur */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2" />
         </div>
      </div>

      {/* Related Products */}
      <section>
         <div className="flex justify-between items-end mb-10">
            <h2 className="text-4xl font-black text-slate-900 font-display tracking-tight uppercase">Similar Vibes.</h2>
            <Link to={`/category/${product.categoryId}`} className="text-blue-600 font-black text-xs uppercase tracking-widest hover:underline flex items-center gap-1">
              Explore More <ArrowRight className="w-4 h-4" />
            </Link>
         </div>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
         </div>
      </section>
    </main>
  );
};
