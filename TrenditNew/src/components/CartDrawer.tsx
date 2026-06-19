import React, { useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight, Truck, Info, Bookmark } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const CartDrawer = () => {
  const { cart, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCartOpen(false);
    };
    if (isCartOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isCartOpen]);

  const deliveryFee = cartTotal > 0 ? 4.00 : 0;
  const itemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="relative w-full max-w-md bg-white shadow-[0px_0px_100px_rgba(0,0,0,0.2)] h-full flex flex-col border-l border-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-10 border-b border-slate-50">
              <div className="flex items-center gap-4 text-slate-900">
                <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl shadow-slate-200">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black font-display italic tracking-tight uppercase">MY BAG<span className="text-blue-600">.</span></h2>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    {itemsCount} UNITS PREPARED FOR SHIPPING
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-4 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all active:scale-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-50/30">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                  <div className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center text-slate-100 relative mb-8 shadow-2xl shadow-slate-100">
                    <ShoppingBag className="w-16 h-16" />
                    <div className="absolute top-0 right-0 w-6 h-6 bg-blue-600 rounded-full animate-pulse border-4 border-white"></div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 italic font-display uppercase tracking-tight">EMPTY.</h3>
                    <p className="text-slate-400 mt-4 font-bold uppercase text-[10px] tracking-widest leading-relaxed">Your curation has not yet been initialized.</p>
                  </div>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="mt-12 px-12 py-5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-95"
                  >
                    Explore Curations
                  </button>
                </div>
              ) : (
                <div className="space-y-10">
                  {cart.map((item) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={item.id} 
                      className="flex gap-6 group relative"
                    >
                      {/* Image */}
                      <Link to={`/product/${item.productId}`} onClick={() => setIsCartOpen(false)} className="w-24 h-24 bg-white rounded-3xl overflow-hidden shrink-0 border border-slate-100 p-3 shadow-xl shadow-slate-100 group-hover:scale-105 transition-transform duration-500">
                        <img src={item.image || 'https://placehold.co/600x600?text=No+Image'} alt={item.title} className="w-full h-full object-contain mix-blend-multiply" />
                      </Link>

                      {/* Details */}
                      <div className="flex-1 flex flex-col py-1">
                        <div className="flex justify-between items-start mb-2">
                          <Link to={`/product/${item.productId}`} onClick={() => setIsCartOpen(false)}>
                            <h4 className="font-black text-slate-900 text-sm line-clamp-1 hover:text-blue-600 transition-colors uppercase tracking-tight font-display">{item.title}</h4>
                          </Link>
                        </div>

                        <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                          {item.selectedColor && <span>{item.selectedColor}</span>}
                          {item.selectedSize && <span> / {item.selectedSize}</span>}
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-slate-900">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-blue-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-slate-900 tracking-tighter">${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Remove */}
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white text-slate-300 hover:text-red-500 hover:scale-110 shadow-lg rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}

                  {/* Promo Banner in Drawer */}
                  <div className="p-6 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                     <h5 className="text-[10px] font-black uppercase tracking-widest mb-1">PROXIMITY UNLOCK</h5>
                     <p className="text-xs font-bold leading-snug">Add $25.00 more to unlock Priority Express Lebanese Dispatch.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Summary */}
            {cart.length > 0 && (
              <div className="border-t border-slate-100 p-10 bg-white space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span>Market Valuation</span>
                    <span className="text-slate-900">${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span>Lebanon Logistics</span>
                    <span className="text-emerald-500 font-extrabold">+${deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-4xl font-black text-slate-900 pt-6 border-t border-slate-100 italic font-display tracking-tighter uppercase leading-none">
                    <span>TOTAL.</span>
                    <span className="text-blue-600">${(cartTotal + deliveryFee).toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => {
                        setIsCartOpen(false);
                        navigate('/cart');
                     }}
                     className="bg-slate-50 hover:bg-slate-100 text-slate-900 font-black text-[10px] uppercase tracking-widest py-6 rounded-[2rem] transition-all flex justify-center items-center gap-3 active:scale-[0.98] border border-slate-100 mb-2"
                   >
                     Bag View
                   </button>
                   <button 
                    onClick={() => {
                      setIsCartOpen(false);
                      navigate('/checkout');
                    }}
                    className="bg-slate-900 hover:bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest py-6 rounded-[2rem] shadow-[0px_20px_40px_rgba(0,0,0,0.2)] transition-all flex justify-center items-center gap-3 active:scale-[0.98] mb-2"
                   >
                    Checkout <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-slate-300">
                   <Truck className="w-5 h-5" />
                   <Info className="w-5 h-5" />
                   <Bookmark className="w-5 h-5" />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
