import React, { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft, 
  CreditCard, 
  Truck, 
  MapPin, 
  User, 
  ArrowRight, 
  ShieldCheck,
  CheckCircle2, 
  Package,
  ShoppingBag,
  History,
  Phone,
  Building,
  Home,
  MessageCircleQuestion,
  Search,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

enum CheckoutStep {
  ADDRESS = 1,
  DELIVERY = 2,
  PAYMENT = 3,
  REVIEW = 4,
  CONFIRMATION = 5
}

export const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(CheckoutStep.ADDRESS);
  const [orderId, setOrderId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    area: '',
    building: '',
    floor: '',
    zone: 'Beirut',
    deliveryMethod: 'Standard',
    paymentMethod: 'Cash on Delivery',
    note: ''
  });

  const deliveryFee = formData.deliveryMethod === 'Express' ? 8.00 : 4.00;
  const finalTotal = cartTotal + deliveryFee;

  const nextStep = () => setCurrentStep(prev => (prev + 1) as CheckoutStep);
  const prevStep = () => setCurrentStep(prev => (prev - 1) as CheckoutStep);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    const newOrderId = `TRND-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      orderNumber: newOrderId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
      customerName: formData.name,
      customerPhone: formData.phone,
      customerEmail: formData.email,
      deliveryAddress: {
        address: formData.address,
        city: formData.city,
        area: formData.area,
        building: formData.building,
        floor: formData.floor,
        zone: formData.zone
      },
      deliveryMethod: formData.deliveryMethod,
      paymentMethod: formData.paymentMethod,
      paymentStatus: 'unpaid',
      subtotal: cartTotal,
      deliveryFee: deliveryFee,
      total: finalTotal,
      customerNote: formData.note,
      userId: user?.id || 'guest',
      items: cart.map(item => ({
        productName: item.title,
        productId: item.productId,
        productImage: item.image,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
        variant: `${item.selectedColor || 'N/A'} / ${item.selectedSize || 'N/A'}`
      }))
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setOrderId(newOrderId);
      setCurrentStep(CheckoutStep.CONFIRMATION);
      clearCart();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
      toast.error('Transaction failed. Contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0 && currentStep !== CheckoutStep.CONFIRMATION) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8">
           <ShoppingBag className="w-16 h-16 text-slate-200" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 font-display uppercase tracking-tighter mb-2">Cart is vacant.</h2>
        <p className="text-slate-500 font-medium mb-8 max-w-sm">You haven't added any premium items to your collection yet.</p>
        <Link to="/" className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl shadow-2xl shadow-slate-200 uppercase text-[10px] tracking-widest active:scale-95 transition-all">
          Explore Arrivals
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pt-12 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentStep !== CheckoutStep.CONFIRMATION && (
          <header className="mb-12 text-center">
             <Link to="/" className="inline-block mb-8">
                <h2 className="text-2xl font-black italic tracking-tighter">TRENDIT<span className="text-blue-600">.</span>OS</h2>
             </Link>
             <h1 className="text-5xl font-black text-slate-900 font-display uppercase tracking-tighter mb-4 italic">Secure. Checkout.</h1>
             <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Logistics Protocol / Verified Transaction</p>
          </header>
        )}

        {currentStep !== CheckoutStep.CONFIRMATION && <StepIndicator currentStep={currentStep} />}

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {/* STEP 1: ADDRESS */}
              {currentStep === CheckoutStep.ADDRESS && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-100 border border-slate-50">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                           <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Delivery Infrastructure</h3>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Where should we route your package?</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Full Legal Name</label>
                           <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <input 
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="Receiver Name"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-sm"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Reliable Contact</label>
                           <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <input 
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                placeholder="+961 XX XXX XXX"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-sm"
                              />
                           </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Street & Landmark</label>
                           <div className="relative">
                              <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <input 
                                type="text"
                                required
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                                placeholder="e.g. Bliss Street, Near AUB Main Gate"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-sm"
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">City / District</label>
                           <input 
                              type="text"
                              required
                              value={formData.city}
                              onChange={e => setFormData({...formData, city: e.target.value})}
                              placeholder="e.g. Beirut"
                              className="w-full px-6 py-4 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-sm"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Building & Floor</label>
                           <div className="relative">
                              <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                              <input 
                                type="text"
                                required
                                value={formData.building}
                                onChange={e => setFormData({...formData, building: e.target.value})}
                                placeholder="Block A, 4th Floor"
                                className="w-full pl-12 pr-4 py-4 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold text-sm"
                              />
                           </div>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex justify-between items-center px-4">
                     <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Cancel Routine
                     </Link>
                     <button 
                        onClick={nextStep}
                        disabled={!formData.name || !formData.phone || !formData.address}
                        className="bg-slate-900 text-white font-black px-12 py-5 rounded-[2rem] shadow-2xl shadow-slate-300 uppercase text-xs tracking-widest hover:-translate-y-1 transition-all disabled:opacity-30 disabled:translate-y-0"
                     >
                        Confirm Logistics <ArrowRight className="w-4 h-4 ml-2 inline" />
                     </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: DELIVERY */}
              {currentStep === CheckoutStep.DELIVERY && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-100 border border-slate-50">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-amber-200">
                           <Truck className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Delivery Method</h3>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Select your haste.</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        {[
                          { id: 'Standard', label: 'Lebanon Protocol (Standard)', time: '2-4 Business Days', price: 4.00, desc: 'Eco-conscious delivery by local specialists.' },
                          { id: 'Express', label: 'Beirut Prime (Express)', time: '24 Hours (Beirut Only)', price: 8.00, desc: 'Priority routing for urgent acquisitions.' }
                        ].map(method => (
                          <button
                            key={method.id}
                            onClick={() => setFormData({...formData, deliveryMethod: method.id})}
                            className={`w-full p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 text-left group ${formData.deliveryMethod === method.id ? 'border-amber-500 bg-amber-50/50' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'}`}
                          >
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${formData.deliveryMethod === method.id ? 'bg-amber-500 text-white shadow-xl shadow-amber-200' : 'bg-white text-slate-300 border border-slate-100'}`}>
                                <Package className="w-7 h-7" />
                             </div>
                             <div className="flex-1">
                                <p className="font-extrabold text-slate-900 uppercase tracking-tight leading-none mb-1">{method.label}</p>
                                <p className="text-xs text-slate-500 font-medium mb-2">{method.desc}</p>
                                <div className="flex items-center gap-2">
                                   <Clock className="w-3 h-3 text-slate-400" />
                                   <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{method.time}</span>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-xl font-black text-slate-900">${method.price.toFixed(2)}</p>
                             </div>
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="flex justify-between items-center px-4">
                     <button onClick={prevStep} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Logistics Adjust
                     </button>
                     <button 
                        onClick={nextStep}
                        className="bg-slate-900 text-white font-black px-12 py-5 rounded-[2rem] shadow-2xl shadow-slate-300 uppercase text-xs tracking-widest hover:-translate-y-1 transition-all"
                     >
                        Confirm Haste <ArrowRight className="w-4 h-4 ml-2 inline" />
                     </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PAYMENT */}
              {currentStep === CheckoutStep.PAYMENT && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-100 border border-slate-50">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                           <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Financial Interface</h3>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">How do you wish to settle?</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        {[
                          { id: 'Cash on Delivery', label: 'Cash On Delivery', desc: 'Settle in USD or LBP at your doorstep.', icon: Package },
                          { id: 'Online Card', label: 'Secure Card Payment', desc: 'Visa / Mastercard via encrypted gateway.', icon: CreditCard, disabled: true },
                          { id: 'V-Wallet', label: 'Trendit Wallet', desc: 'Zero-fee instant settlement.', icon: ShoppingBag, disabled: true }
                        ].map(method => (
                          <button
                            key={method.id}
                            disabled={method.disabled}
                            onClick={() => setFormData({...formData, paymentMethod: method.id})}
                            className={`w-full p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 text-left relative ${formData.paymentMethod === method.id ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'} ${method.disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                          >
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${formData.paymentMethod === method.id ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-white text-slate-300 border border-slate-100'}`}>
                                <method.icon className="w-7 h-7" />
                             </div>
                             <div className="flex-1">
                                <p className="font-extrabold text-slate-900 uppercase tracking-tight leading-none mb-1">{method.label}</p>
                                <p className="text-xs text-slate-500 font-medium">{method.desc}</p>
                             </div>
                             {method.disabled && (
                               <span className="bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest absolute top-6 right-8">Coming Soon</span>
                             )}
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="flex justify-between items-center px-4">
                     <button onClick={prevStep} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Duty Protocol
                     </button>
                     <button 
                        onClick={nextStep}
                        className="bg-slate-900 text-white font-black px-12 py-5 rounded-[2rem] shadow-2xl shadow-slate-300 uppercase text-xs tracking-widest hover:-translate-y-1 transition-all"
                     >
                        Confirm Fund <ArrowRight className="w-4 h-4 ml-2 inline" />
                     </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: REVIEW */}
              {currentStep === CheckoutStep.REVIEW && (
                <motion.div 
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-100 border border-slate-50">
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-200">
                           <Search className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Final Assessment</h3>
                           <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Verify the manifestation.</p>
                        </div>
                     </div>

                     <div className="grid md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ship To</h5>
                              <p className="font-extrabold text-slate-900 leading-tight mb-1">{formData.name}</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed">{formData.address}, {formData.building}, {formData.city}</p>
                              <p className="text-xs text-slate-500 font-bold mt-2">{formData.phone}</p>
                              <button onClick={() => setCurrentStep(CheckoutStep.ADDRESS)} className="absolute top-6 right-6 text-blue-600 hover:scale-110 transition-transform"><User className="w-4 h-4" /></button>
                           </div>

                           <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Methods</h5>
                              <div className="flex items-center gap-3 mb-2">
                                 <Truck className="w-4 h-4 text-amber-500" />
                                 <span className="text-xs font-bold text-slate-700">{formData.deliveryMethod} Protocol</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <CreditCard className="w-4 h-4 text-emerald-600" />
                                 <span className="text-xs font-bold text-slate-700">{formData.paymentMethod}</span>
                              </div>
                              <button onClick={() => setCurrentStep(CheckoutStep.DELIVERY)} className="absolute top-6 right-6 text-blue-600 hover:scale-110 transition-transform"><Truck className="w-4 h-4" /></button>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Selected Goods</h5>
                           <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-3">
                              {cart.map(item => (
                                <div key={item.id} className="flex gap-4 p-3 bg-white border border-slate-100 rounded-2xl items-center">
                                   <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 p-1">
                                      <img src={item.image} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                                   </div>
                                   <div className="flex-1 overflow-hidden">
                                      <p className="text-xs font-black text-slate-900 truncate">{item.title}</p>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty: {item.quantity} · LZ: {item.selectedSize || 'Standard'}</p>
                                   </div>
                                   <p className="text-xs font-black text-slate-900">${(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>
                   </div>

                   <div className="flex justify-between items-center px-4">
                     <button onClick={prevStep} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Adjust Fund
                     </button>
                     <button 
                        disabled={loading}
                        onClick={handlePlaceOrder}
                        className="bg-blue-600 text-white font-black px-16 py-6 rounded-[2rem] shadow-2xl shadow-blue-200 uppercase text-xs tracking-widest hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50"
                     >
                        {loading ? 'Processing...' : 'Authorize Transaction'} <CheckCircle2 className="w-4 h-4 ml-2 inline" />
                     </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: CONFIRMATION */}
              {currentStep === CheckoutStep.CONFIRMATION && (
                <motion.div 
                  key="step5"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="lg:col-span-12"
                >
                   <div className="bg-white rounded-[4rem] p-16 shadow-[0px_40px_100px_rgba(0,0,0,0.08)] border border-slate-50 text-center max-w-4xl mx-auto relative overflow-hidden">
                     {/* Confetti Placeholder / Visuals */}
                     <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-emerald-500 to-indigo-600" />
                     <div className="absolute top-10 left-10 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl" />
                     <div className="absolute bottom-10 right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />

                     <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-emerald-600 mx-auto mb-10 shadow-xl shadow-emerald-50">
                        <CheckCircle2 className="w-12 h-12" />
                     </div>
                     <h2 className="text-6xl font-black text-slate-900 font-display uppercase tracking-tight italic mb-4 leading-none">ORDER. SEALED.</h2>
                     <p className="text-xl font-bold text-slate-500 mb-2">Ref: <span className="text-slate-900">#{orderId}</span></p>
                     <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-12">Transmission Successful / Acquisition Initializing</p>

                     <div className="grid md:grid-cols-3 gap-8 mb-16 px-10">
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] flex flex-col items-center gap-4">
                           <Clock className="w-6 h-6 text-blue-600" />
                           <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmed</h5>
                              <p className="text-xs font-bold text-slate-900">System validated order at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                           </div>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] flex flex-col items-center gap-4">
                           <Truck className="w-6 h-6 text-amber-500" />
                           <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Transit</h5>
                              <p className="text-xs font-bold text-slate-900">Estimated delivery in {formData.deliveryMethod === 'Express' ? '24 Hours' : '3 Days'}</p>
                           </div>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[2.5rem] flex flex-col items-center gap-4">
                           <History className="w-6 h-6 text-emerald-600" />
                           <div>
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Updates</h5>
                              <p className="text-xs font-bold text-slate-900">Track status in your executive profile.</p>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                        <Link 
                          to="/account" 
                          className="w-full sm:w-auto bg-slate-900 text-white font-black px-12 py-5 rounded-2xl shadow-2xl shadow-slate-200 uppercase text-xs tracking-widest hover:-translate-y-1 transition-all"
                        >
                           Track Order Arrival
                        </Link>
                        <Link 
                          to="/" 
                          className="w-full sm:w-auto bg-white border-2 border-slate-100 text-slate-900 font-black px-12 py-5 rounded-2xl uppercase text-xs tracking-widest hover:border-blue-600 transition-all font-display"
                        >
                           Back to Marketplace
                        </Link>
                     </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Summary */}
          {currentStep !== CheckoutStep.CONFIRMATION && (
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-slate-100 border border-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/5 rounded-[3rem] blur-2xl" />
                
                <h3 className="text-xl font-black text-slate-900 mb-8 font-display italic uppercase tracking-tight">Financial Summary</h3>
                
                <div className="space-y-6 mb-8">
                   <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                      <span>Valuation</span>
                      <span className="text-slate-900">${cartTotal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                      <span>Logistics</span>
                      <span className="text-emerald-600 font-extrabold">+${deliveryFee.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                      <span className="text-3xl font-black italic font-display text-slate-900 tracking-tighter">TOTAL.</span>
                      <span className="text-3xl font-black italic font-display text-blue-600 tracking-tighter">${finalTotal.toFixed(2)}</span>
                   </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl space-y-4 mb-2">
                   <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified Acquisition
                   </div>
                   <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <History className="w-4 h-4 text-blue-500" /> Priority Routing
                   </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 border-2 border-slate-50 rounded-3xl mt-6">
                   <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center">
                      <MessageCircleQuestion className="w-5 h-5 text-white" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">Need Assistance?</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Chat with an executive.</p>
                   </div>
                </div>
              </div>

               {/* Secure Badges */}
               <div className="mt-8 flex justify-center items-center gap-8 opacity-40">
                  <Package className="w-6 h-6" />
                  <ShieldCheck className="w-6 h-6" />
                  <Truck className="w-6 h-6" />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="max-w-2xl mx-auto mb-16">
    <div className="flex justify-between items-center relative">
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex flex-col items-center gap-2 bg-white px-2">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-500 ${currentStep >= step ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 ring-4 ring-white' : 'bg-slate-100 text-slate-400'}`}>
            {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentStep >= step ? 'text-slate-900' : 'text-slate-300'}`}>
             {step === 1 ? 'Address' : step === 2 ? 'Duty' : step === 3 ? 'Payment' : 'Review'}
          </span>
        </div>
      ))}
    </div>
  </div>
);
