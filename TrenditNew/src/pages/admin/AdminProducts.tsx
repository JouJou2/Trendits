import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Tag, AlertCircle, TrendingUp, Database, Download, Upload, Check, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc, writeBatch, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { seedDatabase } from '../../services/dataSeeder';
import { ProductType, Vendor, getDisplayPrice } from '../../data/products';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from "@google/genai";

export const AdminProducts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState<ProductType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingImage, setImportingImage] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [undoingImport, setUndoingImport] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as unknown as ProductType));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubVendors = onSnapshot(collection(db, 'vendors'), (snapshot) => {
      const vends = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as unknown as Vendor));
      setVendors(vends);
    });

    return () => {
      unsubProducts();
      unsubVendors();
    };
  }, []);

  const handleDelete = async (productId: string) => {
    console.log('AdminProducts: Executing delete for:', productId);
    const deletePromise = deleteDoc(doc(db, 'products', productId));
    
    toast.promise(deletePromise, {
      loading: 'Deleting product...',
      success: 'Product deleted successfully',
      error: (err) => {
        console.error('AdminProducts: Delete error:', err);
        handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
        return 'Failed to delete product';
      }
    });

    setDeletingProductId(null);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleExportExcel = () => {
    const dataToExport = products.map(p => ({
      ID: p.id,
      Title: p.title,
      Brand: p.brand,
      Price: p.price,
      'Fees %': p.feePercentage || 0,
      OldPrice: p.oldPrice || '',
      Description: p.description,
      Category: p.categoryId,
      VendorID: p.vendorId,
      ImageURL: p.image,
      Stock: p.stock || 0,
      Featured: p.featured ? 'Yes' : 'No',
      Rating: p.rating || 0,
      Reviews: p.reviews || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, `trendit_products_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel exported successfully!");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.includes('image')) {
      handleImportImage(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        interface ExcelProductRow {
          ID?: string;
          Title?: string;
          Brand?: string;
          Price?: number;
          'Fees %'?: number;
          OldPrice?: number;
          Description?: string;
          Category?: string;
          VendorID?: string;
          ImageURL?: string;
          Stock?: number;
          Featured?: string;
          Rating?: number;
          Reviews?: number;
        }

        const data = XLSX.utils.sheet_to_json(ws) as ExcelProductRow[];

        if (data.length === 0) {
          toast.error("No data found in the Excel file.");
          return;
        }

        const batch = writeBatch(db);
        let count = 0;

        data.forEach((row) => {
          // Generate a new ID if not present
          const productId = row.ID || doc(collection(db, 'products')).id;
          const productRef = doc(db, 'products', String(productId));
          
          const productData = {
            id: String(productId),
            title: row.Title || 'Untitled Product',
            brand: row.Brand || '',
            price: Number(row.Price) || 0,
            feePercentage: Number(row['Fees %']) || 0,
            oldPrice: row.OldPrice ? Number(row.OldPrice) : null,
            description: row.Description || '',
            categoryId: row.Category || 'uncategorized',
            vendorId: row.VendorID || '',
            image: row.ImageURL || '',
            stock: Number(row.Stock) || 0,
            featured: row.Featured === 'Yes',
            rating: Number(row.Rating) || 0,
            reviews: Number(row.Reviews) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          batch.set(productRef, productData);
          count++;
        });

        await batch.commit();
        toast.success(`Imported ${count} products successfully!`);
        e.target.value = ''; // Reset input
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Failed to import file. Please check the format.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportImage = async (file: File) => {
    setImportingImage(true);
    const toastId = toast.loading("Analyzing image with AI...");
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64String,
                },
              },
              {
                text: "Analyze this product image and extract the following details in JSON format: title, brand, price (number), description, category (one of: electronics, fashion, home-living, groceries, beauty), stock (number, default 50). Only return valid JSON.",
              },
            ],
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                brand: { type: Type.STRING },
                price: { type: Type.NUMBER },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                stock: { type: Type.NUMBER },
              },
              required: ["title", "brand", "price", "description", "category", "stock"]
            }
          }
        });

        const result = JSON.parse(response.text || '{}');
        
        const productData = {
          title: result.title || 'Extracted Product',
          brand: result.brand || '',
          price: Number(result.price) || 0,
          description: result.description || '',
          categoryId: result.category || 'electronics',
          stock: Number(result.stock) || 50,
          image: reader.result as string, // Store the local image for now
          vendorId: vendors[0]?.id || '', // Assign to first vendor as default
          featured: false,
          rating: 0,
          reviews: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'products'), productData);
        toast.success(`Successfully imported "${productData.title}" from image!`, { id: toastId });
        setImportingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("AI Analysis error:", err);
      toast.error("Failed to analyze image with AI.", { id: toastId });
      setImportingImage(false);
    }
  };

  const handleImportDriveLink = async () => {
    const url = window.prompt("Enter Google Drive Image Link:");
    if (!url) return;

    // Extract ID from Drive link
    // https://drive.google.com/file/d/1X-ID-HERE/view?usp=sharing
    // https://drive.google.com/open?id=ID
    const driveIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    
    if (!driveIdMatch) {
      toast.error("Invalid Google Drive link format. Please provide a direct file share link.");
      return;
    }

    const driveId = driveIdMatch[1];
    const directUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
    
    // For Drive links, we'll just open the "New Product" form with this image pre-filled
    // because we can't easily run AI on a cross-origin Drive URL in the browser 
    // unless we proxy it or it's publicly readable.
    // However, the user wants to "take it".
    
    navigate(`/admin/products/new?imageUrl=${encodeURIComponent(directUrl)}`);
    toast.success("Drive image linked! Please complete product details.");
  };

  const handleUndoLastImport = async () => {
    // We consider "latest imported" as products added in the last 10 minutes
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60000).toISOString();
    const recentProducts = products.filter(p => p.createdAt && p.createdAt > tenMinutesAgo);

    if (recentProducts.length === 0) {
      toast.error("No recently imported products found (last 10 mins).");
      return;
    }

    try {
      const batch = writeBatch(db);
      recentProducts.forEach(p => {
        batch.delete(doc(db, 'products', String(p.id)));
      });
      await batch.commit();
      toast.success(`Deleted ${recentProducts.length} recently added products.`);
      setUndoingImport(false);
    } catch (error) {
      console.error("Undo error:", error);
      toast.error("Failed to delete recent products.");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">Loading catalog...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Products</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your catalog, inventory, and pricing.</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportFile} 
            accept=".xlsx, .xls, image/png, image/jpeg, image/webp"
            className="hidden"
          />
          <button 
            onClick={handleExportExcel}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden divide-x divide-slate-200 shadow-sm">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importingImage}
              className="hover:bg-slate-50 text-slate-600 px-4 py-2 text-sm font-medium transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              title="Import Excel or Image"
            >
              {importingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
              Import
            </button>
            <button 
              onClick={handleImportDriveLink}
              className="hover:bg-slate-50 text-slate-600 px-3 py-2 text-sm font-medium transition-all flex items-center justify-center active:scale-95"
              title="Import via Drive Link"
            >
              <LinkIcon className="w-4 h-4 text-blue-500" />
            </button>
          </div>

          {undoingImport ? (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg p-1 animate-in fade-in zoom-in duration-200">
              <span className="text-xs font-bold text-rose-600 px-2">Undo last import?</span>
              <button 
                onClick={handleUndoLastImport}
                className="bg-rose-600 text-white p-1.5 rounded-md hover:bg-rose-700 transition-colors shadow-sm"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setUndoingImport(false)}
                className="bg-white text-slate-400 border border-slate-200 p-1.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setUndoingImport(true)}
              className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
              title="Delete products added in the last 10 minutes"
            >
              <Trash2 className="w-4 h-4" /> Undo Import
            </button>
          )}
          
          {products.length === 0 && (
            <button 
              onClick={async () => {
                const res = await seedDatabase();
                if(res.success) toast.success(res.message);
                else toast.error(res.message);
              }}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
            >
              <Database className="w-4 h-4" /> Set Up Demo Data
            </button>
          )}
          <Link 
            to="/admin/products/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>
      </div>

      {/* Analytics Mini-bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><Tag className="w-5 h-5" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Products</p>
            <p className="text-xl font-bold text-slate-900">{products.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600"><AlertCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Low Stock</p>
            <p className="text-xl font-bold text-slate-900">{products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 rounded-lg text-slate-600"><Trash2 className="w-5 h-5" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Out of Stock</p>
            <p className="text-xl font-bold text-slate-900">{products.filter(p => !p.stock || p.stock === 0).length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Featured</p>
            <p className="text-xl font-bold text-slate-900">{products.filter(p => p.featured).length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search products by name or brand..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="fashion">Fashion</option>
              <option value="home-living">Home & Living</option>
              <option value="groceries">Groceries</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Seller</th>
                <th className="px-6 py-4 font-medium">Inventory</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const seller = vendors.find(v => v.id === product.vendorId);
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden flex-shrink-0 p-1">
                          <img src={product.image || 'https://placehold.co/100x100?text=No+Image'} alt={product.title} className="w-full h-full object-contain" />
                        </div>
                        <div className="max-w-[200px] sm:max-w-xs">
                          <Link to={`/admin/products/${product.id}`} className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {product.title}
                          </Link>
                          <div className="text-slate-500 mt-0.5">{product.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {seller ? (
                        <div className="flex items-center gap-2">
                          <img src={seller.image} alt={seller.name} className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                          <span className="font-medium text-slate-700">{seller.name}</span>
                        </div>
                      ) : (
                        <span className="text-rose-500 text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                          <AlertCircle className="w-3 h-3" /> No Seller Specified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium ${
                        !product.stock || product.stock === 0 ? 'bg-rose-100 text-rose-700' : 
                        product.stock <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {!product.stock || product.stock === 0 ? 'Out of Stock' : `${product.stock} in stock`}
                      </span>
                      {product.stock <= 10 && product.stock > 0 && <span className="text-[10px] text-amber-600 font-bold ml-1">Low Stock Alert</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">${getDisplayPrice(product.price || 0, product.feePercentage).toFixed(2)}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">
                      Vendor: ${(product.price || 0).toFixed(2)} {product.feePercentage ? `(+${product.feePercentage}%)` : ''}
                    </div>
                    {product.oldPrice && <div className="text-xs text-slate-400 line-through">${product.oldPrice.toFixed(2)}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {product.categoryId?.replace('-', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 transition-opacity">
                      {deletingProductId === product.id ? (
                        <div className="flex items-center gap-2 bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in zoom-in duration-200">
                          <span className="text-[10px] font-bold text-rose-600 px-1 uppercase">Delete?</span>
                          <button 
                            onClick={() => handleDelete(String(product.id))}
                            className="p-1.5 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors shadow-sm"
                            title="Confirm Delete"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => setDeletingProductId(null)}
                            className="p-1.5 bg-white text-slate-400 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => navigate(`/admin/products/${product.id}`)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingProductId(String(product.id))}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                    No products found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
