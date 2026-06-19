import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

export const MobileNav = () => {
  const location = useLocation();
  const { cartCount, setIsCartOpen } = useCart();
  const { user } = useAuth();

  const isHomeActive = location.pathname === '/';
  const isFavoritesActive = location.pathname === '/favorites';
  const isProfileActive = location.pathname === '/account' || location.pathname === '/login';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 pb-safe pt-1 shadow-[0_-8px_20px_rgba(0,0,0,0.03)] h-12.5">
      <div className="flex items-center justify-between max-w-md mx-auto h-11">
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-0.5 transition-all text-center flex-1 cursor-pointer ${isHomeActive ? 'text-blue-600 font-extrabold translate-y-[-1px]' : 'text-slate-400 font-bold'}`}
        >
          <Home className={`w-4 h-4 transition-transform ${isHomeActive ? 'scale-110' : ''}`} />
          <span className="text-[8.5px] uppercase tracking-wider">Home</span>
        </Link>

        <Link 
          to={user ? "/favorites" : "/login"}
          className={`flex flex-col items-center gap-0.5 transition-all text-center flex-1 cursor-pointer ${isFavoritesActive ? 'text-blue-600 font-extrabold translate-y-[-1px]' : 'text-slate-400 font-bold'}`}
        >
          <Heart className={`w-4 h-4 transition-transform ${isFavoritesActive ? 'fill-blue-600 scale-110' : ''}`} />
          <span className="text-[8.5px] uppercase tracking-wider">Favorites</span>
        </Link>

        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative flex flex-col items-center gap-0.5 text-slate-400 font-bold text-center flex-1 cursor-pointer hover:text-blue-600 transition-all"
        >
          <div className="relative">
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[7px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full border border-white">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[8.5px] uppercase tracking-wider">My Kart</span>
        </button>

        <Link 
          to={user ? "/account" : "/login"} 
          className={`flex flex-col items-center gap-0.5 transition-all text-center flex-1 cursor-pointer ${isProfileActive ? 'text-blue-600 font-extrabold translate-y-[-1px]' : 'text-slate-400 font-bold'}`}
        >
          <User className={`w-4 h-4 transition-transform ${isProfileActive ? 'scale-110' : ''}`} />
          <span className="text-[8.5px] uppercase tracking-wider">Profile</span>
        </Link>
      </div>
    </nav>
  );
};
