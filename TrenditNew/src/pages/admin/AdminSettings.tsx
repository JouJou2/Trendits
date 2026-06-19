import React, { useState } from 'react';
import { Shield, CreditCard, Key, Store, Database, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { seedDatabase } from '../../services/dataSeeder';
import { toast } from 'react-hot-toast';

export const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [seeding, setSeeding] = useState(false);

  const tabs = [
    { id: 'general', label: 'General Info', icon: Store },
    { id: 'payments', label: 'Payment Providers', icon: CreditCard },
    { id: 'security', label: 'Security & Roles', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'maintenance', label: 'Maintenance', icon: Database },
  ];

  const handleSeed = async () => {
    if (!window.confirm('This will seed the database with initial products and vendors if it is empty. Continue?')) return;
    setSeeding(true);
    const result = await seedDatabase();
    setSeeding(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">System Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure global variables, roles, API keys, and platform behavior.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
           Save Changes
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto border-b md:border-b-0 border-slate-200 pb-2 md:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Store Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
                  <input type="text" defaultValue="Trendit Marketplace" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                  <input type="email" defaultValue="support@trendit.com" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-2">Platform Description</label>
                   <textarea rows={3} defaultValue="The premier multi-vendor marketplace for the modern creator economy." className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"></textarea>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                 <h2 className="text-lg font-bold text-slate-900">Payment Gateways</h2>
                 <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded border border-emerald-200">Live Mode</span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded flex items-center justify-center text-blue-600 font-bold font-display text-xl">S</div>
                    <div>
                      <h3 className="font-bold text-slate-900">Stripe Connect</h3>
                      <p className="text-sm text-slate-500">Credit cards, Apple Pay, Google Pay</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded hover:bg-slate-200 transition-colors">Manage</button>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-900 text-white rounded flex items-center justify-center font-bold font-display text-xl">P</div>
                    <div>
                      <h3 className="font-bold text-slate-900">PayPal Express</h3>
                      <p className="text-sm text-slate-500">PayPal wallet integrations</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded hover:bg-slate-200 transition-colors">Manage</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                 <h2 className="text-lg font-bold text-slate-900 font-display uppercase tracking-tight">System Maintenance</h2>
                 <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border border-blue-200">Tools</span>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-white group hover:shadow-lg hover:shadow-blue-900/5">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                      <Database className="w-5 h-5" /> Seed Production Data
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                      Populate your Firestore collections with curated products, vendors, and marketplace metadata from the local discovery data. Use this for fresh environments.
                    </p>
                  </div>
                  <button 
                    onClick={handleSeed}
                    disabled={seeding}
                    className="w-full md:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 h-12"
                  >
                    {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {seeding ? 'Seeding...' : 'Initialize Database'}
                  </button>
                </div>

                <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:bg-white group hover:shadow-lg hover:shadow-blue-900/5">
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-rose-600 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" /> Flush System Cache
                    </h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                      Clear all temporary indexing and local storage objects. This will force a hard reload of all vendor metadata and platform settings.
                    </p>
                  </div>
                  <button className="w-full md:w-auto px-8 py-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 shrink-0 h-12">
                    Flush Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
