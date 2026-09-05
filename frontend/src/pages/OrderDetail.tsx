import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  Package, CheckCircle2, Truck, Clock, X, MapPin, CreditCard,
  Loader2, ImageOff, ChevronRight, Store, Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';

interface OrderItem {
  productId?: string | number;
  productImage?: string;
  image?: string;
  quantity: number;
  productName?: string;
  title?: string;
  unitPrice?: number;
  price?: number;
  subtotal?: number;
  vendorId?: string | null;
}

interface OrderData {
  orderNumber: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  total: number;
  orderTotal?: number;
  deliveryFee?: number;
  items: OrderItem[];
  deliveryAddress: { address: string; city: string; area?: string; building?: string; floor?: string; zone?: string };
  paymentMethod: string;
  vendorIds?: string[];
}

interface VendorInfo {
  name: string;
  image?: string;
  deliveryDays?: number;
}

const STATUS_FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  shipped:   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: Truck },
  confirmed: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: CheckCircle2 },
  packed:    { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: Package },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: X },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock },
};

const ItemThumb = ({ src }: { src?: string }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 p-1 overflow-hidden shrink-0 flex items-center justify-center">
      {src && !failed
        ? <img src={src} onError={() => setFailed(true)} className="w-full h-full object-contain mix-blend-multiply" alt="" />
        : <ImageOff className="w-5 h-5 text-slate-300" />}
    </div>
  );
};

export const OrderDetail = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [vendors, setVendors] = useState<Record<string, VendorInfo>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!user?.id || !orderId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.id, 'orders', orderId));
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snap.data() as OrderData;
        setOrder(data);

        const vendorIds = [...new Set(
          (data.vendorIds && data.vendorIds.length
            ? data.vendorIds
            : (data.items || []).map(i => i.vendorId).filter(Boolean) as string[])
        )];

        const vendorEntries = await Promise.all(vendorIds.map(async (vid) => {
          const vSnap = await getDoc(doc(db, 'vendors', vid));
          if (!vSnap.exists()) return null;
          const v = vSnap.data() as any;
          return [vid, { name: v.name, image: v.image, deliveryDays: v.deliveryDays }] as [string, VendorInfo];
        }));
        const vendorMap: Record<string, VendorInfo> = {};
        vendorEntries.forEach(entry => { if (entry) vendorMap[entry[0]] = entry[1]; });
        setVendors(vendorMap);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, orderId]);

  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-slate-500">Loading order...</span>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="font-bold text-slate-500 mb-1">Order not found</p>
        <p className="text-sm text-slate-400 mb-6">We couldn't find this order on your account.</p>
        <Link to="/account?tab=orders" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors">
          Back to Orders
        </Link>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;
  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = STATUS_FLOW.indexOf(order.status);

  const itemsByVendor = (order.items || []).reduce((acc, item) => {
    const key = item.vendorId || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  const orderDate = order.createdAt ? new Date(order.createdAt) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <Link to="/account?tab=orders" className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-3">
          Orders <ChevronRight className="w-3 h-3 rotate-180" /> {order.orderNumber}
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900">Order {order.orderNumber}</h1>
            <p className="text-sm text-slate-400 mt-1">
              Placed on {orderDate ? orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-bold capitalize">{order.status}</span>
          </div>
        </div>
      </div>

      {/* Status timeline */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        {isCancelled ? (
          <div className="flex items-center gap-3 text-red-700">
            <X className="w-5 h-5" />
            <span className="font-bold text-sm">This order was cancelled.</span>
          </div>
        ) : (
          <div className="flex items-center">
            {STATUS_FLOW.map((step, idx) => {
              const StepIcon = STATUS_STYLES[step].icon;
              const reached = currentStepIndex >= idx;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-2 min-w-[64px]">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${reached ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-300'}`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider capitalize ${reached ? 'text-slate-700' : 'text-slate-300'}`}>{step}</span>
                  </div>
                  {idx < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${currentStepIndex > idx ? 'bg-blue-600' : 'bg-slate-100'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Delivery estimates per vendor */}
      {!isCancelled && Object.keys(itemsByVendor).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-slate-900 font-display text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Estimated Delivery
          </h2>
          {Object.entries(itemsByVendor).map(([vendorId, items]) => {
            const vendor = vendors[vendorId];
            const days = vendor?.deliveryDays || 3;
            // Once delivered, show the real timestamp of that status change rather than the original estimate
            const estimate = order.status === 'delivered' && order.updatedAt
              ? new Date(order.updatedAt)
              : (orderDate ? new Date(orderDate.getTime() + days * 86400000) : null);
            return (
              <div key={vendorId} className="flex items-center justify-between gap-4 flex-wrap border-t border-slate-50 pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {vendor?.image ? <img src={vendor.image} className="w-full h-full object-cover" alt="" /> : <Store className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{vendor?.name || 'Store'}</p>
                    <p className="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {order.status === 'delivered' ? 'Delivered' : 'Estimated arrival'}
                  </p>
                  <p className="text-sm font-bold text-blue-600">
                    {estimate ? estimate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-bold text-slate-900 font-display text-sm mb-4">Items</h2>
        <div className="space-y-4">
          {(order.items || []).map((item, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <ItemThumb src={item.productImage || item.image} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{item.productName || item.title || 'Product'}</p>
                <p className="text-xs text-slate-400">Qty {item.quantity}</p>
              </div>
              <p className="text-sm font-bold text-slate-700 shrink-0">
                ${((item.subtotal ?? (item.unitPrice ?? item.price ?? 0) * item.quantity)).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery + payment info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 font-display text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Delivery Address
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {order.deliveryAddress?.address}
            {order.deliveryAddress?.building ? `, ${order.deliveryAddress.building}` : ''}
            {order.deliveryAddress?.floor ? `, Floor ${order.deliveryAddress.floor}` : ''}
            <br />
            {order.deliveryAddress?.area ? `${order.deliveryAddress.area}, ` : ''}{order.deliveryAddress?.city}
            {order.deliveryAddress?.zone ? ` (${order.deliveryAddress.zone})` : ''}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-bold text-slate-900 font-display text-sm mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" /> Payment
          </h2>
          <p className="text-sm text-slate-600">{order.paymentMethod}</p>
          <div className="mt-3 pt-3 border-t border-slate-50 space-y-1">
            {typeof order.orderTotal === 'number' && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal</span><span>${order.orderTotal.toFixed(2)}</span>
              </div>
            )}
            {typeof order.deliveryFee === 'number' && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Delivery</span><span>${order.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
              <span>Total</span><span>${order.total?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
