import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layers, Plus, Edit2, Trash2, Search, Loader2, Check, X, Upload, CornerDownRight, FolderTree } from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { importImageFromUrl } from '../../services/imageImportApi';
import {
  type CategoryRecord, type VariantType, slugify, subcategorySlug,
  topLevelCategories, childrenOf, parentOf,
} from '../../utils/categories';

const toggleVariantType = (types: VariantType[], type: VariantType): VariantType[] =>
  types.includes(type) ? types.filter(t => t !== type) : [...types, type];

const STORAGE_PREFIX = 'https://firebasestorage.googleapis.com/';

export const AdminCategories = () => {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'main' | 'other'>('other');
  const [newCategoryVariantTypes, setNewCategoryVariantTypes] = useState<VariantType[]>([]);
  const [newParentId, setNewParentId] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editType, setEditType] = useState<'main' | 'other'>('other');
  const [editVariantTypes, setEditVariantTypes] = useState<VariantType[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const newImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CategoryRecord)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Images ──────────────────────────────────────────────────────────────

  const uploadCategoryImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const extension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `categories/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (error) => reject(error),
        async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)),
      );
    });

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, onDone: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image is too large. Max 5MB.'); return; }
    setUploadingImage(true);
    setUploadProgress(0);
    try {
      onDone(await uploadCategoryImage(file));
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

  /**
   * A pasted link — a Google Drive share link included — is copied into our own
   * bucket before it is saved, exactly like product images. Storing the raw link
   * would break: Drive serves a web page, not the image, and the site's CSP
   * does not allow third-party image hosts.
   */
  const resolveImage = async (value: string): Promise<string> => {
    const url = value.trim();
    if (!url || url.startsWith(STORAGE_PREFIX)) return url;
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error('Your session expired. Sign in again.');
    const imported = await importImageFromUrl(idToken, url, 'categories');
    return imported.url;
  };

  // ── Create ──────────────────────────────────────────────────────────────

  const parentOptions = useMemo(
    () => topLevelCategories(categories).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const newParent = categories.find(c => c.id === newParentId);
  const previewSlug = newCategoryName.trim()
    ? (newParent ? subcategorySlug(newParent.slug, newCategoryName) : slugify(newCategoryName))
    : '';

  const handleChooseParent = (parentId: string) => {
    setNewParentId(parentId);
    // Start a subcategory with its parent's options so the size picker does not
    // vanish for products filed under it. Still editable before saving.
    const parent = categories.find(c => c.id === parentId);
    if (parent) setNewCategoryVariantTypes(parent.variantTypes || []);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    const slug = newParent ? subcategorySlug(newParent.slug, name) : slugify(name);
    if (categories.some(c => c.slug.toLowerCase() === slug.toLowerCase())) {
      toast.error(`A category already uses "${slug}". Choose a different name.`);
      return;
    }

    setAdding(true);
    try {
      const image = await resolveImage(newCategoryImage);
      await addDoc(collection(db, 'categories'), {
        name,
        slug,
        image,
        // Main/Other only affects how top-level categories are grouped.
        type: newParent ? 'other' : newCategoryType,
        parentId: newParent ? newParent.id : null,
        variantTypes: newCategoryVariantTypes,
        createdAt: new Date().toISOString(),
        productCount: 0,
      });
      setNewCategoryName('');
      setNewCategoryImage('');
      setNewCategoryType('other');
      setNewCategoryVariantTypes([]);
      setNewParentId('');
      toast.success(newParent ? `Added "${name}" under ${newParent.name}.` : 'Category added!');
    } catch (error) {
      if (error instanceof Error && !(error as { code?: string }).code) {
        toast.error(error.message);
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'categories');
      }
    } finally {
      setAdding(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDeleteCategory = async (cat: CategoryRecord) => {
    const children = childrenOf(cat, categories);
    if (children.length) {
      toast.error(`Can't delete "${cat.name}" — it has ${children.length} subcategor${children.length === 1 ? 'y' : 'ies'}. Delete or move those first.`);
      return;
    }

    try {
      // A product may use this as its main category or as one of its extras.
      const [mainSnap, extraSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), where('categoryId', '==', cat.slug))),
        getDocs(query(collection(db, 'products'), where('categoryIds', 'array-contains', cat.slug))),
      ]);
      const inUse = new Set([...mainSnap.docs, ...extraSnap.docs].map(d => d.id)).size;
      if (inUse > 0) {
        toast.error(`Can't delete "${cat.name}" — ${inUse} product${inUse !== 1 ? 's' : ''} still use this category. Reassign them first.`);
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

  // ── Edit ────────────────────────────────────────────────────────────────

  const startEdit = (cat: CategoryRecord) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditImage(cat.image || '');
    setEditType(cat.type || 'other');
    setEditVariantTypes(cat.variantTypes || []);
  };

  const handleSaveEdit = async (cat: CategoryRecord) => {
    setSavingEdit(true);
    try {
      const image = await resolveImage(editImage);
      await updateDoc(doc(db, 'categories', cat.id), {
        name: editName.trim(),
        // The slug is deliberately NOT regenerated on rename. Products and
        // subcategories point at it, so changing it here used to orphan every
        // product in the category the moment it was renamed.
        image,
        type: cat.parentId ? 'other' : editType,
        variantTypes: editVariantTypes,
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
      toast.success('Category updated!');
    } catch (error) {
      if (error instanceof Error && !(error as { code?: string }).code) {
        toast.error(error.message);
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `categories/${cat.id}`);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // ── List ────────────────────────────────────────────────────────────────

  const term = searchTerm.trim().toLowerCase();
  const matches = (c: CategoryRecord) => !term || (c.name || '').toLowerCase().includes(term);

  // Main categories, each followed by its subcategories. A parent stays visible
  // when only one of its children matches the search, so the child has context.
  const grouped = useMemo(() => {
    const sortByName = (a: CategoryRecord, b: CategoryRecord) => a.name.localeCompare(b.name);
    const rows: { cat: CategoryRecord; depth: 0 | 1 }[] = [];
    for (const parent of topLevelCategories(categories).sort(sortByName)) {
      const kids = childrenOf(parent, categories).sort(sortByName).filter(matches);
      if (matches(parent) || kids.length) {
        rows.push({ cat: parent, depth: 0 });
        kids.forEach(kid => rows.push({ cat: kid, depth: 1 }));
      }
    }
    for (const orphan of categories.filter(c => c.parentId && !parentOf(c, categories)).filter(matches)) {
      rows.push({ cat: orphan, depth: 0 });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, term]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading categories...</div>;

  const variantCheckboxes = (value: VariantType[], onToggle: (t: VariantType) => void) => (
    <div className="flex gap-3">
      {(['size', 'color'] as VariantType[]).map(t => (
        <label key={t} className="flex items-center gap-1.5 text-sm font-medium text-slate-700 cursor-pointer capitalize">
          <input
            type="checkbox"
            checked={value.includes(t)}
            onChange={() => onToggle(t)}
            className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
          />
          {t}
        </label>
      ))}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-slate-900">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Category Architecture</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage main categories and the subcategories inside them.
        </p>
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

          <div className="space-y-2.5">
            {grouped.map(({ cat, depth }) => {
              const kidCount = depth === 0 ? childrenOf(cat, categories).length : 0;
              return (
                <div
                  key={cat.id}
                  className={`bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors shadow-sm ${depth === 1 ? 'ml-10' : ''}`}
                >
                  {editingId === cat.id ? (
                    <div className="p-4 space-y-3">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Category name"
                      />
                      <p className="text-[11px] text-slate-400 -mt-1">
                        Link stays <span className="font-mono">/{cat.slug}</span> so existing products keep working.
                      </p>
                      <div className="flex gap-3 items-center">
                        <div className="flex-1 relative">
                          <input
                            value={editImage}
                            onChange={e => setEditImage(e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Paste an image link (Google Drive works) or upload"
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
                        {editImage.startsWith(STORAGE_PREFIX) && (
                          <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                            <img src={editImage} className="w-full h-full object-cover" alt="Preview" />
                          </div>
                        )}
                      </div>
                      {!cat.parentId && (
                        <select
                          value={editType}
                          onChange={e => setEditType(e.target.value as 'main' | 'other')}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="main">Main Category</option>
                          <option value="other">Other Category</option>
                        </select>
                      )}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Product Variants</label>
                        {variantCheckboxes(editVariantTypes, t => setEditVariantTypes(v => toggleVariantType(v, t)))}
                        {cat.parentId && editVariantTypes.length === 0 && (
                          <p className="text-[11px] text-slate-400 mt-1.5">Leave both unticked to use the main category&apos;s options.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(cat)}
                          disabled={savingEdit || !editName.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                          {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                          <X className="w-3 h-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 min-w-0">
                        {depth === 1 && <CornerDownRight className="w-4 h-4 text-slate-300 shrink-0" />}
                        {cat.image ? (
                          <img src={cat.image} className="w-10 h-10 rounded-lg object-cover shrink-0" alt={cat.name} />
                        ) : (
                          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 shrink-0"><Layers className="w-5 h-5" /></div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900">{cat.name}</span>
                          <div className="flex gap-2 items-center mt-0.5 flex-wrap">
                            <span className="text-slate-500 text-xs font-mono">/{cat.slug}</span>
                            {depth === 0 && (
                              <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className={`text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider ${cat.type === 'main' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                  {cat.type || 'other'}
                                </span>
                              </>
                            )}
                            {kidCount > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                <FolderTree className="w-3 h-3" /> {kidCount} sub
                              </span>
                            )}
                            {(cat.variantTypes || []).map(vt => (
                              <span key={vt} className="bg-purple-50 text-purple-600 text-[10px] py-0.5 px-2 rounded-full font-bold uppercase tracking-wider">{vt}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {depth === 0 && (
                          <button
                            onClick={() => { handleChooseParent(cat.id); newImageInputRef.current?.closest('form')?.scrollIntoView({ behavior: 'smooth' }); }}
                            className="p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-100"
                            title={`Add a subcategory under ${cat.name}`}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
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
              );
            })}
            {grouped.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium">
                No categories found.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" /> {newParent ? `Add subcategory to ${newParent.name}` : 'Add New Category'}
            </h2>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Belongs to</label>
                <select
                  value={newParentId}
                  onChange={(e) => handleChooseParent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                >
                  <option value="">Nothing — this is a main category</option>
                  {parentOptions.map(p => (
                    <option key={p.id} value={p.id}>Subcategory of {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  {newParent ? 'Subcategory Name' : 'Category Name'}
                </label>
                <input
                  type="text"
                  placeholder={newParent ? 'e.g. Men' : 'e.g. Home Appliances'}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                {previewSlug && (
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    Link: <span className="font-mono">/{previewSlug}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Image</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Paste a link (Google Drive works) or upload"
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
                <p className="mt-1.5 text-[10px] text-slate-400">
                  Drive files must be shared with &quot;Anyone with the link&quot;. We copy the image when you save.
                </p>
              </div>
              {!newParent && (
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
              )}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Product Variants</label>
                <p className="text-[10px] text-slate-400 mb-2">
                  {newParent
                    ? `Copied from ${newParent.name}. Leave both unticked to always follow it.`
                    : 'Vendors uploading in this category will be able to add these options.'}
                </p>
                {variantCheckboxes(newCategoryVariantTypes, t => setNewCategoryVariantTypes(v => toggleVariantType(v, t)))}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding || !newCategoryName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {newParent ? 'Create Subcategory' : 'Create Category'}
                </button>
                {newParent && (
                  <button
                    type="button"
                    onClick={() => { setNewParentId(''); setNewCategoryVariantTypes([]); }}
                    className="px-4 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
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
