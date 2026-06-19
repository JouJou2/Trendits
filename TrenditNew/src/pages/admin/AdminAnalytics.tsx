import React, { useState } from 'react';
import { BarChart3, Users, MousePointerClick, Calendar, ArrowUpRight, ArrowDownRight, Globe, Smartphone, Monitor, DollarSign } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

export const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState('7d');

  const stats = [
    { label: 'Total Revenue', value: '$24,592.00', change: '+12.5%', isPositive: true, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Unique Visitors', value: '14,291', change: '+5.2%', isPositive: true, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Conversion Rate', value: '3.8%', change: '-0.4%', isPositive: false, icon: MousePointerClick, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Bounce Rate', value: '42.1%', change: '-2.1%', isPositive: true, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  const revenueData = [
    { name: 'Mon', revenue: 4200, visitors: 2400 },
    { name: 'Tue', revenue: 3800, visitors: 2100 },
    { name: 'Wed', revenue: 5100, visitors: 2900 },
    { name: 'Thu', revenue: 4800, visitors: 2600 },
    { name: 'Fri', revenue: 6200, visitors: 3400 },
    { name: 'Sat', revenue: 7500, visitors: 4200 },
    { name: 'Sun', revenue: 6800, visitors: 3800 },
  ];

  const deviceData = [
    { name: 'Mobile', value: 65, color: '#3b82f6', icon: Smartphone },
    { name: 'Desktop', value: 30, color: '#10b981', icon: Monitor },
    { name: 'Tablet', value: 5, color: '#8b5cf6', icon: Smartphone },
  ];

  const sourceData = [
    { name: 'Organic Search', value: 45 },
    { name: 'Direct', value: 25 },
    { name: 'Social Media', value: 20 },
    { name: 'Referral', value: 10 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Deep Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Explore platform traffic, conversion funnels, and core metrics.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
          {['24h', '7d', '30d', '12m'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === range 
                  ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {range}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <button className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Custom
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-lg ${s.bg} ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                s.isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {s.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {s.change}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue & Visitors Line Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Traffic & Revenue Offset</h3>
              <p className="text-xs text-slate-500">Correlating daily visitors to gross revenue volume.</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-200"></div>
                <span className="text-slate-600">Visitors</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="visitors" stroke="#c7d2fe" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
           <div className="mb-6">
              <h3 className="font-bold text-slate-900">Device Breakdown</h3>
              <p className="text-xs text-slate-500">Sessions by device category.</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value}%`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
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

        {/* Traffic Sources Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="font-bold text-slate-900">Traffic Sources</h3>
            <p className="text-xs text-slate-500">Where your visitors are coming from.</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => `${value}%`}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-Time Map Placeholder / Top Pages */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Top Pages</h3>
              <p className="text-xs text-slate-500">Most viewed routes</p>
            </div>
            <Globe className="w-5 h-5 text-slate-300" />
          </div>
          <div className="space-y-4">
            {[
              { path: '/products/sony-wh-1000xm5', views: '12.4k', change: '+14%' },
              { path: '/category/electronics', views: '8.2k', change: '+5%' },
              { path: '/', views: '7.1k', change: '-2%' },
              { path: '/products/nike-air-max', views: '4.5k', change: '+22%' },
              { path: '/cart', views: '3.8k', change: '+1%' }
            ].map((page, idx) => (
              <div key={idx} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-start flex-col">
                  <span className="text-sm font-medium text-slate-900 truncate max-w-[150px] sm:max-w-xs group-hover:text-blue-600 transition-colors">{page.path}</span>
                  <span className={`text-[10px] font-bold ${page.change.startsWith('+') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {page.change} vs last week
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-600">{page.views}</div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 text-sm font-bold rounded-lg transition-colors">
            View All Pages
          </button>
        </div>

      </div>
    </div>
  );
};
