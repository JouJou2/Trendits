import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, MessageCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import { allProducts } from '../data/products';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

// Safe initialization of Gemini SDK
const getGoogleGenAI = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

type Message = {
  id: string;
  role: 'user' | 'model';
  content: string;
};

// Parser to find all occurrences of [PRODUCT_ID: id]
const parseProductIds = (text: string): string[] => {
  const regex = /\[PRODUCT_ID:\s*["']?([a-zA-Z0-9_-]+)["']?\]/gi;
  const ids: string[] = [];
  let match;
  const clonedRegex = new RegExp(regex);
  while ((match = clonedRegex.exec(text)) !== null) {
    if (match[1]) {
      ids.push(match[1].trim());
    }
  }
  // Deduplicate
  return Array.from(new Set(ids));
};

const cleanTextOfProductTags = (text: string): string => {
  return text.replace(/\[PRODUCT_ID:\s*["']?[a-zA-Z0-9_-]+["']?\]/gi, '').trim();
};

export const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const phoneNumber = '96170000000'; // Placeholder Lebanese number
  const whatsappMessage = 'Hello Trendit Support, I have a question about my order.';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      role: 'model',
      content: 'Hi there! I am the Trendit support assistant. How can I help you with our marketplace or products today?'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to UI
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: userMessage };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const ai = getGoogleGenAI();
      let modelReply = '';

      if (!ai) {
        // Safe smart dynamic search fallback when no API key configuration is active
        const query = userMessage.toLowerCase();
        
        // Find matching products by title, brand, or category ID
        const matches = allProducts.filter(p => 
          p.title.toLowerCase().includes(query) || 
          p.brand.toLowerCase().includes(query) || 
          p.categoryId.toLowerCase().includes(query)
        ).slice(0, 2);

        if (matches.length > 0) {
          modelReply = `I found some matches on Trendit OS corresponding to your request:\n\n` +
            matches.map(m => `* **${m.title}** by ${m.brand} available for **$${m.price}** [PRODUCT_ID: ${m.id}]`).join('\n') +
            `\n\nIs there anything else I can search or assist you with?`;
        } else {
          // General queries or order inquiries
          if (query.includes('order') || query.includes('track') || query.includes('status')) {
            modelReply = `To track or update your order status, please provide me with your 6-digit **Order ID**, or send an email to our support branch at support@trendit.com. You can also click the "Chat with us" button above to message our live staff on WhatsApp!`;
          } else if (query.includes('hello') || query.includes('hi ') || query.includes('hey')) {
            modelReply = `Hello there! I am your Trendit customer support assistant. I can help search our elite catalog or resolve common order queries. Try asking me about available jackets, electronics, or shoes!`;
          } else if (query.includes('shipping') || query.includes('delivery')) {
            modelReply = `We offer express delivery all across Lebanon! Orders are processed immediately and arrive in 1-3 business days.`;
          } else {
            // General recommendation of popular products
            const randomProducts = allProducts.slice(0, 2);
            modelReply = `I couldn't find exactly what you were looking for, but here are some popular products trending on our platform now:\n\n` +
              randomProducts.map(m => `* **${m.title}** ($${m.price}) [PRODUCT_ID: ${m.id}]`).join('\n') +
              `\n\nFor more urgent help, feel free to use our Live WhatsApp support link directly in our conversation window above.`;
          }
        }
      } else {
        // Create condensed catalog string to save tokens while keeping contextual awareness
        const catalogData = allProducts.map(p => 
          `ID:${p.id} Name:"${p.title}" Price:$${p.price} Brand:"${p.brand}" Category:"${p.categoryId}"`
        ).join(' | ');

        const systemInstruction = `You are the official customer support chatbot for "Trendit OS", an elite modern multi-vendor marketplace.
        
        Personality: Professional, concise, warm, helpful, data-driven. Do NOT generate overly long massive paragraphs. Use lists where appropriate.
        
        You have access to the platform's current data.
        Our current vendors: Beirut Tech Hub, Urban Threads, ElectroZone (Pending), Home Essentials.
        Our products: ${catalogData}
        
        Rules:
        1. Answer questions about these specific products, vendors, and marketplace policies.
        2. If a customer asks for a product not in the catalog, let them know politely we don't have it currently.
        3. For questions about orders, pretend to check and say you need an Order ID, then ask them to email support@trendit.com.
        4. Crucial Recommendation Rule: Whenever you mention, suggest, recommend, or refer to any products in the catalog in your response, you MUST append a tag in the exact format: [PRODUCT_ID: <id>] for each product you recommend at the very end of your final sentence. For example: "I highly recommend the premium leather jacket [PRODUCT_ID: 1] as a great choice for style." or "Here is the iPhone 15 [PRODUCT_ID: 101]." This tag is parsed by our UI to show interactive product cards with images and links. Always include it when referencing a specific item.
        `;

        // Pass conversation history to API
        const conversationHistory = messages.map(msg => 
          `${msg.role === 'user' ? 'Customer' : 'Trendit Support'}: ${msg.content}`
        ).join('\n') + `\nCustomer: ${userMessage}\nTrendit Support:`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: conversationHistory,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.5,
          },
        });

        modelReply = response.text || "I'm sorry, I encountered an error pulling up that information. Please try again.";
      }

      setMessages((prev) => [
        ...prev, 
        { id: Date.now().toString() + 'bot', role: 'model', content: modelReply }
      ]);
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages((prev) => [
        ...prev, 
        { id: Date.now().toString() + 'err', role: 'model', content: "Sorry, I seem to be having network issues. Please contact our human support at support@trendit.com for immediate help!" }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 p-4 pt-4 mt-0 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all duration-300 transform hover:scale-110 active:scale-95 group cursor-pointer"
        title="Chat with Support"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MessageSquare className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-36 right-4 md:bottom-24 md:right-8 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 flex flex-col overflow-hidden" 
            style={{ height: '500px', maxHeight: 'calc(100vh - 160px)' }}
          >
            {/* Header */}
            <div className="bg-slate-900/95 text-white p-5 flex items-center justify-between z-10 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center relative shadow-lg shadow-blue-600/20">
                  <Bot className="w-6 h-6 text-white" />
                  <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display tracking-tight uppercase italic opacity-90">Trendit Assist.</h3>
                  <p className="text-[10px] text-slate-400 font-black tracking-widest leading-none">NEURAL SUPPORT v1.2</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* WhatsApp Support Integration */}
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-5 py-3 flex items-center justify-between gap-3 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]"></span>
                </span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">Live Support</span>
              </div>
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1eaf53] text-white px-3 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat with us</span>
              </a>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 max-w-[85%]">
                    <div className={`rounded-[1.5rem] p-4 text-sm shadow-xl shadow-slate-900/5 font-medium leading-relaxed
                      ${msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none w-full' 
                        : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none w-full'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <div className="markdown-body">
                          <Markdown>{cleanTextOfProductTags(msg.content)}</Markdown>
                        </div>
                      )}
                    </div>

                    {msg.role === 'model' && parseProductIds(msg.content).length > 0 && (
                      <div className="space-y-2 mt-1">
                        {parseProductIds(msg.content).map((prodId) => {
                          const product = allProducts.find(p => p.id.toString() === prodId.toString());
                          if (!product) return null;
                          return (
                            <div 
                              key={prodId}
                              className="bg-white/95 border border-slate-100 rounded-2xl p-2.5 flex items-center gap-3 transition-all hover:border-blue-200/60 shadow-lg shadow-slate-100"
                            >
                              <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 p-1 flex items-center justify-center">
                                <img 
                                  src={product.image} 
                                  alt={product.title} 
                                  className="w-full h-full object-contain rounded-lg"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">{product.brand}</span>
                                <h4 className="text-[11px] font-extrabold text-slate-800 truncate leading-snug">{product.title}</h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs font-black text-slate-900">${product.price}</span>
                                  {product.oldPrice && (
                                    <span className="text-[9px] font-bold text-slate-400 line-through">${product.oldPrice}</span>
                                  )}
                                </div>
                              </div>
                              <Link 
                                to={`/product/${product.id}`}
                                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-2 rounded-xl transition-all shadow-md hover:shadow-blue-500/25 active:scale-95 text-center cursor-pointer font-extrabold"
                              >
                                View Item
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-white border border-slate-100 text-slate-500 rounded-[1.5rem] rounded-tl-none p-4 shadow-xl shadow-slate-900/5 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Synthesizing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-5 pt-0 bg-transparent relative">
              <div className="absolute bottom-full left-0 right-0 h-8 bg-gradient-to-t from-white/90 to-transparent pointer-events-none"></div>
              <form onSubmit={handleSendMessage} className="flex gap-2 p-2 bg-slate-50 rounded-[1.5rem] border border-slate-100 shadow-inner">
                <input
                  type="text"
                  placeholder="Inquire products..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none rounded-xl px-4 py-2 text-sm focus:outline-none placeholder-slate-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-3 rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0 active:scale-90"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
