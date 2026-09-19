import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Package, ShoppingCart, TrendingUp, Users, AlertTriangle, Loader2, DollarSign, Database, Store, ArrowLeft } from 'lucide-react';
import { collection, onSnapshot, DocumentData, QuerySnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { ProductType } from '../../data/products';
import { useAuth } from '../../contexts/AuthContext';
import { commissionRateOf, orderItemSplit } from '../../utils/commission';

interface Order extends DocumentData {
  id: string;
  customerName?: string;
  total?: number;
  finalTotal?: number;
  vendorAmount?: number;
  status?: string;
  createdAt: string;
  items?: { productId?: string | number; productName?: string; vendorId?: string | null }[];
}

export const AdminOverview = () => {
  const { user, isAdmin, isSuperAdmin, vendorId, vendorProfile } = useAuth();
  const isAdminView = isAdmin || isSuperAdmin;

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalVendors: 0,
    totalOrders: 0,
    totalRevenue: 0,
    loading: true
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  // Orders in view (all for an admin, their own for a vendor) and store rates,
  // kept so the commission line under Total Revenue can be worked out from them.
  const [scopedOrders, setScopedOrders] = useState<Order[]>([]);
  const [vendorRates, setVendorRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vendors'), (snap) => {
      const rates: Record<string, number> = {};
      snap.docs.forEach(d => { rates[d.id] = commissionRateOf(d.data()); });
      setVendorRates(rates);
    }, (err) => console.error('Vendor rates error:', err));
    return () => unsub();
  }, []);

  // Admins see what Trendit earned; a vendor sees what they receive after commission.
  const commissionLine = useMemo(() => {
    let commission = 0;
    let vendorReceives = 0;
    for (const order of scopedOrders) {
      for (const item of ((order as unknown as { items?: any[] }).items || [])) {
        if (!item.vendorId) continue;
        if (!isAdminView && item.vendorId !== vendorId) continue;
        const split = orderItemSplit(item, vendorRates[item.vendorId] ?? 0);
        commission += split.commission;
        vendorReceives += split.vendorAmount;
      }
    }
    return { commission, vendorReceives };
  }, [scopedOrders, vendorRates, isAdminView, vendorId]);
  const [chartData, setChartData] = useState<{name: string, revenue: number, expenses: number}[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [lowStockProduct, setLowStockProduct] = useState<ProductType | null>(null);
  const [topProduct, setTopProduct] = useState<{ id: string | number; name: string; count: number } | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  const computeOrderInsights = (orders: Order[], scopeVendorId?: string) => {
    const counts = new Map<string, { id: string | number; name: string; count: number }>();
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (scopeVendorId && item.vendorId !== scopeVendorId) return;
        if (!item.productId || !item.productName) return;
        const key = item.productId.toString();
        const existing = counts.get(key);
        counts.set(key, { id: item.productId as string | number, name: item.productName, count: (existing?.count || 0) + 1 });
      });
    });
    let best: { id: string | number; name: string; count: number } | null = null;
    counts.forEach((entry) => {
      if (!best || entry.count > best.count) best = entry;
    });
    setTopProduct(best);

    const pending = orders.filter(o => o.status === 'pending' || o.status === 'new').length;
    setPendingOrdersCount(pending);
  };

  const handleExportReport = () => {
    if (recentOrders.length === 0) {
      toast.error('No orders to export.');
      return;
    }
    const header = ['Order ID', 'Customer', 'Amount', 'Status', 'Date'];
    const rows = recentOrders.map(o => [
      o.id,
      o.customerName || 'Guest',
      ((o.vendorAmount ?? o.total) || 0).toFixed(2),
      o.status || 'pending',
      o.createdAt || '',
    ]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trendit-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFeatureProduct = async (productId: string | number) => {
    try {
      await updateDoc(doc(db, 'products', productId.toString()), { featured: true });
      toast.success('Product marked as featured!');
    } catch (err) {
      console.error('Failed to feature product:', err);
      toast.error('Failed to update product.');
    }
  };

  const [activities, setActivities] = useState<{
    time: string;
    user: string;
    action: string;
    item: string;
    icon: React.ElementType;
    color: string;
    bg: string;
  }[]>([]);

  useEffect(() => {
    let unsubUsers: (() => void) | null = null;
    let unsubProducts: (() => void) | null = null;
    let unsubVendors: (() => void) | null = null;
    let unsubOrders: (() => void) | null = null;

    // Any refused or failed query must end the loading state, or the cards
    // show a spinner forever with nothing to explain why.
    const stopLoading = (what: string) => (error: Error) => {
      console.error(`Dashboard: could not load ${what}:`, error);
      setStats(prev => ({ ...prev, loading: false }));
    };

    const setupListeners = () => {
      // Scope queries based on role — vendors see only their own data
      if (!isAdminView && vendorId) {
        // VENDOR-SPECIFIC DATA (using vendorId from AuthContext)
        const currentVendorId = vendorId;

        // Scoped products
        const pq = query(collection(db, 'products'), where('vendorId', '==', currentVendorId));
        unsubProducts = onSnapshot(pq, (snap: QuerySnapshot) => {
          setStats(prev => ({ ...prev, totalProducts: snap.size }));

          // Low stock alerts
          const lowStockProducts = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ProductType))
            .filter(p => p.stock !== undefined && p.stock < 10);
          setLowStockProduct(lowStockProducts[0] || null);

          const lowStock = lowStockProducts
            .slice(0, 2)
            .map(p => ({
              time: 'Stock Alert',
              user: 'System',
              action: 'low stock alert',
              item: p.title,
              icon: Package,
              color: 'text-amber-500',
              bg: 'bg-amber-100'
            }));

          setActivities(prev => {
            const filtered = prev.filter(a => a.action !== 'low stock alert');
            return [...filtered, ...lowStock].slice(0, 6);
          });
        }, stopLoading('vendor products'));

        // The vendor's own copies of their orders. The site-wide orders list is
        // admin-only, and reading it from here was refused — with no error
        // handler, so the dashboard spun forever.
        const oq = collection(db, 'vendors', currentVendorId, 'orders');
        unsubOrders = onSnapshot(oq, (snap: QuerySnapshot) => {
          const orders = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Order))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Unique customers who bought from this store.
          const customers = new Set<string>();
          orders.forEach(o => {
            const customerId = (o as any).customerId;
            if (customerId && customerId !== 'guest') customers.add(customerId);
          });
          setStats(prev => ({ ...prev, totalUsers: customers.size }));

          // Compute vendor-specific revenue by summing item.subtotal for items matching vendorId
          const revenue = orders.reduce((acc, ord) => {
            const items = (ord as any).items || [];
            const vendorShare = items
              .filter((it: any) => it.vendorId === currentVendorId)
              .reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
            return acc + vendorShare;
          }, 0);

          setStats(prev => ({ ...prev, totalOrders: snap.size, totalRevenue: revenue, loading: false }));
          setScopedOrders(orders);

          const sortedOrders = [...orders].slice(0, 5);
          const vendorOrders = sortedOrders.map((order) => {
            const items = (order as any).items || [];
            const vendorShare = items
              .filter((it: any) => it.vendorId === currentVendorId)
              .reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
            return { ...order, vendorAmount: vendorShare };
          });
          setRecentOrders(vendorOrders as Order[]);
          computeOrderInsights(orders, currentVendorId);

          const orderActivities = vendorOrders.slice(0, 3).map(o => ({
            time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: o.customerName || 'Guest User',
            action: 'placed order',
            item: `$${(o.vendorAmount || 0).toFixed(2)}`,
            icon: ShoppingCart,
            color: 'text-blue-500',
            bg: 'bg-blue-100'
          }));

          setActivities(prev => {
            const filtered = prev.filter(a => a.action !== 'placed order');
            return [...orderActivities, ...filtered].slice(0, 6);
          });

          // Chart data (last 7 days) based on vendor revenue and allocated delivery expenses
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return { name: days[d.getDay()], revenue: 0, expenses: 0 };
          }).reverse();

          orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const dayName = days[orderDate.getDay()];
            const day = last7Days.find(d => d.name === dayName);
            if (day) {
              const items = (order as any).items || [];
              const orderItemsTotal = items.reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
              const vendorShare = items
                .filter((it: any) => it.vendorId === currentVendorId)
                .reduce((s: number, it: any) => s + (it.subtotal || 0), 0);
              day.revenue += vendorShare;

              // Allocate delivery fee proportionally to vendor's share of the order
              const deliveryFee = Number((order as any).deliveryFee || 0);
              if (orderItemsTotal > 0 && vendorShare > 0) {
                day.expenses += deliveryFee * (vendorShare / orderItemsTotal);
              }
            }
          });
          setChartData(last7Days);
        }, stopLoading('vendor orders'));

        // vendors count for vendor users is 1 (their store)
        setStats(prev => ({ ...prev, totalVendors: 1 }));
      } else if (!isAdminView && !vendorId) {
        // Vendor without a vendorId (no vendor record yet) — no data available
        setStats(prev => ({ ...prev, loading: false }));
      } else {
        // ADMIN / SUPER ADMIN: global data for all vendors
        unsubUsers = onSnapshot(collection(db, 'users'), (snap: QuerySnapshot) => {
          setStats(prev => ({ ...prev, totalUsers: snap.size }));
        }, stopLoading('users'));

        unsubProducts = onSnapshot(collection(db, 'products'), (snap: QuerySnapshot) => {
          setStats(prev => ({ ...prev, totalProducts: snap.size }));

          const lowStockProducts = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ProductType))
            .filter(p => p.stock !== undefined && p.stock < 10);
          setLowStockProduct(lowStockProducts[0] || null);

          const lowStock = lowStockProducts
            .slice(0, 2)
            .map(p => ({
              time: 'Stock Alert',
              user: 'System',
              action: 'low stock alert',
              item: p.title,
              icon: Package,
              color: 'text-amber-500',
              bg: 'bg-amber-100'
            }));

          setActivities(prev => {
            const filtered = prev.filter(a => a.action !== 'low stock alert');
            return [...filtered, ...lowStock].slice(0, 6);
          });
        }, stopLoading('products'));

        unsubVendors = onSnapshot(collection(db, 'vendors'), (snap: QuerySnapshot) => {
          setStats(prev => ({ ...prev, totalVendors: snap.size }));
        }, stopLoading('vendors'));

        unsubOrders = onSnapshot(collection(db, 'orders'), (snap: QuerySnapshot) => {
          const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
          const revenue = orders.reduce((acc, curr) => acc + (curr.finalTotal || curr.total || 0), 0);
          setStats(prev => ({ ...prev, totalOrders: snap.size, totalRevenue: revenue, loading: false }));
          setScopedOrders(orders);

          const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
          setRecentOrders(sortedOrders);
          computeOrderInsights(orders);

          const orderActivities = sortedOrders.slice(0, 3).map(o => ({
            time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: o.customerName || 'Guest User',
            action: 'placed order',
            item: `$${(o.total || 0).toFixed(2)}`,
            icon: ShoppingCart,
            color: 'text-blue-500',
            bg: 'bg-blue-100'
          }));

          setActivities(prev => {
            const filtered = prev.filter(a => a.action !== 'placed order');
            return [...orderActivities, ...filtered].slice(0, 6);
          });

          // Generate last 7 days chart data for all orders from persisted values
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return { name: days[d.getDay()], revenue: 0, expenses: 0 };
          }).reverse();

          orders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const dayName = days[orderDate.getDay()];
            const day = last7Days.find(d => d.name === dayName);
            if (day) {
              day.revenue += Number(order.finalTotal || order.total || 0);
              day.expenses += Number((order as any).deliveryFee || 0);
            }
          });
          setChartData(last7Days);
        }, stopLoading('orders'));
      }
    };

    setupListeners();

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubProducts) unsubProducts();
      if (unsubVendors) unsubVendors();
      if (unsubOrders) unsubOrders();
    };
  }, [user, isAdminView, vendorId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <a href="/" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight uppercase">{isAdminView ? 'Executive Dashboard' : 'Vendor Dashboard'}</h1>
            <p className="text-slate-500 text-sm mt-1">{isAdminView ? "Here's what's happening with your store today." : 'Your store performance at a glance.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
          {isAdminView && (
            <button onClick={handleExportReport} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95">
              Export Report
            </button>
          )}
        </div>
      </div>

      {/* Vendor without vendor profile — show error */}
      {!isAdminView && !vendorId && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-red-800 mb-2">Vendor Profile Not Found</h2>
          <p className="text-red-700">Your vendor profile could not be found in the system. Please contact an administrator for assistance.</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Products</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats.totalProducts}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
<div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium font-bold">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Live
            </span>
          </div>
        </div>

        {!isAdminView && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">My Store</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {/* The store's real status, not a hard-coded "Active". */}
                {vendorProfile?.status === 'active' ? 'Active'
                  : vendorProfile?.status === 'suspended' ? 'Suspended'
                  : vendorProfile ? 'Pending approval'
                  : <Loader2 className="w-6 h-6 animate-spin text-slate-300" />}
              </h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Store className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium font-bold">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Active
            </span>
          </div>
        </div>
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Orders</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats.totalOrders}
              </h3>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium font-bold">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Real-time
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">{isAdminView ? 'Total Users' : 'My Customers'}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats.totalUsers}
              </h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-medium font-bold">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              {isAdminView ? 'Growth' : 'Unique'}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : `$${stats.totalRevenue.toLocaleString()}`}
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {stats.loading ? (
              <span className="text-slate-400">&nbsp;</span>
            ) : isAdminView ? (
              <span className="text-slate-600">
                Trendit commission{' '}
                <span className="font-bold text-emerald-700">
                  ${commissionLine.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            ) : (
              <span className="text-slate-600">
                You receive{' '}
                <span className="font-bold text-emerald-700">
                  ${commissionLine.vendorReceives.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {' '}after commission
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Revenue & Expenses</h3>
            <button onClick={() => navigate(isAdminView ? '/admin/analytics' : '/admin/orders')} className="text-sm text-blue-600 font-medium hover:underline">View details</button>
          </div>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 500 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Insights Panel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700 shadow-md text-white flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg font-display">Store Insights</h3>
          </div>

          <div className="space-y-4 flex-1">
            <div className="bg-white/10 p-4 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/15 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Low Stock
              </h4>
              {lowStockProduct ? (
                <>
                  <p className="text-slate-300 text-sm leading-relaxed text-balance">
                    "{lowStockProduct.title}" has only {lowStockProduct.stock} left in stock.
                  </p>
                  <button onClick={() => navigate(`/admin/products/${lowStockProduct.id}`)} className="text-xs text-blue-300 font-medium mt-2 hover:underline">Restock now →</button>
                </>
              ) : (
                <p className="text-slate-400 text-sm leading-relaxed">No products are currently low on stock.</p>
              )}
            </div>

            <div className="bg-white/10 p-4 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/15 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Best Seller
              </h4>
              {topProduct ? (
                <>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    "{topProduct.name}" appears in {topProduct.count} recent order{topProduct.count !== 1 ? 's' : ''} — your top performer.
                  </p>
                  <button onClick={() => handleFeatureProduct(topProduct.id)} className="text-xs text-blue-300 font-medium mt-2 hover:underline">Feature on homepage →</button>
                </>
              ) : (
                <p className="text-slate-400 text-sm leading-relaxed">Not enough order data yet to identify a top seller.</p>
              )}
            </div>

            <div className="bg-white/10 p-4 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/15 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                Needs Attention
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                {pendingOrdersCount > 0
                  ? `${pendingOrdersCount} order${pendingOrdersCount !== 1 ? 's' : ''} pending confirmation.`
                  : 'No pending orders right now.'}
              </p>
              {pendingOrdersCount > 0 && (
                <button onClick={() => navigate('/admin/orders')} className="text-xs text-blue-300 font-medium mt-2 hover:underline">Review orders →</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Recent Orders (Pending)</h3>
            <button onClick={() => navigate('/admin/orders')} className="text-sm text-blue-600 font-medium hover:underline">View all</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-6 py-3 font-medium">Order ID</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase truncate max-w-[120px]">{order.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 text-slate-600">{order.customerName || 'Guest'}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">${((order.vendorAmount ?? order.total) || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'confirmed' ? 'bg-blue-50 text-blue-700' :
                        order.status === 'packed' ? 'bg-violet-50 text-violet-700' :
                        order.status === 'shipped' ? 'bg-purple-50 text-purple-700' :
                        order.status === 'cancelled' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {order.status || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium italic">
                      No orders found in database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              Live Activity Feed
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            </h3>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {activities.map((log, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-white ${log.bg} ${log.color} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10`}>
                  <log.icon className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded-lg border border-slate-100 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex justify-between items-start mb-1 text-xs">
                    <span className="font-bold text-slate-900">{log.user}</span>
                    <span className="text-slate-400 font-medium">{log.time}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {log.action} <span className="font-medium text-slate-900">{log.item}</span>
                  </div>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm italic">
                Waiting for live activity...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
