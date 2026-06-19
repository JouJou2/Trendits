import React from 'react';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Trash2, 
  Minus, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Truck, 
  ShieldCheck, 
  Maximize2,
  Bookmark,
  Gem,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductCard } from '../components/ProductCard';
import { allProducts } from '../data/products';

export const Cart = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const navigate = useNavigate();

  const deliveryFee = 4.00;
  const itemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Suggested add-ons (conceptual)
  const suggestions = allProducts.slice(0, 4);

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-40 h-40 bg-slate-50 rounded-[4rem] flex items-center justify-center mb-10 group">
           <ShoppingBag className="w-20 h-20 text-slate-200 group-hover:scale-110 transition-transform duration-500" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 font-display uppercase tracking-tighter mb-4 italic">YOUR BAG IS EMPTY.</h2>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-12">Transmission ID: BAG-NULL / Refill Required</p>
        <Link to="/" className="bg-slate-900 text-white font-black px-12 py-5 rounded-2xl shadow-2xl shadow-slate-200 uppercase text-xs tracking-widest hover:-translate-y-1 active:scale-95 transition-all">
          Browse Active Goods
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-16">
         <div className="flex items-center gap-4 mb-4">
            <ShoppingBag className="w-8 h-8 text-blue-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Acquisition Manifest</span>
         </div>
         <h1 className="text-6xl font-black text-slate-900 font-display uppercase tracking-tighter italic leading-none">MY BAG<span className="text-blue-600">.</span></h1>
         <p className="text-sm font-bold text-slate-500 mt-4">{itemsCount} Units identified for extraction.</p>
      </header>

      <div className="grid lg:grid-cols-12 gap-16 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-8">
           <AnimatePresence mode="popLayout">
              {cart.map((item) => (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2.5rem] p-8 shadow-[0px_20px_50px_rgba(0,0,0,0.03)] border border-slate-50 flex flex-col md:flex-row gap-8 group relative overflow-hidden"
                >
                   {/* Background element */}
                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                   {/* Image */}
                   <Link to={`/product/${item.productId}`} className="w-full md:w-48 h-48 bg-slate-50 rounded-3xl overflow-hidden p-6 shrink-0 border border-slate-50 group-hover:bg-white transition-colors flex items-center justify-center">
                      <img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-110" />
                   </Link>

                   {/* Info */}
                   <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                         <Link to={`/product/${item.productId}`}>
                            <h3 className="text-2xl font-black text-slate-900 font-display leading-tight tracking-tight uppercase group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
                         </Link>
                         <button 
                            onClick={() => removeFromCart(item.id)}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                         >
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </div>

                      <div className="flex items-center gap-6 mb-8">
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-200" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.selectedColor || 'STANDARD'}</span>
                         </div>
                         <div className="w-px h-3 bg-slate-100" />
                         <div className="flex items-center gap-2">
                            <Maximize2 className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.selectedSize || 'OS'}</span>
                         </div>
                         <div className="w-px h-3 bg-slate-100" />
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">NEW CONDITION</span>
                         </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between">
                         <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                         </div>

                         <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Unit Valuation</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter">${(item.price * item.quantity).toFixed(2)}</p>
                         </div>
                      </div>
                   </div>

                   {/* Save for later / Wishlist */}
                   <button className="absolute bottom-8 right-8 md:relative md:bottom-0 md:right-0 mt-6 md:mt-0 flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-blue-600 transition-colors">
                      <Bookmark className="w-4 h-4" /> Save for later
                   </button>
                </motion.div>
              ))}
           </AnimatePresence>

           <div className="flex justify-between items-center pt-8 border-t border-slate-100">
              <Link to="/" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all flex items-center gap-3 group">
                 <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Continue Acquisition
              </Link>
           </div>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
           <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl shadow-slate-950/20 text-white relative overflow-hidden">
              {/* Highlight blur */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-600/10 rounded-full blur-3xl opacity-30" />

              <h3 className="text-2xl font-black italic font-display uppercase tracking-tight mb-8">SUMMARY.</h3>

              <div className="space-y-6 mb-10">
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sub-Valuation</span>
                    <span className="font-extrabold text-slate-300">${cartTotal.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lebanon Logistics</span>
                       <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">PROXIMITY PROTOCOL</span>
                    </div>
                    <span className="font-extrabold text-emerald-500">+${deliveryFee.toFixed(2)}</span>
                 </div>
                 <div className="pt-8 border-t border-slate-800">
                    <div className="flex justify-between items-baseline mb-1">
                       <span className="text-4xl font-black italic font-display tracking-tighter">TOTAL.</span>
                       <span className="text-4xl font-black italic font-display tracking-tighter text-blue-500">${(cartTotal + deliveryFee).toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] font-medium text-slate-500 text-right">VAT & COMMISSIONS INCLUDED</p>
                 </div>
              </div>

              <div className="space-y-4 mb-10">
                 <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <Truck className="w-5 h-5 text-blue-500" />
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">Transit Time</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">24-48H Across Lebanon</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">Secure Check</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verified Multi-Vendor Gear</p>
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2rem] shadow-xl shadow-blue-900/40 transition-all transform hover:-translate-y-1 active:scale-95 text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3"
              >
                 GO TO SECURE CHECKOUT <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center mt-6 text-[8px] font-black text-slate-600 uppercase tracking-widest">Encrypted Transmission / Secure Settlement</p>
           </div>

           {/* Promo / Trust */}
           <div className="mt-8 p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 flex items-center gap-6 group cursor-pointer hover:bg-white transition-all">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                 <Gem className="w-6 h-6" />
              </div>
              <div className="flex-1">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">AI SAVER REBATE</p>
                 <p className="text-xs font-bold text-slate-900">Add $12 more to unlock Free Logic-based Shipping!</p>
              </div>
           </div>
        </div>
      </div>

      {/* Suggested add-ons */}
      <section className="mt-32">
         <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
               <Info className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tight">AI Suggested Pairings</h3>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Frequently acquired together with your items.</p>
            </div>
         </div>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {suggestions.map(p => <ProductCard key={p.id} product={p} />)}
         </div>
      </section>
    </main>
  );
};
