import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchElevatorPitch } from '../services/aiBackend';

interface AIElevatorPitchProps {
  /** The server reads the product's own details from this id. */
  productId: string;
}

export const AIElevatorPitch: React.FC<AIElevatorPitchProps> = ({ productId }) => {
  const [pitch, setPitch] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    const generatePitch = async () => {
      try {
        const response = await fetchElevatorPitch(productId);
        if (!cancelled && response.text) {
          setPitch(response.text.trim());
        }
      } catch (error) {
        console.error("Elevator pitch backend error:", error);
      }
    };

    generatePitch();
    return () => { cancelled = true; };
  }, [productId]);

  // Only render once we actually have a pitch — no loading flash that then
  // disappears on failure (e.g. API quota exhausted), which left a visible gap.
  if (!pitch) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5 mt-6 mb-8 group"
    >
      <div className="flex items-start gap-4 relative z-10">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-200">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Smart Highlight</h4>
          <p className="text-slate-700 font-medium leading-relaxed italic">
            "{pitch}"
          </p>
        </div>
      </div>

      {/* Dynamic background element */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
    </motion.div>
  );
};
