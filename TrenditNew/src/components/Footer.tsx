import React from 'react';
import { ChevronRight, Facebook, Twitter, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => (
  <footer className="bg-white/40 backdrop-blur-3xl border-t border-white/20 pt-16 text-sm relative z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-extrabold text-gray-900 uppercase tracking-widest text-[10px] mb-6 font-display">Customer Service</h3>
          <ul className="space-y-3 text-gray-600 font-medium">
            <li className="flex items-center gap-2 group"><ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-primary transition-colors"/> <a href="#" className="hover:text-primary">Help Center</a></li>
            <li className="flex items-center gap-2 group"><ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-primary transition-colors"/> <a href="#" className="hover:text-primary">Returns Policy</a></li>
            <li className="flex items-center gap-2 group"><ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-primary transition-colors"/> <a href="#" className="hover:text-primary">Track Order</a></li>
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-extrabold text-gray-900 uppercase tracking-widest text-[10px] mb-6 font-display">About Us</h3>
          <ul className="space-y-3 text-gray-600 font-medium">
            <li><a href="#" className="hover:text-primary transition-colors">Our Story</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
          </ul>
        </div>
        <div className="col-span-2 md:col-span-1">
          <h3 className="font-extrabold text-gray-900 uppercase tracking-widest text-[10px] mb-6 font-display">Follow Us</h3>
          <div className="flex gap-3">
            <a href="#" className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 hover:-translate-y-1">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 hover:-translate-y-1">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 hover:-translate-y-1">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="col-span-2 md:col-span-2 flex flex-col items-start md:items-end w-full">
           <div className="flex gap-4 w-full justify-start md:justify-end opacity-80 hover:opacity-100 transition-opacity">
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-[40px] cursor-pointer" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-[40px] cursor-pointer" />
           </div>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-display font-extrabold text-gray-900 text-2xl tracking-tighter hover:text-primary transition-colors">Trendit</Link>
          <span className="mx-2 text-gray-200">|</span>
          <Link to="/admin" className="text-[10px] text-gray-400 hover:text-primary uppercase font-extrabold tracking-widest transition-colors">Admin Panel</Link>
        </div>
        <p className="text-gray-400 text-xs font-medium uppercase tracking-widest">
          © 2024 Trendit Marketplace. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);
