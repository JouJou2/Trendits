import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, Package, ShoppingCart, TrendingUp, Users, AlertTriangle, Loader2, DollarSign, Database, Store, ArrowLeft, Bell } from 'lucide-react';
import { collection, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { seedDatabase } from '../../services/dataSeeder';
import { toast } from 'react-hot-toast';
import { ProductType } from '../../data/products';

interface Order extends DocumentData {
  id: string;
  customerName?: string;
  total?: number;
  finalTotal?: number;
  status?: string;
  createdAt: string;
}

export const AdminOverview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalVendors: 0,
    totalOrders: 0,
    totalRevenue: 0,
    loading: true
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<{name: string, revenue: number, expenses: number}[]>([]);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    const result = await seedDatabase();
    setSeeding(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
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
    // We could do something more advanced like cloud functions for counts
    // but for now we observe collections for real-time counts on the dashboard
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap: QuerySnapshot) => {
      setStats(prev => ({ ...prev, totalUsers: snap.size }));
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap: QuerySnapshot) => {
      setStats(prev => ({ ...prev, totalProducts: snap.size }));
      
      // Update low stock alerts in activity
      const lowStock = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ProductType))
        .filter(p => p.stock !== undefined && p.stock < 10)
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
    });

    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snap: QuerySnapshot) => {
      setStats(prev => ({ ...prev, totalVendors: snap.size }));
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap: QuerySnapshot) => {
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      const revenue = orders.reduce((acc, curr) => {
        // Handle both old 'total' and new 'finalTotal' fields
        return acc + (curr.finalTotal || curr.total || 0);
      }, 0);
      
      setStats(prev => ({ 
        ...prev, 
        totalOrders: snap.size, 
        totalRevenue: revenue,
        loading: false 
      }));
      
      // Get recent orders for the table
      const sortedOrders = [...orders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      setRecentOrders(sortedOrders);

      // Add recent orders to activity feed
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

      // Generate last 7 days chart data
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return { 
          name: days[d.getDay()], 
          revenue: 0, 
          expenses: Math.floor(Math.random() * 500) // Dummy expenses since we don't track them 
        };
      }).reverse();

      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const dayName = days[orderDate.getDay()];
        const day = last7Days.find(d => d.name === dayName);
        if (day) {
          day.revenue += (order.total || 0);
        }
      });
      setChartData(last7Days);
    });

    return () => {
      unsubUsers();
      unsubProducts();
      unsubVendors();
      unsubOrders();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <a href="/" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95 shadow-sm group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight uppercase">Executive Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Here's what's happening with your store today.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(stats.totalProducts === 0 || stats.totalVendors === 0) && !stats.loading && (
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Set Up Demo Data
            </button>
          )}
          <select className="bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95">
            Export Report
          </button>
        </div>
      </div>

      {/* NEW ORDER ALERTS */}
      {recentOrders.some(o => o.status === 'pending') && (
        <div className="bg-blue-600 rounded-xl p-4 sm:p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
             <Bell className="w-8 h-8 animate-ring" />
          </div>
          <div className="flex-1 text-center md:text-left">
             <h3 className="text-xl font-black uppercase tracking-tight italic">New Orders Pending!</h3>
             <p className="text-blue-100 font-medium text-sm">There are {recentOrders.filter(o => o.status === 'pending').length} new orders requiring immediate confirmation and logistics dispatch.</p>
          </div>
          <div className="flex gap-3 shrink-0">
             <button onClick={() => toast.success('Dispatch module opening...')} className="px-6 py-2.5 bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-blue-50 transition-colors">Route Orders</button>
             <button onClick={() => toast.success('Logs filtered.')} className="px-6 py-2.5 bg-white/10 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-white/20 transition-colors">Dismiss</button>
          </div>
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

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Vendors</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {stats.loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-300" /> : stats.totalVendors}
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
              <p className="text-slate-500 text-sm font-medium">Total Users</p>
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
              Growth
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
            <span className="flex items-center text-emerald-600 font-medium font-bold">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              Live
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Revenue & Expenses</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">View details</button>
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

        {/* AI Insights Panel */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700 shadow-md text-white flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg font-display">Trendit AI Insights</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="bg-white/10 p-4 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/15 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Sales Alert
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed text-balance">
                Sales dropped 12% today due to low stock in Electronics (specifically smartphones).
              </p>
              <button className="text-xs text-blue-300 font-medium mt-2 hover:underline">Restock now →</button>
            </div>

            <div className="bg-white/10 p-4 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/15 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Trending Product
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                "Ultra Wireless Headphones" visits are up 300%. Consider boosting this product to Homepage.
              </p>
              <button className="text-xs text-blue-300 font-medium mt-2 hover:underline">Apply Boost →</button>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg border border-white/5 backdrop-blur-sm relative overflow-hidden group hover:bg-white/15 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
              <h4 className="font-medium text-sm flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                Customer Segments
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                We detected 45 abandoned carts in the last hour. Auto-recovery email sequence initialized.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Recent Orders (Pending)</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">View all</button>
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
                    <td className="px-6 py-4 font-medium text-slate-900">${(order.total || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'processing' ? 'bg-blue-50 text-blue-700' :
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
