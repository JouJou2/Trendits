import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, ShieldCheck, User, 
  Search, Filter, Mail, Clock, 
  AlertTriangle, Crown
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'vendor' | 'admin' | 'super_admin';
  createdAt?: string;
}

export const AdminRoleManagement = () => {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(userData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleRoleUpdate = async (userId: string, newRole: UserData['role'], userName: string) => {
    if (!isSuperAdmin) {
      toast.error("Security Restriction: Only Super Admins can modify account roles.");
      return;
    }

    if (userId === currentUser?.id) {
      toast.error("Self-Modification Blocked: You cannot change your own role to prevent lockout.");
      return;
    }

    try {
      setUpdatingId(userId);
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      toast.success(`Access Level Updated: ${userName} is now a ${newRole.replace('_', ' ')}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeStyles = (role: string) => {
    switch(role) {
      case 'super_admin': return 'bg-rose-500 text-white ring-red-500/20';
      case 'admin': return 'bg-blue-600 text-white ring-blue-500/20';
      case 'vendor': return 'bg-amber-500 text-white ring-amber-500/20';
      default: return 'bg-slate-200 text-slate-700 ring-slate-500/20';
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'super_admin': return <Crown className="w-3.5 h-3.5" />;
      case 'admin': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'vendor': return <Users className="w-3.5 h-3.5" />;
      default: return <User className="w-3.5 h-3.5" />;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
        <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center shadow-xl">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tight">Access Denied.</h2>
          <p className="text-slate-500 max-w-md mx-auto mt-2">
            You are attempting to access a Restricted Intelligence Terminal. 
            Role management is strictly reserved for Super Administrative entities.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Synchronizing user mainframe...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 font-display italic uppercase tracking-tighter">Identity Management.</h1>
          <p className="text-slate-500 text-sm mt-1">Direct oversight of platform authority and access roles.</p>
        </div>
        <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Authority</p>
            <p className="text-sm font-bold">SUPER ADMINISTRATOR</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search identity by name or digital address..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-white transition-all w-full sm:w-auto"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Identities</option>
            <option value="super_admin">Super Admins</option>
            <option value="admin">Platform Admins</option>
            <option value="vendor">Retail Vendors</option>
            <option value="user">Standard Users</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((u) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={u.id} 
              className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40 overflow-hidden flex flex-col group relative"
            >
              {updatingId === u.id && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    {u.name?.[0] || 'U'}
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-4 ${getRoleBadgeStyles(u.role)}`}>
                    {getRoleIcon(u.role)}
                    {u.role.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="font-black text-slate-900 text-lg leading-tight mb-1 truncate">{u.name || 'Anonymous Identity'}</h3>
                <div className="flex items-center gap-2 text-slate-500 mb-4">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium truncate">{u.email}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                <p className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Modify Clearance Level</p>
                
                <button 
                  onClick={() => handleRoleUpdate(u.id, 'vendor', u.name)}
                  disabled={u.role === 'vendor' || u.id === currentUser?.id}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    u.role === 'vendor' 
                    ? 'bg-amber-50 border-amber-200 text-amber-600' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-amber-400 hover:text-amber-500'
                  }`}
                >
                  <Users className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Vendor</span>
                </button>

                <button 
                  onClick={() => handleRoleUpdate(u.id, 'admin', u.name)}
                  disabled={u.role === 'admin' || u.id === currentUser?.id}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    u.role === 'admin' 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-blue-400 hover:text-blue-500'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
                </button>

                <button 
                  onClick={() => handleRoleUpdate(u.id, 'super_admin', u.name)}
                  disabled={u.role === 'super_admin' || u.id === currentUser?.id}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    u.role === 'super_admin' 
                    ? 'bg-rose-50 border-rose-200 text-rose-600' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-rose-400 hover:text-rose-500'
                  }`}
                >
                  <Crown className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Super</span>
                </button>

                <button 
                  onClick={() => handleRoleUpdate(u.id, 'user', u.name)}
                  disabled={u.role === 'user' || u.id === currentUser?.id}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                    u.role === 'user' 
                    ? 'bg-slate-100 border-slate-300 text-slate-700' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-400 hover:text-slate-500'
                  }`}
                >
                  <User className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Demote</span>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-[3rem] border border-slate-100 p-20 text-center space-y-4 shadow-xl">
          <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 italic font-display uppercase tracking-tight">Identity Vacuum.</h2>
          <p className="text-slate-400 font-medium max-w-[300px] mx-auto">Zero identities matched your current scanning parameters.</p>
        </div>
      )}
    </div>
  );
};
