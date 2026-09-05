import React, { useState, useEffect, useRef } from 'react';
import {
  Search, User, Package, ShoppingCart, ShieldCheck, Loader2, Tag, Heart, Store, ArrowRight, Menu, X, LayoutGrid,
  Clock, TrendingUp, Trash2, Bell, Sparkles, MessageSquare, HelpCircle, Truck
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../hooks/useWishlist';
import { collection, query, limit, getDocs, orderBy, addDoc, serverTimestamp, where, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  type?: 'main' | 'other';
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'trending' | 'category' | 'brand';
  slug?: string;
}

// Renders each notification `type` with its own message/link/icon instead of
// assuming every notification is a "new product" alert.
const getNotificationContent = (n: any): { text: React.ReactNode; link: string; icon: React.ElementType } => {
  switch (n.type) {
    case 'order_status':
      return {
        text: <>Your order <span className="font-bold">#{n.orderNumber}</span> is now <span className="font-semibold capitalize">{n.status}</span></>,
        link: `/account/orders/${n.orderId}`,
        icon: Truck,
      };
    case 'review_reply':
      return {
        text: <><span className="font-bold">{n.repliedBy || 'The seller'}</span> replied to your review on <span className="font-semibold">{n.productTitle}</span></>,
        link: `/product/${n.productId}?tab=reviews`,
        icon: MessageSquare,
      };
    case 'question_answered':
      return {
        text: <><span className="font-bold">{n.answeredBy || 'The seller'}</span> answered your question about <span className="font-semibold">{n.productTitle}</span></>,
        link: `/product/${n.productId}?tab=questions`,
        icon: HelpCircle,
      };
    case 'new_product':
      return {
        text: <><span className="font-bold">{n.vendorName}</span> added a new product: <span className="font-semibold">{n.productTitle}</span></>,
        link: n.productId ? `/product/${n.productId}` : `/vendor/${n.vendorId}`,
        icon: Sparkles,
      };
    default:
      return {
        text: n.title || n.message || 'You have a new notification.',
        link: n.productId ? `/product/${n.productId}` : n.vendorId ? `/vendor/${n.vendorId}` : '/account',
        icon: Bell,
      };
  }
};

export const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [hasDeals, setHasDeals] = useState(false);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVendor, isSuperAdmin } = useAuth();
  const { cartCount, setIsCartOpen } = useCart();
  const { wishlist } = useWishlist();
  const wishlistCount = wishlist.length;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('trendit_recent_searches');
    return saved ? JSON.parse(saved) : [];
  });

  const searchParams = new URLSearchParams(location.search);
  const activeCategory = searchParams.get('cat');
  const isHomePage = location.pathname === '/';

  // Notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'users', user.id, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error('Notifications error:', error));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotifications = async () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening && user) {
      const unread = notifications.filter(n => !n.read);
      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(n => batch.update(doc(db, 'users', user.id, 'notifications', n.id), { read: true }));
        batch.commit().catch(e => console.error('Failed to mark notifications read:', e));
      }
    }
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'), limit(30));
        const snap = await getDocs(q);
        const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Check for deals
  useEffect(() => {
    const checkDeals = async () => {
      try {
        const q = query(collection(db, 'products'), orderBy('oldPrice'), limit(1));
        const snap = await getDocs(q);
        setHasDeals(!snap.empty);
      } catch {
        setHasDeals(false);
      } finally {
        setDealsLoading(false);
      }
    };
    checkDeals();
  }, []);

  // Fetch trending searches from Firestore
  useEffect(() => {
    const q = query(
      collection(db, 'searchAnalytics'),
      orderBy('count', 'desc'),
      limit(10)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const trends = snap.docs.map(doc => doc.data().term as string);
      setTrendingSearches(trends);
    }, (err) => {
      console.error('Trending searches error:', err);
      // Fallback to empty if Firestore fails
      setTrendingSearches([]);
    });

    return () => unsub();
  }, []);

  // Save search analytics
  const logSearch = async (term: string) => {
    if (!term.trim()) return;
    try {
      const q = query(
        collection(db, 'searchAnalytics'),
        where('term', '==', term.toLowerCase().trim()),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        // Update existing
        const docRef = snap.docs[0].ref;
        const currentCount = snap.docs[0].data().count || 0;
        await updateDoc(docRef, {
          count: currentCount + 1,
          lastSearched: serverTimestamp()
        });
      } else {
        // Create new
        await addDoc(collection(db, 'searchAnalytics'), {
          term: term.toLowerCase().trim(),
          count: 1,
          lastSearched: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Failed to log search:', err);
    }
  };

  // Save recent search helper
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const updated = [term, ...prev.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      localStorage.setItem('trendit_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Delete a recent search
  const deleteRecentSearch = (e: React.MouseEvent, termToDelete: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== termToDelete);
      localStorage.setItem('trendit_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Build search suggestions
  useEffect(() => {
    const buildSuggestions = async () => {
      const trimmedQuery = searchQuery.trim().toLowerCase();
      const results: SearchSuggestion[] = [];

      // Empty query: show recent + trending
      if (trimmedQuery.length === 0) {
        recentSearches.slice(0, 5).forEach((term, i) => {
          results.push({ id: `recent-${i}`, text: term, type: 'recent' });
        });

        trendingSearches.slice(0, 4).forEach((term, i) => {
          if (!results.find(r => r.text.toLowerCase() === term.toLowerCase())) {
            results.push({ id: `trending-${i}`, text: term, type: 'trending' });
          }
        });

        setSuggestions(results);
        return;
      }

      if (trimmedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setSearching(true);
      try {
        // Category matches
        const matchingCategories = categories.filter(cat =>
          cat.name.toLowerCase().includes(trimmedQuery) ||
          cat.slug.toLowerCase().includes(trimmedQuery)
        ).slice(0, 3);

        matchingCategories.forEach(cat => {
          results.push({
            id: `cat-${cat.id}`,
            text: cat.name,
            type: 'category',
            slug: cat.slug
          });
        });

        // Brand suggestions from products
        const productsQ = query(collection(db, 'products'), limit(100));
        const productsSnap = await getDocs(productsQ);
        const allProducts = productsSnap.docs.map(doc => doc.data());

        const matchingBrands = [...new Set(
          allProducts
            .map((p: any) => p.brand)
            .filter((brand: string) => brand?.toLowerCase().includes(trimmedQuery))
        )].slice(0, 4);

        matchingBrands.forEach((brand, i) => {
          if (!results.find(r => r.text.toLowerCase() === (brand as string).toLowerCase())) {
            results.push({ id: `brand-${i}`, text: brand as string, type: 'brand' });
          }
        });

        // Search term itself
        if (!results.find(r => r.text.toLowerCase() === trimmedQuery)) {
          results.unshift({
            id: 'search-term',
            text: searchQuery.trim(),
            type: 'trending'
          });
        }

        setSuggestions(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(buildSuggestions, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, categories, recentSearches, trendingSearches]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideDesktopSearch = searchRef.current && searchRef.current.contains(target);
      const insideMobileSearch = mobileSearchRef.current && mobileSearchRef.current.contains(target);
      if (!insideDesktopSearch && !insideMobileSearch) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setShowSuggestions(false);
    setMobileSearchOpen(false);

    if (suggestion.type === 'category' && suggestion.slug) {
      navigate(`/search?cat=${suggestion.slug}`);
    } else {
      const searchTerm = suggestion.text;
      saveRecentSearch(searchTerm);
      logSearch(searchTerm); // Log to analytics
      setSearchQuery(searchTerm);
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      logSearch(searchQuery.trim()); // Log to analytics
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setMobileSearchOpen(false);
    }
  };

  const handleCategoryClick = (slug: string) => {
    if (isHomePage) {
      navigate(`/?cat=${slug}`, { replace: true });
    } else {
      navigate(`/?cat=${slug}`);
    }
  };

  const handleLogoClick = () => {
    if (isHomePage && activeCategory) {
      navigate('/', { replace: true });
    }
  };

  const renderSuggestionsDropdown = () => (
    <AnimatePresence>
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-[9999]"
        >
          {searching ? (
            <div className="px-4 py-8 flex flex-col items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-xs font-medium text-slate-400">Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-2 max-h-[400px] overflow-y-auto">
              {/* Recent searches with delete button */}
              {suggestions.filter(s => s.type === 'recent').length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recent</p>
                  {suggestions.filter(s => s.type === 'recent').map((s) => (
                    <div key={s.id} className="group flex items-center">
                      <button onClick={() => handleSuggestionClick(s)}
                        className="flex-1 text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-900">{s.text}</span>
                      </button>
                      <button
                        onClick={(e) => deleteRecentSearch(e, s.text)}
                        className="px-3 py-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove from recent searches"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Trending searches */}
              {suggestions.filter(s => s.type === 'trending').length > 0 && (
                <div>
                  {suggestions.some(s => s.type === 'recent') && <div className="border-t border-slate-100 my-1" />}
                  <p className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trending</p>
                  {suggestions.filter(s => s.type === 'trending').map((s) => (
                    <button key={s.id} onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-slate-900">{s.text}</span>
                      <span className="ml-auto text-[11px] text-slate-400">Search</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Categories */}
              {suggestions.filter(s => s.type === 'category').length > 0 && (
                <div>
                  {suggestions.some(s => s.type === 'recent' || s.type === 'trending') && <div className="border-t border-slate-100 my-1" />}
                  <p className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categories</p>
                  {suggestions.filter(s => s.type === 'category').map((s) => (
                    <button key={s.id} onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <LayoutGrid className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-900">{s.text}</span>
                      <span className="ml-auto text-[11px] text-slate-400">Category</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Brands */}
              {suggestions.filter(s => s.type === 'brand').length > 0 && (
                <div>
                  {suggestions.some(s => s.type !== 'brand') && <div className="border-t border-slate-100 my-1" />}
                  <p className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Brands</p>
                  {suggestions.filter(s => s.type === 'brand').map((s) => (
                    <button key={s.id} onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors">
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-slate-900">{s.text}</span>
                      <span className="ml-auto text-[11px] text-slate-400">Brand</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : searchQuery.trim().length >= 2 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-900">No suggestions found</p>
              <p className="text-xs text-slate-400 mt-1">Press Enter to search for "{searchQuery}"</p>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-white md:hidden"
          >
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-tr-[0.9rem] rounded-bl-[0.9rem] bg-gradient-to-br from-blue-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
                </div>
                <span className="font-display font-bold text-[21px] tracking-tighter text-slate-900 leading-none">Trendit</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 space-y-0.5">
              {isVendor && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 mb-1 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-sm font-bold">Admin Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Link>
              )}
              <Link to="/categories" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
                <LayoutGrid className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-800">Categories</span>
              </Link>
              {!dealsLoading && hasDeals && (
                <Link to="/search?deal=true" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <Tag className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-semibold text-slate-800">Deals</span>
                  <span className="ml-auto text-[11px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded">Hot</span>
                </Link>
              )}
              <div className="border-t border-slate-100 my-2" />
              <p className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Shop by Category</p>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { handleCategoryClick(cat.slug); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left ${activeCategory === cat.slug ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  {cat.image ? (
                    <img src={cat.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
                  {activeCategory === cat.slug && (
                    <span className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 md:h-[72px] flex items-center gap-4 md:gap-8 relative">

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* Logo */}
            <Link to="/" onClick={handleLogoClick} className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-8 h-8 rounded-tr-[0.9rem] rounded-bl-[0.9rem] bg-gradient-to-br from-blue-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-shadow">
                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-inner" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-[21px] tracking-tighter text-slate-900 leading-none">Trendit</span>
              </div>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-2xl hidden md:block relative" ref={searchRef}>
              <form className="relative w-full" onSubmit={handleSearchSubmit}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search for product, category, or brand"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                />
              </form>

              {renderSuggestionsDropdown()}
            </div>

            {/* Mobile search overlay */}
            {mobileSearchOpen && (
              <div ref={mobileSearchRef} className="absolute inset-0 bg-white flex items-center gap-2 px-4 md:hidden z-30">
                <button
                  type="button"
                  onClick={() => { setMobileSearchOpen(false); setShowSuggestions(false); }}
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
                <div className="relative flex-1">
                  <form className="relative w-full" onSubmit={handleSearchSubmit}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder="Search for product, category, or brand"
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all"
                    />
                  </form>
                  {renderSuggestionsDropdown()}
                </div>
              </div>
            )}

            {/* Right actions */}
            <div className="flex items-center gap-1 md:gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setMobileSearchOpen(true)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Search className="w-5 h-5 text-slate-600" />
              </button>

              {isVendor && (
                <>
                  {/* Compact icon-only below lg so vendors/admins can still reach
                      the dashboard on a phone, where the labelled pill won't fit. */}
                  <Link
                    to="/admin"
                    aria-label="Admin dashboard"
                    className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    {isSuperAdmin && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />}
                  </Link>
                  <Link to="/admin" className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors relative">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin</span>
                    {isSuperAdmin && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />}
                  </Link>
                </>
              )}

              {user && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={handleOpenNotifications}
                    className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <Bell className="w-5 h-5 text-slate-500" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white px-1">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <AnimatePresence>
                    {notificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute top-[calc(100%+8px)] right-0 w-80 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-[9999]"
                      >
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</p>
                        </div>
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Sparkles className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">No notifications yet.</p>
                          </div>
                        ) : (
                          <div className="max-h-[360px] overflow-y-auto">
                            {notifications.map(n => {
                              const { text, link, icon: NotifIcon } = getNotificationContent(n);
                              return (
                                <Link
                                  key={n.id}
                                  to={link}
                                  onClick={() => setNotificationsOpen(false)}
                                  className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${!n.read ? 'bg-blue-50/40' : ''}`}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                    <NotifIcon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm text-slate-800">{text}</p>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <Link to={user ? "/favorites" : "/login"} className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors group">
                <Heart className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" />
                <span className="hidden lg:block text-sm font-semibold text-slate-700 group-hover:text-slate-900">Favorites</span>
                {wishlistCount > 0 && (
                  <span className="hidden lg:flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] font-bold rounded-full px-1">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link to={user ? "/account" : "/login"} className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors group">
                <User className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                <span className="hidden lg:block text-sm font-semibold text-slate-700 group-hover:text-slate-900">{user ? 'My Account' : 'Log in'}</span>
              </Link>

              <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors active:scale-95 relative">
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden lg:block text-sm font-bold">Cart</span>
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] font-bold flex items-center justify-center rounded-full border-2 border-white px-1"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Category Nav Bar */}
        <div className="hidden md:block border-t border-slate-100 bg-white">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-0.5 h-11 overflow-x-auto scrollbar-hide">
              <Link to="/categories"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all whitespace-nowrap"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Categories</span>
              </Link>

              {!dealsLoading && hasDeals && (
                <Link to="/search?deal=true"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 transition-all whitespace-nowrap"
                >
                  <Tag className="w-3.5 h-3.5 text-orange-500" />
                  <span>Deals</span>
                  <span className="text-[9px] font-bold text-white bg-orange-500 px-1 py-0.5 rounded leading-none">Hot</span>
                </Link>
              )}

              <div className="w-px h-5 bg-slate-200 mx-1" />

              {categoriesLoading ? (
                <div className="flex items-center gap-2 px-3">
                  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                  <span className="text-[13px] text-slate-400">Loading...</span>
                </div>
              ) : (
                categories.map((cat) => {
                  const isActive = activeCategory === cat.slug && isHomePage;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.slug)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                      }`}
                    >
                      {cat.image && (
                        <img src={cat.image} alt="" className="w-4 h-4 rounded object-cover" />
                      )}
                      <span>{cat.name}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full ml-0.5" />
                      )}
                    </button>
                  );
                })
              )}
            </nav>
          </div>
        </div>

        {/* Active category indicator */}
        {activeCategory && (
          <div className="hidden md:block bg-white border-t border-slate-100">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Browsing:</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {categories.find(c => c.slug === activeCategory)?.name || activeCategory}
                </span>
              </div>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
              >
                <X className="w-3.5 h-3.5" /> Clear filter
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};