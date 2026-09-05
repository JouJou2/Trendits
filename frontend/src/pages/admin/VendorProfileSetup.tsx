import React, { useState, useEffect, useRef } from 'react';
import { Store, Upload, Loader2, AlertCircle, X, ImageIcon, ShieldCheck, BadgeCheck, Clock } from 'lucide-react';
import { doc, setDoc, collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { uploadImage } from '../../services/uploadImage';



export const VendorProfileSetup = () => {
  const { user, vendorProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [processingLogo, setProcessingLogo] = useState(false);
  const [processingBanner, setProcessingBanner] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [verificationRequest, setVerificationRequest] = useState<any>(null);
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    businessName: '',
    yearsOperating: '',
    qualityDescription: '',
    sampleLinks: '',
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'verificationRequests'), where('vendorId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setVerificationRequest(requests[0] || null);
    }, (error) => console.error('Verification request lookup error:', error));
    return () => unsub();
  }, [user]);

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!verifyForm.businessName.trim() || !verifyForm.qualityDescription.trim()) {
      toast.error('Please fill in the required fields.');
      return;
    }
    setSubmittingVerify(true);
    try {
      await addDoc(collection(db, 'verificationRequests'), {
        vendorId: user.id,
        vendorName: vendorProfile?.name || user.name,
        businessName: verifyForm.businessName.trim(),
        yearsOperating: verifyForm.yearsOperating.trim(),
        qualityDescription: verifyForm.qualityDescription.trim(),
        sampleLinks: verifyForm.sampleLinks.trim(),
        status: 'Pending',
        createdAt: new Date().toISOString(),
      });
      toast.success('Verification request submitted!');
      setShowVerifyForm(false);
      setVerifyForm({ businessName: '', yearsOperating: '', qualityDescription: '', sampleLinks: '' });
    } catch (error) {
      console.error('Failed to submit verification request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    image: '',
    bannerImage: '',
    category: 'Marketplace Store',
    taxNumber: '',
    deliveryDays: '2',
  });

  // Pre-fill if editing existing profile
  useEffect(() => {
    if (vendorProfile) {
      setFormData({
        name: vendorProfile.name || '',
        description: vendorProfile.description || '',
        location: vendorProfile.location || '',
        image: vendorProfile.image || '',
        bannerImage: vendorProfile.bannerImage || '',
        category: vendorProfile.category || 'Marketplace Store',
        taxNumber: vendorProfile.taxNumber || '',
        deliveryDays: vendorProfile.deliveryDays ? String(vendorProfile.deliveryDays) : '2',
      });
    }
    setChecking(false);
  }, [vendorProfile]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
  const file = e.target.files?.[0];
  if (!file) return;

  const isLogo = type === 'logo';
  isLogo ? setProcessingLogo(true) : setProcessingBanner(true);

  try {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const path = isLogo ? 'vendor-logos' : 'vendor-banners';
    const url = await uploadImage(file, path);

    setFormData(prev => ({
      ...prev,
      [isLogo ? 'image' : 'bannerImage']: url
    }));

    toast.success(`${isLogo ? 'Logo' : 'Banner'} uploaded!`);
  } catch (error) {
    console.error('Image upload error:', error);
    toast.error('Failed to upload image');
  } finally {
    isLogo ? setProcessingLogo(false) : setProcessingBanner(false);
    e.target.value = '';
  }
};

  const removeImage = (type: 'logo' | 'banner') => {
    setFormData(prev => ({
      ...prev,
      [type === 'logo' ? 'image' : 'bannerImage']: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const wasNewProfile = !vendorProfile;
    setLoading(true);
    try {
      const vendorRef = doc(db, 'vendors', user.id);

      await setDoc(vendorRef, {
        id: user.id,
        name: formData.name,
        description: formData.description,
        location: formData.location,
        image: formData.image || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&q=80',
        bannerImage: formData.bannerImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
        category: formData.category,
        ownerId: user.id,
        ownerName: user.name,
        email: user.email,
        // Never self-activate — an admin must approve the store (see AdminVendors)
        // before it can sell. Preserves whatever status already exists (pending
        // on first submission, or active/suspended if editing later).
        status: vendorProfile?.status || 'pending',
        rating: vendorProfile?.rating || 0,
        totalProducts: vendorProfile?.totalProducts || 0,
        productCount: vendorProfile?.productCount || 0,
        totalSales: vendorProfile?.totalSales || 0,
        commissionRate: vendorProfile?.commissionRate || 8,
        joinedDate: vendorProfile?.joinedDate || new Date().toLocaleDateString(),
        createdAt: vendorProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        taxNumber: formData.taxNumber || '',
        deliveryDays: Number(formData.deliveryDays) || 2,
      }, { merge: true });

      toast.success(
        wasNewProfile
          ? 'Profile submitted! An admin will review your store before it goes live.'
          : 'Profile updated!'
      );
      window.location.reload();
    } catch (error) {
      console.error('Profile setup error:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Complete Your Vendor Profile</h1>
            <p className="text-slate-500 text-sm mt-1">Set up your store to start selling products</p>
          </div>
        </div>

        {!vendorProfile && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium text-sm">Profile Required</p>
              <p className="text-amber-700 text-xs mt-1">Complete this form to submit your store for admin review. You'll be able to add products once it's approved.</p>
            </div>
          </div>
        )}

        {vendorProfile?.status === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium text-sm">Awaiting admin approval</p>
              <p className="text-amber-700 text-xs mt-1">Your store details are submitted. You'll be able to add products as soon as an admin approves your store — feel free to update your details below in the meantime.</p>
            </div>
          </div>
        )}

        {vendorProfile?.status === 'suspended' && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-800 font-medium text-sm">Store suspended</p>
              <p className="text-rose-700 text-xs mt-1">Your store is currently suspended and isn't visible to customers. Contact support if you believe this is a mistake.</p>
            </div>
          </div>
        )}

        {vendorProfile && (
          <div className="mb-6">
            {vendorProfile.verified ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-blue-800 font-medium text-sm">Your store is verified</p>
                  <p className="text-blue-700 text-xs mt-0.5">The verified badge is shown on your storefront and product pages.</p>
                </div>
              </div>
            ) : verificationRequest?.status === 'Pending' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">Verification request pending</p>
                  <p className="text-amber-700 text-xs mt-0.5">Submitted {new Date(verificationRequest.createdAt).toLocaleDateString()}. An admin will review it soon.</p>
                </div>
              </div>
            ) : showVerifyForm ? (
              <form onSubmit={handleSubmitVerification} className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Request Verification</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registered Business Name *</label>
                  <input type="text" required value={verifyForm.businessName} onChange={e => setVerifyForm(f => ({ ...f, businessName: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Years Operating</label>
                  <input type="text" value={verifyForm.yearsOperating} onChange={e => setVerifyForm(f => ({ ...f, yearsOperating: e.target.value }))} placeholder="e.g., 3 years" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Describe Your Product Quality & Sourcing *</label>
                  <textarea required rows={3} value={verifyForm.qualityDescription} onChange={e => setVerifyForm(f => ({ ...f, qualityDescription: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sample Product Links or Photos (optional)</label>
                  <input type="text" value={verifyForm.sampleLinks} onChange={e => setVerifyForm(f => ({ ...f, sampleLinks: e.target.value }))} placeholder="Paste links, separated by commas" className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submittingVerify} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
                    {submittingVerify && <Loader2 className="w-4 h-4 animate-spin" />} Submit Request
                  </button>
                  <button type="button" onClick={() => setShowVerifyForm(false)} className="text-slate-500 hover:text-slate-900 text-sm font-medium">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-slate-800 font-medium text-sm">Not verified yet</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {verificationRequest?.status === 'Rejected' ? 'Your last request was not approved. You can submit a new one.' : 'Request a verified badge for your store.'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowVerifyForm(true)} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors">
                  Request Verification
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Fresh Market"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store Description *</label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell customers about your store..."
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none"
            />
          </div>
            {/* Tax Number */}
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax / Business Registration Number</label>
            <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                placeholder="e.g., 12345678"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">Required for invoicing and tax compliance</p>
            </div>
          {/* Delivery Estimate */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Average Delivery Time (days)</label>
            <input
                type="number"
                min={1}
                value={formData.deliveryDays}
                onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })}
                placeholder="e.g., 2"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1">Used to estimate delivery dates on customer order tracking.</p>
          </div>
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Beirut, Lebanon"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
            >
              <option value="Marketplace Store">Marketplace Store</option>
              <option value="Organic Grocery">Organic Grocery</option>
              <option value="Electronics Shop">Electronics Shop</option>
              <option value="Fashion Boutique">Fashion Boutique</option>
              <option value="Home & Living">Home & Living</option>
              <option value="Beauty & Health">Beauty & Health</option>
            </select>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Store Logo</label>
            <input
              type="file"
              ref={logoInputRef}
              onChange={(e) => handleImageSelect(e, 'logo')}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            
            {formData.image ? (
              <div className="relative inline-block">
                <img 
                  src={formData.image} 
                  alt="Store logo preview" 
                  className="w-24 h-24 rounded-xl object-cover border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage('logo')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={processingLogo}
                className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {processingLogo ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Logo</span>
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP up to 5MB</p>
          </div>

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Store Banner</label>
            <input
              type="file"
              ref={bannerInputRef}
              onChange={(e) => handleImageSelect(e, 'banner')}
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
            />
            
            {formData.bannerImage ? (
              <div className="relative">
                <img 
                  src={formData.bannerImage} 
                  alt="Store banner preview" 
                  className="w-full h-32 rounded-xl object-cover border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage('banner')}
                  className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={processingBanner}
                className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {processingBanner ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                    <span className="text-sm text-slate-500 font-medium">Upload Banner Image</span>
                    <span className="text-xs text-slate-400">Recommended: 1200×400px, PNG/JPG/WebP</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Store className="w-5 h-5" />}
            {vendorProfile ? 'Update Profile' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
};