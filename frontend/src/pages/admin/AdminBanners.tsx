import React, { useState, useRef, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';
import {
  Image as ImageIcon, Plus, Trash2, ArrowUp, ArrowDown, Upload,
  Loader2, ExternalLink, Eye, EyeOff, Pencil, X, ZoomIn
} from 'lucide-react';

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  title?: string;
  focalX?: number; // 0-100, % — which point of the image stays centered when cropped
  focalY?: number; // 0-100, %
  zoom?: number;   // 1 = fit, up to 2 = zoomed in
  order: number;
  active: boolean;
  createdAt: string;
}

// Roughly matches the live desktop banner's proportions, so "how it looks here"
// matches "how it looks on the homepage" closely enough to adjust by eye.
const PREVIEW_ASPECT = 'aspect-[3.6/1]';

const emptyForm = { imageUrl: '', linkUrl: '', title: '', focalX: 50, focalY: 50, zoom: 1 };

const ImagePositionAdjuster = ({
  imageUrl, focalX, focalY, zoom, onMove, onZoom,
}: {
  imageUrl: string; focalX: number; focalY: number; zoom: number;
  onMove: (focalX: number, focalY: number) => void; onZoom: (zoom: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const setFromPointer = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((clientY - rect.top) / rect.height) * 100)));
    onMove(x, y);
  };

  return (
    <div>
      <div
        ref={containerRef}
        onClick={(e) => setFromPointer(e.clientX, e.clientY)}
        className={`relative w-full ${PREVIEW_ASPECT} rounded-xl overflow-hidden bg-slate-900 cursor-crosshair border border-slate-200`}
        title="Click to set the focal point"
      >
        <img
          src={imageUrl}
          alt="Banner preview"
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{ objectPosition: `${focalX}% ${focalY}%`, transform: `scale(${zoom})`, transformOrigin: `${focalX}% ${focalY}%` }}
        />
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white bg-blue-600/80 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${focalX}%`, top: `${focalY}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">Click anywhere on the preview to set the focal point — it's what stays centered when the image gets cropped to fit the banner.</p>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5"><ZoomIn className="w-3.5 h-3.5" /> Zoom</label>
          <span className="text-xs font-bold text-slate-500">{Math.round(zoom * 100)}%</span>
        </div>
        <input
          type="range" min={1} max={2} step={0.05} value={zoom}
          onChange={(e) => onZoom(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>
    </div>
  );
};

export const AdminBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner)));
      setLoading(false);
    }, (error) => {
      console.error('Failed to load banners:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploading(true);
    setUploadProgress(0);
    try {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `banners/${timestamp}_${randomStr}.${extension}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      const imageUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
          (error) => reject(error),
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
        );
      });

      // A newly (re)chosen image should start centered/unzoomed again.
      setForm(prev => ({ ...prev, imageUrl, focalX: 50, focalY: 50, zoom: 1 }));
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const startEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      title: banner.title || '',
      focalX: banner.focalX ?? 50,
      focalY: banner.focalY ?? 50,
      zoom: banner.zoom ?? 1,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSaveBanner = async () => {
    if (!form.imageUrl.trim()) {
      toast.error('Upload or paste an image first.');
      return;
    }
    const trimmedLink = form.linkUrl.trim();
    if (!trimmedLink) {
      toast.error('Add a destination link — where should clicking this banner take shoppers?');
      return;
    }
    if (!trimmedLink.startsWith('/') && !/^https?:\/\//i.test(trimmedLink)) {
      toast.error('Link must start with "/" (e.g. /category/electronics) or "https://".');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        imageUrl: form.imageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        title: form.title.trim(),
        focalX: form.focalX,
        focalY: form.focalY,
        zoom: form.zoom,
      };
      if (editingId) {
        await updateDoc(doc(db, 'banners', editingId), payload);
        toast.success('Banner updated!');
      } else {
        await addDoc(collection(db, 'banners'), {
          ...payload,
          order: banners.length,
          active: true,
          createdAt: new Date().toISOString(),
        });
        toast.success('Banner added!');
      }
      cancelEdit();
    } catch (error) {
      console.error('Failed to save banner:', error);
      toast.error('Failed to save banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateDoc(doc(db, 'banners', banner.id), { active: !banner.active });
    } catch (error) {
      console.error('Failed to update banner:', error);
      toast.error('Failed to update banner.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      if (editingId === id) cancelEdit();
      toast.success('Banner deleted.');
    } catch (error) {
      console.error('Failed to delete banner:', error);
      toast.error('Failed to delete banner.');
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;
    const a = banners[index];
    const b = banners[targetIndex];
    try {
      await Promise.all([
        updateDoc(doc(db, 'banners', a.id), { order: b.order }),
        updateDoc(doc(db, 'banners', b.id), { order: a.order }),
      ]);
    } catch (error) {
      console.error('Failed to reorder banners:', error);
      toast.error('Failed to reorder banners.');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading banners...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900">Homepage Banners</h1>
        <p className="text-slate-500 text-sm mt-1">Upload campaign or offer images for the homepage carousel. Shoppers who click a banner are taken to its link.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {banners.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium">
              <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              No banners yet. The homepage will show its default hero until you add one.
            </div>
          ) : (
            banners.map((banner, idx) => (
              <div key={banner.id} className={`bg-white border rounded-xl overflow-hidden shadow-sm flex items-center gap-4 p-4 ${editingId === banner.id ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200'}`}>
                <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                  <img
                    src={banner.imageUrl}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${banner.focalX ?? 50}% ${banner.focalY ?? 50}%`, transform: `scale(${banner.zoom ?? 1})`, transformOrigin: `${banner.focalX ?? 50}% ${banner.focalY ?? 50}%` }}
                    alt={banner.title || 'Banner'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 truncate">{banner.title || 'Untitled banner'}</p>
                  <a href={banner.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                    <ExternalLink className="w-3 h-3 shrink-0" /> {banner.linkUrl}
                  </a>
                  <span className={`inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${banner.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {banner.active ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => handleReorder(idx, 'up')} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleReorder(idx, 'down')} disabled={idx === banners.length - 1} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent">
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(banner)}
                    className="p-2 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                    title="Edit image position, link, or label"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner)}
                    className="p-2 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                    title={banner.active ? 'Hide from homepage' : 'Show on homepage'}
                  >
                    {banner.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id)}
                    className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                    title="Delete banner"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                {editingId ? <Pencil className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-blue-600" />}
                {editingId ? 'Edit Banner' : 'Add Banner'}
              </h2>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-700 transition-colors" title="Cancel edit">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Image</label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="https://... or upload"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                      title="Upload from computer"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">Wide images work best — the carousel spans the full page width.</p>
              </div>

              {form.imageUrl && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Position & Zoom</label>
                  <ImagePositionAdjuster
                    imageUrl={form.imageUrl}
                    focalX={form.focalX}
                    focalY={form.focalY}
                    zoom={form.zoom}
                    onMove={(focalX, focalY) => setForm(prev => ({ ...prev, focalX, focalY }))}
                    onZoom={(zoom) => setForm(prev => ({ ...prev, zoom }))}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Destination Link</label>
                <input
                  type="text"
                  placeholder="/search?q=sale or https://..."
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
                <p className="mt-1.5 text-[10px] text-slate-400">Use a path like <span className="font-mono">/category/electronics</span> for pages on this site, or a full https:// URL to link elsewhere.</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5">Label (internal, optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Sale"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  disabled={saving || !form.imageUrl.trim() || !form.linkUrl.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Save Changes' : 'Add Banner'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {uploading && (
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
