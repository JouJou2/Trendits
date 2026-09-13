import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Box,
  DollarSign, Image as ImageIcon, Activity, List, Loader2,
  Upload, Palette, Ruler, Check
} from 'lucide-react';
import { doc, getDoc, addDoc, collection, updateDoc, onSnapshot, query, where, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { ProductType, ProductVariant, variantId } from '../../data/products';
import { toast } from 'react-hot-toast';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { categoryOptions, effectiveVariantTypes, normalizeCategoryIds, MAX_PRODUCT_CATEGORIES } from '../../utils/categories';
import { fetchVendorCommission, splitSale } from '../../utils/commission';

// ── Category type ──
type VariantType = 'size' | 'color';
interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  variantTypes: VariantType[];
  parentId?: string | null;
}

export const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';

  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'basic');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Navigating from one product's edit page to another (e.g. after creating a
  // color variant) reuses this component instance — the lazy state above only
  // fires once, so re-sync the tab whenever the id or ?tab= param changes.
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [id, searchParams]);

  // ── Fetch categories from Firestore ──
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name || d.id,
        slug: d.data().slug || d.id,
        variantTypes: (d.data().variantTypes || []) as VariantType[],
        parentId: d.data().parentId ?? null,
      }));
      setCategories(cats);
    });
    return () => unsub();
  }, []);
  const storage = getStorage();

const uploadImageToStorage = (
  file: File,
  path: string = 'products',
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${path}/${timestamp}_${randomStr}.${extension}`;

    const storageRef = ref(storage, filename);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
  const [formData, setFormData] = useState<Partial<ProductType>>(() => {
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get('imageUrl');
    
    return {
      title: '',
      brand: '',
      categoryId: '',
      vendorId: '',
      description: '',
      price: 0,
      oldPrice: 0,
      image: imageUrl || '',
      images: [],
      specs: {},
      sizes: [],
      colors: [],
      sizeOptions: [],
      variants: [],
      variantColor: '',
      stock: 0,
      feePercentage: 0,
      featured: false
    };
  });

  // ── Set default categoryId once categories load ──
  useEffect(() => {
    if (isNew && categories.length > 0 && !formData.categoryId) {
      setFormData(prev => ({ ...prev, categoryId: categories[0].slug }));
    }
  }, [categories, isNew, formData.categoryId]);

  // ── Variants: which axes does the selected category support ──
  // Color is handled as separate, linked products (see siblingProducts below),
  // not an in-product axis — so only size feeds the stock/price matrix.
  const activeCategory = categories.find(c => c.slug === formData.categoryId);
  // A subcategory with no options of its own follows its main category, so
  // filing a shirt under "Fashion › Men" keeps the size picker.
  const activeVariantTypes = effectiveVariantTypes(activeCategory, categories);
  const hasColorAxis = activeVariantTypes.includes('color');
  const hasSizeAxis = activeVariantTypes.includes('size');

  const [newSizeInput, setNewSizeInput] = useState('');

  // Keep the size matrix in sync with the size option list, preserving
  // stock/price/sku already entered for sizes that still exist.
  useEffect(() => {
    if (!hasSizeAxis) return;
    const sizeNames = formData.sizeOptions || [];
    const existing = new Map((formData.variants || []).map(v => [v.id, v]));
    const next: ProductVariant[] = sizeNames.map(size => {
      const vid = variantId(size);
      return existing.get(vid) || { id: vid, size, stock: 0, price: null };
    });
    const changed = next.length !== (formData.variants || []).length || next.some(v => !existing.has(v.id));
    if (changed) {
      setFormData(prev => ({ ...prev, variants: next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sizeOptions, hasSizeAxis]);

  // ── Color variants: sibling products sharing this product's variantGroupId ──
  const [siblingProducts, setSiblingProducts] = useState<Array<{ id: string; variantColor?: string; price?: number; stock?: number; image?: string }>>([]);
  const [newColorName, setNewColorName] = useState('');
  const [addingColorVariant, setAddingColorVariant] = useState(false);

  useEffect(() => {
    if (!formData.variantGroupId) { setSiblingProducts([]); return; }
    const q = query(collection(db, 'products'), where('variantGroupId', '==', formData.variantGroupId));
    const unsub = onSnapshot(q, (snap) => {
      setSiblingProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(p => p.id !== id));
    }, (err) => console.error('Sibling lookup error:', err));
    return () => unsub();
  }, [formData.variantGroupId, id]);

  const handleAddColorVariant = async () => {
    const colorName = newColorName.trim();
    if (!colorName || !id) return;
    setAddingColorVariant(true);
    try {
      let groupId = formData.variantGroupId;
      if (!groupId) {
        groupId = doc(collection(db, 'products')).id;
        await updateDoc(doc(db, 'products', id), { variantGroupId: groupId });
        setFormData(prev => ({ ...prev, variantGroupId: groupId }));
      }
      // A vendor's new listing always carries their store's commission; Firestore
      // rules refuse any other value on create.
      const colorVariantFee = (isAdmin || isSuperAdmin)
        ? Number(formData.feePercentage || 0)
        : await fetchVendorCommission(formData.vendorId);
      const newProductRef = await addDoc(collection(db, 'products'), {
        title: `${colorName.toUpperCase()} - ${formData.title || ''}`,
        brand: formData.brand || '',
        categoryId: formData.categoryId || '',
        categoryIds: normalizeCategoryIds(formData.categoryId, formData.categoryIds),
        vendorId: formData.vendorId || '',
        description: formData.description || '',
        price: Number(formData.price) || 0,
        oldPrice: null,
        image: '',
        images: [],
        specs: formData.specs || {},
        stock: 0,
        featured: false,
        feePercentage: colorVariantFee,
        variantGroupId: groupId,
        variantColor: colorName,
        colors: [colorName],
        sizeOptions: hasSizeAxis ? (formData.sizeOptions || []) : [],
        variants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setNewColorName('');
      toast.success(`Created the "${colorName}" version — add its photo, price, and stock.`);
      navigate(`/admin/products/${newProductRef.id}?tab=media`);
    } catch (error) {
      console.error('Failed to create color variant:', error);
      toast.error('Failed to create color variant.');
    } finally {
      setAddingColorVariant(false);
    }
  };

  const handleAddSizeOption = () => {
    const label = newSizeInput.trim();
    if (!label) return;
    setFormData(prev => {
      if ((prev.sizeOptions || []).includes(label)) return prev;
      return { ...prev, sizeOptions: [...(prev.sizeOptions || []), label] };
    });
    setNewSizeInput('');
  };
  const handleRemoveSizeOption = (label: string) => {
    setFormData(prev => ({ ...prev, sizeOptions: (prev.sizeOptions || []).filter(s => s !== label) }));
  };

  const handleUpdateVariantField = (vid: string, field: 'stock' | 'price' | 'sku', value: string) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map(v => {
        if (v.id !== vid) return v;
        if (field === 'stock') return { ...v, stock: Number(value) || 0 };
        if (field === 'price') return { ...v, price: value === '' ? null : Number(value) };
        return { ...v, sku: value };
      })
    }));
  };

 const [availableVendors, setAvailableVendors] = useState<{id: string; name: string}[]>([]);
  const { user, isAdmin, isSuperAdmin, isVendor } = useAuth();
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [currentVendorName, setCurrentVendorName] = useState<string>('');

  useEffect(() => {
    if (isVendor && !isAdmin && !isSuperAdmin && user) {
      let unsubOwnerQuery: (() => void) | undefined;

      const loadVendor = async () => {
        try {
          const vendorByIdSnap = await getDoc(doc(db, 'vendors', user.id));

          if (vendorByIdSnap.exists()) {
            const vendorData = { id: vendorByIdSnap.id, ...vendorByIdSnap.data() } as {id: string; name: string};
setAvailableVendors([vendorData]);
            setCurrentVendorId(vendorByIdSnap.id);
            setCurrentVendorName(vendorData.name || '');
            if (isNew) setFormData(prev => ({ ...prev, vendorId: vendorByIdSnap.id }));
            return;
          }

          const q = query(collection(db, 'vendors'), where('ownerId', '==', user.id), limit(1));
          unsubOwnerQuery = onSnapshot(q, (snapshot) => {
            const vends = snapshot.docs.map(docSnap => ({ 
  id: docSnap.id, 
  ...docSnap.data() 
} as {id: string; name: string}));
const vendorDoc = vends[0] || null;
            setAvailableVendors(vendorDoc ? [vendorDoc] : []);
            setCurrentVendorId(vendorDoc ? vendorDoc.id : null);
            setCurrentVendorName(vendorDoc ? (vendorDoc.name || '') : '');
            if (isNew && vendorDoc) setFormData(prev => ({ ...prev, vendorId: vendorDoc.id }));
          }, (err) => {
            console.error('Vendor lookup error:', err);
            setAvailableVendors([]);
            setCurrentVendorId(null);
            setCurrentVendorName('');
          });
        } catch (err) {
          console.error('Vendor lookup error:', err);
          setAvailableVendors([]);
          setCurrentVendorId(null);
          setCurrentVendorName('');
        }
      };

      void loadVendor();
      return () => {
        if (unsubOwnerQuery) unsubOwnerQuery();
      };
    }

    const unsubAll = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vends = snapshot.docs.map(doc => ({ 
  id: doc.id, 
  ...doc.data() 
} as {id: string; name: string}));
setAvailableVendors(vends);
    });
    return () => unsubAll();
  }, [isVendor, isAdmin, isSuperAdmin, user, isNew]);

  // A vendor starting a new product sees their store's commission straight
  // away, so the "Shoppers pay" preview is right before they save.
  useEffect(() => {
    if (!isNew || isAdmin || isSuperAdmin || !formData.vendorId) return;
    let cancelled = false;
    fetchVendorCommission(formData.vendorId)
      .then(rate => { if (!cancelled) setFormData(prev => ({ ...prev, feePercentage: rate })); })
      .catch(err => console.error('Commission lookup failed:', err));
    return () => { cancelled = true; };
  }, [isNew, isAdmin, isSuperAdmin, formData.vendorId]);

  useEffect(() => {
    if (!isNew && id) {
      const fetchProduct = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'products', id));
          if (docSnap.exists()) {
            setFormData({ ...docSnap.data() });
          } else {
            console.error("Product not found");
            navigate('/admin/products');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `products/${id}`);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isNew, navigate]);

  // ── handleSave is declared BEFORE the JSX that uses it ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const variants = hasSizeAxis ? (formData.variants || []) : [];
      const sizeOptions = hasSizeAxis ? (formData.sizeOptions || []) : [];
      const variantColor = hasColorAxis ? (formData.variantColor || '').trim() : '';

      const dataToSave: Partial<ProductType> = {
        ...formData,
        updatedAt: new Date().toISOString(),
        price: Number(formData.price),
        feePercentage: Number(formData.feePercentage || 0),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
        stock: variants.length > 0 ? variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) : Number(formData.stock),
        variants,
        sizeOptions,
        variantColor,
        // Mirror onto the legacy flat fields other pages (e.g. category color filters) still read.
        colors: variantColor ? [variantColor] : (formData.colors || []),
        sizes: sizeOptions,
        categoryIds: normalizeCategoryIds(formData.categoryId, formData.categoryIds),
      };

      if (isNew) {
        dataToSave.createdAt = new Date().toISOString();
        // Commission is the store's rate, set by an admin — not something a vendor
        // types in. Without this every vendor-created product defaulted to 0%.
        if (!isAdmin && !isSuperAdmin) {
          dataToSave.feePercentage = await fetchVendorCommission(dataToSave.vendorId);
        }
        const newProductRef = await addDoc(collection(db, 'products'), dataToSave);

        // Notify followers of this vendor that a new product dropped
        if (dataToSave.vendorId) {
          try {
            const followersSnap = await getDocs(collection(db, 'vendors', dataToSave.vendorId, 'followers'));
            const vendorDoc = await getDoc(doc(db, 'vendors', dataToSave.vendorId));
            const vendorName = vendorDoc.exists() ? (vendorDoc.data().name || 'A store you follow') : 'A store you follow';
            await Promise.all(followersSnap.docs.map(f => addDoc(collection(db, 'users', f.id, 'notifications'), {
              type: 'new_product',
              vendorId: dataToSave.vendorId,
              vendorName,
              productId: newProductRef.id,
              productTitle: dataToSave.title || 'New product',
              read: false,
              createdAt: new Date().toISOString(),
            }).catch(e => console.error('Failed to notify follower:', f.id, e))));
          } catch (notifyError) {
            console.error('Failed to notify followers:', notifyError);
          }
        }
      } else if (id) {
        await updateDoc(doc(db, 'products', id), dataToSave);
      }

      navigate('/admin/products');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, isNew ? 'products' : `products/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSpec = () => {
    setFormData({
      ...formData,
      specs: { ...formData.specs, 'New Spec': 'Value' }
    });
  };

  const handleUpdateSpec = (oldKey: string, newKey: string, value: string) => {
    const newSpecs = { ...formData.specs };
    if (oldKey !== newKey) {
      delete newSpecs[oldKey];
    }
    newSpecs[newKey] = value;
    setFormData({ ...formData, specs: newSpecs });
  };

  const handleRemoveSpec = (key: string) => {
    const newSpecs = { ...formData.specs };
    delete newSpecs[key];
    setFormData({ ...formData, specs: newSpecs });
  };

  const [uploadingImage, setUploadingImage] = useState(false);
const [uploadProgress, setUploadProgress] = useState(0);

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error("Please select an image file.");
    return;
  }

  // Validate file size (max 5MB for Storage)
  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image is too large. Max 5MB.");
    return;
  }

  setUploadingImage(true);
  setUploadProgress(0);

  try {
    const imageUrl = await uploadImageToStorage(file, 'products', (progress) => {
      setUploadProgress(progress);
    });

    if (isGallery) {
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), imageUrl]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        image: imageUrl
      }));
    }

    toast.success("Image uploaded to storage!");
  } catch (error) {
    console.error('Upload error:', error);
    toast.error("Failed to upload image. Please try again.");
  } finally {
    setUploadingImage(false);
    setUploadProgress(0);
    e.target.value = '';
  }
};

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading product details...</div>;

  return (
    <form onSubmit={handleSave} className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-30 bg-[#f8fafc] py-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link to="/admin/products" className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              {isNew ? 'Create New Product' : `Edit Product`}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Make sure to save your changes when finished.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            type="button" 
            onClick={() => navigate('/admin/products')}
            className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sub-Navigation Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col gap-2 overflow-x-auto hide-scrollbar border-b lg:border-b-0 border-slate-200 pb-2 lg:pb-0">
            {[
              { id: 'basic', label: 'Basic Info', icon: Box },
              { id: 'inventory', label: 'Inventory & Pricing', icon: DollarSign },
              { id: 'variants', label: 'Variants', icon: Palette },
              { id: 'attributes', label: 'Dynamic Attributes', icon: List },
              { id: 'media', label: 'Product Media', icon: ImageIcon },
              { id: 'analytics', label: 'Performance', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* Tab 1: Basic Info */}
          {activeTab === 'basic' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  placeholder="e.g. Sony Wireless Headphones"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                  <input 
                    type="text" 
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  />
                </div>
                {/* ── DYNAMIC CATEGORY SELECT ── */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    value={formData.categoryId}
                    onChange={(e) => {
                      // The old main category must not linger as an "also show in" pick.
                      const extras = (formData.categoryIds || []).filter(s => s !== formData.categoryId);
                      setFormData({
                        ...formData,
                        categoryId: e.target.value,
                        categoryIds: normalizeCategoryIds(e.target.value, extras),
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors appearance-none"
                  >
                    {categories.length === 0 && (
                      <option value="">Loading categories...</option>
                    )}
                    {categoryOptions(categories).map(opt => (
                      <option key={opt.slug} value={opt.slug}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">The main category decides sizes, colours and the breadcrumb.</p>
                </div>
              </div>
              {categories.length > 0 && (() => {
                const extras = (formData.categoryIds || []).filter(s => s !== formData.categoryId);
                const atLimit = extras.length + 1 >= MAX_PRODUCT_CATEGORIES;
                const toggleExtra = (slug: string) => {
                  const next = extras.includes(slug) ? extras.filter(s => s !== slug) : [...extras, slug];
                  setFormData({ ...formData, categoryIds: normalizeCategoryIds(formData.categoryId, next) });
                };
                return (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Also show in <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Pick any other categories this product should appear in — e.g. running shoes under Men, Men › Clothing and Men › Sports.
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      {categoryOptions(categories).filter(opt => opt.slug !== formData.categoryId).map(opt => {
                        const selected = extras.includes(opt.slug);
                        return (
                          <button
                            key={opt.slug}
                            type="button"
                            onClick={() => toggleExtra(opt.slug)}
                            disabled={!selected && atLimit}
                            aria-pressed={selected}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                              selected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                            }`}
                          >
                            {selected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {atLimit && (
                      <p className="text-xs text-amber-600 mt-1">A product can be in up to {MAX_PRODUCT_CATEGORIES} categories.</p>
                    )}
                  </div>
                );
              })()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Seller (Vendor) <span className="text-rose-500">*</span></label>
                  {isVendor && !isAdmin && !isSuperAdmin ? (
                    <div>
                      <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700">{currentVendorName || 'Your vendor'}</div>
                      <input type="hidden" value={formData.vendorId} />
                      {!formData.vendorId && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Unable to determine your vendor — contact admin.</p>}
                    </div>
                  ) : (
                    <select 
                      value={formData.vendorId}
                      onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors appearance-none"
                      required
                    >
                      <option value="">Select a seller...</option>
                      {availableVendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors resize-y"
                  placeholder="Detailed product description..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500"
                />
                <label htmlFor="featured" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Featured Product (Show on homepage)
                </label>
              </div>
            </div>
          )}

          {/* Tab 2: Inventory & Pricing */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Base Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trendit commission %</label>
                    <input 
                      type="number" 
                      step="0.1"
                      min={0}
                      value={formData.feePercentage || 0}
                      onChange={(e) => setFormData({ ...formData, feePercentage: Number(e.target.value) })}
                      disabled={!isAdmin && !isSuperAdmin}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:text-slate-400 disabled:cursor-not-allowed"
                      placeholder="e.g. 8"
                    />
                    {(() => {
                      // Commission comes out of the price; the shopper pays the price as entered.
                      const split = splitSale(Number(formData.price) || 0, Number(formData.feePercentage) || 0);
                      return (
                        <p className="text-xs text-slate-500 mt-1.5">
                          Shoppers pay <span className="font-semibold text-slate-700">${(Number(formData.price) || 0).toFixed(2)}</span>
                          {' · '}Trendit earns <span className="font-semibold text-emerald-700">${split.commission.toFixed(2)}</span>
                          {' · '}{(!isAdmin && !isSuperAdmin) ? 'you receive' : 'vendor receives'} <span className="font-semibold text-slate-700">${split.vendorAmount.toFixed(2)}</span>
                          {(!isAdmin && !isSuperAdmin) && <span className="block mt-0.5">Commission is set by Trendit for your store.</span>}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Compare at Price ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.oldPrice || ''}
                      onChange={(e) => setFormData({ ...formData, oldPrice: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      placeholder="Show a strike-through price"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Inventory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Available Stock</label>
                    {hasSizeAxis && (formData.variants || []).length > 0 ? (
                      <>
                        <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600">
                          {(formData.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Computed automatically from per-size stock — manage it in the Variants tab.</p>
                      </>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Variants */}
          {activeTab === 'variants' && (
            <div className="space-y-6">
              {!hasColorAxis && !hasSizeAxis ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
                  <Palette className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-1">No variants for this category</h3>
                  <p className="text-sm">"{activeCategory?.name || 'This category'}" doesn't have Size or Color variants enabled. An admin can turn these on from Category Architecture.</p>
                </div>
              ) : (
                <>
                  {hasColorAxis && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><Palette className="w-4 h-4 text-blue-600" /> Color Variants</h3>
                      <p className="text-xs text-slate-500 mb-4">Each color is its own product with its own price, stock, and photos — shoppers can jump between colors from the product page, and each one shows up in the catalog on its own.</p>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">This product's color</label>
                        <input
                          type="text"
                          value={formData.variantColor || ''}
                          onChange={(e) => setFormData({ ...formData, variantColor: e.target.value })}
                          placeholder="e.g. White"
                          className="w-full max-w-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {isNew ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3">Save this product first — then you can add its other color variants.</p>
                      ) : (
                        <>
                          {siblingProducts.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {siblingProducts.map(s => (
                                <Link
                                  key={s.id}
                                  to={`/admin/products/${s.id}`}
                                  className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                    {s.image ? <img src={s.image} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{s.variantColor || 'Unnamed color'}</p>
                                    <p className="text-xs text-slate-400">${Number(s.price || 0).toFixed(2)} · {s.stock ?? 0} in stock</p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddColorVariant(); } }}
                              placeholder="e.g. Black"
                              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={handleAddColorVariant}
                              disabled={addingColorVariant || !newColorName.trim()}
                              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                            >
                              {addingColorVariant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Color
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {hasSizeAxis && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Ruler className="w-4 h-4 text-blue-600" /> Sizes</h3>
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          value={newSizeInput}
                          onChange={(e) => setNewSizeInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSizeOption(); } }}
                          placeholder="e.g. M"
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="button" onClick={handleAddSizeOption} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(formData.sizeOptions || []).map(size => (
                          <span key={size} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm font-bold px-3 py-1.5 rounded-full">
                            {size}
                            <button type="button" onClick={() => handleRemoveSizeOption(size)} className="text-slate-400 hover:text-rose-600">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {(formData.sizeOptions || []).length === 0 && (
                          <p className="text-sm text-slate-400">No sizes added yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {(formData.variants || []).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-1">Stock & Pricing per Size</h3>
                      <p className="text-xs text-slate-500 mb-4">Each size gets its own stock count. Leave price blank to use the base price above.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                              <th className="pb-2 pr-4">Size</th>
                              <th className="pb-2 pr-4">Stock</th>
                              <th className="pb-2 pr-4">Price Override</th>
                              <th className="pb-2">SKU</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(formData.variants || []).map(v => (
                              <tr key={v.id} className="border-b border-slate-50 last:border-0">
                                <td className="py-2 pr-4 font-bold text-slate-700">{v.size}</td>
                                <td className="py-2 pr-4">
                                  <input
                                    type="number"
                                    min={0}
                                    value={v.stock}
                                    onChange={(e) => handleUpdateVariantField(v.id, 'stock', e.target.value)}
                                    className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="py-2 pr-4">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={v.price ?? ''}
                                    onChange={(e) => handleUpdateVariantField(v.id, 'price', e.target.value)}
                                    placeholder={String(formData.price ?? 0)}
                                    className="w-24 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                                <td className="py-2">
                                  <input
                                    type="text"
                                    value={v.sku || ''}
                                    onChange={(e) => handleUpdateVariantField(v.id, 'sku', e.target.value)}
                                    className="w-28 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Tab 3: Dynamic Attributes */}
          {activeTab === 'attributes' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
               <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-slate-900">Technical Specifications</label>
                <button type="button" onClick={handleAddSpec} className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Specification
                </button>
              </div>
              
              <div className="space-y-3">
                {Object.entries(formData.specs || {}).map(([key, value], idx) => (
                  <div key={idx} className="flex gap-4 items-start animate-in slide-in-from-left-2 duration-200">
                    <input 
                      type="text" 
                      value={key}
                      onChange={(e) => handleUpdateSpec(key, e.target.value, value)}
                      className="w-1/3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input 
                      type="text" 
                      value={value}
                      onChange={(e) => handleUpdateSpec(key, key, e.target.value)}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleRemoveSpec(key)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {Object.keys(formData.specs || {}).length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
                    No technical specifications added yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Media */}
          {activeTab === 'media' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-4">Main Image URL</label>
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <input 
                      type="url" 
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                      placeholder="https://example.com/image.jpg"
                    />
                    <button 
                      type="button"
                      onClick={() => mainImageInputRef.current?.click()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Upload from computer"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input 
                      ref={mainImageInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden"
                    />
                  </div>
                  {formData.image && (
                    <div className="w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-white shrink-0">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-4">Gallery Images (URLs)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(formData.images || []).map((img: string, i: number) => (
                    <div key={i} className="aspect-square rounded-lg border border-slate-200 overflow-hidden relative group">
                      <img src={img} className="w-full h-full object-cover" alt="Product" />
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            const newImgs = [...(formData.images || [])];
                            newImgs.splice(i, 1);
                            setFormData({ ...formData, images: newImgs });
                          }}
                          className="p-2 bg-white rounded text-slate-900 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    type="button"
                    onClick={() => galleryImageInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-slate-500 cursor-pointer group"
                  >
                    <Upload className="w-8 h-8 mb-2 text-slate-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Upload Image</span>
                    <input 
                      ref={galleryImageInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                    />
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      const url = window.prompt("Enter image URL:");
                      if (url) {
                        setFormData({ ...formData, images: [...(formData.images || []), url] });
                      }
                    }}
                    className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center justify-center text-slate-500 cursor-pointer group"
                  >
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-400 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Add via URL</span>
                  </button>
                  {uploadingImage && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <h3 className="font-bold text-slate-900">Uploading to Storage...</h3>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-blue-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p className="text-sm text-slate-500 mt-2 text-center">{uploadProgress}%</p>
    </div>
  </div>
)}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Analytics */}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Analytics View</h3>
              <p>Interaction data and conversion metrics will be available here soon.</p>
            </div>
          )}

        </div>
      </div>
    </form>
  );
};