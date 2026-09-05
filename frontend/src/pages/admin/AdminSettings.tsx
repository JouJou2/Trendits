import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CreditCard, Key, Store, Database, Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [seeding, setSeeding] = useState(false);
  const { loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState('Trendit Marketplace');
  const [supportEmail, setSupportEmail] = useState('support@trendit.com');
  const [description, setDescription] = useState('The premier multi-vendor marketplace for the modern creator economy.');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'siteSettings', 'general'));
        if (snap.exists()) {
          const data = snap.data();
          if (data.storeName) setStoreName(data.storeName);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.description) setDescription(data.description);
        }
      } catch (err) {
        console.error('Failed to load site settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'siteSettings', 'general'), {
        storeName: storeName.trim(),
        supportEmail: supportEmail.trim(),
        description: description.trim(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Settings saved!');
    } catch (err) {
      console.error('Failed to save site settings:', err);
      toast.error('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General Info', icon: Store },
    { id: 'payments', label: 'Payment Providers', icon: CreditCard },
    { id: 'security', label: 'Security & Roles', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'maintenance', label: 'Maintenance', icon: Database },
  ];

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">System Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Configure global variables, roles, API keys, and platform behavior.</p>
        </div>
        {activeTab === 'general' && (
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings || settingsLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
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
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
                    <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                    <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-slate-700 mb-2">Platform Description</label>
                     <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"></textarea>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                 <h2 className="text-lg font-bold text-slate-900">Payment Gateways</h2>
                 <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-200">No Provider Connected</span>
              </div>
              <p className="text-sm text-slate-500 -mt-2">
                Checkout currently only supports Cash on Delivery. Connect a real payment processor before enabling card payments.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded flex items-center justify-center text-blue-600 font-bold font-display text-xl">S</div>
                    <div>
                      <h3 className="font-bold text-slate-900">Stripe Connect</h3>
                      <p className="text-sm text-slate-500">Credit cards, Apple Pay, Google Pay</p>
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-medium rounded cursor-not-allowed">Not Connected</button>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-900 text-white rounded flex items-center justify-center font-bold font-display text-xl">P</div>
                    <div>
                      <h3 className="font-bold text-slate-900">PayPal Express</h3>
                      <p className="text-sm text-slate-500">PayPal wallet integrations</p>
                    </div>
                  </div>
                  <button disabled className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-medium rounded cursor-not-allowed">Not Connected</button>
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
                <p className="text-sm text-slate-500">No maintenance tools available.</p>
              </div>
            </div>
          )}

          {(activeTab === 'security' || activeTab === 'api') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-16 text-center">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">Coming Soon</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                {activeTab === 'security'
                  ? 'Fine-grained role and permission controls beyond the existing Roles & Access page are still being built.'
                  : 'API key management for third-party integrations is still being built.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
