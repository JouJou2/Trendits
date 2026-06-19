import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Product } from './pages/Product';
import { Category } from './pages/Category';
import { Login } from './pages/Login';
import { Account } from './pages/Account';
import { Favorites } from './pages/Favorites';
import { CategoriesPage } from './pages/Categories';
import { VendorProfile } from './pages/VendorProfile';
import { SearchResults } from './pages/SearchResults';
import { Checkout } from './pages/Checkout';
import { Cart } from './pages/Cart';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { CmsProvider } from './contexts/CmsContext';
import { CartDrawer } from './components/CartDrawer';
import { Chatbot } from './components/Chatbot';
import { ScrollToTop } from './components/ScrollToTop';
import { BackButton } from './components/BackButton';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminProductForm } from './pages/admin/AdminProductForm';
import { AdminVendors } from './pages/admin/AdminVendors';
import { AdminRoleManagement } from './pages/admin/AdminRoleManagement';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminMarketing } from './pages/admin/AdminMarketing';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminFinance } from './pages/admin/AdminFinance';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminCMS } from './pages/admin/AdminCMS';
import { AdminSettings } from './pages/admin/AdminSettings';
import { FlowShaderBackground } from './components/FlowShaderBackground';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { HelmetProvider } from 'react-helmet-async';
import { MobileNav } from './components/MobileNav';
import { Toaster } from 'react-hot-toast';

// A wrapper component for public/storefront routes to include the Header and Footer
const StorefrontLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="font-sans selection:bg-blue-200 selection:text-blue-900 flex flex-col min-h-screen relative bg-transparent pb-16 md:pb-0">
    <FlowShaderBackground />
    <Header />
    <BackButton />
    <MobileNav />
    <CartDrawer />
    <Chatbot />
    <div className="flex-grow relative z-10 pt-[58px] md:pt-[68px]">
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
          <CartProvider>
            <CmsProvider>
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
                <Route path="/account" element={<StorefrontLayout><Account /></StorefrontLayout>} />
                <Route path="/favorites" element={<StorefrontLayout><Favorites /></StorefrontLayout>} />
                <Route path="/categories" element={<StorefrontLayout><CategoriesPage /></StorefrontLayout>} />
                <Route path="/vendor/:id" element={<StorefrontLayout><VendorProfile /></StorefrontLayout>} />
                <Route path="/search" element={<StorefrontLayout><SearchResults /></StorefrontLayout>} />
                <Route path="/cart" element={<StorefrontLayout><Cart /></StorefrontLayout>} />
                <Route path="/checkout" element={<StorefrontLayout><Checkout /></StorefrontLayout>} />

                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/:id" element={<AdminProductForm />} />
                  <Route path="vendors" element={<AdminVendors />} />
                  <Route path="roles" element={<AdminRoleManagement />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="marketing" element={<AdminMarketing />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="finance" element={<AdminFinance />} />
                  <Route path="cms" element={<AdminCMS />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Routes>
            </div>
          </Router>
        </CmsProvider>
      </CartProvider>
    </AuthProvider>
  </ErrorBoundary>
</HelmetProvider>
);
}

