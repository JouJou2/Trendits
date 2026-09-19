import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, FolderTree, ShoppingCart,
  Users, Store, Megaphone, Star, BarChart3,
  DollarSign, Settings, Globe,
  LogOut, Bell, Menu, X, ShieldCheck, MessageSquare, HelpCircle, Image, Loader2, Eye, ExternalLink
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { VendorProfileSetup } from './VendorProfileSetup';
import { toast } from 'react-hot-toast';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
const { user, loading, isAdmin, isVendor, isSuperAdmin, vendorId, vendorProfile, logout } = useAuth();
  const isAdminView = isAdmin || isSuperAdmin;
  // A vendor's own public page, exactly as customers see it. Opened in a new
  // tab so the dashboard stays where they left it.
  const myStoreUrl = !isAdminView && vendorId ? `/vendor/${vendorId}` : null;
  const navigate = useNavigate();
  const location = useLocation();

  const navigation = [
    { name: isAdminView ? 'Dashboard' : 'Store', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Products', href: '/admin/products', icon: ShoppingBag, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Categories', href: '/admin/categories', icon: FolderTree, roles: ['admin', 'super_admin'] },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingCart, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Customers', href: '/admin/customers', icon: Users, roles: ['admin', 'super_admin'] },
    { name: 'Vendors', href: '/admin/vendors', icon: Store, roles: ['super_admin'] },
    { name: 'Roles & Access', href: '/admin/roles', icon: ShieldCheck, roles: ['super_admin'] },
    { name: 'Marketing', href: '/admin/marketing', icon: Megaphone, roles: ['admin', 'super_admin'] },
    { name: 'Homepage Banners', href: '/admin/banners', icon: Image, roles: ['admin', 'super_admin'] },
    { name: 'Reviews', href: '/admin/reviews', icon: Star, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Questions', href: '/admin/questions', icon: HelpCircle, roles: ['admin', 'super_admin', 'vendor'] },
    { name: 'Support', href: '/admin/support', icon: MessageSquare, roles: ['admin', 'super_admin'] },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin', 'super_admin'] },
    { name: 'Finance', href: '/admin/finance', icon: DollarSign, roles: ['admin', 'super_admin'] },
    { name: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin', 'super_admin'] },
    { name: 'Profile', href: '/admin/profile', icon: Store, roles: ['vendor'] },
  ];

  const filteredNavigation = navigation.filter(item => item.roles.includes(user?.role || ''));

  useEffect(() => {
    if (!loading && !isVendor) {
      navigate('/login', { state: { from: location } });
    }
  }, [loading, isVendor, navigate, location]);

  useEffect(() => {
    if (!isVendor || !user) return;

    let unsub: (() => void) | null = null;

    const subscribeToNewOrders = async () => {
      let currentVendorId: string | null = null;

      // Prefer vendors/{uid}
      const vendorDoc = await getDoc(doc(db, 'vendors', user.id));
      if (vendorDoc.exists()) {
        currentVendorId = vendorDoc.id;
      } else {
        // Fallback to ownerId mapping
        const vendorQuery = query(collection(db, 'vendors'), where('ownerId', '==', user.id), limit(1));
        const vendorSnap = await getDocs(vendorQuery);
        if (!vendorSnap.empty) {
          currentVendorId = vendorSnap.docs[0].id;
        }
      }

      // Real checkout orders are created with status 'pending' — 'new' is only ever
      // used by the demo data seeder, so both are checked here. Admins count the
      // site-wide list; a vendor counts their own copies, because the site-wide
      // list is admin-only and a vendor's query on it is refused.
      const ordersQuery = isAdminView || !currentVendorId
        ? query(collection(db, 'orders'), where('status', 'in', ['pending', 'new']))
        : query(collection(db, 'vendors', currentVendorId, 'orders'), where('status', 'in', ['pending', 'new']));

      unsub = onSnapshot(ordersQuery, (snapshot) => {
        setNewOrdersCount(snapshot.size);
      }, (error) => console.error('New orders count unavailable:', error));
    };

    subscribeToNewOrders();

    return () => {
      if (unsub) unsub();
    };
  }, [isVendor, user, isAdminView]);

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
  const isProfileIncomplete = isVendor && !isAdminView && (!vendorProfile || vendorProfile.status !== 'active');
const isOnProfilePage = location.pathname === '/admin/profile';

if (isProfileIncomplete && !isOnProfilePage) {
  return <Navigate to="/admin/profile" replace />;
}

  // Beyond the coarse "is this account vendor-tier at all" gate above, each nav
  // entry also declares which roles may actually view that section (e.g. Vendors
  // and Roles & Access are super_admin only) — enforce that at the route level
  // too, not just by hiding the sidebar link. Nested routes like
  // /admin/products/:id match their parent's entry via longest-prefix.
  const role = user?.role || '';
  const exactNavMatch = navigation.find(item => item.href === location.pathname);
  const prefixNavMatch = !exactNavMatch
    ? navigation
        .filter(item => item.href !== '/admin' && location.pathname.startsWith(item.href + '/'))
        .sort((a, b) => b.href.length - a.href.length)[0]
    : undefined;
  const matchedNavItem = exactNavMatch || prefixNavMatch;
  const isRouteAllowed = !matchedNavItem || matchedNavItem.roles.includes(role);

  if (!isRouteAllowed) {
    return <Navigate to="/admin" replace />;
  }

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
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="flex-1">{item.name}</span>
                  {item.name === 'Orders' && newOrdersCount > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-slate-900 group-hover:ring-slate-800">
                      {newOrdersCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          {myStoreUrl && (
            <a
              href={myStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Eye className="w-5 h-5 text-slate-400" />
              <span className="flex-1">View my store</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          )}
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
          </div>
          
          <div className="flex items-center gap-3 sm:gap-4">
            {myStoreUrl ? (
              <a
                href={myStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 hidden sm:flex"
                title="Open your store page as customers see it"
              >
                <Eye className="w-4 h-4" />
                View my store
              </a>
            ) : (
              <a
                href="/"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 hidden sm:flex"
              >
                <Globe className="w-4 h-4" />
                View Store
              </a>
            )}
            
            <button
              onClick={() => navigate('/admin/orders')}
              className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              title={newOrdersCount > 0 ? `${newOrdersCount} new order${newOrdersCount !== 1 ? 's' : ''}` : 'No new orders'}
            >
              <Bell className="w-5 h-5" />
              {newOrdersCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content — its own Suspense boundary so switching between
            code-split admin pages keeps the sidebar/header mounted. */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
              </div>
            }
          >
            <Outlet />
          </React.Suspense>
        </main>
      </div>
    </div>
  );
};
