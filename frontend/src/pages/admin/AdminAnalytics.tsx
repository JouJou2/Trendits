import React, { useState, useEffect } from 'react';
import { BarChart3, Users, MousePointerClick, Calendar, ArrowUpRight, ArrowDownRight, Globe, Smartphone, Monitor, DollarSign, Loader2 } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

export const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [revenueData, setRevenueData] = useState<{name: string, revenue: number, orders: number}[]>([]);

  useEffect(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const orders = snap.docs.map(d => ({ ...d.data() } as any));
      const revenue = orders.reduce((acc, o) => acc + (o.finalTotal || o.total || 0), 0);
      setTotalRevenue(revenue);
      setTotalOrders(orders.length);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { name: days[d.getDay()], revenue: 0, orders: 0 };
      });

      orders.forEach(order => {
        if (!order.createdAt) return;
        const orderDate = new Date(order.createdAt);
        const dayName = days[orderDate.getDay()];
        const day = last7Days.find(d => d.name === dayName);
        if (day) {
          day.revenue += Number(order.finalTotal || order.total || 0);
          day.orders += 1;
        }
      });

      setRevenueData(last7Days);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setTotalUsers(snap.size);
    });

    return () => {
      unsubOrders();
      unsubUsers();
    };
  }, []);

  const deviceData = [
    { name: 'Mobile', value: 65, color: '#3b82f6' },
    { name: 'Desktop', value: 30, color: '#10b981' },
    { name: 'Tablet', value: 5, color: '#8b5cf6' },
  ];

  const sourceData = [
    { name: 'Organic Search', value: 45 },
    { name: 'Direct', value: 25 },
    { name: 'Social Media', value: 20 },
    { name: 'Referral', value: 10 },
  ];

  const stats = [
    { label: 'Total Revenue', value: loading ? '...' : `$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, change: 'Live', isPositive: true, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Users', value: loading ? '...' : totalUsers.toLocaleString(), change: 'Live', isPositive: true, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Orders', value: loading ? '...' : totalOrders.toLocaleString(), change: 'Live', isPositive: true, icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg. Order Value', value: loading ? '...' : `$${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}`, change: 'Live', isPositive: true, icon: MousePointerClick, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Deep Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Explore platform traffic, conversion funnels, and core metrics.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-xs font-medium text-slate-500">
          <Calendar className="w-3.5 h-3.5" /> Last 7 Days
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-lg ${s.bg} ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                <ArrowUpRight className="w-3 h-3" />{s.change}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Revenue & Orders (Last 7 Days)</h3>
              <p className="text-xs text-slate-500">Daily revenue vs order volume.</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600"></div><span className="text-slate-600">Revenue</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-200"></div><span className="text-slate-600">Orders</span></div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#c7d2fe" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Device Breakdown</h3>
            <p className="text-xs text-slate-500">Estimated — connect GA4 for real data.</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deviceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {deviceData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full mt-4 space-y-3">
              {deviceData.map((device, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: device.color }}></div>
                    {device.name}
                  </div>
                  <div className="text-sm font-bold text-slate-900">{device.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Traffic Sources</h3>
            <p className="text-xs text-slate-500">Estimated — connect GA4 for real data.</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value) => `${value}%`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {sourceData.map((_, index) => (<Cell key={index} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][index % 4]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Top Pages</h3>
              <p className="text-xs text-slate-500">Connect GA4 for real data</p>
            </div>
            <Globe className="w-5 h-5 text-slate-300" />
          </div>
          <div className="space-y-4">
            {[
              { path: '/products', views: '—', change: '+0%' },
              { path: '/category/electronics', views: '—', change: '+0%' },
              { path: '/', views: '—', change: '+0%' },
              { path: '/cart', views: '—', change: '+0%' },
              { path: '/account', views: '—', change: '+0%' },
            ].map((page, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">{page.path}</span>
                <span className="text-sm font-bold text-slate-400">GA4 needed</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};