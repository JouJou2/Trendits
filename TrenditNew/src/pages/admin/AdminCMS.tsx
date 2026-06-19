import React, { useState } from 'react';
import { 
  Eye, Save, MoveUp, MoveDown, ToggleLeft, ToggleRight, 
  Layout, Palette, Type, Smartphone, Laptop, Loader2
} from 'lucide-react';
import { useCms } from '../../contexts/CmsContext';

export const AdminCMS = () => {
  const { 
    sections, moveSectionUp, moveSectionDown, toggleSectionStatus,
    primaryColor, setPrimaryColor, fontFamily, setFontFamily, saveConfig
  } = useCms();
  
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const handleSave = async () => {
    setSaving(true);
    await saveConfig();
    setSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Website Editor (CMS)</h1>
          <p className="text-slate-500 text-sm mt-1">Control your homepage layout, themes, and content sections.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Eye className="w-4 h-4" /> Live Preview
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Publish Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Panel */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Theme Section */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <Palette className="w-5 h-5 text-blue-600" />
              <h2>Theme & Visuals</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Primary Brand Color</label>
                <div className="flex gap-3 items-center">
                  <input 
                    type="color" 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-lg border border-slate-200 cursor-pointer p-1"
                  />
                  <input 
                    type="text" 
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 p-2.5 border border-slate-200 rounded-lg text-sm font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Display Font</label>
                <div className="relative">
                  <Type className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white transition-colors outline-none cursor-pointer"
                  >
                    <option value="Inter">Inter (Modern Sans)</option>
                    <option value="Outfit">Outfit (Clean Geometric)</option>
                    <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech Monospace)</option>
                    <option value="JetBrains Mono">JetBrains Mono (Technical)</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Layout Section */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
              <Layout className="w-5 h-5 text-blue-600" />
              <h2>Homepage Structure</h2>
            </div>
            
            <div className="space-y-3">
              {sections.map((section, idx) => (
                <div key={section.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${section.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveSectionUp(idx)}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => moveSectionDown(idx)}
                      disabled={idx === sections.length - 1}
                      className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{section.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{section.type}</p>
                  </div>

                  <button 
                    onClick={() => toggleSectionStatus(section.id)}
                    className={`transition-colors ${section.active ? 'text-blue-600' : 'text-slate-300'}`}
                  >
                    {section.active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Live Simulator Panel */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 rounded-[2.5rem] p-4 border-[8px] border-slate-800 shadow-2xl sticky top-24 mx-auto max-w-[380px] lg:max-w-none lg:w-full aspect-[9/16] lg:aspect-auto lg:h-[700px] flex flex-col">
            {/* Simulator Controls */}
            <div className="flex justify-center gap-4 mb-4">
               <button 
                onClick={() => setPreviewDevice('mobile')}
                className={`p-2 rounded-lg transition-colors ${previewDevice === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
               >
                 <Smartphone className="w-4 h-4" />
               </button>
               <button 
                onClick={() => setPreviewDevice('desktop')}
                className={`p-2 rounded-lg transition-colors ${previewDevice === 'desktop' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
               >
                 <Laptop className="w-4 h-4" />
               </button>
            </div>
            
            {/* Simulator Screen */}
            <div className={`bg-white rounded-2xl overflow-hidden flex-1 relative transition-all duration-500 mx-auto ${previewDevice === 'mobile' ? 'w-full' : 'w-full'}`}>
              <div className="absolute inset-0 overflow-y-auto overflow-x-hidden hide-scrollbar bg-slate-50">
                {/* Mock Website Preview */}
                <div className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10 border-b border-slate-100">
                  <div className="w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
                  <div className="flex gap-2">
                    <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                    <div className="w-4 h-4 bg-slate-200 rounded-full"></div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {sections.filter(s => s.active).map(s => (
                    <div key={s.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {s.id === 'Hero' && (
                        <div className="h-40 rounded-xl overflow-hidden relative">
                           <div className="absolute inset-0 opacity-40" style={{ backgroundColor: primaryColor }}></div>
                           <div className="absolute inset-0 p-6 flex flex-col justify-end">
                              <div className="w-2/3 h-4 bg-white/50 rounded mb-2"></div>
                              <div className="w-1/2 h-3 bg-white/30 rounded"></div>
                           </div>
                        </div>
                      )}
                      {s.id === 'Categories' && (
                        <div className="grid grid-cols-2 gap-2">
                           {[1,2,3,4].map(n => <div key={n} className="h-20 bg-white rounded-lg border border-slate-100 shadow-sm"></div>)}
                        </div>
                      )}
                      {(s.id === 'FeaturedProducts' || s.id === 'LocalStores') && (
                        <div className="flex gap-3 overflow-hidden">
                           {[1,2,3].map(n => (
                             <div key={n} className="w-32 h-40 bg-white rounded-lg border border-slate-100 shadow-sm flex-shrink-0 flex flex-col p-2 space-y-2">
                                <div className="h-24 bg-slate-50 rounded"></div>
                                <div className="h-3 bg-slate-100 rounded w-full"></div>
                                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                             </div>
                           ))}
                        </div>
                      )}
                      {s.id === 'Banner' && (
                        <div className="h-12 rounded-lg flex items-center justify-center p-3 text-white text-[10px] font-bold" style={{ backgroundColor: primaryColor }}>
                           TRENDING DISCOUNTS • LIMITED TIME ONLY
                        </div>
                      )}
                      {s.id === 'WhyShop' && (
                        <div className="space-y-2">
                           {[1,2].map(n => (
                             <div key={n} className="h-10 bg-white rounded-lg border border-slate-100 flex items-center px-3 gap-3">
                                <div className="w-5 h-5 rounded bg-blue-50"></div>
                                <div className="h-2 bg-slate-100 rounded flex-1"></div>
                             </div>
                           ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
