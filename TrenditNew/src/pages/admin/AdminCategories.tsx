import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, GripVertical, Search, Loader2 } from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as Category));
      setCategories(cats);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date().toISOString(),
        productCount: 0
      });
      setNewCategoryName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const filteredCategories = categories.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading categories...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-900">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Category Architecture</h1>
          <p className="text-slate-500 text-sm mt-1">Manage global product taxonomies and landing pages.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
             <div className="relative flex-1 max-w-md">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  className="w-full pl-10 pr-4 py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          <div className="space-y-3">
             {filteredCategories.map(cat => (
                <div key={cat.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors shadow-sm">
                   <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                         <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                         <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                            <Layers className="w-5 h-5" />
                         </div>
                         <div>
                            <span className="font-bold text-slate-900">{cat.name}</span>
                            <div className="flex gap-2 items-center mt-0.5">
                               <span className="text-slate-500 text-xs font-mono">/{cat.slug}</span>
                               <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                               <span className="bg-slate-100 text-slate-600 text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">{cat.productCount || 0} products</span>
                            </div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button className="p-2 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                            <Edit2 className="w-4 h-4" />
                         </button>
                         <button 
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </div>
             ))}
             {filteredCategories.length === 0 && (
               <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium">
                  No categories found. Start by adding one.
               </div>
             )}
          </div>
        </div>

        {/* Add Category Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Add New Category
            </h2>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Category Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Home Appliances" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <p className="mt-1.5 text-[10px] text-slate-400">Slug: <span className="font-mono">{newCategoryName.toLowerCase().replace(/\s+/g, '-')}</span></p>
              </div>
              
              <button 
                type="submit"
                disabled={adding || !newCategoryName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50 transition-all"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Category
              </button>
            </form>
          </div>
          
          <div className="bg-blue-600 rounded-xl p-6 text-white shadow-xl shadow-blue-900/20">
             <h3 className="font-bold text-sm mb-2">Category Tips</h3>
             <p className="text-blue-100 text-xs leading-relaxed">
                Use broad categories for top-level root items. You can organize specific products by linking them to these IDs in the Products manager.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
