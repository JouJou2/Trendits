import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { Megaphone, Mail, Tag, RefreshCw, Sparkles, Plus, Play, Pause, MoreHorizontal, MousePointerClick } from 'lucide-react';

export const AdminMarketing = () => {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [promos, setPromos] = useState<any[]>([]);
const [newPromo, setNewPromo] = useState({ code: '', discountPercent: 10, maxDiscountAmount: '', lockedToEmail: '', type: 'Global' });
const [addingPromo, setAddingPromo] = useState(false);

useEffect(() => {
  const unsub = onSnapshot(collection(db, 'promos'), snap => {
    setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return () => unsub();
}, []);

const handleAddPromo = async () => {
  if (!newPromo.code.trim()) return;
  if (newPromo.discountPercent < 1 || newPromo.discountPercent > 100) {
    toast.error('Discount must be between 1% and 100%.');
    return;
  }
  setAddingPromo(true);
  try {
    const maxDiscountAmount = newPromo.maxDiscountAmount ? Number(newPromo.maxDiscountAmount) : null;
    const lockedToEmail = newPromo.lockedToEmail.trim() ? newPromo.lockedToEmail.trim().toLowerCase() : null;
    await addDoc(collection(db, 'promos'), {
      code: newPromo.code.toUpperCase(),
      discountPercent: newPromo.discountPercent,
      maxDiscountAmount,
      lockedToEmail,
      discount: maxDiscountAmount
        ? `${newPromo.discountPercent}% OFF (max $${maxDiscountAmount})`
        : `${newPromo.discountPercent}% OFF`,
      type: newPromo.type,
      status: 'Active',
      usage: 0,
      createdAt: new Date().toISOString()
    });
    setNewPromo({ code: '', discountPercent: 10, maxDiscountAmount: '', lockedToEmail: '', type: 'Global' });
    toast.success('Promo code created!');
  } catch (e) {
    toast.error('Failed to create promo.');
  } finally {
    setAddingPromo(false);
  }
};

const handleTogglePromo = async (id: string, currentStatus: string) => {
  await updateDoc(doc(db, 'promos', id), { status: currentStatus === 'Active' ? 'Expired' : 'Active' });
};

const handleDeletePromo = async (id: string) => {
  if (!confirm('Delete this promo?')) return;
  await deleteDoc(doc(db, 'promos', id));
  toast.success('Promo deleted.');
};

const [campaigns, setCampaigns] = useState<any[]>([]);
const [newCampaign, setNewCampaign] = useState({ name: '', type: 'Email' });
const [addingCampaign, setAddingCampaign] = useState(false);

const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
const promoRedemptions = promos.reduce((acc, p) => acc + (p.usage || 0), 0);

const stats = [
  { label: 'Active Campaigns', value: String(activeCampaigns), icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Avg. Open Rate', value: 'N/A', icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Promo Redemptions', value: String(promoRedemptions), icon: Tag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Cart Recovery Value', value: 'N/A', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' }
];
useEffect(() => {
  const unsub = onSnapshot(collection(db, 'campaigns'), snap => {
    setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return () => unsub();
}, []);

const handleAddCampaign = async () => {
  if (!newCampaign.name.trim()) return;
  setAddingCampaign(true);
  try {
    await addDoc(collection(db, 'campaigns'), {
      name: newCampaign.name,
      type: newCampaign.type,
      status: 'Scheduled',
      sent: '--',
      openRate: '--',
      clicks: '--',
      createdAt: new Date().toISOString()
    });
    setNewCampaign({ name: '', type: 'Email' });
    toast.success('Campaign created!');
  } catch (e) {
    toast.error('Failed to create campaign.');
  } finally {
    setAddingCampaign(false);
  }
};

const handleToggleCampaign = async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
  await updateDoc(doc(db, 'campaigns', id), { status: newStatus });
  toast.success(`Campaign ${newStatus.toLowerCase()}.`);
};

const handleDeleteCampaign = async (id: string) => {
  if (!confirm('Delete this campaign?')) return;
  await deleteDoc(doc(db, 'campaigns', id));
  toast.success('Campaign deleted.');
};
 

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Marketing & Growth</h1>
          <p className="text-slate-500 text-sm mt-1">Drive sales with campaigns, promo codes, and AI-driven recovery.</p>
        </div>
        <button
          onClick={() => setActiveTab('campaigns')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
        >
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
          
{activeTab === 'campaigns' && (
  <div className="space-y-4">
    {/* Add Campaign */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-bold text-slate-900 mb-4">Create Campaign</h3>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Campaign name..."
          value={newCampaign.name}
          onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
          className="flex-1 min-w-[200px] px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={newCampaign.type}
          onChange={e => setNewCampaign({...newCampaign, type: e.target.value})}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>Email</option>
          <option>Push</option>
          <option>Automation</option>
        </select>
        <button
          onClick={handleAddCampaign}
          disabled={addingCampaign || !newCampaign.name}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {addingCampaign ? 'Adding...' : '+ Add Campaign'}
        </button>
      </div>
    </div>

    {/* Campaigns List */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-900">Email & Push Campaigns</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Campaign</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Sent & Open Rate</th>
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
                <td className="px-6 py-4 font-medium text-slate-900">{camp.clicks}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {camp.status === 'Active' ? (
                      <button onClick={() => handleToggleCampaign(camp.id, camp.status)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Pause">
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => handleToggleCampaign(camp.id, camp.status)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Activate">
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleDeleteCampaign(camp.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No campaigns yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
 
          {/* Promos Tab */}
          {activeTab === 'promos' && (
  <div className="space-y-4">
    {/* Add New Promo */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-bold text-slate-900 mb-4">Create Promo Code</h3>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="CODE (e.g. SAVE20)"
          value={newPromo.code}
          onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          placeholder="Discount %"
          value={newPromo.discountPercent}
          onChange={e => setNewPromo({...newPromo, discountPercent: Number(e.target.value)})}
          className="w-32 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          min={1}
          max={100}
        />
        <input
          type="number"
          placeholder="Max discount $ (optional)"
          value={newPromo.maxDiscountAmount}
          onChange={e => setNewPromo({...newPromo, maxDiscountAmount: e.target.value})}
          className="w-44 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          min={0}
        />
        <input
          type="email"
          placeholder="Lock to user email (optional)"
          value={newPromo.lockedToEmail}
          onChange={e => setNewPromo({...newPromo, lockedToEmail: e.target.value})}
          className="w-56 px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={newPromo.type}
          onChange={e => setNewPromo({...newPromo, type: e.target.value})}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option>Global</option>
          <option>First Order</option>
          <option>Flash Deal</option>
        </select>
        <button
          onClick={handleAddPromo}
          disabled={addingPromo || !newPromo.code}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {addingPromo ? 'Adding...' : '+ Add Code'}
        </button>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Max discount caps how much the percentage can take off in dollars — e.g. 50% off with a $10 cap: a $20 item drops to $10, a $40 item drops to $30 (capped), a $6 item drops to $3 (under the cap, so uncapped).
        Locking to an email restricts the code to that one account, and they can only use it once.
      </p>
    </div>

    {/* Promos List */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-900">Active Promo Codes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-medium">Code</th>
              <th className="px-6 py-4 font-medium">Discount</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Usage</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promos.map((promo) => (
              <tr key={promo.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">{promo.code}</span>
                  {promo.lockedToEmail && (
                    <div className="text-[10px] text-blue-600 font-bold mt-1">🔒 {promo.lockedToEmail}</div>
                  )}
                </td>
                <td className="px-6 py-4 font-bold text-emerald-600">{promo.discount}</td>
                <td className="px-6 py-4 text-slate-600">{promo.type}</td>
                <td className="px-6 py-4 text-slate-600">{promo.usage || 0}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${promo.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {promo.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleTogglePromo(promo.id, promo.status)} className="text-xs font-bold text-blue-600 hover:underline">
                    {promo.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDeletePromo(promo.id)} className="text-xs font-bold text-rose-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {promos.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No promo codes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
