import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

// Shared shell for every tab so the touch targets stay uniform. Each item is a
// full-height 56px row (above the 44pt/48dp minimum) rather than just the
// icon+label box, so taps near the edges still register.
const itemClass = (active: boolean) =>
  `relative flex flex-col items-center justify-center gap-1 flex-1 h-14 cursor-pointer transition-colors ${
    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
  }`;

const labelClass = 'text-[11px] font-bold uppercase tracking-wide leading-none';

const ActiveBar = () => (
  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-blue-600" />
);

export const MobileNav = () => {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const isHomeActive = location.pathname === '/';
  const isFavoritesActive = location.pathname === '/favorites';
  const isProfileActive = location.pathname === '/account' || location.pathname === '/login';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch max-w-md mx-auto px-2">
        <Link to="/" className={itemClass(isHomeActive)}>
          {isHomeActive && <ActiveBar />}
          <Home className="w-[22px] h-[22px]" strokeWidth={isHomeActive ? 2.5 : 2} />
          <span className={labelClass}>Home</span>
        </Link>

        <Link to={user ? '/favorites' : '/login'} className={itemClass(isFavoritesActive)}>
          {isFavoritesActive && <ActiveBar />}
          <Heart className={`w-[22px] h-[22px] ${isFavoritesActive ? 'fill-blue-600' : ''}`} strokeWidth={isFavoritesActive ? 2.5 : 2} />
          <span className={labelClass}>Favorites</span>
        </Link>

        <button onClick={() => setIsCartOpen(true)} className={itemClass(false)}>
          <span className="relative">
            <ShoppingCart className="w-[22px] h-[22px]" strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </span>
          <span className={labelClass}>Cart</span>
        </button>

        <Link to={user ? '/account' : '/login'} className={itemClass(isProfileActive)}>
          {isProfileActive && <ActiveBar />}
          <User className="w-[22px] h-[22px]" strokeWidth={isProfileActive ? 2.5 : 2} />
          <span className={labelClass}>Profile</span>
        </Link>
      </div>
    </nav>
  );
};
