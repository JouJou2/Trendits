import React, { useEffect, useMemo, useState } from 'react';
import { DollarSign, Download, ArrowUpRight, ArrowDownRight, Building, CreditCard, Wallet, FileText, CheckCircle, Loader2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';

// Used only as a fallback when a vendor doc has no commissionRate set — matches
// the same default shown/editable in AdminVendors.tsx. Actual payouts always use
// each vendor's real rate, not a flat platform-wide percentage.
const DEFAULT_COMMISSION_RATE = 8;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface VendorPayout {
  vendorId: string;
  vendorName: string;
  earned: number;
  paid: number;
  pending: number;
}

export const AdminFinance = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendorNames, setVendorNames] = useState<Record<string, string>>({});
  const [vendorRates, setVendorRates] = useState<Record<string, number>>({});
  const [vendorPaid, setVendorPaid] = useState<Record<string, number>>({});
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => d.data() as any));
      setLoading(false);
    });

    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snap) => {
      const names: Record<string, string> = {};
      const rates: Record<string, number> = {};
      snap.docs.forEach(d => {
        const data = d.data() as any;
        names[d.id] = data.name || d.id;
        rates[d.id] = Number(data.commissionRate ?? DEFAULT_COMMISSION_RATE);
      });
      setVendorNames(names);
      setVendorRates(rates);
    });

    const unsubPayoutRecords = onSnapshot(collection(db, 'payoutRecords'), (snap) => {
      const paid: Record<string, number> = {};
      snap.docs.forEach(d => {
        const data = d.data() as any;
        paid[data.vendorId] = (paid[data.vendorId] || 0) + Number(data.amount || 0);
      });
      setVendorPaid(paid);
    });

    return () => {
      unsubOrders();
      unsubVendors();
      unsubPayoutRecords();
    };
  }, []);

  // Each vendor keeps its own commission rate (set in AdminVendors), so gross
  // volume and platform revenue have to be computed per item, not at one flat rate.
  const { gmv, cashFlowData, vendorEarnings, platformRevenue } = useMemo(() => {
    const monthlyData: Record<string, { gross: number, revenue: number }> = {};
    MONTHS.forEach(m => { monthlyData[m] = { gross: 0, revenue: 0 }; });

    const earningsByVendor: Record<string, { name: string; gross: number }> = {};
    let totalGmv = 0;
    let totalPlatformRevenue = 0;

    orders.forEach(order => {
      const orderTotal = Number(order.finalTotal || order.total || 0);
      totalGmv += orderTotal;
      const month = order.createdAt ? MONTHS[new Date(order.createdAt).getMonth()] : null;
      if (month) monthlyData[month].gross += orderTotal;

      (order.items || []).forEach((item: any) => {
        if (!item.vendorId) return;
        const rate = (vendorRates[item.vendorId] ?? DEFAULT_COMMISSION_RATE) / 100;
        const subtotal = Number(item.subtotal || 0);
        const platformShare = subtotal * rate;
        totalPlatformRevenue += platformShare;
        if (month) monthlyData[month].revenue += platformShare;

        if (!earningsByVendor[item.vendorId]) {
          earningsByVendor[item.vendorId] = { name: vendorNames[item.vendorId] || item.vendor || item.vendorId, gross: 0 };
        }
        earningsByVendor[item.vendorId].gross += subtotal * (1 - rate);
      });
    });

    return {
      gmv: totalGmv,
      cashFlowData: MONTHS.map(m => ({ name: m, ...monthlyData[m] })),
      vendorEarnings: earningsByVendor,
      platformRevenue: totalPlatformRevenue,
    };
  }, [orders, vendorRates, vendorNames]);

  const payouts: VendorPayout[] = Object.entries(vendorEarnings)
    .map(([vendorId, { name, gross }]) => {
      const paid = vendorPaid[vendorId] || 0;
      return { vendorId, vendorName: name, earned: gross, paid, pending: Math.max(0, gross - paid) };
    })
    .sort((a, b) => b.pending - a.pending);

  const totalPending = payouts.reduce((acc, p) => acc + p.pending, 0);

  const stats = [
    { label: 'Gross Merchandise Value', value: loading ? '...' : `$${gmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: 'Live', isPositive: true, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Platform Revenue', value: loading ? '...' : `$${platformRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: 'Live', isPositive: true, icon: Building, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Payouts', value: loading ? '...' : `$${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: 'Live', isPositive: false, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Active Vendors', value: loading ? '...' : String(payouts.length), change: 'Live', isPositive: true, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' }
  ];

  const handleMarkPaid = async (payout: VendorPayout) => {
    if (payout.pending <= 0) return;
    if (!window.confirm(`Record a manual payout of $${payout.pending.toFixed(2)} to ${payout.vendorName}? This just logs that you paid them outside the app — it does not move any money.`)) return;
    setMarkingPaid(payout.vendorId);
    try {
      await addDoc(collection(db, 'payoutRecords'), {
        vendorId: payout.vendorId,
        vendorName: payout.vendorName,
        amount: payout.pending,
        paidAt: new Date().toISOString(),
      });
      toast.success(`Recorded payout to ${payout.vendorName}.`);
    } catch (err) {
      console.error('Failed to record payout:', err);
      toast.error('Failed to record payout.');
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleExportCsv = () => {
    if (payouts.length === 0) {
      toast.error('No payout data to export.');
      return;
    }
    const header = ['Vendor', 'Earned', 'Paid', 'Pending'];
    const rows = payouts.map(p => [p.vendorName, p.earned.toFixed(2), p.paid.toFixed(2), p.pending.toFixed(2)]);
    const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trendit-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Financial Reporting</h1>
          <p className="text-slate-500 text-sm mt-1">Manage vendor payouts and platform fee splits.</p>
        </div>
        <button onClick={handleExportCsv} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
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
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading
                ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                : s.value}</p>
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
                      formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
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
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Vendor Payouts</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Computed from real order data using each vendor's own commission rate (set in Vendors & Sellers). No payment processor is connected — "Mark as Paid" only logs that you paid a vendor outside the app (e.g. bank transfer); it does not move any money.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">Vendor</th>
                      <th className="px-6 py-4 font-medium">Total Earned</th>
                      <th className="px-6 py-4 font-medium">Paid Out</th>
                      <th className="px-6 py-4 font-medium">Pending</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payouts.map((payout) => (
                      <tr key={payout.vendorId} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-bold text-slate-900">{payout.vendorName}</td>
                        <td className="px-6 py-4 text-slate-600">${payout.earned.toFixed(2)}</td>
                        <td className="px-6 py-4 text-slate-600">${payout.paid.toFixed(2)}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">${payout.pending.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          {payout.pending <= 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                              <CheckCircle className="w-3 h-3" /> Settled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(payout)}
                              disabled={markingPaid === payout.vendorId}
                              className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
                            >
                              {markingPaid === payout.vendorId ? 'Recording...' : 'Mark as Paid'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!loading && payouts.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No vendor sales yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Taxes Tab */}
          {activeTab === 'taxes' && (
            <div className="bg-white p-16 rounded-xl border border-slate-200 shadow-sm text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">Tax Tracking Not Set Up</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                This platform does not currently calculate, collect, or remit sales tax on your behalf. Consult a tax professional or a service like TaxJar/Avalara before enabling tax collection.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
