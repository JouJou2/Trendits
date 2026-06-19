import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, FolderTree, ShoppingCart, 
  Users, Store, Megaphone, Star, BarChart3, 
  DollarSign, MonitorSmartphone, Settings, Globe,
  LogOut, Bell, Menu, X, Search, ShieldCheck
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const { user, loading, isAdmin, isVendor, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Products', href: '/admin/products', icon: ShoppingBag, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Categories', href: '/admin/categories', icon: FolderTree, roles: ['admin', 'super_admin'] },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Customers', href: '/admin/customers', icon: Users, roles: ['admin', 'super_admin'] },
    { name: 'Vendors', href: '/admin/vendors', icon: Store, roles: ['super_admin'] },
    { name: 'Roles & Access', href: '/admin/roles', icon: ShieldCheck, roles: ['super_admin'] },
    { name: 'Marketing', href: '/admin/marketing', icon: Megaphone, roles: ['admin', 'super_admin'] },
    { name: 'Reviews', href: '/admin/reviews', icon: Star, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin', 'super_admin'] },
    { name: 'Finance', href: '/admin/finance', icon: DollarSign, roles: ['admin', 'super_admin'] },
    { name: 'Website Builder', href: '/admin/cms', icon: MonitorSmartphone, roles: ['admin', 'super_admin'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin', 'super_admin', 'vendor'] },
  ];

  const filteredNavigation = navigation.filter(item => item.roles.includes(user?.role || ''));

  useEffect(() => {
    if (!loading && !isVendor) {
      navigate('/login', { state: { from: location } });
    }
  }, [loading, isVendor, navigate, location]);

  useEffect(() => {
    if (!isVendor) return;

    const q = query(collection(db, 'orders'), where('status', '==', 'new'));
    const unsub = onSnapshot(q, (snapshot) => {
      setNewOrdersCount(snapshot.size);
    });

    return () => unsub();
  }, [isVendor]);

  // Ensure scroll triggers are reset when changing routes inside dashboard
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Verifying Credentials...</p>
        </div>
      </div>
    );
  }

  if (!isVendor) return null;

  return (
    <div className="h-screen w-full bg-slate-100 flex font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950 border-b border-slate-800">
          <span className="text-xl font-bold font-display text-white tracking-tight">
            Trendit <span className="text-blue-500">OS</span>
          </span>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto hide-scrollbar py-4 px-3 space-y-1">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/admin'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon className={`w-5 h-5 ${window.location.pathname === item.href ? 'text-white' : 'text-slate-400'}`} />
              <span className="flex-1">{item.name}</span>
              {item.name === 'Orders' && newOrdersCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-slate-900 group-hover:ring-slate-800">
                  {newOrdersCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSuperAdmin ? 'bg-rose-500' : isAdmin ? 'bg-blue-600' : 'bg-slate-700'}`}>
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                {user?.role?.replace('_', ' ') || 'Identity'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center relative text-gray-500 focus-within:text-blue-600">
              <Search className="w-5 h-5 absolute left-3 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search orders, clients, or products... (Cmd+K)" 
                className="pl-10 pr-4 py-2 w-80 bg-slate-100 hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-lg text-sm transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            <a 
              href="/" 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 hidden sm:flex"
            >
              <Globe className="w-4 h-4" />
              View Store
            </a>
            
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
