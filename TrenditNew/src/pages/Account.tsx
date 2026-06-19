import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Package, 
  Heart, 
  Settings, 
  User, 
  ShoppingCart, 
  Trash2, 
  ChevronRight, 
  Truck, 
  Clock, 
  CheckCircle2, 
  CreditCard,
  Box,
  MapPin,
  HelpCircle,
  Bell,
  Check,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface OrderItem {
  productImage: string;
  quantity: number;
  title: string;
  price: number;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: Timestamp;
  status: string;
  total: number;
  items: OrderItem[];
  deliveryAddress: {
    address: string;
    city: string;
  };
  paymentMethod: string;
}

export const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { wishlist } = useWishlist();
  const { cartCount, setIsCartOpen } = useCart();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab) return location.state.tab;
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'overview';
  });

  // Profile Form States
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Toggle States (Mock notifications made interactive)
  const [notifyProtocol, setNotifyProtocol] = useState(true);
  const [notifyArrivals, setNotifyArrivals] = useState(true);

  // Support Request States
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportStatus, setSupportStatus] = useState('');

  // Delete Confirmation States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    let targetTab = 'overview';
    if (location.state?.tab) {
      targetTab = location.state.tab;
    } else {
      const params = new URLSearchParams(location.search);
      const tabParam = params.get('tab');
      if (tabParam) {
        targetTab = tabParam;
      }
    }

    if (activeTab !== targetTab) {
      const timer = setTimeout(() => {
        setActiveTab(targetTab);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location, activeTab]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Error reading orders:", error);
      setLoadingOrders(false);
    });

    return () => unsub();
  }, [user]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const latestOrder = orders[0];

  // Handle saving the user profile name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setSaveStatus({ type: 'error', message: 'Display name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { name: displayName.trim() });
      setSaveStatus({ type: 'success', message: 'Your settings have been saved successfully!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 5000);
    } catch (err) {
      console.error('Error saving user profile name:', err);
      setSaveStatus({ type: 'error', message: 'Failed to update preferences. Please explore later.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle mock support ticket submission
  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;

    setSupportSending(true);
    setTimeout(() => {
      setSupportSending(false);
      setSupportStatus('Your support inquiry has been sent! Our representative will email you within 2-4 hours.');
      setSupportMessage('');
      setTimeout(() => {
        setSupportStatus('');
        setIsSupportOpen(false);
      }, 6000);
    }, 1200);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 mb-20">
      {/* Header Segment */}
      <header className="mb-10 border-b border-slate-100 pb-8">
         <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-primary">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-primary tracking-wider uppercase">User Portal</span>
         </div>
         <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
           Account Dashboard
         </h1>
         <div className="flex items-center gap-2 mt-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-sm font-medium text-slate-500">
              Authenticated session: <span className="font-semibold text-slate-800">{user.name}</span> ({user.role})
            </p>
         </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 shrink-0">
           <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="flex flex-col items-center text-center mb-6 border-b border-slate-50 pb-5">
                 <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-blue-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute right-0 bottom-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                 </div>
                 <h2 className="text-base font-bold text-slate-800 tracking-tight mt-3 mb-0.5">{user.name}</h2>
                 <span className="text-xs text-slate-400 font-medium">Registered account holder</span>
              </div>

              <nav className="space-y-1">
                 {[
                   { id: 'overview', icon: Box, label: 'Overview' },
                   { id: 'orders', icon: Package, label: 'My Orders' },
                   { id: 'wishlist', icon: Heart, label: 'Wishlist Collection' },
                   { id: 'settings', icon: Settings, label: 'Account Settings' },
                 ].map(tab => {
                   const isActive = activeTab === tab.id;
                   return (
                     <button 
                       key={tab.id}
                       onClick={() => {
                         if (tab.id === 'wishlist') {
                           navigate('/favorites');
                         } else {
                           setActiveTab(tab.id);
                         }
                       }}
                       className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-semibold text-xs tracking-wider uppercase ${
                         isActive 
                           ? 'bg-slate-900 text-white shadow-sm' 
                           : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                       }`}
                     >
                       <div className="flex items-center gap-2.5">
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                       </div>
                       <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
                     </button>
                   );
                 })}
                 
                 <button 
                   onClick={logout}
                   className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50/50 transition-all text-xs font-bold uppercase tracking-wider mt-4 border border-dashed border-red-200/50"
                 >
                    <LogOut className="w-4 h-4" /> Sign Out of Account
                 </button>
              </nav>
           </div>
        </aside>

        {/* Main Interface Area */}
        <div className="flex-1 w-full max-w-4xl">
           <AnimatePresence mode="wait">
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <motion.div 
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                   {/* Live Tracking Card */}
                   {latestOrder ? (
                     <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="flex justify-between items-center mb-6">
                           <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Tracker</h3>
                           <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-primary rounded-full text-[10px] font-bold tracking-wider uppercase font-mono">
                             <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                             ORDER STATUS
                           </span>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 relative z-10 border-b border-slate-50 pb-4">
                           <div>
                              <h4 className="text-lg font-bold text-slate-800 tracking-tight leading-none mb-1">
                                Order #{latestOrder.orderNumber}
                              </h4>
                              <p className="text-xs text-slate-400 font-medium">
                                Placed on {latestOrder.createdAt && 'toDate' in latestOrder.createdAt ? latestOrder.createdAt.toDate().toLocaleDateString() : 'N/A'}
                              </p>
                           </div>
                           <div className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-sm">
                              {latestOrder.status}
                           </div>
                        </div>

                        <OrderTimeline status={latestOrder.status} />

                        <div className="grid md:grid-cols-2 gap-4 border-t border-slate-50 pt-5 relative z-10">
                           <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl">
                              <MapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                              <div>
                                 <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1">Delivery Address</h5>
                                 <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                   {latestOrder.deliveryAddress?.address}, {latestOrder.deliveryAddress?.city}
                                 </p>
                              </div>
                           </div>
                           <div className="flex justify-between items-start p-3.5 bg-slate-50 rounded-xl">
                              <div className="flex items-start gap-3">
                                 <CreditCard className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                                 <div>
                                    <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1">Payment Method</h5>
                                    <p className="text-xs text-slate-500 font-medium">{latestOrder.paymentMethod}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                                 <p className="text-sm font-bold text-primary font-mono">${latestOrder.total?.toFixed(2)}</p>
                              </div>
                           </div>
                        </div>
                     </section>
                   ) : (
                     <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center py-8">
                       <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                       <p className="text-sm text-slate-500 font-medium">No recent orders found. Discover products below to get started.</p>
                       <Link to="/" className="text-xs text-primary font-bold hover:underline uppercase tracking-wider mt-3 inline-block">Explore Shop Catalog</Link>
                     </div>
                   )}

                   {/* Stats Grid */}
                   <section className="grid sm:grid-cols-3 gap-4">
                       <div key="stat-orders" onClick={() => setActiveTab('orders')} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-slate-200 hover:shadow-md transition-all">
                          <div className="w-10 h-10 bg-blue-50 text-primary rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                             <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-0.5">{orders.length}</h4>
                            <p className="text-xs text-slate-400 font-medium">Orders Placed</p>
                          </div>
                       </div>
                       <div key="stat-wishlist" onClick={() => navigate('/favorites')} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-slate-200 hover:shadow-md transition-all">
                          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                             <Heart className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-0.5">{wishlist.length}</h4>
                            <p className="text-xs text-slate-400 font-medium">Saved Collection</p>
                          </div>
                       </div>
                       <div key="stat-cart" onClick={() => setIsCartOpen(true)} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-slate-200 hover:shadow-md transition-all">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                             <ShoppingCart className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-0.5">{cartCount}</h4>
                            <p className="text-xs text-slate-400 font-medium">Items in Bag</p>
                          </div>
                       </div>
                    </section>

                   {/* Recommended / Help Area */}
                   <section className="bg-slate-900 rounded-2xl p-8 sm:p-10 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/25 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-10">
                         <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                            <HelpCircle className="w-8 h-8 text-blue-200" />
                         </div>
                         <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold text-white mb-2">Need assistance with your delivery?</h3>
                            <p className="text-slate-300 text-sm font-medium mb-6">Our dedicated support representatives are ready to resolve any logistic or checkout inquiry immediately.</p>
                            
                            {!isSupportOpen ? (
                              <button 
                                onClick={() => setIsSupportOpen(true)}
                                className="bg-white text-slate-900 font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-100 transition-all shadow-md"
                              >
                                Contact Care Team
                              </button>
                            ) : (
                              <form onSubmit={handleSendSupport} className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl max-w-lg space-y-3 text-left">
                                <label className="block text-xs font-semibold text-slate-300">Message to Team</label>
                                <textarea
                                  value={supportMessage}
                                  onChange={(e) => setSupportMessage(e.target.value)}
                                  placeholder="Type your inquiry or issue here..."
                                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-white focus:outline-none focus:border-white placeholder:text-slate-500 h-20 resize-none transition-all"
                                  required
                                ></textarea>
                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    disabled={supportSending}
                                    className="bg-primary text-white font-bold px-4 py-2.5 rounded-lg text-xs hover:bg-primary-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {supportSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Send Message
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSupportOpen(false);
                                      setSupportMessage('');
                                    }}
                                    className="bg-slate-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs hover:bg-slate-600 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                {supportStatus && (
                                  <p className="text-xs font-semibold text-emerald-400 mt-2 bg-emerald-900/20 px-3 py-1.5 rounded-md border border-emerald-800/30">
                                    {supportStatus}
                                  </p>
                                )}
                              </form>
                            )}
                         </div>
                      </div>
                   </section>
                </motion.div>
              )}

              {/* ORDERS TAB */}
              {activeTab === 'orders' && (
                <motion.div 
                   key="orders"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                >
                   <div className="flex items-center justify-between pl-1">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-950 tracking-tight">Purchase History</h2>
                        <p className="text-xs text-slate-400 font-medium">Verify tracking details and log files</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{orders.length} orders found</span>
                   </div>

                   <div className="space-y-4">
                      {loadingOrders ? (
                        <div className="p-12 text-center text-slate-400 font-semibold text-sm animate-pulse flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          Retrieving order transcripts...
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center shadow-sm">
                           <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                           <p className="text-sm font-semibold text-slate-500">You haven't placed any orders yet.</p>
                           <Link to="/" className="text-primary text-xs font-bold uppercase tracking-wider mt-4 inline-block hover:underline">Explore Products</Link>
                        </div>
                      ) : orders.map(order => (
                        <div key={order.id} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm hover:border-slate-200 transition-all">
                           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-50 pb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                    <Package className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <h4 className="text-base font-bold text-slate-800 tracking-tight">#{order.orderNumber}</h4>
                                    <p className="text-xs text-slate-400 font-semibold">
                                      Placed {order.createdAt && 'toDate' in order.createdAt ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                 <div className="text-left sm:text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Grand Total</p>
                                    <p className="text-sm font-bold text-slate-800 font-mono">${order.total?.toFixed(2)}</p>
                                 </div>
                                 <div className={`px-3 py-1 bg-slate-50 border rounded-lg text-xs font-bold uppercase tracking-wider ${
                                   order.status === 'delivered' 
                                     ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                     : 'bg-blue-50 border-blue-100 text-primary'
                                 }`}>
                                    {order.status}
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                              {order.items?.map((item, idx) => (
                                <div key={idx} className="aspect-square bg-slate-50 rounded-xl p-1.5 border border-slate-100 relative group/item overflow-hidden" title={item.title}>
                                   <img src={item.productImage} className="w-full h-full object-contain mix-blend-multiply" alt={item.title} />
                                   <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white p-1 text-center font-bold">
                                      <span>Qty: {item.quantity}</span>
                                      <span className="text-[8px] font-medium tracking-tight truncate w-full mt-0.5">${item.price}</span>
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}



              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <motion.div 
                   key="settings"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                >
                   <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-1">Account settings</h3>
                      <p className="text-xs text-slate-400 font-medium mb-6">Manage your contact credentials and protocols</p>
                      
                      <form onSubmit={handleSaveProfile} className="space-y-5 max-w-md">
                         <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 pl-1">Display Name</label>
                            <div className="relative">
                              <input 
                                type="text" 
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white outline-none transition-all font-semibold text-sm text-slate-800"
                                required
                              />
                            </div>
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 pl-1">Email Address</label>
                            <input 
                              type="email" 
                              value={user.email} 
                              disabled
                              className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-100 outline-none text-slate-400 font-medium text-sm cursor-not-allowed"
                            />
                            <p className="text-[10px] text-slate-400 italic pl-1">Primary authentication email is read-only.</p>
                         </div>

                         {/* Notification Settings with State Toggles */}
                         <div className="space-y-2 border-t border-slate-100 pt-5">
                            <label className="text-xs font-semibold text-slate-600 pl-1">Email Preference Controls</label>
                            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                               <div className="flex items-center justify-between">
                                  <div className="pr-4">
                                    <span className="text-xs font-semibold text-slate-800 block">Transaction reports</span>
                                    <span className="text-[10px] text-slate-400 block font-normal">Immediate alert receipts on successful checkout.</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setNotifyProtocol(!notifyProtocol)}
                                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-250 ${notifyProtocol ? 'bg-primary' : 'bg-slate-300'}`}
                                  >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-250 ${notifyProtocol ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                               </div>
                               <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-xs font-semibold text-slate-800 block">Logistics Updates</span>
                                    <span className="text-[10px] text-slate-400 block font-normal">Regular notifications on in-transit milestones.</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setNotifyArrivals(!notifyArrivals)}
                                    className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-250 ${notifyArrivals ? 'bg-primary' : 'bg-slate-300'}`}
                                  >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-250 ${notifyArrivals ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </button>
                               </div>
                            </div>
                         </div>

                         {/* Save Success Banner */}
                         {saveStatus.type && (
                           <div className={`p-4 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                             saveStatus.type === 'success' 
                               ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' 
                               : 'bg-red-50 border border-red-100 text-red-800'
                           }`}>
                             {saveStatus.type === 'success' ? (
                               <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                             ) : (
                               <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                             )}
                             <div>{saveStatus.message}</div>
                           </div>
                         )}

                         <button 
                           type="submit"
                           disabled={isSaving}
                           className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-3 rounded-lg text-xs uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 max-w-xs"
                         >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Configuration
                         </button>
                      </form>
                   </div>

                   {/* Danger Zone Container */}
                   <section className="bg-red-50/50 rounded-2xl p-5 border border-red-100">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                         <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm shrink-0 border border-red-50">
                            <Trash2 className="w-6 h-6" />
                         </div>
                         <div className="flex-1">
                            <h4 className="text-base font-bold text-red-700 tracking-tight mb-0.5">Danger zone</h4>
                            <p className="text-xs text-red-500 font-medium"> Erase all logs and close this user account permanently.</p>
                         </div>
                         
                         {!showDeleteConfirm ? (
                           <button 
                             onClick={() => setShowDeleteConfirm(true)}
                             className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors whitespace-nowrap"
                           >
                              Delete Account
                           </button>
                         ) : (
                           <div className="bg-white p-4 rounded-xl border border-red-100 space-y-3 w-full sm:max-w-md">
                             <p className="text-xs font-semibold text-slate-800">
                               To permanently delete your account, type <span className="font-mono text-red-600 underline">delete permanent</span>:
                             </p>
                             <input
                               type="text"
                               value={deleteConfirmText}
                               onChange={(e) => setDeleteConfirmText(e.target.value)}
                               placeholder="Type the confirmation phrase..."
                               className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-red-500 font-semibold"
                             />
                             <div className="flex gap-2">
                               <button
                                 onClick={() => {
                                   if (deleteConfirmText === 'delete permanent') {
                                     alert('Account deleted process initiated.');
                                     logout();
                                   } else {
                                     alert('Confirmation text did not match.');
                                   }
                                 }}
                                 disabled={deleteConfirmText !== 'delete permanent'}
                                 className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex-1 disabled:opacity-50"
                               >
                                 Confirm Delete
                               </button>
                               <button
                                 onClick={() => {
                                   setShowDeleteConfirm(false);
                                   setDeleteConfirmText('');
                                 }}
                                 className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-lg text-xs flex-1"
                               >
                                 Cancel
                               </button>
                             </div>
                           </div>
                         )}
                      </div>
                   </section>
                </motion.div>
              )}
           </AnimatePresence>

           {/* Floating Notifications Mock */}
           <div className="fixed bottom-8 right-8 hidden xl:flex flex-col gap-4 z-50">
              <div className="bg-white rounded-xl p-4 shadow-xl border border-slate-100 max-w-[260px] flex items-center gap-3 animate-pulse">
                 <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                    <Bell className="w-5 h-5" />
                 </div>
                 <div>
                    <h6 className="text-[10px] font-bold text-slate-800 uppercase tracking-tight">Status alert</h6>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Your latest tracking details are available in the Overview channel.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </main>
  );
};

const OrderTimeline = ({ status }: { status: string }) => {
  const steps = [
    { id: 'pending', label: 'Processing', icon: Clock, color: 'text-amber-500' },
    { id: 'confirmed', label: 'Confirmed', icon: CheckCircle2, color: 'text-blue-500' },
    { id: 'shipping', label: 'In Transit', icon: Truck, color: 'text-purple-500' },
    { id: 'delivered', label: 'Delivered', icon: Package, color: 'text-emerald-500' },
  ];

  const currentIdx = steps.findIndex(s => s.id === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;

  return (
    <div className="relative flex justify-between items-center mb-10 max-w-xl mx-auto px-1">
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 -z-10" />
      {steps.map((step, idx) => {
        const isCompleted = idx <= activeIdx;
        return (
          <div key={idx} className="flex flex-col items-center gap-2 bg-white px-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 ${
              isCompleted 
                ? 'bg-slate-900 text-white shadow' 
                : 'bg-slate-50 text-slate-300 border border-slate-100'
            }`}>
              <step.icon className="w-4 h-4" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isCompleted ? 'text-slate-900 font-semibold' : 'text-slate-400 font-normal'
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
