import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Tag, AlertCircle, TrendingUp, Database, Download, Upload, Check, X, Link as LinkIcon, Loader2, Image as ImageIcon, Store } from 'lucide-react';
import { collection, limit, onSnapshot, query, where, deleteDoc, doc, writeBatch, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { auth, db, handleFirestoreError, OperationType } from '../../services/firebase';
import { importImageFromUrl, importImages } from '../../services/imageImportApi';
import { buildProductWorkbook, downloadWorkbook, PRODUCT_COLUMNS } from '../../utils/productSheet';
import { imageLinksOf, planImport, productsToRows, toSheetRow, type ImportPlan } from '../../utils/productImport';
import { type CategoryRecord, categoryOptions, categoryLabel, productInCategory } from '../../utils/categories';
import { commissionRateOf, fetchVendorCommission } from '../../utils/commission';
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
  /** Admins can narrow the list to one store. Vendors only ever see their own. */
  const [selectedVendor, setSelectedVendor] = useState('All');
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
const [categories, setCategories] = useState<CategoryRecord[]>([]);
// Outcome of the last spreadsheet import, shown in a dialog so a vendor can see
// exactly which rows failed and why.
const [importReport, setImportReport] = useState<(ImportPlan & { created: number; updated: number; failedBatches: string[] }) | null>(null);

useEffect(() => {
  const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
    setCategories(snap.docs.map(d => ({
      id: d.id,
      name: d.data().name || d.id,
      slug: d.data().slug || d.id,
      parentId: d.data().parentId ?? null,
      variantTypes: d.data().variantTypes || [],
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
    const matchesCategory = selectedCategory === 'All' || productInCategory(p, selectedCategory, categories);
    const matchesVendor = selectedVendor === 'All' || String(p.vendorId || '') === selectedVendor;
    return matchesSearch && matchesCategory && matchesVendor;
  });

  // Stores for the admin's vendor filter, with how many products each has,
  // busiest first so the stores with stock are at the top.
  const vendorFilterOptions = (() => {
    const counts = new Map<string, number>();
    products.forEach(p => {
      const id = String(p.vendorId || '');
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    });
    return vendors
      .map(v => ({ id: String(v.id), name: v.name || 'Unnamed store', count: counts.get(String(v.id)) || 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  })();

  /** Shared by both exports: vendors get their own id and commission locked in. */
  const sheetContext = async () => {
    const staff = isAdmin || isSuperAdmin;
    const lockedVendorId = !staff && isVendor ? (currentVendorId || '') : undefined;
    return {
      isStaff: staff,
      lockedVendorId,
      lockedCommission: lockedVendorId ? await fetchVendorCommission(lockedVendorId) : undefined,
      categoryChoices: categoryOptions(categories).map(o => ({ slug: o.slug, label: o.label })),
    };
  };

  const handleExportExcel = async () => {
    try {
      const { isStaff, lockedVendorId, lockedCommission, categoryChoices } = await sheetContext();
      const workbook = await buildProductWorkbook({
        sheetName: 'Products',
        title: 'Product export',
        categories: categoryChoices,
        isStaff,
        lockedVendorId,
        lockedCommission,
        // One row per size, colour listings grouped — imports straight back.
        rows: productsToRows(products, categories, lockedVendorId),
      });
      await downloadWorkbook(workbook, `trendit_products_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Products exported.');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export products. Please try again.');
    }
  };

  const handleExportTemplate = async () => {
    try {
      const { isStaff, lockedVendorId, lockedCommission, categoryChoices } = await sheetContext();
      // Worked examples showing a family with two colours and two sizes. Rows
      // titled EXAMPLE are always skipped on import, so leaving them in is harmless.
      const sizeCategory = categories.find(c => (c.variantTypes || []).includes('size'));
      const exampleCategory = categoryChoices.find(o => o.slug === sizeCategory?.slug)?.label
        || categoryChoices[0]?.label || '';
      const fee = lockedCommission ?? 8;
      const example = (color: string, size: string, stock: number) => ({
        group: 'TEE-01', id: '', title: 'EXAMPLE — Cotton T-Shirt', brand: 'Your Brand',
        color, size, price: 20, fees: isStaff ? '' : fee,
        commissionAmount: Math.round(20 * fee) / 100,
        vendorAmount: Math.round((20 - Math.round(20 * fee) / 100) * 100) / 100,
        oldPrice: '', description: 'Soft cotton tee, regular fit.', category: exampleCategory, alsoIn: '',
        imageUrl: 'https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing',
        moreImages: '',
        stock, featured: 'No', vendorId: lockedVendorId || '', rating: '', reviews: '',
      });

      const workbook = await buildProductWorkbook({
        sheetName: 'Products',
        title: 'Product upload template',
        categories: categoryChoices,
        isStaff,
        lockedVendorId,
        lockedCommission,
        rows: [example('Black', 'M', 5), example('Black', 'L', 3), example('White', 'M', 4)],
      });
      await downloadWorkbook(workbook, 'trendit_product_upload_template.xlsx');
      toast.success('Template downloaded.');
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

        // Header spellings ("Image URL", "ImageURL", "image url") are matched
        // loosely in toSheetRow, so this only needs to collect header → value.
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

        // The template puts a banner and a hint line above the headers, so the
        // header row is not necessarily row 1. Find it by looking for a column
        // name we know, which also keeps older sheets importable.
        const knownHeaders = new Set(
          PRODUCT_COLUMNS.map(c => c.header.toLowerCase()).concat(['title', 'imageurl', 'image url', 'vendorid']),
        );
        const cleanHeader = (value: unknown) =>
          String(value ?? '').replace(/\*/g, '').trim(); // required columns are labelled "Title *"

        let headerRowNumber = 1;
        for (let candidate = 1; candidate <= Math.min(12, ws.rowCount); candidate++) {
          const values: string[] = [];
          ws.getRow(candidate).eachCell({ includeEmpty: false }, cell => {
            values.push(cleanHeader(cellValue(cell.value)).toLowerCase());
          });
          if (values.some(v => knownHeaders.has(v))) {
            headerRowNumber = candidate;
            break;
          }
        }

        const headers: string[] = [];
        ws.getRow(headerRowNumber).eachCell({ includeEmpty: true }, (cell, col) => {
          headers[col] = cleanHeader(cellValue(cell.value));
        });

        const data: ExcelProductRow[] = [];
        const rowNumbers: number[] = [];
        ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber <= headerRowNumber) return; // banner, hint and header rows
          const entry: ExcelProductRow = {};
          row.eachCell({ includeEmpty: false }, (cell, col) => {
            const key = headers[col];
            // Header names come from an uploaded file, so never let one reach
            // Object.prototype — that is the exact bug class we just moved off.
            if (!key || key === '__proto__' || key === 'constructor' || key === 'prototype') return;
            const value = cellValue(cell.value);
            if (value !== undefined) entry[key] = value;
          });
          if (Object.keys(entry).length > 0) { data.push(entry); rowNumbers.push(rowNumber); }
        });

        if (data.length === 0) {
          toast.error('No data found in the Excel file.');
          return;
        }

        const sheetRows = data.map((record, i) => toSheetRow(record, rowNumbers[i]));
        const staff = isAdmin || isSuperAdmin;
        const lockedVendorId = staff ? undefined : (currentVendorId || '');

        // Commission per store, read from the vendor documents the rules check
        // new products against.
        const commissionByVendor: Record<string, number> = {};
        if (lockedVendorId) {
          commissionByVendor[lockedVendorId] = await fetchVendorCommission(lockedVendorId);
        } else {
          for (const vend of vendors) commissionByVendor[String(vend.id)] = commissionRateOf(vend);
        }

        // Copy every referenced image into our own Storage bucket before writing
        // any product, so listings point at files we control.
        // Several photos per product: the main Image URL cell and More Images.
        const sourceUrls = imageLinksOf(sheetRows);
        const imageResults = new Map<string, { url?: string; error?: string }>();

        if (sourceUrls.length) {
          const idToken = await auth.currentUser?.getIdToken();
          if (!idToken) {
            toast.error('Your session expired. Sign in again and retry the import.');
            return;
          }
          const imageToastId = toast.loading(`Importing images 0/${sourceUrls.length}...`);
          try {
            const results = await importImages(
              idToken,
              sourceUrls,
              (done, total) => toast.loading(`Importing images ${done}/${total}...`, { id: imageToastId }),
              seconds => toast.loading(`Lots of photos — pausing ${seconds}s, then carrying on...`, { id: imageToastId }),
            );
            results.forEach((value, key) => imageResults.set(key, value));
            toast.dismiss(imageToastId);
          } catch (imageError) {
            toast.dismiss(imageToastId);
            console.error('Image import step failed:', imageError);
          }
        }

        const plan = planImport(sheetRows, {
          categories,
          existingProducts: products.map(pr => ({
            id: String(pr.id), variantGroupId: pr.variantGroupId,
            categoryId: pr.categoryId, categoryIds: pr.categoryIds,
          })),
          isStaff: staff,
          lockedVendorId,
          commissionByVendor,
          storedImage: url => (url ? imageResults.get(url)?.url ?? '' : ''),
          newId: () => doc(collection(db, 'products')).id,
          now: new Date().toISOString(),
        });

        // Per-image failures belong in the report next to the rows they affect.
        const imageFailures = [...imageResults.entries()].filter(([, r]) => r.error);
        if (imageFailures.length) {
          plan.warnings.unshift(...imageFailures.slice(0, 20).map(([url, r]) => `Image ${url.slice(0, 60)}${url.length > 60 ? '…' : ''}: ${r.error}`));
        }

        // Merge rather than overwrite, so an update keeps fields the sheet does
        // not carry (gallery photos, specs, real ratings, creation date). Chunked
        // because a Firestore batch holds at most 500 writes.
        const CHUNK = 400;
        let created = 0;
        let updated = 0;
        const createdIds: string[] = [];
        const failedBatches: string[] = [];

        for (let i = 0; i < plan.writes.length; i += CHUNK) {
          const chunk = plan.writes.slice(i, i + CHUNK);
          const batch = writeBatch(db);
          chunk.forEach(w => batch.set(doc(db, 'products', w.id), w.data, { merge: true }));
          try {
            await batch.commit();
            chunk.forEach(w => { if (w.isNew) { created++; createdIds.push(w.id); } else { updated++; } });
          } catch (batchError) {
            console.error('Import batch failed:', batchError);
            const rowsInChunk = chunk.flatMap(w => w.rows);
            failedBatches.push(
              `Rows ${Math.min(...rowsInChunk)}–${Math.max(...rowsInChunk)} were not saved: `
              + (String((batchError as { code?: string }).code).includes('permission')
                ? 'one of them refers to a product that is not yours, or to a store that is not approved yet.'
                : 'the database refused the write. Try again in a moment.'),
            );
          }
        }

        // Undo removes only what this import created. It used to record every
        // id, so undoing an import that updated live products deleted them.
        try {
          localStorage.setItem('trendit_last_import', JSON.stringify({ ids: createdIds, ts: new Date().toISOString() }));
        } catch (storageError) {
          console.warn('Could not persist last import ids', storageError);
        }

        setImportReport({ ...plan, created, updated, failedBatches });
        if (created + updated > 0 && !plan.errors.length && !failedBatches.length) {
          toast.success(`Import finished: ${created} created, ${updated} updated.`);
        }
        e.target.value = '';
      } catch (err) {
        console.error('Import error:', err);
        toast.error('Failed to import file. Please check the format.');
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

  /**
   * Takes any image link and copies it into our own Storage bucket, then opens
   * the new-product form pointing at the stored copy. This used to hand the form
   * a drive.google.com/uc?...&export=download URL, which the browser cannot
   * render (Drive answers with HTML unless the file is public), the site's CSP
   * does not allow, and Google throttles when hotlinked.
   */
  const handleImportDriveLink = async () => {
    const url = window.prompt('Paste an image link (Google Drive share link, or any direct image URL):');
    if (!url?.trim()) return;

    if (isVendor && !isAdmin && !isSuperAdmin && !currentVendorId) {
      toast.error(currentVendorName
        ? `No vendor link found for ${currentVendorName}. Ask a super admin to assign your vendor profile.`
        : 'No vendor link found for your account. Ask a super admin to assign your vendor profile.');
      return;
    }

    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      toast.error('Your session expired. Sign in again and retry.');
      return;
    }

    const toastId = toast.loading('Importing image...');
    try {
      const imported = await importImageFromUrl(idToken, url.trim());
      toast.success('Image saved to your store.', { id: toastId });
      navigate(`/admin/products/new?imageUrl=${encodeURIComponent(imported.url)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not import that image.', { id: toastId, duration: 9000 });
    }
  };

  /**
   * One-off repair for products saved before images were imported server-side.
   * Those rows still hold a third-party URL (a Drive share link, a stock photo),
   * which the browser often cannot render and which disappears the moment the
   * other host changes. Pulls each one into our bucket and rewrites the record.
   *
   * Only touches products whose image is not already in Storage, and leaves the
   * row untouched when the fetch fails, so it is safe to run more than once.
   */
  const handleBackfillImages = async () => {
    const needsFixing = products.filter(p => {
      const url = String(p.image || '').trim();
      return url && !url.startsWith('https://firebasestorage.googleapis.com/');
    });

    if (!needsFixing.length) {
      toast.success('Every product image is already stored in your own bucket.');
      return;
    }

    const confirmed = window.confirm(
      `${needsFixing.length} product${needsFixing.length === 1 ? '' : 's'} still link to an outside host.\n\n` +
      `Copy those images into your own storage and update the products?\n\n` +
      `Products whose image cannot be fetched are left exactly as they are.`,
    );
    if (!confirmed) return;

    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      toast.error('Your session expired. Sign in again and retry.');
      return;
    }

    const toastId = toast.loading(`Repairing images 0/${needsFixing.length}...`);
    let fixed = 0;
    const failures: string[] = [];

    for (const [index, product] of needsFixing.entries()) {
      toast.loading(`Repairing images ${index + 1}/${needsFixing.length}...`, { id: toastId });
      try {
        const imported = await importImageFromUrl(idToken, String(product.image));
        await updateDoc(doc(db, 'products', String(product.id)), {
          image: imported.url,
          images: [imported.url],
          updatedAt: new Date().toISOString(),
        });
        fixed++;
      } catch (err) {
        failures.push(`${product.title || product.id}: ${err instanceof Error ? err.message : 'failed'}`);
      }
    }

    if (failures.length) {
      console.warn('Image backfill failures:', failures);
      toast.error(
        `Repaired ${fixed} of ${needsFixing.length}. ${failures.length} could not be fetched — first: ${failures[0]}`,
        { id: toastId, duration: 12000 },
      );
    } else {
      toast.success(`Repaired ${fixed} product image${fixed === 1 ? '' : 's'}.`, { id: toastId });
    }
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

  /**
   * Gives products with no commission their store's rate. Commission comes out
   * of the price, so this changes what Trendit earns per sale, never what a
   * shopper pays. Products an admin set to a non-zero rate are left alone.
   */
  const handleApplyStoreCommission = async () => {
    const rates = new Map(vendors.map(v => [String(v.id), commissionRateOf(v)]));
    const pending = products
      .filter(p => p.vendorId && !(Number(p.feePercentage) > 0) && (rates.get(String(p.vendorId)) || 0) > 0)
      .map(p => ({ id: String(p.id), rate: rates.get(String(p.vendorId)) as number }));

    if (pending.length === 0) {
      toast.success('Every vendor product already has a commission.');
      return;
    }

    const byRate = new Map<number, number>();
    pending.forEach(p => byRate.set(p.rate, (byRate.get(p.rate) || 0) + 1));
    const summary = [...byRate].map(([rate, count]) => `${count} at ${rate}%`).join(', ');
    const confirmed = window.confirm(
      `Set the store commission on ${pending.length} product${pending.length === 1 ? '' : 's'} that currently have 0% (${summary})?\n\n`
      + 'Shelf prices do not change — the commission is taken out of the price.'
    );
    if (!confirmed) return;

    try {
      const chunkSize = 450;
      let updated = 0;
      const now = new Date().toISOString();
      for (let index = 0; index < pending.length; index += chunkSize) {
        const batch = writeBatch(db);
        pending.slice(index, index + chunkSize).forEach(p => {
          batch.update(doc(db, 'products', p.id), { feePercentage: p.rate, updatedAt: now });
        });
        await batch.commit();
        updated += Math.min(chunkSize, pending.length - index);
      }
      toast.success(`Store commission applied to ${updated} product${updated === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Apply store commission error:', error);
      toast.error('Could not apply store commission. Make sure you are signed in as an admin.');
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
              onClick={handleBackfillImages}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
              title="Copy any product image still hosted elsewhere into your own storage"
            >
              <ImageIcon className="w-4 h-4" /> Fix external images
            </button>
          )}

          {(isAdmin || isSuperAdmin) && (
            <button
              onClick={handleApplyStoreCommission}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 active:scale-95"
              title="Give products with 0% commission their store's rate. Shelf prices do not change."
            >
              <TrendingUp className="w-4 h-4" /> Apply store commission
            </button>
          )}

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
          {(isAdmin || isSuperAdmin) && (
            <div className="relative flex-1 sm:flex-none sm:w-56">
              <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none outline-none cursor-pointer ${selectedVendor === 'All' ? 'border-slate-200 bg-slate-50' : 'border-blue-300 bg-blue-50 text-blue-700 font-semibold'}`}
                aria-label="Filter by vendor"
              >
                <option value="All">All Vendors</option>
                {vendorFilterOptions.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.count})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
  value={selectedCategory}
  onChange={(e) => setSelectedCategory(e.target.value)}
  className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 appearance-none outline-none cursor-pointer"
>
  <option value="All">All Categories</option>
  {categoryOptions(categories).map(opt => (
    <option key={opt.slug} value={opt.slug}>
      {opt.label}
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
  {(() => {
    // "Men › Shorts" rather than just "Shorts", so a subcategory is never
    // mistaken for a main category.
    const cat = categories.find(c => c.slug === product.categoryId);
    return cat ? categoryLabel(cat, categories) : product.categoryId?.replace('-', ' ');
  })()}
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

      {importReport && (
        <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">Import results</h2>
                <p className="text-sm text-slate-500 mt-1">
                  <span className="font-semibold text-emerald-700">{importReport.created} created</span>
                  {' · '}
                  <span className="font-semibold text-blue-700">{importReport.updated} updated</span>
                  {importReport.errors.length > 0 && <>{' · '}<span className="font-semibold text-rose-700">{importReport.errors.length} rows skipped</span></>}
                </p>
              </div>
              <button onClick={() => setImportReport(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5">
              {[...importReport.failedBatches, ...importReport.errors].length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-600 mb-2">Not imported — fix these rows and import again</p>
                  <ul className="space-y-1.5">
                    {[...importReport.failedBatches, ...importReport.errors].map((msg, i) => (
                      <li key={i} className="text-sm text-slate-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importReport.warnings.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-2">Imported, with notes</p>
                  <ul className="space-y-1.5">
                    {importReport.warnings.map((msg, i) => (
                      <li key={i} className="text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
              {importReport.errors.length === 0 && importReport.warnings.length === 0 && importReport.failedBatches.length === 0 && (
                <p className="text-sm text-slate-600">Everything imported cleanly.</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setImportReport(null)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};