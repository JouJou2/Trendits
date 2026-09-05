import React, { useState, useEffect } from 'react';
import { 
  Clock, Truck, CheckCircle, Search, 
  User, Phone, Mail, MapPin, 
  CreditCard, ShieldCheck, ShoppingBag,
  Check, X, PhoneCall, Package, CreditCard as PaidIcon,
  MessageSquare
} from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query, where, doc, updateDoc, deleteDoc, addDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface OrderItem {
  productName: string;
  productId: string | number;
  productImage?: string;
  sku: string;
  vendor?: string;
  vendorId?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variant: string;
  globalOrderId?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;  // ← ADD THIS
  timestamp: Timestamp;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  globalOrderId?: string;
  deliveryAddress: {
    address: string;
    area: string;
    building: string;
    city: string;
    floor: string;
    zone: string;
  };
  deliveryZone: string;
  paymentMethod: string;
  paymentStatus: string;
  orderTotal: number;
  deliveryFee: number;
  finalTotal: number;
  customerNote: string;
  items: OrderItem[];
  vendorIds?: string[];
}

export const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { user, isAdmin, isSuperAdmin, isVendor, vendorId } = useAuth();
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [vendorLookupDone, setVendorLookupDone] = useState(false);

  useEffect(() => {
    if (vendorId) {
      setCurrentVendorId(vendorId);
      setVendorLookupDone(true);
      return;
    }

    if (!isVendor || isAdmin || isSuperAdmin || !user) {
      setVendorLookupDone(true);
      return;
    }

    const q = query(collection(db, 'vendors'), where('ownerId', '==', user.id), limit(1));
    const unsub = onSnapshot(q, {
      next: (snapshot) => {
        const vendorDoc = snapshot.docs[0];
        setCurrentVendorId(vendorDoc ? vendorDoc.id : null);
        setVendorLookupDone(true);
      },
      error: (error) => {
        console.error('Vendor lookup error:', error);
        setCurrentVendorId(null);
        setVendorLookupDone(true);
      }
    });
    
    return () => unsub();
  }, [isVendor, isAdmin, isSuperAdmin, user, vendorId]);

  useEffect(() => {
    let ordersQuery;

    if (isAdmin || isSuperAdmin) {
      ordersQuery = query(collection(db, 'orders'));
    } else if (isVendor && vendorId) {
      ordersQuery = query(collection(db, 'vendors', vendorId, 'orders'));
    } else {
      setOrders([]);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      ordersQuery,
      (snapshot) => {
        let ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as unknown as Order));

        // For vendors, hide cancelled orders older than 24h (optional - remove if not needed)
        const now = Date.now();
if (!isAdmin && !isSuperAdmin) {
  ordersData = ordersData.filter(o => {
    if (o.status !== 'cancelled') return true;
    const cancelledAt = o.updatedAt || o.createdAt;
    if (!cancelledAt) return false;
    let cancelledTime: number;
    if (typeof cancelledAt === 'string') {
      cancelledTime = new Date(cancelledAt).getTime();
    } else {
      // It's a Firestore Timestamp
      cancelledTime = (cancelledAt as any).toDate?.().getTime() || 0;
    }
    return (now - cancelledTime) < 24 * 60 * 60 * 1000;
  });
}

        ordersData.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error('Orders error:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [vendorId, isVendor, isAdmin, isSuperAdmin]);

  const handleContactCustomer = (phone: string) => {
    if (!phone) {
      toast.error("Error: Patient/Customer contact data missing.");
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const handleCopySummary = (order: Order) => {
    const itemsList = order.items.map(item =>
      `- ${item.quantity}x ${item.productName} (${item.variant || 'Default'})\n  Price: $${(item.unitPrice || 0).toFixed(2)}`
    ).join('\n');

    const summary = `🚀 TRENDIT LEBANON - ORDER SUMMARY
Order #: ${order.orderNumber || order.id.substring(0, 10).toUpperCase()}
-----------------------------------
CUSTOMER DETAILS:
Name: ${order.customerName}
Phone: ${order.customerPhone}
Address: ${typeof order.deliveryAddress === 'string' ? order.deliveryAddress : `${order.deliveryAddress?.address}, ${order.deliveryAddress?.city}`},
Zone: ${order.deliveryZone}

ITEMS:
${itemsList}

-----------------------------------
FINANCIALS:
Subtotal: $${(order.orderTotal || 0).toFixed(2)}
Delivery: $${(order.deliveryFee || 0).toFixed(2)}
TOTAL TO COLLECT: $${(order.finalTotal || 0).toFixed(2)}

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

 const handleStatusUpdate = async (globalId: string, orderNumber: string, newStatus: string, userId?: string, vendorIds?: string[]) => {
  try {
    const updateData = { status: newStatus, updatedAt: new Date().toISOString() };
    
    await updateDoc(doc(db, 'orders', globalId), updateData);
    console.log('✅ global orders updated');
    
    if (userId && userId !== 'guest') {
      await updateDoc(doc(db, 'users', userId, 'orders', orderNumber), updateData)
        .catch(e => console.error('❌ user subcollection failed:', e));
      console.log('✅ user subcollection updated');

      await addDoc(collection(db, 'users', userId, 'notifications'), {
        type: 'order_status',
        orderId: orderNumber,
        orderNumber,
        status: newStatus,
        read: false,
        createdAt: new Date().toISOString(),
      }).catch(e => console.error('Failed to notify customer of order status:', e));
    }

    if (vendorIds && vendorIds.length > 0) {
      for (const vid of vendorIds) {
        if (vid) {
          await updateDoc(doc(db, 'vendors', vid, 'orders', orderNumber), updateData)
            .catch(e => console.error('❌ vendor subcollection failed:', e));
        }
      }
      console.log('✅ vendor subcollections updated');
    }
    
    toast.success(`Order status updated to ${newStatus}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${globalId}`);
  }
};

const handlePaymentUpdate = async (globalId: string, orderNumber: string, newStatus: string, userId?: string, vendorIds?: string[]) => {
  try {
    const updateData = { paymentStatus: newStatus, updatedAt: new Date().toISOString() };
    
    await updateDoc(doc(db, 'orders', globalId), updateData);
    
    if (userId && userId !== 'guest') {
      await updateDoc(doc(db, 'users', userId, 'orders', orderNumber), updateData).catch(() => {});
    }
    
    if (vendorIds && vendorIds.length > 0) {
      for (const vid of vendorIds) {
        if (vid) {
          await updateDoc(doc(db, 'vendors', vid, 'orders', orderNumber), updateData).catch(() => {});
        }
      }
    }
    
    toast.success(`Payment status updated to ${newStatus}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${globalId}`);
  }
};

const handleDeleteOrder = async (globalId: string, orderNumber: string, userId?: string, vendorIds?: string[]) => {
  const confirmMessage = isAdmin || isSuperAdmin
    ? `Permanently delete order ${orderNumber}? This cannot be undone.`
    : `Cancel order ${orderNumber}? The customer will be notified.`;
  if (!window.confirm(confirmMessage)) return;

  try {
    if (isAdmin || isSuperAdmin) {
      await deleteDoc(doc(db, 'orders', globalId));
      
      if (userId && userId !== 'guest') {
        await deleteDoc(doc(db, 'users', userId, 'orders', orderNumber)).catch((e) => {
          console.error('Failed to delete from user subcollection:', e);
        });
      }
      
      if (vendorIds && vendorIds.length > 0) {
        for (const vid of vendorIds) {
          if (vid) {
            await deleteDoc(doc(db, 'vendors', vid, 'orders', orderNumber)).catch((e) => {
              console.error(`Failed to delete from vendor ${vid} subcollection:`, e);
            });
          }
        }
      }
      
      toast.success("Order permanently deleted");
    } else if (vendorId) {
      const updateData = { status: 'cancelled', updatedAt: new Date().toISOString() };
      
      await updateDoc(doc(db, 'vendors', vendorId, 'orders', orderNumber), updateData);
      
      if (globalId) {
        await updateDoc(doc(db, 'orders', globalId), updateData).catch(() => {});
      }
      if (userId && userId !== 'guest') {
        await updateDoc(doc(db, 'users', userId, 'orders', orderNumber), updateData).catch(() => {});
      }
      
      toast.success("Order cancelled");
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${globalId}`);
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
      case 'pending': return 'New / Pending Confirmation';
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
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
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
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            LIVE MONITORING
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'New', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', id: 'pending' },
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
          <option value="pending">New / Pending</option>
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
                    <h2 className="text-xl font-black text-slate-900 italic font-display uppercase tracking-tight">Order {o.orderNumber || o.id.substring(0, 10).toUpperCase()}</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{o.customerName || 'Anonymous Customer'}</p>
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
                            {typeof o.deliveryAddress === 'string' 
                              ? o.deliveryAddress 
                              : `${o.deliveryAddress?.address}${o.deliveryAddress?.building ? ', ' + o.deliveryAddress.building : ''}${o.deliveryAddress?.city ? ', ' + o.deliveryAddress.city : ''}` || 'Address details missing.'
                            }
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
                        <span className="text-emerald-600">${(o.deliveryFee || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-2xl font-black text-slate-900 pt-4 border-t border-slate-200 font-display italic tracking-tight">
                        <span>FINAL</span>
                        <span>${(o.finalTotal || (o as any).total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Note</p>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-xs italic text-slate-600 leading-relaxed">
                        "{o.customerNote || "No special instructions provided."}"
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
                    onClick={() => handleStatusUpdate(o.globalOrderId || o.id, o.orderNumber, 'confirmed', o.userId)}
                    className="flex-1 min-w-[150px] bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-900/40"
                  >
                    <Check className="w-4 h-4" /> Confirm Order
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(o.globalOrderId || o.id, o.orderNumber, 'shipped', o.userId)}
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
                    onClick={() => handlePaymentUpdate(o.globalOrderId || o.id, o.orderNumber, 'paid', o.userId)}
                    className="flex-1 min-w-[150px] bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-900/40"
                  >
                    <PaidIcon className="w-4 h-4" /> Mark as Paid
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(o.globalOrderId || o.id, o.orderNumber, 'packed', o.userId)}
                    className="flex-1 min-w-[150px] bg-violet-600 hover:bg-violet-500 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-violet-900/40"
                  >
                    <Package className="w-4 h-4" /> Mark as Packed
                  </button>
                  <button 
                    onClick={() => handleStatusUpdate(o.globalOrderId || o.id, o.orderNumber  , 'delivered', o.userId)}
                    className="flex-1 min-w-[150px] bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle className="w-4 h-4" /> Mark as Delivered
                  </button>
                  <button 
                    onClick={() => handleDeleteOrder(o.globalOrderId || o.id, o.orderNumber, o.userId, o.vendorIds)}
                    className="flex-1 min-w-[150px] bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 border border-rose-500/30"
                  >
                    <X className="w-4 h-4" /> {isAdmin || isSuperAdmin ? 'Delete Order' : 'Cancel Order'}
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