import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, Filter, Store, ChevronDown, TrendingUp, Database, ExternalLink, BadgeCheck, Check, X, UserPlus } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../services/firebase';
import { createVendorInvite, buildInviteUrl } from '../../services/vendorInviteApi';
import { Vendor } from '../../data/products';
import { toast } from 'react-hot-toast';

export const AdminVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState('All');
const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
const [decidingRequestId, setDecidingRequestId] = useState<string | null>(null);

// Vendor invite dialog. The raw token comes back from the server exactly once,
// so it is held in state only until the admin closes the dialog.
const [inviteOpen, setInviteOpen] = useState(false);
const [inviteEmail, setInviteEmail] = useState('');
const [inviteStore, setInviteStore] = useState('');
const [inviteLink, setInviteLink] = useState('');
const [inviteBusy, setInviteBusy] = useState(false);
const [inviteError, setInviteError] = useState('');

const handleCreateInvite = async () => {
  setInviteBusy(true);
  setInviteError('');
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Your session expired. Sign in again.');
    const invite = await createVendorInvite(idToken, inviteEmail.trim(), inviteStore.trim());
    setInviteLink(buildInviteUrl(invite.token));
    setInviteEmail('');
    setInviteStore('');
  } catch (err) {
    setInviteError(err instanceof Error ? err.message : 'Could not create the invite.');
  } finally {
    setInviteBusy(false);
  }
};

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'verificationRequests'), (snapshot) => {
      setVerificationRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    }, (error) => console.error('Verification requests error:', error));
    return () => unsub();
  }, []);

  const pendingVerifications = verificationRequests.filter(r => r.status === 'Pending');

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

  const handleVerificationDecision = async (request: any, approve: boolean) => {
    setDecidingRequestId(request.id);
    try {
      await updateDoc(doc(db, 'verificationRequests', request.id), { status: approve ? 'Approved' : 'Rejected' });
      if (approve) {
        await updateDoc(doc(db, 'vendors', request.vendorId), { verified: true, updatedAt: new Date().toISOString() });
      }
      toast.success(approve ? 'Vendor verified!' : 'Request rejected.');
    } catch (error) {
      console.error('Failed to process verification request:', error);
      toast.error('Failed to update. You may not have permission.');
    } finally {
      setDecidingRequestId(null);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.ownerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading vendors...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Vendors &amp; Sellers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage the marketplace sellers, commissions, and approvals.</p>
        </div>
        <button
          onClick={() => { setInviteOpen(true); setInviteLink(''); setInviteError(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors active:scale-95"
        >
          <UserPlus className="w-4 h-4" /> Invite vendor
        </button>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl w-full max-w-lg p-7 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Invite a vendor</h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  We create their store login, then you send them a one-time setup link.
                  They choose their own password — you never see it.
                </p>
              </div>
              <button onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-600 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!inviteLink ? (
              <>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-6 mb-2">
                  Store login email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="store@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mt-4 mb-2">
                  Store name <span className="text-slate-300 normal-case font-medium">(optional)</span>
                </label>
                <input
                  value={inviteStore}
                  onChange={(e) => setInviteStore(e.target.value)}
                  placeholder="Prefills their setup form"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />

                {inviteError && (
                  <p className="text-xs text-rose-600 mt-3">{inviteError}</p>
                )}

                <button
                  onClick={handleCreateInvite}
                  disabled={inviteBusy || !inviteEmail.trim()}
                  className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {inviteBusy ? 'Creating...' : 'Create setup link'}
                </button>
              </>
            ) : (
              <>
                <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-emerald-800">Setup link ready</p>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    Send this to the vendor. It works once and expires in 7 days.
                    We can&apos;t show it again after you close this.
                  </p>
                </div>
                <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-3 break-all text-xs font-mono text-slate-700">
                  {inviteLink}
                </div>
                <div className="flex gap-2.5 mt-4">
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Link copied.'); }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => setInviteOpen(false)}
                    className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      {pendingVerifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-slate-900">Verification Requests ({pendingVerifications.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingVerifications.map(req => (
              <div key={req.id} className="p-5 flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <p className="font-bold text-slate-900">{req.businessName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Store: {req.vendorName} • Years operating: {req.yearsOperating || 'N/A'}</p>
                  <p className="text-sm text-slate-600 mt-2">{req.qualityDescription}</p>
                  {req.sampleLinks && (
                    <p className="text-xs text-blue-600 mt-1 break-all">{req.sampleLinks}</p>
                  )}
                </div>
                <div className="flex md:flex-col gap-2 shrink-0">
                  {decidingRequestId === req.id ? (
                    <div className="px-4 py-2 text-sm text-slate-400">Updating...</div>
                  ) : (
                    <>
                      <button onClick={() => handleVerificationDecision(req, true)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleVerificationDecision(req, false)} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors appearance-none outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
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
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    {v.name}
                    {v.verified && <span title="Verified"><BadgeCheck className="w-4 h-4 text-blue-600" /></span>}
                  </div>
                  <div className="text-slate-500 text-xs">Owner: {v.ownerName || 'Unknown'} • {v.id.substring(0, 8)}...</div>
                </td>
                <td className="px-6 py-4">
  <div className="relative">
    <span
      onClick={() => setOpenStatusDropdown(openStatusDropdown === v.id ? null : v.id)}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize cursor-pointer ${
        v.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
        v.status === 'suspended' ? 'bg-rose-100 text-rose-700' :
        'bg-amber-100 text-amber-700'
      }`}
    >
      {v.status}
      <ChevronDown className="w-3 h-3 ml-1" />
    </span>
    {openStatusDropdown === v.id && (
      <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
        {['active', 'pending', 'suspended'].map(status => (
          <button
            key={status}
            onClick={() => { handleStatusUpdate(v.id, status); setOpenStatusDropdown(null); }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 capitalize"
          >
            {status}
          </button>
        ))}
      </div>
    )}
  </div>
</td>
                <td className="px-6 py-4 font-medium">{v.productCount || 0}</td>
                <td className="px-6 py-4 font-bold text-slate-900">${(v.totalSales || 0).toLocaleString()}</td>
                <td className="px-6 py-4 font-medium">{v.commissionRate || '8'}%</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/vendor/${v.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Profile
                    </Link>
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
                  <p className="text-slate-500 font-medium">No vendors found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
