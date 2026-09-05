import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Product } from './pages/Product';
import { Category } from './pages/Category';
import { Login } from './pages/Login';
import { AuthAction } from './pages/AuthAction';
import { Account } from './pages/Account';
import { OrderDetail } from './pages/OrderDetail';
import { Favorites } from './pages/Favorites';
import { CategoriesPage } from './pages/Categories';
import { VendorProfile } from './pages/VendorProfile';
import { SearchResults } from './pages/SearchResults';
import { Checkout } from './pages/Checkout';
import { Cart } from './pages/Cart';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { CartDrawer } from './components/CartDrawer';
import { Chatbot } from './components/Chatbot';
import { TwoFactorGate } from './components/TwoFactorGate';
import { ProfileCompletionGate } from './components/ProfileCompletionGate';
import { ScrollToTop } from './components/ScrollToTop';
import { BackButton } from './components/BackButton';
// Admin is lazy-loaded: these 17 screens are staff-only, so shipping them in the
// main bundle made every shopper download code they can never open.
const AdminLayout = React.lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminOverview = React.lazy(() => import('./pages/admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminProductForm = React.lazy(() => import('./pages/admin/AdminProductForm').then(m => ({ default: m.AdminProductForm })));
const AdminVendors = React.lazy(() => import('./pages/admin/AdminVendors').then(m => ({ default: m.AdminVendors })));
const AdminRoleManagement = React.lazy(() => import('./pages/admin/AdminRoleManagement').then(m => ({ default: m.AdminRoleManagement })));
const AdminOrders = React.lazy(() => import('./pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminCustomers = React.lazy(() => import('./pages/admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminMarketing = React.lazy(() => import('./pages/admin/AdminMarketing').then(m => ({ default: m.AdminMarketing })));
const AdminBanners = React.lazy(() => import('./pages/admin/AdminBanners').then(m => ({ default: m.AdminBanners })));
const AdminReviews = React.lazy(() => import('./pages/admin/AdminReviews').then(m => ({ default: m.AdminReviews })));
const AdminSupport = React.lazy(() => import('./pages/admin/AdminSupport').then(m => ({ default: m.AdminSupport })));
const AdminQuestions = React.lazy(() => import('./pages/admin/AdminQuestions').then(m => ({ default: m.AdminQuestions })));
const AdminAnalytics = React.lazy(() => import('./pages/admin/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminFinance = React.lazy(() => import('./pages/admin/AdminFinance').then(m => ({ default: m.AdminFinance })));
const AdminCategories = React.lazy(() => import('./pages/admin/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { HelmetProvider } from 'react-helmet-async';
import { MobileNav } from './components/MobileNav';
import { Toaster } from 'react-hot-toast';
const VendorProfileSetup = React.lazy(() => import('./pages/admin/VendorProfileSetup').then(m => ({ default: m.VendorProfileSetup })));

// Blocks the entire signed-in app experience until the 2FA email code is verified.
// Signed-out visitors pass straight through untouched.
const TwoFactorCheck = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, needsTwoFactor, needsProfileCompletion } = useAuth();
  if (!loading && user && needsTwoFactor) {
    return <TwoFactorGate />;
  }
  // 2FA first, then profile details — never both at once.
  if (!loading && user && needsProfileCompletion) {
    return <ProfileCompletionGate />;
  }
  return <>{children}</>;
};

// A wrapper component for public/storefront routes to include the Header and Footer
const StorefrontLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="font-sans selection:bg-blue-200 selection:text-blue-900 flex flex-col min-h-screen relative bg-transparent pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
    <Header />
    <BackButton />
    <MobileNav />
    <CartDrawer />
    <Chatbot />
    {/* No top padding here: Header is position:sticky, so it already occupies
        flow space. Adding offset padding (as a fixed header would need) just
        leaves a dead gap above the hero. */}
    <div className="flex-grow relative z-10">
      {children}
    </div>
    <Footer />
  </div>
);

export default function App() {
  const [isInitializing, setIsInitializing] = React.useState(true);

  React.useEffect(() => {
    // Simulate system initialization
    const timer = setTimeout(() => setIsInitializing(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <TwoFactorCheck>
          <CartProvider>
            <Router>
              <ScrollToTop />
              <div className="min-h-screen font-sans">
                <Toaster position="bottom-right" />
                <Routes>
                {/* Storefront Routes */}
                <Route path="/" element={<StorefrontLayout><Home /></StorefrontLayout>} />
                <Route path="/product/:id" element={<StorefrontLayout><Product /></StorefrontLayout>} />
                <Route path="/category/:id" element={<StorefrontLayout><Category /></StorefrontLayout>} />
                <Route path="/login" element={<StorefrontLayout><Login /></StorefrontLayout>} />
                {/* Firebase email action links (password reset, email verification)
                    land here instead of Firebase's generic page. */}
                <Route path="/auth/action" element={<StorefrontLayout><AuthAction /></StorefrontLayout>} />
                <Route path="/account" element={<StorefrontLayout><Account /></StorefrontLayout>} />
                <Route path="/account/orders/:orderId" element={<StorefrontLayout><OrderDetail /></StorefrontLayout>} />
                <Route path="/favorites" element={<StorefrontLayout><Favorites /></StorefrontLayout>} />
                <Route path="/categories" element={<StorefrontLayout><CategoriesPage /></StorefrontLayout>} />
                <Route path="/vendor/:id" element={<StorefrontLayout><VendorProfile /></StorefrontLayout>} />
                <Route path="/search" element={<StorefrontLayout><SearchResults /></StorefrontLayout>} />
                <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
                <Route path="/checkout" element={<StorefrontLayout><Checkout /></StorefrontLayout>} />

                {/* Admin Routes — wrapped in Suspense because the whole section
                    is code-split out of the shopper-facing bundle. */}
                <Route
                  path="/admin"
                  element={
                    <React.Suspense fallback={<LoadingScreen />}>
                      <AdminLayout />
                    </React.Suspense>
                  }
                >
                  <Route index element={<AdminOverview />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/:id" element={<AdminProductForm />} />
                  <Route path="vendors" element={<AdminVendors />} />
                  <Route path="roles" element={<AdminRoleManagement />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="marketing" element={<AdminMarketing />} />
                  <Route path="banners" element={<AdminBanners />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="support" element={<AdminSupport />} />
                  <Route path="questions" element={<AdminQuestions />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="finance" element={<AdminFinance />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="profile" element={<VendorProfileSetup />} />
                </Route>
              </Routes>
            </div>
          </Router>
          </CartProvider>
          </TwoFactorCheck>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

