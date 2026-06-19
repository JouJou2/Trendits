import React, { useState, useEffect } from 'react';
import { Search, Filter, Users as UsersIcon, ShieldCheck, User as UserIcon, Store, Loader2 } from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { User } from '../../contexts/AuthContext';

export const AdminCustomers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as User));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900">Users & Roles</h1>
          <p className="text-slate-500 text-sm mt-1">Manage platform access, assign roles, and view user activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><UsersIcon className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <p className="text-xl font-bold">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><UserIcon className="w-5 h-5" /></div>
          <div>
             <p className="text-sm font-medium text-slate-500">Standard Users</p>
             <p className="text-xl font-bold">{users.filter(u => u.role === 'user').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Store className="w-5 h-5" /></div>
          <div>
             <p className="text-sm font-medium text-slate-500">Vendors</p>
             <p className="text-xl font-bold">{users.filter(u => u.role === 'vendor').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><ShieldCheck className="w-5 h-5" /></div>
          <div>
             <p className="text-sm font-medium text-slate-500">Admins</p>
             <p className="text-xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer font-medium"
            >
              <option value="All">All Roles</option>
              <option value="Customer">Customers</option>
              <option value="Vendor">Vendors</option>
              <option value="Admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">User</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Role Access</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Joined</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px] text-right">Role Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold relative ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 
                        u.role === 'vendor' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.name?.charAt(0) || u.email?.charAt(0)}
                        {u.role === 'admin' && (
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                            <ShieldCheck className="w-3 h-3 text-amber-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.name || 'Anonymous'}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 
                      u.role === 'vendor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role || 'customer'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       <span className="text-emerald-700 font-medium">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <select 
                         value={u.role || 'customer'}
                         onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                         className="bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white cursor-pointer"
                       >
                         <option value="customer">Customer</option>
                         <option value="vendor">Vendor</option>
                         <option value="admin">Admin</option>
                       </select>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between text-[10px] text-slate-400 uppercase font-black tracking-widest">
          <div>Showing {filteredUsers.length} total platform users</div>
        </div>
      </div>
    </div>
  );
};
