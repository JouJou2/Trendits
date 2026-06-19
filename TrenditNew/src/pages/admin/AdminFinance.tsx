import React, { useState } from 'react';
import { DollarSign, Download, ArrowUpRight, ArrowDownRight, Building, CreditCard, Wallet, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export const AdminFinance = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Gross Merchandise Value', value: '$124,592.00', change: '+14.2%', isPositive: true, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Platform Revenue (15%)', value: '$18,688.80', change: '+14.2%', isPositive: true, icon: Building, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Payouts', value: '$42,105.50', change: '+2.4%', isPositive: false, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Taxes Collected', value: '$8,450.20', change: '+8.1%', isPositive: true, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  const cashFlowData = [
    { name: 'Jan', gross: 82000, revenue: 12300 },
    { name: 'Feb', gross: 89000, revenue: 13350 },
    { name: 'Mar', gross: 104000, revenue: 15600 },
    { name: 'Apr', gross: 94000, revenue: 14100 },
    { name: 'May', gross: 110000, revenue: 16500 },
    { name: 'Jun', gross: 124592, revenue: 18688 },
  ];

  const payouts = [
    { id: 'PAY-8842', vendor: 'TechHaven Electronics', amount: 12450.00, date: 'Oct 24, 2024', status: 'Processing', method: 'Bank Transfer (ACH)' },
    { id: 'PAY-8841', vendor: 'StyleStudio Apparel', amount: 4200.50, date: 'Oct 23, 2024', status: 'Paid', method: 'Stripe Connect' },
    { id: 'PAY-8840', vendor: 'UrbanKicks', amount: 1800.00, date: 'Oct 23, 2024', status: 'Failed', method: 'Bank Transfer (ACH)' },
    { id: 'PAY-8839', vendor: 'HomeGoods Plus', amount: 8450.75, date: 'Oct 21, 2024', status: 'Paid', method: 'Stripe Connect' },
    { id: 'PAY-8838', vendor: 'FitGear Pro', amount: 2100.25, date: 'Oct 20, 2024', status: 'Paid', method: 'PayPal Payouts' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Financial Reporting</h1>
          <p className="text-slate-500 text-sm mt-1">Manage vendor payouts, platform fee splits, and tax compliance.</p>
        </div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-48 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto border-b lg:border-b-0 border-slate-200 pb-2 lg:pb-0">
            {[
               { id: 'overview', label: 'Cash Flow', icon: BarChart },
               { id: 'payouts', label: 'Vendor Payouts', icon: CreditCard },
               { id: 'taxes', label: 'Taxes & Fees', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold text-slate-900">Platform Cash Flow (YTD)</h3>
                  <p className="text-xs text-slate-500">Gross volume vs realized platform revenue.</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-100"></div>
                    <span className="text-slate-600">Gross Volume</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-600"></div>
                    <span className="text-slate-600">Our Revenue</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      tickFormatter={(val) => `$${val / 1000}k`}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    />
                    <Bar dataKey="gross" fill="#dbeafe" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Pending & Historical Payouts</h3>
                <button className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors">
                  Run Manual Payout
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">Transaction ID</th>
                      <th className="px-6 py-4 font-medium">Vendor</th>
                      <th className="px-6 py-4 font-medium">Amount</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Method & Status</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{payout.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{payout.vendor}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">${payout.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-600">{payout.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs text-slate-500">{payout.method}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              payout.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                              payout.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {payout.status === 'Paid' ? <CheckCircle className="w-3 h-3" /> :
                               payout.status === 'Processing' ? <Clock className="w-3 h-3" /> :
                               <AlertCircle className="w-3 h-3" />}
                              {payout.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {payout.status === 'Failed' ? (
                            <button className="text-xs font-bold text-rose-600 hover:text-rose-700 border border-rose-200 bg-rose-50 px-2 py-1 rounded">Retry</button>
                          ) : (
                            <button className="text-xs font-bold text-blue-600 hover:underline">View Receipt</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Taxes Tab */}
          {activeTab === 'taxes' && (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Tax Nexus Compliance</h3>
                <p className="text-sm text-slate-600 mb-4 tracking-wide leading-relaxed">
                  As a marketplace facilitator, the platform automatically collects and remits sales taxes on behalf of third-party vendors in states where economic nexus thresholds are met.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="border border-slate-200 p-4 rounded-lg bg-slate-50 flex items-center justify-between">
                     <div>
                       <div className="font-bold text-slate-900">California (CA)</div>
                       <div className="text-xs text-slate-500">Nexus Met: Jan 2024</div>
                     </div>
                     <div className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Active Remittance</div>
                   </div>
                   <div className="border border-slate-200 p-4 rounded-lg bg-slate-50 flex items-center justify-between">
                     <div>
                       <div className="font-bold text-slate-900">New York (NY)</div>
                       <div className="text-xs text-slate-500">Nexus Met: Mar 2024</div>
                     </div>
                     <div className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2 py-1 rounded border border-emerald-100">Active Remittance</div>
                   </div>
                   <div className="border border-slate-200 p-4 rounded-lg bg-slate-50 flex items-center justify-between">
                     <div>
                       <div className="font-bold text-slate-900">Texas (TX)</div>
                       <div className="text-xs text-slate-500 hover:text-rose-600 transition-colors cursor-pointer">Registering</div>
                     </div>
                     <div className="text-amber-600 font-bold text-sm bg-amber-50 px-2 py-1 rounded border border-amber-100">Action Required</div>
                   </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
