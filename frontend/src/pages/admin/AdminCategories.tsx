import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Edit2, Trash2, GripVertical, Search, Loader2, Check, X, Upload } from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

type VariantType = 'size' | 'color';

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string;
  type?: 'main' | 'other';
  productCount?: number;
  variantTypes?: VariantType[];
}

const toggleVariantType = (types: VariantType[], type: VariantType): VariantType[] =>
  types.includes(type) ? types.filter(t => t !== type) : [...types, type];

export const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'main' | 'other'>('other');
  const [newCategoryVariantTypes, setNewCategoryVariantTypes] = useState<VariantType[]>([]);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editType, setEditType] = useState<'main' | 'other'>('other');
  const [editVariantTypes, setEditVariantTypes] = useState<VariantType[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const newImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage();

  const uploadCategoryImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `categories/${timestamp}_${randomStr}.${extension}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (error) => reject(error),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
      );
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onDone: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large. Max 5MB.');
      return;
    }
    setUploadingImage(true);
    setUploadProgress(0);
    try {
      const url = await uploadCategoryImage(file);
      onDone(url);
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Category));
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
        image: newCategoryImage || '',
        type: newCategoryType,
        variantTypes: newCategoryVariantTypes,
        createdAt: new Date().toISOString(),
        productCount: 0
      });
      setNewCategoryName('');
      setNewCategoryImage('');
      setNewCategoryType('other');
      setNewCategoryVariantTypes([]);
      toast.success('Category added!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      const inUseSnap = await getDocs(query(collection(db, 'products'), where('categoryId', '==', cat.slug)));
      if (!inUseSnap.empty) {
        toast.error(`Can't delete "${cat.name}" — ${inUseSnap.size} product${inUseSnap.size !== 1 ? 's' : ''} still use this category. Reassign them first.`);
        return;
      }
    } catch (error) {
      console.error('Failed to check category usage:', error);
      toast.error('Failed to verify category usage. Please try again.');
      return;
    }

    if (!confirm(`Delete the "${cat.name}" category? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'categories', cat.id));
      toast.success('Category deleted!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${cat.id}`);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditImage(cat.image || '');
    setEditType(cat.type || 'other');
    setEditVariantTypes(cat.variantTypes || []);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'categories', id), {
        name: editName,
        slug: editName.toLowerCase().replace(/\s+/g, '-'),
        image: editImage,
        type: editType,
        variantTypes: editVariantTypes,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
      toast.success('Category updated!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const filteredCategories = categories.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading categories...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-900">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Category Architecture</h1>
        <p className="text-slate-500 text-sm mt-1">Manage global product taxonomies and landing pages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="relative">
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
                {editingId === cat.id ? (
                  <div className="p-4 space-y-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Category name"
                    />
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 relative">
                        <input
                          value={editImage}
                          onChange={e => setEditImage(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Image URL"
                        />
                        <button
                          type="button"
                          onClick={() => editImageInputRef.current?.click()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Upload from computer"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <input
                          ref={editImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, (url) => setEditImage(url))}
                        />
                      </div>
                      {editImage && (
                        <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                          <img src={editImage} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                    </div>
                    <select
                      value={editType}
                      onChange={e => setEditType(e.target.value as 'main' | 'other')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="main">Main Category</option>
                      <option value="other">Other Category</option>
                    </select>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Product Variants</label>
                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={editVariantTypes.includes('size')} onChange={() => setEditVariantTypes(t => toggleVariantType(t, 'size'))} className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500" />
                          Size
                        </label>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                          <input type="checkbox" checked={editVariantTypes.includes('color')} onChange={() => setEditVariantTypes(t => toggleVariantType(t, 'color'))} className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500" />
                          Color
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(cat.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                      {cat.image ? (
                        <img src={cat.image} className="w-10 h-10 rounded-lg object-cover" alt={cat.name} />
                      ) : (
                        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600"><Layers className="w-5 h-5" /></div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900">{cat.name}</span>
                        <div className="flex gap-2 items-center mt-0.5 flex-wrap">
                          <span className="text-slate-500 text-xs font-mono">/{cat.slug}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className={`text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider ${cat.type === 'main' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                            {cat.type || 'other'}
                          </span>
                          <span className="bg-slate-100 text-slate-600 text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">{cat.productCount || 0} products</span>
                          {(cat.variantTypes || []).map(vt => (
                            <span key={vt} className="bg-purple-50 text-purple-600 text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">{vt}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(cat)} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCategory(cat)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium">
                No categories found.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> Add New Category
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
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Image</label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                      value={newCategoryImage}
                      onChange={(e) => setNewCategoryImage(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => newImageInputRef.current?.click()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Upload from computer"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input
                      ref={newImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, (url) => setNewCategoryImage(url))}
                    />
                  </div>
                  {newCategoryImage && (
                    <div className="w-11 h-11 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                      <img src={newCategoryImage} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Type</label>
                <select
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value as 'main' | 'other')}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                >
                  <option value="main">Main Category</option>
                  <option value="other">Other Category</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Product Variants</label>
                <p className="text-[10px] text-slate-400 mb-2">Vendors uploading in this category will be able to add these options.</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={newCategoryVariantTypes.includes('size')} onChange={() => setNewCategoryVariantTypes(t => toggleVariantType(t, 'size'))} className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500" />
                    Size
                  </label>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={newCategoryVariantTypes.includes('color')} onChange={() => setNewCategoryVariantTypes(t => toggleVariantType(t, 'color'))} className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500" />
                    Color
                  </label>
                </div>
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
        </div>
      </div>

      {uploadingImage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <h3 className="font-bold text-slate-900">Uploading image...</h3>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-sm text-slate-500 mt-2 text-center">{uploadProgress}%</p>
          </div>
        </div>
      )}
    </div>
  );
};