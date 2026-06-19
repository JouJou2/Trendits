import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const BackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show the back button on the homepage
  if (location.pathname === '/') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, x: -20, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        className="fixed bottom-20 left-4 md:bottom-8 md:left-8 z-50 flex"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center bg-slate-950/95 hover:bg-blue-600 backdrop-blur-xl px-4.5 py-3 rounded-2xl shadow-2xl shadow-slate-950/30 text-white font-extrabold text-xs uppercase tracking-widest transition-all duration-300 group active:scale-95 border border-slate-800 cursor-pointer"
          id="global-back-button"
        >
          <ChevronLeft className="h-4.5 w-4.5 mr-1 transition-transform group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
