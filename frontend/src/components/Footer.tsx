import React from 'react';
import { ChevronRight, Facebook, Twitter, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Every footer link points at a route that actually exists — dead "#" links
// read as an unfinished site to shoppers.
const CUSTOMER_SERVICE_LINKS = [
  { label: 'Help Center', to: '/account?tab=help' },
  { label: 'Returns Policy', to: '/account?tab=help' },
  { label: 'Track Order', to: '/account?tab=orders' },
];

const SHOP_LINKS = [
  { label: 'All Categories', to: '/categories' },
  { label: 'Deals', to: '/search?deal=true' },
  { label: 'My Favorites', to: '/favorites' },
];

// Add real profile URLs here to make the "Follow Us" block appear. Left empty
// on purpose: linking social icons to "#" is worse than not showing them.
const SOCIAL_LINKS: { label: string; href: string; Icon: React.ElementType }[] = [
  // { label: 'Facebook', href: 'https://facebook.com/...', Icon: Facebook },
  // { label: 'Instagram', href: 'https://instagram.com/...', Icon: Instagram },
  // { label: 'X', href: 'https://x.com/...', Icon: Twitter },
];

export const Footer = () => {
  const { isVendor } = useAuth();

  return (
  <footer className="bg-white/40 backdrop-blur-3xl border-t border-white/20 pt-16 text-sm relative z-10">
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-extrabold text-gray-900 uppercase tracking-wide text-[11px] mb-6 font-display">Customer Service</h3>
          <ul className="space-y-3 text-gray-600 font-medium">
            {CUSTOMER_SERVICE_LINKS.map(link => (
              <li key={link.label} className="flex items-center gap-2 group">
                <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-primary transition-colors" />
                <Link to={link.to} className="hover:text-primary transition-colors">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-extrabold text-gray-900 uppercase tracking-wide text-[11px] mb-6 font-display">Shop</h3>
          <ul className="space-y-3 text-gray-600 font-medium">
            {SHOP_LINKS.map(link => (
              <li key={link.label} className="flex items-center gap-2 group">
                <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-primary transition-colors" />
                <Link to={link.to} className="hover:text-primary transition-colors">{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        {SOCIAL_LINKS.length > 0 && (
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-extrabold text-gray-900 uppercase tracking-wide text-[11px] mb-6 font-display">Follow Us</h3>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 hover:-translate-y-1"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-display font-extrabold text-gray-900 text-2xl tracking-tighter hover:text-primary transition-colors">Trendit</Link>
          {/* Staff-only entry point — shoppers shouldn't see an admin link in the footer. */}
          {isVendor && (
            <>
              <span className="mx-2 text-gray-200">|</span>
              <Link to="/admin" className="text-[11px] text-gray-400 hover:text-primary uppercase font-extrabold tracking-wide transition-colors">Admin Panel</Link>
            </>
          )}
        </div>
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">
          © {new Date().getFullYear()} Trendit Marketplace. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
  );
};
