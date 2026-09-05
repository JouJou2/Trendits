import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Tag, AlertCircle, TrendingUp, Database, Download, Upload, Check, X, Link as LinkIcon, Loader2 } from 'lucide-react';
import { collection, limit, onSnapshot, query, where, deleteDoc, doc, writeBatch, addDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, handleFirestoreError, OperationType } from '../../services/firebase';
import { ProductType, Vendor, getDisplayPrice } from '../../data/products';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { fetchImageAnalysis } from '../../services/aiBackend';
import { useAuth } from '../../contexts/AuthContext';

// ── FIREBASE STORAGE SETUP ──
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
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

export const AdminProducts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState<ProductType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingImage, setImportingImage] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [undoingImport, setUndoingImport] = useState(false);
  const { user, isAdmin, isSuperAdmin, isVendor, vendorId } = useAuth();
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [currentVendorName, setCurrentVendorName] = useState<string>('');
  const [vendorLookupDone, setVendorLookupDone] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // ── NEW: Dynamic categories ──
const [categories, setCategories] = useState<{id: string; name: string; slug: string}[]>([]);

useEffect(() => {
  const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
    setCategories(snap.docs.map(d => ({
      id: d.id,
      name: d.data().name || d.id,
      slug: d.data().slug || d.id
    })));
  });
  return () => unsub();
}, []);
  useEffect(() => {
    // Use vendorId from AuthContext if available
    if (vendorId) {
      setCurrentVendorId(vendorId);
      setVendorLookupDone(true);
      return;
    }

    if (!isVendor || isAdmin || isSuperAdmin || !user) {
      setVendorLookupDone(true);
      return;
    }

    let unsubOwnerQuery: (() => void) | undefined;

    const loadVendor = async () => {
      try {
        const vendorByIdSnap = await getDoc(doc(db, 'vendors', user.id));

        if (vendorByIdSnap.exists()) {
          const vendorDoc = { id: vendorByIdSnap.id, ...vendorByIdSnap.data() } as Vendor;
          setCurrentVendorId(vendorDoc.id);
          setCurrentVendorName(vendorDoc.name || '');
          setVendors([vendorDoc]);
          setVendorLookupDone(true);
          return;
        }

        const q = query(collection(db, 'vendors'), where('ownerId', '==', user.id), limit(1));
        unsubOwnerQuery = onSnapshot(q, (snapshot) => {
          const vendorDoc = snapshot.docs[0] ? ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vendor) : null;
          setCurrentVendorId(vendorDoc ? vendorDoc.id : null);
          setCurrentVendorName(vendorDoc ? (vendorDoc.name || '') : '');
          setVendors(vendorDoc ? [vendorDoc] : []);
          setVendorLookupDone(true);
        }, (error) => {
          console.error('Vendor lookup error:', error);
          setCurrentVendorId(null);
          setCurrentVendorName('');
          setVendors([]);
          setVendorLookupDone(true);
        });
      } catch (error) {
        console.error('Vendor lookup error:', error);
        setCurrentVendorId(null);
        setCurrentVendorName('');
        setVendors([]);
        setVendorLookupDone(true);
      }
    };

    void loadVendor();

    return () => {
      if (unsubOwnerQuery) unsubOwnerQuery();
    };
  }, [isVendor, isAdmin, isSuperAdmin, user, vendorId]);


  useEffect(() => {
    if (isVendor && !isAdmin && !isSuperAdmin) {
      if (!vendorLookupDone) return;
      if (!currentVendorId) {
        setProducts([]);
        setLoading(false);
        return;
      }
    }

    const productsQuery = isVendor && !isAdmin && !isSuperAdmin
      ? query(collection(db, 'products'), where('vendorId', '==', currentVendorId))
      : collection(db, 'products');

    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
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
  }, [currentVendorId, vendorLookupDone, isVendor, isAdmin, isSuperAdmin]);

  const handleDelete = async (productId: string) => {
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

  const CATEGORY_OPTIONS = categories.map(c => c.slug);

  const normalizeCategory = (value: unknown): string => {
    const normalized = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    return CATEGORY_OPTIONS.includes(normalized) ? normalized : 'uncategorized';
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Products');
      const vendorDefault = isVendor && !isAdmin && !isSuperAdmin ? (currentVendorId || '') : '';

      sheet.columns = [
        { header: 'ID', key: 'id', width: 18 },
        { header: 'Title', key: 'title', width: 28 },
        { header: 'Brand', key: 'brand', width: 22 },
        { header: 'Price', key: 'price', width: 12 },
        { header: 'Fees %', key: 'fees', width: 10 },
        { header: 'OldPrice', key: 'oldPrice', width: 12 },
        { header: 'Description', key: 'description', width: 42 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'VendorID', key: 'vendorId', width: 20, hidden: true },
        { header: 'ImageURL', key: 'imageUrl', width: 36 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Featured', key: 'featured', width: 12 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Reviews', key: 'reviews', width: 10 }
      ];

      products.forEach((p) => {
        sheet.addRow({
          id: String(p.id || ''),
          title: p.title || '',
          brand: p.brand || '',
          price: Number(p.price || 0),
          fees: Number(p.feePercentage || 0),
          oldPrice: p.oldPrice ?? '',
          description: p.description || '',
          category: normalizeCategory(p.categoryId),
          vendorId: vendorDefault || (p.vendorId || ''),
          imageUrl: p.image || '',
          stock: Number(p.stock || 0),
          featured: p.featured ? 'Yes' : 'No',
          rating: Number(p.rating || 0),
          reviews: Number(p.reviews || 0)
        });
      });

      const lookupSheet = workbook.addWorksheet('_lists');
      lookupSheet.state = 'veryHidden';
      lookupSheet.getCell('A1').value = 'Categories';
      CATEGORY_OPTIONS.forEach((category, index) => {
        lookupSheet.getCell(`A${index + 2}`).value = category;
      });

      const maxRows = Math.max(1000, sheet.rowCount + 200);
      for (let row = 2; row <= maxRows; row++) {
        sheet.getCell(`H${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`'_lists'!$A$2:$A$${CATEGORY_OPTIONS.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Invalid category',
          error: 'Choose a value from the dropdown list.'
        };

        if (vendorDefault) {
          sheet.getCell(`I${row}`).value = vendorDefault;
        }
        sheet.getCell(`I${row}`).protection = { locked: true };
      }

      for (let row = 2; row <= maxRows; row++) {
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'].forEach((col) => {
          sheet.getCell(`${col}${row}`).protection = { locked: false };
        });
      }

      await sheet.protect('trendit-export', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trendit_products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel file.');
    }
  };

  const handleExportTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Products Template');
      const categories = CATEGORY_OPTIONS;
      const vendorDefault = isVendor && !isAdmin && !isSuperAdmin ? (currentVendorId || '') : 'vendor-id';

      sheet.columns = [
        { header: 'ID', key: 'id', width: 18 },
        { header: 'Title', key: 'title', width: 28 },
        { header: 'Brand', key: 'brand', width: 22 },
        { header: 'Price', key: 'price', width: 12 },
        { header: 'Fees %', key: 'fees', width: 10 },
        { header: 'OldPrice', key: 'oldPrice', width: 12 },
        { header: 'Description', key: 'description', width: 42 },
        { header: 'Category', key: 'category', width: 18 },
        { header: 'VendorID', key: 'vendorId', width: 20, hidden: true },
        { header: 'ImageURL', key: 'imageUrl', width: 36 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Featured', key: 'featured', width: 12 },
        { header: 'Rating', key: 'rating', width: 10 },
        { header: 'Reviews', key: 'reviews', width: 10 }
      ];

      sheet.addRow({
        id: 'product-001',
        title: 'Sample Product',
        brand: 'Sample Brand',
        price: 49.99,
        fees: 0,
        oldPrice: '',
        description: 'Short product description',
        category: 'electronics',
        vendorId: vendorDefault,
        imageUrl: 'https://example.com/image.jpg',
        stock: 25,
        featured: 'No',
        rating: 0,
        reviews: 0
      });

      // Hidden lookup sheet for Excel dropdown values
      const lookupSheet = workbook.addWorksheet('_lists');
      lookupSheet.state = 'veryHidden';
      lookupSheet.getCell('A1').value = 'Categories';
      categories.forEach((category, index) => {
        lookupSheet.getCell(`A${index + 2}`).value = category;
      });

      // Category dropdown validation for common bulk range
      for (let row = 2; row <= 1000; row++) {
        sheet.getCell(`H${row}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`'_lists'!$A$2:$A$${categories.length + 1}`],
          showErrorMessage: true,
          errorTitle: 'Invalid category',
          error: 'Choose a value from the dropdown list.'
        };

        // Keep vendor id hidden and prefilled for safer imports
        sheet.getCell(`I${row}`).value = vendorDefault;
        sheet.getCell(`I${row}`).protection = { locked: true };
      }

      // Unlock editable cells and protect sheet to reduce accidental edits
      for (let row = 2; row <= 1000; row++) {
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'].forEach((col) => {
          sheet.getCell(`${col}${row}`).protection = { locked: false };
        });
      }

      await sheet.protect('trendit-template', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
        pivotTables: false
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'trendit_products_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Template exported successfully!');
    } catch (error) {
      console.error('Template export error:', error);
      toast.error('Failed to generate template. Please try again.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isVendor && !isAdmin && !isSuperAdmin && !currentVendorId) {
      toast.error(currentVendorName
        ? `No vendor link found for ${currentVendorName}. Ask a super admin to assign your vendor profile.`
        : 'No vendor link found for your account. Ask a super admin to assign your vendor profile.');
      e.target.value = '';
      return;
    }

    if (file.type.includes('image')) {
      handleImportImage(file);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        // Parsed with ExcelJS rather than xlsx: this is the one place the admin
        // panel reads a file it did not create, and xlsx carries unpatched
        // prototype-pollution and ReDoS advisories with no fix available.
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(evt.target?.result as ArrayBuffer);
        const ws = wb.worksheets[0];

        if (!ws) {
          toast.error('No worksheet found in the Excel file.');
          return;
        }

        interface ExcelProductRow {
          [key: string]: unknown;
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

        const firstValue = (row: ExcelProductRow, keys: string[]) => {
          for (const key of keys) {
            const value = row[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              return value;
            }
          }
          return undefined;
        };

        // ExcelJS hands back cells, not plain rows, so rebuild the header-keyed
        // objects the rest of this importer expects (what sheet_to_json gave us).
        // A cell's value can be a formula/hyperlink/rich-text wrapper, so unwrap
        // it down to the primitive the mapping code below compares against.
        const cellValue = (raw: ExcelJS.CellValue): unknown => {
          if (raw === null || raw === undefined) return undefined;
          if (raw instanceof Date) return raw;
          if (typeof raw === 'object') {
            if ('result' in raw) return raw.result;
            if ('richText' in raw) return raw.richText.map(t => t.text).join('');
            if ('text' in raw) return raw.text;
            return undefined;
          }
          return raw;
        };

        const headers: string[] = [];
        ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
          headers[col] = String(cellValue(cell.value) ?? '').trim();
        });

        const data: ExcelProductRow[] = [];
        ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return; // header
          const entry: ExcelProductRow = {};
          row.eachCell({ includeEmpty: false }, (cell, col) => {
            const key = headers[col];
            // Header names come from an uploaded file, so never let one reach
            // Object.prototype — that is the exact bug class we just moved off.
            if (!key || key === '__proto__' || key === 'constructor' || key === 'prototype') return;
            const value = cellValue(cell.value);
            if (value !== undefined) entry[key] = value;
          });
          if (Object.keys(entry).length > 0) data.push(entry);
        });

        if (data.length === 0) {
          toast.error('No data found in the Excel file.');
          return;
        }

        const isMeaningfulRow = (row: ExcelProductRow) => {
          const title = firstValue(row, ['Title', 'title']);
          const brand = firstValue(row, ['Brand', 'brand']);
          const desc = firstValue(row, ['Description', 'description']);
          const image = firstValue(row, ['ImageURL', 'imageUrl', 'Image']);
          const priceVal = firstValue(row, ['Price', 'price']);
          const priceNumber = priceVal ? Number(priceVal) : 0;
          return Boolean(title || brand || desc || image || priceNumber > 0);
        };

        // Filter out the many prefilled template rows which only contain VendorID
        const filteredData = data.filter(isMeaningfulRow);

        if (filteredData.length === 0) {
          toast.error('No product rows found to import. Ensure at least one row has a title, brand, image, or price.');
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        const importedIds: string[] = [];

        filteredData.forEach((row) => {
          // Preserve imported IDs when present (supports common header variants)
          const importedId = firstValue(row, ['ID', 'Id', 'id', 'ProductID', 'Product ID']);
          const productId = importedId ? String(importedId).trim() : doc(collection(db, 'products')).id;
          const productRef = doc(db, 'products', String(productId));
          const importedVendorId = firstValue(row, ['VendorID', 'Vendor Id', 'vendorId', 'vendor_id']);
          const resolvedVendorId = isVendor && !isAdmin && !isSuperAdmin
            ? (currentVendorId || '')
            : (importedVendorId ? String(importedVendorId).trim() : '');
          const importedCategory = firstValue(row, ['Category', 'category', 'CategoryID', 'Category Id']);
          const importedFeatured = firstValue(row, ['Featured', 'featured']);
          const importedFee = firstValue(row, ['Fees %', 'Fees', 'Fee %', 'feePercentage']);
          const importedPrice = firstValue(row, ['Price', 'price']);
          const importedStock = firstValue(row, ['Stock', 'stock']);
          const importedRating = firstValue(row, ['Rating', 'rating']);
          const importedReviews = firstValue(row, ['Reviews', 'reviews']);
          const importedTitle = firstValue(row, ['Title', 'title']);
          const importedBrand = firstValue(row, ['Brand', 'brand']);
          const importedOldPrice = firstValue(row, ['OldPrice', 'Old Price', 'oldPrice']);
          const importedDescription = firstValue(row, ['Description', 'description']);
          const importedImage = firstValue(row, ['ImageURL', 'Image Url', 'imageUrl', 'Image']);

          const isFeatured = ['yes', 'true', '1'].includes(String(importedFeatured || '').trim().toLowerCase());

          const productData = {
            id: String(productId),
            title: importedTitle ? String(importedTitle) : 'Untitled Product',
            brand: importedBrand ? String(importedBrand) : '',
            price: Number(importedPrice) || 0,
            feePercentage: Number(importedFee) || 0,
            oldPrice: importedOldPrice ? Number(importedOldPrice) : null,
            description: importedDescription ? String(importedDescription) : '',
            categoryId: normalizeCategory(importedCategory),
            vendorId: resolvedVendorId,
            image: importedImage ? String(importedImage) : '',
            images: importedImage ? [String(importedImage)] : [],
            stock: Number(importedStock) || 0,
            featured: isFeatured,
            rating: Number(importedRating) || 0,
            reviews: Number(importedReviews) || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          batch.set(productRef, productData);
          importedIds.push(String(productId));
          count++;
        });

        await batch.commit();
        // persist last import ids to localStorage for reliable undo
        try {
          localStorage.setItem('trendit_last_import', JSON.stringify({ ids: importedIds, ts: new Date().toISOString() }));
        } catch (e) {
          console.warn('Could not persist last import ids', e);
        }

        toast.success(`Imported ${count} products successfully!`);
        e.target.value = ''; // Reset input
      } catch (err) {
        console.error("Import error:", err);
        toast.error("Failed to import file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportImage = async (file: File) => {
    setImportingImage(true);
    const toastId = toast.loading("Uploading image to storage...");

    try {
      // Upload image to Firebase Storage first
      const imageUrl = await uploadImageToStorage(file, 'products');

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];

        const response = await fetchImageAnalysis(base64String, file.type);
        const result = JSON.parse(response.text || '{}');

        const productData = {
          title: result.title || 'Extracted Product',
          brand: result.brand || '',
          price: Number(result.price) || 0,
          description: result.description || '',
          categoryId: result.category || 'electronics',
          stock: Number(result.stock) || 50,
          image: imageUrl,
          images: [imageUrl],
          vendorId: currentVendorId || '',
          featured: false,
          rating: 0,
          reviews: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (!productData.vendorId) {
          toast.error(currentVendorName
            ? `No vendor link found for ${currentVendorName}. Ask a super admin to assign your vendor profile.`
            : 'No vendor link found for your account. Ask a super admin to assign your vendor profile.');
          setImportingImage(false);
          return;
        }

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

    if (isVendor && !isAdmin && !isSuperAdmin && !currentVendorId) {
      toast.error(currentVendorName
        ? `No vendor link found for ${currentVendorName}. Ask a super admin to assign your vendor profile.`
        : 'No vendor link found for your account. Ask a super admin to assign your vendor profile.');
      return;
    }

    navigate(`/admin/products/new?imageUrl=${encodeURIComponent(directUrl)}`);
    toast.success("Drive image linked! Please complete product details.");
  };

  const handleUndoLastImport = async () => {
    // Prefer deleting the explicit last-imported IDs saved in localStorage
    try {
      const raw = localStorage.getItem('trendit_last_import');
      if (raw) {
        const parsed = JSON.parse(raw) as { ids: string[]; ts?: string };
        if (parsed.ids && parsed.ids.length > 0) {
          const deletable: string[] = [];
          const deleted: string[] = [];
          const failed: { id: string; error: any }[] = [];

          for (const id of parsed.ids) {
            try {
              const snap = await getDoc(doc(db, 'products', String(id)));
              if (!snap.exists()) continue;
              const pdata = snap.data() as any;
              const prodVendorId = pdata?.vendorId || '';

              const allowedToDelete = isAdmin || isSuperAdmin || (isVendor && prodVendorId && currentVendorId && prodVendorId === currentVendorId);
              if (!allowedToDelete) continue;

              deletable.push(String(id));

              try {
                await deleteDoc(doc(db, 'products', String(id)));
                deleted.push(String(id));
              } catch (delErr) {
                failed.push({ id: String(id), error: delErr });
                console.warn('Failed to delete product id', id, delErr);
              }
            } catch (innerErr) {
              console.warn('Error checking product for deletion', id, innerErr);
            }
          }

          if (deleted.length === 0) {
            toast.error('No deletable products were removed (permission denied or already removed).');
            // remove stored import info to avoid repeated failures
            localStorage.removeItem('trendit_last_import');
            return;
          }

          // If some failed, keep the remaining ids in storage for a later retry
          const remaining = parsed.ids.filter(id => !deleted.includes(id));
          if (remaining.length > 0) {
            try {
              localStorage.setItem('trendit_last_import', JSON.stringify({ ids: remaining, ts: parsed.ts }));
            } catch (e) {
              console.warn('Could not update remaining import ids', e);
            }
          } else {
            localStorage.removeItem('trendit_last_import');
          }

          toast.success(`Deleted ${deleted.length} products from last import. ${failed.length ? `${failed.length} failed.` : ''}`);
          setUndoingImport(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Error reading last import from storage', err);
    }

    // Fallback: delete products created in the last 10 minutes
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60000).toISOString();
    const recentProducts = products.filter(p => p.createdAt && String(p.createdAt) > tenMinutesAgo);

    if (recentProducts.length === 0) {
      toast.error('No recently imported products found (last 10 mins).');
      return;
    }

    try {
      const deletableRecent = recentProducts.filter(p => {
        const prodVendorId = (p as any).vendorId || '';
        return isAdmin || isSuperAdmin || (isVendor && prodVendorId && currentVendorId && prodVendorId === currentVendorId);
      });

      if (deletableRecent.length === 0) {
        toast.error('No recently added products can be deleted (permission denied or none belong to you).');
        return;
      }

      const batch = writeBatch(db);
      deletableRecent.forEach(p => batch.delete(doc(db, 'products', String(p.id))));
      await batch.commit();
      toast.success(`Deleted ${deletableRecent.length} recently added products.`);
      setUndoingImport(false);
    } catch (error) {
      console.error('Undo error:', error);
      if (String(error).toLowerCase().includes('permission') || String(error).toLowerCase().includes('insufficient')) {
        toast.error('Permission denied when deleting imported products. Ensure your account has delete rights or ask an admin to undo the import.');
      } else {
        toast.error('Failed to delete recent products.');
      }
    }
  };

  const handleDeleteUntitledProducts = async () => {
    const untitledProducts = products.filter((product) => {
      const title = String(product.title || '').trim().toLowerCase();
      return title.includes('untitled');
    });

    if (untitledProducts.length === 0) {
      toast.error('No Untitled products found.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${untitledProducts.length} Untitled product${untitledProducts.length === 1 ? '' : 's'}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const chunkSize = 450;
      let deletedCount = 0;

      for (let index = 0; index < untitledProducts.length; index += chunkSize) {
        const chunk = untitledProducts.slice(index, index + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((product) => {
          batch.delete(doc(db, 'products', String(product.id)));
        });

        await batch.commit();
        deletedCount += chunk.length;
      }

      toast.success(`Deleted ${deletedCount} Untitled product${deletedCount === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Delete untitled products error:', error);
      if (String(error).toLowerCase().includes('permission') || String(error).toLowerCase().includes('insufficient')) {
        toast.error('Permission denied while deleting Untitled products. Make sure you are signed in as admin or super_admin.');
      } else {
        toast.error('Failed to delete Untitled products.');
      }
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
        <div className="flex items-center gap-2 flex-wrap">
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
          <button
            onClick={handleExportTemplate}
            className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
            title="Download a ready-to-fill import template"
          >
            <Download className="w-4 h-4" /> Template
          </button>

          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={handleDeleteUntitledProducts}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
              title="Delete all products with Untitled in the name"
            >
              <Trash2 className="w-4 h-4" /> Delete Untitled
            </button>
          )}

          {(isAdmin || isSuperAdmin) && (
            <>
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
            </>
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
  {categories.map(cat => (
    <option key={cat.id} value={cat.slug}>
      {cat.name}
    </option>
  ))}
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
                          <img 
                            src={product.image || (product.images?.[0]) || 'https://placehold.co/100x100?text=No+Image'} 
                            alt={product.title} 
                            className="w-full h-full object-contain" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image';
                            }}
                          />
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
                     {product.stock != null && product.stock <= 10 && product.stock > 0 && (
  <span className="text-[10px] text-amber-600 font-bold ml-1">Low Stock Alert</span>
)}
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
  {categories.find(c => c.slug === product.categoryId)?.name || product.categoryId?.replace('-', ' ')}
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