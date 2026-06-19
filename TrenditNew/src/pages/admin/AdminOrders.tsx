import React, { useState, useEffect } from 'react';
import { 
  Clock, Truck, CheckCircle, Search, 
  User, Phone, Mail, MapPin, 
  CreditCard, ShieldCheck, ShoppingBag,
  Check, X, UserPlus, PhoneCall, Package, CreditCard as PaidIcon,
  MessageSquare
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { seedOrders } from '../../services/dataSeeder';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

interface OrderItem {
  productName: string;
  productId: string | number;
  productImage?: string;
  sku: string;
  vendor: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variant: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  timestamp: Timestamp;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  deliveryZone: string;
  paymentMethod: string;
  paymentStatus: string;
  orderTotal: number;
  deliveryFee: number;
  finalTotal: number;
  customerNote: string;
  items: OrderItem[];
}

export const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as Order));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSeedOrders = async () => {
    setSeeding(true);
    const result = await seedOrders();
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
    setSeeding(false);
  };

  const handleAssignVendor = (orderId: string) => {
    toast.success(`Logistics: Vendor matching initiated for order ${orderId.substring(0, 8)}. Dispatching request.`);
  };

  const handleContactCustomer = (phone: string) => {
    if (!phone) {
      toast.error("Error: Patient/Customer contact data missing.");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleCopySummary = (order: Order) => {
    const itemsList = order.items.map(item => 
      `- ${item.quantity}x ${item.productName} (${item.variant || 'Default'})\n  Price: $${item.unitPrice.toFixed(2)}`
    ).join('\n');

    const summary = `🚀 TRENDIT LEBANON - ORDER SUMMARY
Order #: ${order.orderNumber || order.id.substring(0, 10).toUpperCase()}
-----------------------------------
CUSTOMER DETAILS:
Name: ${order.customerName}
Phone: ${order.customerPhone}
Address: ${order.deliveryAddress}
Zone: ${order.deliveryZone}

ITEMS:
${itemsList}

-----------------------------------
FINANCIALS:
Subtotal: $${order.orderTotal.toFixed(2)}
Delivery: $${order.deliveryFee.toFixed(2)}
TOTAL TO COLLECT: $${order.finalTotal.toFixed(2)}

Payment: ${order.paymentMethod} (${order.paymentStatus})
Note: ${order.customerNote || 'No special instructions.'}
-----------------------------------
Generated on: ${new Date().toLocaleString()}
`;

    navigator.clipboard.writeText(summary).then(() => {
      toast.success("Order summary copied to clipboard! 📋");
    }).catch(err => {
      console.error('Copy failed:', err);
      toast.error("Failed to copy summary.");
    });
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handlePaymentUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel and delete this order?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success("Order deleted successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const filteredOrders = orders.filter(o => {
    const searchStr = `${o.orderNumber} ${o.customerName} ${o.customerEmail}`.toLowerCase();
    const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: string) => {
    return orders.filter(o => o.status === status.toLowerCase()).length;
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'new': return 'New / Pending Confirmation';
      case 'confirmed': return 'Confirmed / Processing';
      case 'packed': return 'Packed / Ready for Pickup';
      case 'shipped': return 'Shipped / In Transit';
      case 'delivered': return 'Delivered / Completed';
      case 'cancelled': return 'Cancelled / Voided';
      default: return status;
    }
  };

  const getStatusStyles = (status: string) => {
    switch(status) {
      case 'new': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'packed': return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'shipped': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Syncing with logistics server...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-display italic uppercase tracking-tight">Orders Center.</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, fulfill and track incoming store requests.</p>
        </div>
        <div className="flex items-center gap-3">
          {orders.length === 0 && (
            <button 
              onClick={handleSeedOrders}
              disabled={seeding}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {seeding ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  SEEDING...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  SEED MOCK ORDERS
                </>
              )}
            </button>
          )}
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            LIVE MONITORING
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'New', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', id: 'new' },
          { label: 'Confirmed', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50', id: 'confirmed' },
          { label: 'Shipped', icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50', id: 'shipped' },
          { label: 'Delivered', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', id: 'delivered' }
        ].map(stat => (
          <button 
            key={stat.label} 
            onClick={() => setStatusFilter(stat.id)}
            className={`bg-white p-5 rounded-2xl border transition-all hover:shadow-lg text-left group overflow-hidden relative ${statusFilter === stat.id ? 'ring-2 ring-blue-500 border-transparent' : 'border-slate-100'}`}
          >
            <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform relative z-10`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-black text-slate-900 relative z-10">{getStatusCount(stat.id)}</p>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest relative z-10">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID, customer or email..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-white transition-all w-full sm:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="new">New / Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((o) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={o.id} 
              className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${getStatusStyles(o.status)} border`}>
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 italic font-display uppercase tracking-tight">New Order Received.</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Notification Title</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getStatusStyles(o.status)}`}>
                    Status: {getStatusLabel(o.status)}
                  </span>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Column 1: Order Meta */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Specs</p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</p>
                          <p className="text-sm font-black text-slate-900 uppercase font-mono">{o.orderNumber || o.id.substring(0, 10).toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Time</p>
                          <p className="text-sm font-bold text-slate-700">
                            {o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB', { 
                              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            }).replace(',', ' —') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Info</p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</p>
                          <p className="text-sm font-bold text-slate-700">{o.paymentMethod || 'Cash on Delivery'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <PaidIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Status</p>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                            o.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {o.paymentStatus || 'Unpaid'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Customer details */}
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Details</p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Name</p>
                          <p className="text-sm font-bold text-slate-900">{o.customerName || 'Anonymous Customer'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Phone</p>
                          <p className="text-sm font-bold text-slate-700">{o.customerPhone || 'Not Provided'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Email</p>
                          <p className="text-sm font-bold text-slate-700">{o.customerEmail || 'No Email'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Delivery Address</p>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Zone</p>
                          <p className="text-sm font-black text-emerald-600 uppercase tracking-tight">{o.deliveryZone || 'Standard Zone'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Address</p>
                          <p className="text-xs font-medium text-slate-600 leading-relaxed max-w-[200px]">
                            {o.deliveryAddress || 'Address details missing.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Totals & Items summary */}
                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Financial Summary</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Order Total</span>
                        <span className="text-slate-900">${(o.orderTotal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Delivery Fee</span>
                        <span className="text-gerald-600">${(o.deliveryFee || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-2xl font-black text-slate-900 pt-4 border-t border-slate-200 font-display italic tracking-tight">
                        <span>FINAL.</span>
                        <span>${(o.finalTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Note</p>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs italic text-slate-600 leading-relaxed">
                        “{o.customerNote || "No special instructions provided."}”
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="px-8 pb-8">
                <div className="bg-slate-100/50 rounded-2xl overflow-hidden border border-slate-100">
                  <div className="px-6 py-4 bg-slate-200/50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Ordered Items Section</h3>
                    <span className="bg-white text-slate-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                      {o.items?.length || 0} Units
                    </span>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {o.items?.map((item, idx) => {
                      const variantParts = (item.variant || '').split(' / ');
                      const color = variantParts[0] !== 'N/A' ? variantParts[0] : null;
                      const size = variantParts[1] !== 'N/A' ? variantParts[1] : null;
                      
                      return (
                        <div key={idx} className="p-6 grid grid-cols-1 md:grid-cols-6 gap-6 hover:bg-white transition-colors">
                          <div className="md:col-span-1">
                            <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                              {item.productImage ? (
                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-contain p-2 mix-blend-multiply" />
                              ) : (
                                <Package className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                          </div>
                          
                          <div className="md:col-span-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Information</p>
                            <p className="text-sm font-bold text-slate-900 line-clamp-1">{item.productName}</p>
                            <div className="flex gap-4 mt-2">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU</p>
                                <p className="text-[10px] font-bold text-slate-700 uppercase font-mono">{item.sku || `PRD-${item.productId}`}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor</p>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.vendor || 'Trendit Lebanon'}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="md:col-span-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attributes</p>
                            <div className="space-y-3 mt-1">
                              {color && (
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: color.toLowerCase().replace(' ', '') }}></div>
                                  <p className="text-xs font-bold text-slate-800">{color}</p>
                                </div>
                              )}
                              {size && (
                                <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-tighter">
                                  Size: {size}
                                </div>
                              )}
                              {!color && !size && (
                                <p className="text-xs font-medium text-slate-400 mt-1 italic">Default</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</p>
                              <p className="text-sm font-black text-slate-900">{item.quantity}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unit</p>
                              <p className="text-sm font-black text-slate-900">${(item.unitPrice || 0).toFixed(2)}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal</p>
                            <p className="text-lg font-black text-slate-900">${(item.subtotal || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="px-8 py-8 bg-slate-900 border-t border-slate-800">
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => handleStatusUpdate(o.id, 'confirmed')}
                    className="flex-1 min-w-[150px] bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-900/40"
                  >
                    <Check className="w-4 h-4" /> Confirm Order
                  </button>
                  <button 
                    onClick={() => handleAssignVendor(o.id)}
                    className="flex-1 min-w-[150px] bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-700"
                  >
                    <UserPlus className="w-4 h-4" /> Assign Vendor
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(o.id, 'shipped')}
                    className="flex-1 min-w-[150px] bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-700"
                  >
                    <Truck className="w-4 h-4" /> Assign Delivery
                  </button>
                  <button 
                    onClick={() => handleContactCustomer(o.customerPhone)}
                    className="flex-1 min-w-[150px] bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-700"
                  >
                    <PhoneCall className="w-4 h-4" /> Contact Customer
                  </button>
                  <button 
                    onClick={() => handleCopySummary(o)}
                    className="flex-1 min-w-[150px] bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border border-slate-700"
                  >
                    <MessageSquare className="w-4 h-4" /> Copy Summary
                  </button>
                  <button 
                    onClick={() => handlePaymentUpdate(o.id, 'paid')}
                    className="flex-1 min-w-[150px] bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-900/40"
                  >
                    <PaidIcon className="w-4 h-4" /> Mark as Paid
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(o.id, 'packed')}
                    className="flex-1 min-w-[150px] bg-violet-600 hover:bg-violet-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-violet-900/40"
                  >
                    <Package className="w-4 h-4" /> Mark as Packed
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(o.id, 'delivered')}
                    className="flex-1 min-w-[150px] bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark as Delivered
                  </button>
                  <button 
                    onClick={() => handleDeleteOrder(o.id)}
                    className="flex-1 min-w-[150px] bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border border-rose-500/30"
                  >
                    <X className="w-4 h-4" /> Cancel Order
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 italic font-display uppercase tracking-tight">Empty Terminal.</h2>
            <p className="text-slate-400 font-medium max-w-[300px] mx-auto">No orders match your current monitoring parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
