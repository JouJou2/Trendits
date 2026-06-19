import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface AIElevatorPitchProps {
  productTitle: string;
  productDescription: string;
  brand: string;
}

export const AIElevatorPitch: React.FC<AIElevatorPitchProps> = ({ 
  productTitle, 
  productDescription,
  brand
}) => {
  const [pitch, setPitch] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const generatePitch = async () => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return;

      setIsLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `You are an expert product marketer. Create a punchy, 2-sentence "elevator pitch" for this product that highlights its unique value proposition and why someone in Lebanon should want it. Product: ${productTitle} by ${brand}. Description: ${productDescription}. Keep it energetic and persuasive.`,
          config: {
            systemInstruction: "Speak like a high-end luxury concierge. Be brief. Maximum 30 words.",
          }
        });

        if (response.text) {
          setPitch(response.text.trim());
        }
      } catch (error) {
        console.error("Gemini AI Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    generatePitch();
  }, [productTitle, productDescription, brand]);

  if (!isLoading && !pitch) return null;

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
          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Smart Highlight</h4>
          {isLoading ? (
            <div className="flex items-center gap-2 text-slate-500 font-medium italic animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Curating the perfect pitch...</span>
            </div>
          ) : (
            <p className="text-slate-700 font-medium leading-relaxed italic">
              "{pitch}"
            </p>
          )}
        </div>
      </div>
      
      {/* Dynamic background element */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
    </motion.div>
  );
};
