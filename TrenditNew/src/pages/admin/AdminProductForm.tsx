import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Box, 
  DollarSign, Image as ImageIcon, Activity, List, Loader2,
  Upload
} from 'lucide-react';
import { doc, getDoc, addDoc, collection, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { ProductType } from '../../data/products';
import { toast } from 'react-hot-toast';

export const AdminProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ProductType>>(() => {
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get('imageUrl');
    
    return {
      title: '',
      brand: '',
      categoryId: 'electronics',
      vendorId: '',
      description: '',
      price: 0,
      oldPrice: 0,
      image: imageUrl || '',
      images: [],
      specs: {},
      sizes: [],
      colors: [],
      stock: 0,
      feePercentage: 0,
      featured: false
    };
  });

  const [availableVendors, setAvailableVendors] = useState<{id: string, name?: string}[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vends = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableVendors(vends);
    });
    return () => unsub();
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSave: Partial<ProductType> = {
        ...formData,
        updatedAt: new Date().toISOString(),
        price: Number(formData.price),
        feePercentage: Number(formData.feePercentage || 0),
        oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
        stock: Number(formData.stock)
      };

      if (isNew) {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'products'), dataToSave);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (Firestore limit is 1MB for the entire document)
    if (file.size > 800000) { // ~800KB limit for safety
      toast.error("Image is too large. Please select an image under 800KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isGallery) {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), base64String]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          image: base64String
        }));
      }
      toast.success("Image uploaded successfully!");
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors appearance-none"
                  >
                    <option value="electronics">Electronics</option>
                    <option value="fashion">Fashion</option>
                    <option value="home-living">Home & Living</option>
                    <option value="groceries">Groceries</option>
                    <option value="beauty">Beauty</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Seller (Vendor) <span className="text-rose-500">*</span></label>
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
                  {!formData.vendorId && <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><Activity className="w-3 h-3" /> A product must have a specified seller.</p>}
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
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fees % (Profit)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={formData.feePercentage || 0}
                      onChange={(e) => setFormData({ ...formData, feePercentage: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      placeholder="e.g. 15"
                    />
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
                    <input 
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
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
