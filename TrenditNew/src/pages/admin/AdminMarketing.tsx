import React, { useState } from 'react';
import { Megaphone, Mail, Tag, RefreshCw, Sparkles, Plus, Play, Pause, MoreHorizontal, MousePointerClick } from 'lucide-react';

export const AdminMarketing = () => {
  const [activeTab, setActiveTab] = useState('campaigns');

  const stats = [
    { label: 'Active Campaigns', value: '4', icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg. Open Rate', value: '24.8%', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Promo Redemptions', value: '842', icon: Tag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cart Recovery Value', value: '$4,290', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  const campaigns = [
    { id: 1, name: 'Summer Flash Sale', type: 'Email', status: 'Active', sent: '45k', openRate: '28%', clicks: '4.2k' },
    { id: 2, name: 'Welcome Series (AI)', type: 'Automation', status: 'Active', sent: '12k', openRate: '45%', clicks: '3.1k' },
    { id: 3, name: 'App Push Notification', type: 'Push', status: 'Scheduled', sent: '--', openRate: '--', clicks: '--' },
    { id: 4, name: 'Inactive Users Winback', type: 'Email', status: 'Paused', sent: '8k', openRate: '12%', clicks: '450' },
  ];

  const promos = [
    { code: 'SUMMER20', discount: '20% OFF', type: 'Global', usage: '842 / 1000', status: 'Active' },
    { code: 'WELCOME10', discount: '10% OFF', type: 'First Order', usage: '∞', status: 'Active' },
    { code: 'FLASH50', discount: '50% OFF', type: 'Flash Deal', usage: '50 / 50', status: 'Expired' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Marketing & Growth</h1>
          <p className="text-slate-500 text-sm mt-1">Drive sales with campaigns, promo codes, and AI-driven recovery.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg flex-shrink-0 ${s.bg} ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sub-Navigation Sidebar */}
        <aside className="w-full lg:w-48 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto border-b lg:border-b-0 border-slate-200 pb-2 lg:pb-0">
            {[
               { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
               { id: 'promos', label: 'Promo Codes', icon: Tag },
               { id: 'automations', label: 'AI Automations', icon: Sparkles },
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
          
          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Email & Push Campaigns</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">Campaign</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Sent &amp; Open Rate</th>
                      <th className="px-6 py-4 font-medium">Clicks</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{camp.name}</div>
                          <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                            {camp.type === 'Email' ? <Mail className="w-3 h-3" /> : camp.type === 'Push' ? <Megaphone className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            {camp.type}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            camp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                            camp.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{camp.sent}</div>
                          <div className="text-slate-500 text-xs">{camp.openRate} open</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {camp.clicks}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             {camp.status === 'Active' ? (
                               <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Pause"><Pause className="w-4 h-4" /></button>
                             ) : (
                               <button className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Resume/Start"><Play className="w-4 h-4" /></button>
                             )}
                             <button className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"><MoreHorizontal className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Promos Tab */}
          {activeTab === 'promos' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900">Discount & Promo Codes</h3>
                <button className="text-sm font-medium text-blue-600 hover:underline">Add New Code</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-medium">Code</th>
                      <th className="px-6 py-4 font-medium">Value</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Usage</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promos.map((promo, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">{promo.code}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600">{promo.discount}</td>
                        <td className="px-6 py-4 text-slate-600">{promo.type}</td>
                        <td className="px-6 py-4 text-slate-600">{promo.usage}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            promo.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {promo.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Automations Tab */}
          {activeTab === 'automations' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl border border-blue-800 shadow-md p-6 text-white text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="font-bold text-xl flex items-center justify-center md:justify-start gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-400" /> Trendit AI Revenue Engine
                  </h3>
                  <p className="text-blue-200 text-sm max-w-xl">
                    Let our intelligent autonomous agents track user behaviors and deploy strategic emails exactly when users are most likely to buy.
                  </p>
                </div>
                <button className="whitespace-nowrap px-6 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
                  Configure AI Rules
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="mt-1 p-2 bg-emerald-50 text-emerald-600 rounded-full"><RefreshCw className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900">Abandoned Cart Recovery</h4>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-emerald-500 appearance-none cursor-pointer translate-x-5" />
                        <label className="toggle-label block overflow-hidden h-5 rounded-full bg-emerald-500 cursor-pointer"></label>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 mb-3">Automatically emails users 1hr and 24hrs after leaving items in their cart.</p>
                    <div className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                      <span>Monthly Recovery:</span> <span className="text-emerald-600 font-bold">$4,290.00</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
                  <div className="mt-1 p-2 bg-purple-50 text-purple-600 rounded-full"><MousePointerClick className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900">"You May Also Like" Drops</h4>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-emerald-500 appearance-none cursor-pointer translate-x-5" />
                        <label className="toggle-label block overflow-hidden h-5 rounded-full bg-emerald-500 cursor-pointer"></label>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 mb-3">AI clusters users based on shared purchase histories and sends personalized recommendations.</p>
                    <div className="text-sm font-medium text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 flex justify-between">
                      <span>Conversion Rate:</span> <span className="text-emerald-600 font-bold">4.8% CTR</span>
                    </div>
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
