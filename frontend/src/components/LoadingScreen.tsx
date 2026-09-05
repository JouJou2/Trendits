import React from 'react';
import { motion } from 'motion/react';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated Background Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full"
        />
        
        {/* Logo Animation */}
        <div className="relative flex flex-col items-center">
          <motion.div 
            initial={{ rotate: -12, scale: 0.8, opacity: 0 }}
            animate={{ rotate: 12, scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              repeat: Infinity,
              repeatType: "reverse",
              duration: 2
            }}
            className="w-20 h-20 rounded-tr-[2rem] rounded-bl-[2rem] bg-gradient-to-br from-blue-600 to-indigo-400 flex items-center justify-center shadow-2xl shadow-blue-900/20 mb-8"
          >
            <div className="w-10 h-10 bg-white rounded-full shadow-inner" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h2 className="font-display text-4xl font-bold text-slate-900 tracking-tighter uppercase mb-2">
              Trendit<span className="text-primary">.</span>
            </h2>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-1.5 h-1.5 bg-primary rounded-full"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Bottom Status */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 font-display text-[11px] font-bold uppercase tracking-[0.3em] text-slate-900"
      >
        Initializing Marketplace...
      </motion.p>
    </div>
  );
};
