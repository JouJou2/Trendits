import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Store, ChevronDown, TrendingUp, Database } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { Vendor } from '../../data/products';
import { seedDatabase } from '../../services/dataSeeder';
import { toast } from 'react-hot-toast';

export const AdminVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vendorsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as Vendor));
      setVendors(vendorsData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleStatusUpdate = async (vendorId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vendors/${vendorId}`);
    }
  };

  const filteredVendors = vendors.filter(v => 
    (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading vendors...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Vendors & Sellers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the marketplace sellers, commissions, and approvals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 h-fit"><Store className="w-6 h-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Vendors</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{vendors.filter(v => v.status === 'active').length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 h-fit"><TrendingUp className="w-6 h-6" /></div>
          <div>
             <p className="text-sm font-medium text-slate-500">Avg. Commission</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">
               {vendors.length > 0 ? (vendors.reduce((acc, v) => acc + (v.commissionRate || 0), 0) / vendors.length).toFixed(1) : 0}%
             </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 h-fit"><ShieldCheck className="w-6 h-6" /></div>
          <div>
             <p className="text-sm font-medium text-slate-500">Awaiting Approval</p>
             <p className="text-2xl font-bold text-slate-900 mt-1">{vendors.filter(v => v.status === 'pending').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 justify-between items-center">
        <div className="relative w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search stores or owners..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" /> Filter Status
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Store Info</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Products</th>
              <th className="px-6 py-4 font-medium">Total Sales</th>
              <th className="px-6 py-4 font-medium">Commission %</th>
              <th className="px-6 py-4 font-medium text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVendors.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{v.name}</div>
                  <div className="text-slate-500 text-xs">Owner: {v.ownerName || 'Unknown'} • {v.id.substring(0, 8)}...</div>
                </td>
                <td className="px-6 py-4">
                  <div className="relative group/status flex items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      v.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      v.status === 'suspended' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {v.status}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </span>
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 hidden group-hover/status:block min-w-[120px]">
                      {['active', 'pending', 'suspended'].map(status => (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(v.id, status)}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 capitalize"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-medium">{v.productCount || 0}</td>
                <td className="px-6 py-4 font-bold text-slate-900">${(v.totalSales || 0).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium">{v.commissionRate || '8'}%</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {v.status === 'pending' ? (
                      <button 
                        onClick={() => handleStatusUpdate(v.id, 'active')}
                        className="text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
                      >
                        Approve
                      </button>
                    ) : v.status === 'active' ? (
                      <button 
                        onClick={() => handleStatusUpdate(v.id, 'suspended')}
                        className="text-rose-700 bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-200 transition-colors"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStatusUpdate(v.id, 'active')}
                        className="text-blue-700 bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredVendors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-slate-500 font-medium">No vendors found in database.</p>
                    <button 
                      onClick={async () => {
                        const res = await seedDatabase();
                        if (res.success) toast.success(res.message);
                        else toast.error(res.message);
                      }}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-md shadow-blue-200"
                    >
                      <Database className="w-4 h-4" /> Seed Vendors & Products
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
