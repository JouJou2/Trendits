import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../hooks/useWishlist';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, Package, Heart, User, Trash2,
  ChevronRight, Truck, Clock, CheckCircle2, CreditCard, MapPin,
  HelpCircle, Check, Loader2, AlertTriangle, Store, Edit3, Shield,
  Star, Bell, ShoppingBag, ArrowRight, X, Plus, Home, Briefcase,
  Building2, Eye, EyeOff, Box, Settings, ImageOff, Search,
  Receipt, MessageSquare, History, Tag, Mail, Copy, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { isValidPhone, PHONE_HINT } from '../utils/phone';
import {
  collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc,
  addDoc, deleteDoc, setDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  updatePassword, reauthenticateWithCredential,
  EmailAuthProvider, deleteUser, verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { db, storage, auth } from '../services/firebase';
import { allProducts, ProductType, getDisplayPrice, LEBANON_ZONES } from '../data/products';
import { ProductCard } from '../components/ProductCard';

interface OrderItem {
  productId?: string | number;
  productImage?: string;
  image?: string;
  quantity: number;
  title?: string;
  productName?: string;
  price: number;
  unitPrice?: number;
  vendorId?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  total: number;
  items: OrderItem[];
  deliveryAddress: { address: string; city: string; };
  paymentMethod: string;
}

interface MyReview {
  id: string;
  productId: string;
  product: string;
  rating: number;
  comment: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  reply?: string;
  repliedBy?: string;
}

interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  name: string;
  phone: string;
  address: string;
  building: string;
  city: string;
  area: string;
  zone: string;
  isDefault: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 },
  shipped:   { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  icon: Truck },
  confirmed: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: CheckCircle2 },
  packed:    { bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: Package },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: X },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock },
};

const LABEL_ICONS: Record<string, React.ElementType> = {
  Home: Home, Work: Briefcase, Other: Building2,
};

const OrderItemThumb = ({ src }: { src?: string }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 p-1 overflow-hidden shrink-0 flex items-center justify-center">
      {src && !failed
        ? <img src={src} onError={() => setFailed(true)} className="w-full h-full object-contain mix-blend-multiply" alt="" />
        : <ImageOff className="w-5 h-5 text-slate-300" />}
    </div>
  );
};

const StatusBanner = ({ status }: { status: { type: 'success' | 'error' | null; message: string } }) =>
  status.type ? (
    <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-red-50 border border-red-100 text-red-700'}`}>
      {status.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {status.message}
    </div>
  ) : null;

export const Account = () => {
  const { user, logout, isVendor, isAdmin, isSuperAdmin, vendorProfile } = useAuth();
  const navigate = useNavigate();
  const { wishlist, isInWishlist } = useWishlist();
  const location = useLocation();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isCustomer = !isVendor && !isAdmin && !isSuperAdmin;
  const isAdminUser = isAdmin || isSuperAdmin;

  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab) return location.state.tab;
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'orders';
  });

  // Order filter
  const [orderFilter, setOrderFilter] = useState<'all' | 'in-progress' | 'cancelled'>('all');
  const [orderSearch, setOrderSearch] = useState('');

  // Shared state
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  // Google sign-ins have no password credential, so reauthenticateWithCredential
  // can never succeed for them — surface that instead of a wrong-password error.
  const hasPasswordLogin = auth.currentUser?.providerData?.some(p => p.providerId === 'password') ?? true;
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [notifyOrders, setNotifyOrders] = useState(user?.notifyOrders ?? true);
  const [notifyDelivery, setNotifyDelivery] = useState(user?.notifyDelivery ?? true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Support
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [supportStatus, setSupportStatus] = useState('');

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Addresses
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home' as 'Home' | 'Work' | 'Other',
    name: user?.name || '',
    phone: '', address: '', building: '', city: '', area: '', zone: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Favorites (merged static + Firestore)
  const [dbProducts, setDbProducts] = useState<ProductType[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // My Reviews
  const [myReviews, setMyReviews] = useState<MyReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // My Questions
  const [myQuestions, setMyQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Followed Stores
  const [followedStores, setFollowedStores] = useState<{ id: string; vendorId: string; vendorName: string; vendorImage: string }[]>([]);
  const [loadingFollowed, setLoadingFollowed] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  // Browsing History
  const [browsingHistory, setBrowsingHistory] = useState<{ id: string; title: string; image: string; price: number; viewedAt: string }[]>([]);
  const [loadingBrowsing, setLoadingBrowsing] = useState(true);
  const [clearingHistory, setClearingHistory] = useState(false);

  // Coupons
  interface PromoDoc { id: string; code: string; discount: string; status: string; type: string; lockedToEmail?: string | null; }
  const [myCoupons, setMyCoupons] = useState<PromoDoc[]>([]);
  const [storeWideCoupons, setStoreWideCoupons] = useState<PromoDoc[]>([]);
  const [usedPromoIds, setUsedPromoIds] = useState<Set<string>>(new Set());
  const [loadingCoupons, setLoadingCoupons] = useState(true);

  // Vendor images
  const [vendorBannerUrl, setVendorBannerUrl] = useState('');
  const [vendorLogoUrl, setVendorLogoUrl] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => { if (vendorProfile) { setVendorBannerUrl(vendorProfile.bannerImage || ''); setVendorLogoUrl(vendorProfile.image || ''); } }, [vendorProfile]);
  useEffect(() => { if (user) setDisplayName(user.name || ''); }, [user]);
  useEffect(() => {
    if (user) {
      setNotifyOrders(user.notifyOrders ?? true);
      setNotifyDelivery(user.notifyDelivery ?? true);
    }
  }, [user]);

  // Orders listener
  useEffect(() => {
    if (!user || !isCustomer) return;
    const q = query(collection(db, 'users', user.id, 'orders'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
      data.sort((a, b) => (!a.createdAt ? 1 : !b.createdAt ? -1 : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setOrders(data.filter(o => o.orderNumber && o.items));
      setLoadingOrders(false);
    }, () => setLoadingOrders(false));
    return () => unsub();
  }, [user, isCustomer]);

  // Addresses listener
  useEffect(() => {
    if (!user || !isCustomer) return;
    const q = query(collection(db, 'users', user.id, 'addresses'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as SavedAddress[];
      data.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
      setAddresses(data);
      setLoadingAddresses(false);
    }, () => setLoadingAddresses(false));
    return () => unsub();
  }, [user, isCustomer]);

  // Firestore products for favorites
  useEffect(() => {
    const q = collection(db, 'products');
    const unsub = onSnapshot(q, (snap) => {
      setDbProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as ProductType)));
      setLoadingFavorites(false);
    }, () => setLoadingFavorites(false));
    return () => unsub();
  }, []);

  // My Reviews listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'reviews'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as MyReview[];
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyReviews(data);
      setLoadingReviews(false);
    }, () => setLoadingReviews(false));
    return () => unsub();
  }, [user]);

  // My Questions listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'questions'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMyQuestions(data);
      setLoadingQuestions(false);
    }, () => setLoadingQuestions(false));
    return () => unsub();
  }, [user]);

  // Followed stores listener
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.id, 'following'), (snap) => {
      setFollowedStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoadingFollowed(false);
    }, () => setLoadingFollowed(false));
    return () => unsub();
  }, [user]);

  const handleUnfollow = async (vendorId: string) => {
    if (!user) return;
    setUnfollowingId(vendorId);
    try {
      await deleteDoc(doc(db, 'users', user.id, 'following', vendorId));
      await deleteDoc(doc(db, 'vendors', vendorId, 'followers', user.id));
    } catch (error) {
      console.error('Failed to unfollow:', error);
    } finally {
      setUnfollowingId(null);
    }
  };

  // Browsing history listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.id, 'browsingHistory'), orderBy('viewedAt', 'desc'), limit(24));
    const unsub = onSnapshot(q, (snap) => {
      setBrowsingHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setLoadingBrowsing(false);
    }, () => setLoadingBrowsing(false));
    return () => unsub();
  }, [user]);

  // My coupons: codes locked to my email + active store-wide codes
  useEffect(() => {
    if (!user?.email) { setLoadingCoupons(false); return; }
    let personalDone = false, storeWideDone = false;
    const checkDone = () => { if (personalDone && storeWideDone) setLoadingCoupons(false); };

    const personalQ = query(collection(db, 'promos'), where('lockedToEmail', '==', user.email.toLowerCase()));
    const unsubPersonal = onSnapshot(personalQ, (snap) => {
      setMyCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoDoc)));
      personalDone = true; checkDone();
    }, () => { personalDone = true; checkDone(); });

    const storeWideQ = query(collection(db, 'promos'), where('status', '==', 'Active'));
    const unsubStoreWide = onSnapshot(storeWideQ, (snap) => {
      setStoreWideCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as PromoDoc)).filter(p => !p.lockedToEmail));
      storeWideDone = true; checkDone();
    }, () => { storeWideDone = true; checkDone(); });

    return () => { unsubPersonal(); unsubStoreWide(); };
  }, [user?.email]);

  // Which of my locked coupons have already been redeemed
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'promoRedemptions'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      setUsedPromoIds(new Set(snap.docs.map(d => d.data().promoId).filter(Boolean)));
    });
    return () => unsub();
  }, [user]);

  const handleCopyCoupon = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied "${code}" to clipboard!`);
    } catch {
      toast.error('Could not copy code.');
    }
  };

  const combinedProducts = React.useMemo(() => {
    const map = new Map<string, ProductType>();
    dbProducts.forEach(p => map.set(p.id.toString(), p));
    return Array.from(map.values());
  }, [dbProducts]);

  const wishlistedItems = React.useMemo(
    () => combinedProducts.filter(p => isInWishlist(p.id)),
    [combinedProducts, isInWishlist]
  );

  // Buy Again: unique items from delivered orders, most recently delivered first
  const buyAgainItems = React.useMemo(() => {
    const delivered = orders.filter(o => o.status === 'delivered');
    const seen = new Map<string, OrderItem & { lastOrdered: string }>();
    delivered.forEach(o => {
      o.items?.forEach(item => {
        const key = (item.productId ?? item.title ?? item.productName ?? '').toString();
        if (!key) return;
        const existing = seen.get(key);
        if (!existing || new Date(o.createdAt).getTime() > new Date(existing.lastOrdered).getTime()) {
          seen.set(key, { ...item, lastOrdered: o.createdAt });
        }
      });
    });
    return Array.from(seen.values()).sort((a, b) => new Date(b.lastOrdered).getTime() - new Date(a.lastOrdered).getTime());
  }, [orders]);

  if (!user) return <Navigate to="/login" replace />;

  // ── HELPERS ──
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(storageRef, file);
    return await getDownloadURL(snap.ref);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setSaveStatus({ type: 'error', message: 'Name cannot be empty.' }); return; }
    if (!isValidPhone(phoneNumber)) { setSaveStatus({ type: 'error', message: 'Enter a valid phone number.' }); return; }
    setIsSaving(true); setSaveStatus({ type: null, message: '' });
    try {
      await updateDoc(doc(db, 'users', user.id), {
        name: displayName.trim(),
        phone: phoneNumber.trim(),
        updatedAt: new Date().toISOString(),
      });
      setSaveStatus({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
    } catch { setSaveStatus({ type: 'error', message: 'Failed to save. Try again.' }); }
    finally { setIsSaving(false); }
  };

  const handleToggleNotification = async (field: 'notifyOrders' | 'notifyDelivery', current: boolean) => {
    const next = !current;
    const setter = field === 'notifyOrders' ? setNotifyOrders : setNotifyDelivery;
    setter(next);
    try {
      await updateDoc(doc(db, 'users', user.id), { [field]: next, updatedAt: new Date().toISOString() });
    } catch {
      setter(current);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPasswordLogin) {
      setPwStatus({ type: 'error', message: 'Your account signs in with Google. Password changes are managed in your Google Account.' });
      return;
    }
    if (newPassword !== confirmPassword) { setPwStatus({ type: 'error', message: 'Passwords do not match.' }); return; }
    if (newPassword.length < 6) { setPwStatus({ type: 'error', message: 'Password must be at least 6 characters.' }); return; }
    setPwSaving(true); setPwStatus({ type: null, message: '' });
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('Not authenticated');
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPwStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setTimeout(() => setPwStatus({ type: null, message: '' }), 4000);
    } catch (err: any) {
      const msg = err.code === 'auth/wrong-password' ? 'Current password is incorrect.'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try later.'
        : 'Failed to update password.';
      setPwStatus({ type: 'error', message: msg });
    } finally { setPwSaving(false); }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPasswordLogin) {
      setEmailStatus({ type: 'error', message: 'Your account signs in with Google, so there is no password to confirm. Manage your email address in your Google Account settings.' });
      return;
    }
    if (!newEmail.trim() || newEmail.trim() === user.email) {
      setEmailStatus({ type: 'error', message: 'Enter a different email address.' });
      return;
    }
    setEmailSaving(true); setEmailStatus({ type: null, message: '' });
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) throw new Error('Not authenticated');
      const credential = EmailAuthProvider.credential(currentUser.email, emailChangePassword);
      await reauthenticateWithCredential(currentUser, credential);
      await verifyBeforeUpdateEmail(currentUser, newEmail.trim());
      setEmailStatus({ type: 'success', message: `Confirmation link sent to ${newEmail.trim()}. Click it to finish changing your email.` });
      setNewEmail(''); setEmailChangePassword('');
    } catch (err: any) {
      const msg = err.code === 'auth/wrong-password' ? 'Current password is incorrect.'
        : err.code === 'auth/email-already-in-use' ? 'That email is already in use.'
        : err.code === 'auth/invalid-email' ? 'Enter a valid email address.'
        : err.code === 'auth/too-many-requests' ? 'Too many attempts. Try later.'
        : 'Failed to start email change. Please try again.';
      setEmailStatus({ type: 'error', message: msg });
    } finally { setEmailSaving(false); }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSending(true);
    try {
      await addDoc(collection(db, 'supportMessages'), {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        message: supportMessage.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
      });
      setSupportStatus("Message sent! We'll reply within 2–4 hours.");
      setSupportMessage('');
      setTimeout(() => { setSupportStatus(''); setIsSupportOpen(false); }, 5000);
    } catch (err) {
      console.error('Failed to send support message:', err);
      setSupportStatus('Failed to send. Please try again.');
    } finally {
      setSupportSending(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'delete permanent') return;
    setIsDeleting(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      await deleteDoc(doc(db, 'users', user.id));
      await deleteUser(currentUser);
      await logout();
    } catch (err: any) {
      alert(err.code === 'auth/requires-recent-login'
        ? 'Please sign out and sign back in before deleting your account.'
        : 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  const openAddressForm = (addr?: SavedAddress) => {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({ label: addr.label, name: addr.name, phone: addr.phone, address: addr.address, building: addr.building, city: addr.city, area: addr.area, zone: addr.zone, isDefault: addr.isDefault });
    } else {
      setEditingAddress(null);
      setAddressForm({ label: 'Home', name: user.name || '', phone: '', address: '', building: '', city: '', area: '', zone: '', isDefault: addresses.length === 0 });
    }
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    try {
      const addrCol = collection(db, 'users', user.id, 'addresses');
      if (addressForm.isDefault) {
        const existing = await getDocs(addrCol);
        await Promise.all(existing.docs.map(d => updateDoc(doc(db, 'users', user.id, 'addresses', d.id), { isDefault: false })));
      }
      if (editingAddress) {
        await updateDoc(doc(db, 'users', user.id, 'addresses', editingAddress.id), { ...addressForm });
      } else {
        await addDoc(addrCol, { ...addressForm, createdAt: new Date().toISOString() });
      }
      setShowAddressForm(false); setEditingAddress(null);
    } catch (err) { console.error('Address save error:', err); }
    finally { setSavingAddress(false); }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await deleteDoc(doc(db, 'users', user.id, 'addresses', id));
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    setDeletingReviewId(id);
    try {
      await deleteDoc(doc(db, 'reviews', id));
    } catch (error) {
      console.error('Failed to delete review:', error);
    } finally {
      setDeletingReviewId(null);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear your entire browsing history?')) return;
    setClearingHistory(true);
    try {
      const batch = writeBatch(db);
      browsingHistory.forEach(item => batch.delete(doc(db, 'users', user.id, 'browsingHistory', item.id)));
      await batch.commit();
    } catch (error) {
      console.error('Failed to clear browsing history:', error);
    } finally {
      setClearingHistory(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    const addrCol = collection(db, 'users', user.id, 'addresses');
    const existing = await getDocs(addrCol);
    await Promise.all(existing.docs.map(d => updateDoc(doc(db, 'users', user.id, 'addresses', d.id), { isDefault: d.id === id })));
  };

  const handleVendorBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorProfile?.id) return;
    setUploadingBanner(true);
    try { const url = await uploadImage(file, `vendors/${vendorProfile.id}/banners`); setVendorBannerUrl(url); await updateDoc(doc(db, 'vendors', vendorProfile.id), { bannerImage: url }); }
    catch { alert('Failed to upload banner.'); }
    finally { setUploadingBanner(false); e.target.value = ''; }
  };

  const handleVendorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorProfile?.id) return;
    setUploadingLogo(true);
    try { const url = await uploadImage(file, `vendors/${vendorProfile.id}/logos`); setVendorLogoUrl(url); await updateDoc(doc(db, 'vendors', vendorProfile.id), { image: url }); }
    catch { alert('Failed to upload logo.'); }
    finally { setUploadingLogo(false); e.target.value = ''; }
  };

  const getRoleGradient = () => {
    if (user.role === 'super_admin') return 'from-rose-500 to-pink-600';
    if (user.role === 'admin') return 'from-blue-600 to-indigo-700';
    if (user.role === 'vendor') return 'from-amber-500 to-orange-500';
    return 'from-blue-600 to-blue-700';
  };

  const getRoleBadge = () => {
    if (user.role === 'super_admin') return { label: 'Super Admin', cls: 'bg-rose-100 text-rose-700' };
    if (user.role === 'admin') return { label: 'Admin', cls: 'bg-blue-100 text-blue-700' };
    if (user.role === 'vendor') return { label: 'Vendor', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'Member', cls: 'bg-slate-100 text-slate-600' };
  };
  const badge = getRoleBadge();

  // Placeholder tab IDs — show "coming soon" when clicked
  const COMING_SOON_TABS = new Set(['cards']);

  // ── SIDEBAR GROUPS ──
  const sidebarGroups = [
    {
      title: 'My Orders',
      items: [
        { id: 'orders',    icon: Receipt,      label: 'My orders' },
        { id: 'favorites', icon: Heart,        label: 'My favorites' },
        { id: 'reviews',   icon: MessageSquare,label: 'My reviews' },
        { id: 'questions', icon: HelpCircle,   label: 'My questions' },
        { id: 'buy-again', icon: ShoppingBag,  label: 'Buy again' },
      ]
    },
    {
      title: 'Just for you',
      items: [
        { id: 'coupons',   icon: Tag,          label: 'My coupons' },
        { id: 'browsing',  icon: History,      label: 'Browsing history' },
        { id: 'followed',  icon: Store,        label: 'Followed stores' },
      ]
    },
    {
      title: 'Account & Help',
      items: [
        { id: 'addresses', icon: MapPin,       label: 'My addresses' },
        { id: 'cards',     icon: CreditCard,   label: 'Saved cards' },
        { id: 'settings',  icon: Settings,     label: 'Account settings' },
        { id: 'help',      icon: HelpCircle,   label: 'Help & support' },
      ]
    }
  ];

  // Filter orders
  const filteredOrders = orders
    .filter(order => {
      if (orderFilter === 'all') return true;
      if (orderFilter === 'in-progress') return ['pending', 'confirmed', 'packed', 'shipped'].includes(order.status);
      if (orderFilter === 'cancelled') return order.status === 'cancelled';
      return true;
    })
    .filter(order => {
      if (!orderSearch.trim()) return true;
      const s = orderSearch.toLowerCase();
      return order.orderNumber.toLowerCase().includes(s) ||
        order.items?.some(i => (i.title || i.productName || '').toLowerCase().includes(s));
    });

  const handleSidebarClick = (id: string) => {
    setActiveTab(id);
  };

  const isSidebarActive = (id: string) => activeTab === id;

  // Flattened for the mobile tab strip — on a phone the grouped card stack would
  // push the actual tab content a full screen down.
  const allSidebarItems = sidebarGroups.flatMap(g => g.items);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT SIDEBAR ── */}
          <aside className="w-full lg:w-72 shrink-0 space-y-3">
            {/* User Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center text-white font-bold text-sm font-display shadow-md shrink-0`}>
                  {getInitials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                {/* On mobile Sign Out lives here instead of as a full row, so it
                    doesn't add another block above the tab content. */}
                <button
                  onClick={logout}
                  aria-label="Sign out"
                  className="lg:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile: horizontal tab strip */}
            <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto no-scrollbar">
              <div className="flex gap-2 w-max pb-1">
                {allSidebarItems.map(item => {
                  const active = isSidebarActive(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSidebarClick(item.id)}
                      className={`flex items-center gap-2 pl-3 pr-3.5 h-10 rounded-full border text-xs font-bold whitespace-nowrap transition-all ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                      {item.id === 'favorites' && wishlist.length > 0 && (
                        <span className={`text-[11px] font-bold px-1.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>
                          {wishlist.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop: grouped nav cards */}
            <div className="hidden lg:block space-y-3">
              {sidebarGroups.map((group, gi) => (
                <div key={gi} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide">{group.title}</p>
                  <div className="p-1.5">
                    {group.items.map(item => {
                      const active = isSidebarActive(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSidebarClick(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                          {item.id === 'favorites' && wishlist.length > 0 && (
                            <span className="ml-auto text-[11px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                              {wishlist.length}
                            </span>
                          )}
                          {active && item.id !== 'favorites' && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Sign Out */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm text-red-500 hover:bg-red-50 transition-all text-sm font-semibold"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 w-full min-w-0">
            <AnimatePresence mode="wait">

              {/* ═══════ ORDERS ═══════ */}
              {activeTab === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <h2 className="text-xl font-bold font-display text-slate-900">My orders</h2>
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text" value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                          placeholder="Search by item or brand name"
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(['all', 'in-progress', 'cancelled'] as const).map(f => (
                        <button key={f} onClick={() => setOrderFilter(f)}
                          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                            orderFilter === f ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}>
                          {f === 'in-progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingOrders ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading orders...</span>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No orders found</p>
                      <p className="text-sm text-slate-400 mb-6">Start shopping to see your orders here.</p>
                      <Link to="/" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors">
                        Explore Products <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredOrders.map(order => {
                        const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                        const StatusIcon = statusStyle.icon;
                        return (
                          <div key={order.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="bg-slate-50/80 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
                              <div className="flex items-center gap-6 flex-wrap">
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Order date</p>
                                  <p className="text-sm font-bold text-slate-700">
                                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Items</p>
                                  <p className="text-sm font-bold text-slate-700">{order.items?.reduce((s, i) => s + (i.quantity || 1), 0)} item(s)</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Total</p>
                                  <p className="text-sm font-bold text-blue-600 font-display">${order.total?.toFixed(2)}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => navigate(`/account/orders/${order.id}`)}
                                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95">
                                Details
                              </button>
                            </div>
                            <div className="p-5 flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex items-center justify-center shrink-0`}>
                                <StatusIcon className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <span className={`text-sm font-bold ${statusStyle.text} capitalize`}>{order.status}</span>
                                <div className="flex items-center gap-2 mt-3 flex-wrap">
                                  {order.items?.slice(0, 4).map((item, idx) => <OrderItemThumb key={idx} src={item.productImage || item.image} />)}
                                  {(order.items?.length || 0) > 4 && (
                                    <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                      +{order.items.length - 4}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ FAVORITES ═══════ */}
              {activeTab === 'favorites' && (
                <motion.div key="favorites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-900">My Favorites</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{wishlistedItems.length} saved item{wishlistedItems.length !== 1 ? 's' : ''}</p>
                    </div>
                    <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                  </div>

                  {loadingFavorites ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading favorites...</span>
                    </div>
                  ) : wishlistedItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <Heart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No favorites yet</p>
                      <p className="text-sm text-slate-400 mb-6">Tap the heart icon on any product to save it here.</p>
                      <Link to="/" className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-600 transition-colors">
                        <ShoppingBag className="w-4 h-4" /> Explore Marketplace
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      <AnimatePresence mode="popLayout">
                        {wishlistedItems.map(item => (
                          <motion.div
                            key={item.id} layout
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ProductCard product={item} isCompact={true} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ MY REVIEWS ═══════ */}
              {activeTab === 'reviews' && (
                <motion.div key="reviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">My Reviews</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{myReviews.length} review{myReviews.length !== 1 ? 's' : ''} submitted</p>
                  </div>

                  {loadingReviews ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading reviews...</span>
                    </div>
                  ) : myReviews.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <MessageSquare className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No reviews yet</p>
                      <p className="text-sm text-slate-400 mb-6">Reviews you leave on products will show up here.</p>
                      <Link to="/" className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-600 transition-colors">
                        <ShoppingBag className="w-4 h-4" /> Browse Products
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myReviews.map(review => (
                        <div key={review.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <Link to={`/product/${review.productId}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1">
                              {review.product}
                            </Link>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg ${
                                review.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                review.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {review.status}
                              </span>
                              <Link
                                to={`/product/${review.productId}?tab=reviews`}
                                className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                title="Edit review"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={deletingReviewId === review.id}
                                className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50"
                                title="Delete review"
                              >
                                {deletingReviewId === review.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} className={`w-3.5 h-3.5 ${n <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                            ))}
                            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider ml-2">
                              {review.date ? new Date(review.date).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                          {review.reply && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{review.repliedBy || 'Store'} replied</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{review.reply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ MY QUESTIONS ═══════ */}
              {activeTab === 'questions' && (
                <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">My Questions</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{myQuestions.length} question{myQuestions.length !== 1 ? 's' : ''} asked</p>
                  </div>

                  {loadingQuestions ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading...</span>
                    </div>
                  ) : myQuestions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <HelpCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No questions yet</p>
                      <p className="text-sm text-slate-400">Questions you ask sellers will show up here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myQuestions.map(q => (
                        <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <Link to={`/product/${q.productId}?tab=questions`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1">
                              {q.product}
                            </Link>
                            <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg ${
                              q.status === 'Answered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {q.status === 'Answered' ? 'Answered' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{q.question}</p>
                          {q.answer && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{q.answeredBy || 'Seller'} answered</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{q.answer}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ BUY AGAIN ═══════ */}
              {activeTab === 'buy-again' && (
                <motion.div key="buy-again" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">Buy Again</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Items from your delivered orders.</p>
                  </div>

                  {loadingOrders ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading...</span>
                    </div>
                  ) : buyAgainItems.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">Nothing to buy again yet</p>
                      <p className="text-sm text-slate-400">Items from your delivered orders will show up here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {buyAgainItems.map((item, i) => {
                        const title = item.title || item.productName || 'Item';
                        const image = item.productImage || item.image;
                        const price = item.unitPrice ?? item.price ?? 0;
                        return (
                          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col group hover:shadow-md hover:border-slate-200 transition-all">
                            <div className="h-28 bg-slate-50 rounded-xl p-2 flex items-center justify-center overflow-hidden mb-2.5">
                              {image
                                ? <img src={image} className="max-h-full max-w-full object-contain mix-blend-multiply" alt={title} />
                                : <ImageOff className="w-6 h-6 text-slate-300" />}
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{title}</h4>
                            <span className="text-base font-bold text-slate-900 mt-1">${price.toFixed(2)}</span>
                            {/* Goes to the product page rather than adding straight to cart — stock and
                                current price can only be trusted there, not from this historical order snapshot. */}
                            {item.productId ? (
                              <Link
                                to={`/product/${item.productId}`}
                                className="mt-3 w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" /> Buy Again
                              </Link>
                            ) : (
                              <span className="mt-3 w-full bg-slate-100 text-slate-400 font-bold py-2 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed">
                                No Longer Available
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ BROWSING HISTORY ═══════ */}
              {activeTab === 'browsing' && (
                <motion.div key="browsing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold font-display text-slate-900">Browsing History</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Products you've recently viewed.</p>
                    </div>
                    {browsingHistory.length > 0 && (
                      <button
                        onClick={handleClearHistory}
                        disabled={clearingHistory}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        {clearingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Clear History
                      </button>
                    )}
                  </div>

                  {loadingBrowsing ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading...</span>
                    </div>
                  ) : browsingHistory.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No browsing history yet</p>
                      <p className="text-sm text-slate-400">Products you view will show up here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {browsingHistory.map(item => (
                        <Link key={item.id} to={`/product/${item.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col hover:shadow-md hover:border-slate-200 transition-all">
                          <div className="h-28 bg-slate-50 rounded-xl p-2 flex items-center justify-center overflow-hidden mb-2.5">
                            {item.image
                              ? <img src={item.image} className="max-h-full max-w-full object-contain mix-blend-multiply" alt={item.title} />
                              : <ImageOff className="w-6 h-6 text-slate-300" />}
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.title}</h4>
                          <span className="text-base font-bold text-slate-900 mt-1">${item.price.toFixed(2)}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ FOLLOWED STORES ═══════ */}
              {activeTab === 'followed' && (
                <motion.div key="followed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">Followed Stores</h2>
                    <p className="text-xs text-slate-400 mt-0.5">You'll get notified when they add new products.</p>
                  </div>

                  {loadingFollowed ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading...</span>
                    </div>
                  ) : followedStores.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <Store className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">Not following any stores yet</p>
                      <p className="text-sm text-slate-400">Visit a vendor's page and tap "Follow Store" to see their new drops here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {followedStores.map(store => (
                        <div key={store.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-col group hover:shadow-md hover:border-slate-200 transition-all">
                          <Link to={`/vendor/${store.vendorId}`} className="h-20 bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center mb-2.5">
                            {store.vendorImage
                              ? <img src={store.vendorImage} className="w-full h-full object-cover" alt={store.vendorName} />
                              : <Store className="w-6 h-6 text-slate-300" />}
                          </Link>
                          <Link to={`/vendor/${store.vendorId}`} className="text-sm font-bold text-slate-800 line-clamp-1 hover:text-blue-600 transition-colors">
                            {store.vendorName}
                          </Link>
                          <button
                            onClick={() => handleUnfollow(store.vendorId)}
                            disabled={unfollowingId === store.vendorId}
                            className="mt-3 w-full bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                          >
                            {unfollowingId === store.vendorId ? 'Unfollowing...' : 'Unfollow'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ COUPONS ═══════ */}
              {activeTab === 'coupons' && (
                <motion.div key="coupons" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">My Coupons</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Codes reserved for your account and store-wide offers you can use at checkout.</p>
                  </div>

                  {loadingCoupons ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-500">Loading coupons...</span>
                    </div>
                  ) : (myCoupons.length === 0 && storeWideCoupons.length === 0) ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <Tag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No coupons available</p>
                      <p className="text-sm text-slate-400">Check back later for exclusive offers.</p>
                    </div>
                  ) : (
                    <>
                      {myCoupons.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1">Exclusive to you</h3>
                          {myCoupons.map(coupon => {
                            const isUsed = usedPromoIds.has(coupon.id);
                            const isExpired = coupon.status !== 'Active';
                            const disabled = isUsed || isExpired;
                            return (
                              <div key={coupon.id} className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap ${disabled ? 'border-slate-100 opacity-60' : 'border-purple-100'}`}>
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-slate-900 tracking-wider">{coupon.code}</span>
                                      <span className="text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">Exclusive to you</span>
                                      {isUsed && <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Used</span>}
                                      {!isUsed && isExpired && <span className="text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Expired</span>}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-0.5">{coupon.discount}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleCopyCoupon(coupon.code)}
                                  disabled={disabled}
                                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {storeWideCoupons.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 px-1 pt-2">Store-wide offers</h3>
                          {storeWideCoupons.map(coupon => (
                            <div key={coupon.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                  <Tag className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-slate-900 tracking-wider">{coupon.code}</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{coupon.type}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-0.5">{coupon.discount}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCopyCoupon(coupon.code)}
                                className="flex items-center gap-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-colors shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* ═══════ ADDRESSES ═══════ */}
              {activeTab === 'addresses' && (
                <motion.div key="addresses" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold font-display text-slate-900">Saved Addresses</h2>
                      <button onClick={() => openAddressForm()} className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95">
                        <Plus className="w-4 h-4" /> Add New
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showAddressForm && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-bold text-slate-900 font-display">{editingAddress ? 'Edit Address' : 'New Address'}</h3>
                          <button onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <form onSubmit={handleSaveAddress} className="space-y-4">
                          <div className="flex gap-2">
                            {(['Home', 'Work', 'Other'] as const).map(lbl => {
                              const Icon = LABEL_ICONS[lbl];
                              return (
                                <button key={lbl} type="button" onClick={() => setAddressForm(f => ({ ...f, label: lbl }))}
                                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${addressForm.label === lbl ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                                  <Icon className="w-4 h-4" /> {lbl}
                                </button>
                              );
                            })}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Full Name</label>
                              <input required value={addressForm.name} onChange={e => setAddressForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Phone</label>
                              <input required value={addressForm.phone} onChange={e => setAddressForm(f => ({ ...f, phone: e.target.value }))} placeholder="+961..." className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Street & Landmark</label>
                            <input required value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Bliss Street, Near AUB" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Building</label>
                              <input value={addressForm.building} onChange={e => setAddressForm(f => ({ ...f, building: e.target.value }))} placeholder="Block A, Floor 3" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">City</label>
                              <input required value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} placeholder="Beirut" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none text-sm font-semibold transition-all" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Zone</label>
                            <select required value={addressForm.zone} onChange={e => setAddressForm(f => ({ ...f, zone: e.target.value }))} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none text-sm font-semibold transition-all">
                              <option value="" disabled>Select zone…</option>
                              {LEBANON_ZONES.map(z => <option key={z}>{z}</option>)}
                            </select>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${addressForm.isDefault ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                              {addressForm.isDefault && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={addressForm.isDefault} onChange={e => setAddressForm(f => ({ ...f, isDefault: e.target.checked }))} />
                            <span className="text-sm font-semibold text-slate-700">Set as default address</span>
                          </label>
                          <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={savingAddress} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95">
                              {savingAddress && <Loader2 className="w-4 h-4 animate-spin" />} Save Address
                            </button>
                            <button type="button" onClick={() => { setShowAddressForm(false); setEditingAddress(null); }} className="px-6 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-xs hover:bg-slate-200 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {loadingAddresses ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
                  ) : addresses.length === 0 && !showAddressForm ? (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <MapPin className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-1">No addresses saved</p>
                      <p className="text-sm text-slate-400 mb-6">Add your delivery addresses for faster checkout.</p>
                      <button onClick={() => openAddressForm()} className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors">
                        <Plus className="w-4 h-4" /> Add Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {addresses.map(addr => {
                        const Icon = LABEL_ICONS[addr.label] || MapPin;
                        return (
                          <div key={addr.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${addr.isDefault ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100 hover:border-slate-200'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${addr.isDefault ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-900">{addr.label}</span>
                                  {addr.isDefault && <span className="text-[9px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Default</span>}
                                </div>
                                <p className="text-sm font-semibold text-slate-700">{addr.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{addr.phone}</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{addr.address}{addr.building ? `, ${addr.building}` : ''}<br />{addr.city}, {addr.zone}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                              {!addr.isDefault && <button onClick={() => handleSetDefault(addr.id)} className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Set Default</button>}
                              <button onClick={() => openAddressForm(addr)} className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">Edit</button>
                              <button onClick={() => handleDeleteAddress(addr.id)} className="flex-1 py-2 text-xs font-bold text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ SETTINGS (profile + password + notifications all-in-one) ═══════ */}
              {activeTab === 'settings' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">Account Settings</h2>
                    <p className="text-xs text-slate-400 mt-1">Manage your profile, password, and preferences</p>
                  </div>

                  {/* Profile */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 font-display mb-5 flex items-center gap-2 text-sm"><User className="w-5 h-5 text-blue-600" /> Personal Details</h3>
                    <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Display Name</label>
                        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Phone Number</label>
                        <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required placeholder={PHONE_HINT} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
                        <p className="text-[11px] text-slate-400 mt-1">Used by couriers to reach you about deliveries.</p>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Email</label>
                        <input type="email" value={user.email} disabled className="w-full px-4 py-3 rounded-xl bg-slate-100 text-slate-400 text-sm cursor-not-allowed border border-slate-100" />
                        <p className="text-[11px] text-slate-400 mt-1">Use "Change Email" below to update this.</p>
                      </div>
                      <StatusBanner status={saveStatus} />
                      <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                      </button>
                    </form>
                  </div>

                  {/* Change Email */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 font-display mb-5 flex items-center gap-2 text-sm"><Mail className="w-5 h-5 text-blue-600" /> Change Email</h3>
                    <form onSubmit={handleEmailChange} className="space-y-4 max-w-md">
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">New Email Address</label>
                        <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="new@email.com" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Current Password</label>
                        <input type="password" value={emailChangePassword} onChange={e => setEmailChangePassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
                      </div>
                      <p className="text-[11px] text-slate-400">We'll send a confirmation link to the new address. Your email won't change until you click it.</p>
                      <StatusBanner status={emailStatus} />
                      <button type="submit" disabled={emailSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
                        {emailSaving && <Loader2 className="w-4 h-4 animate-spin" />} Send Confirmation Link
                      </button>
                    </form>
                  </div>

                  {/* Password */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 font-display mb-5 flex items-center gap-2 text-sm"><Shield className="w-5 h-5 text-blue-600" /> Change Password</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                      {[
                        { label: 'Current Password', value: currentPassword, set: setCurrentPassword, show: showCurrentPw, toggle: () => setShowCurrentPw(v => !v) },
                        { label: 'New Password', value: newPassword, set: setNewPassword, show: showNewPw, toggle: () => setShowNewPw(v => !v) },
                      ].map(field => (
                        <div key={field.label}>
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">{field.label}</label>
                          <div className="relative">
                            <input type={field.show ? 'text' : 'password'} value={field.value} onChange={e => field.set(e.target.value)} required minLength={field.label.includes('New') ? 6 : undefined}
                              className="w-full px-4 py-3 pr-10 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
                            <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-semibold text-sm" />
                      </div>
                      <StatusBanner status={pwStatus} />
                      <button type="submit" disabled={pwSaving} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all">
                        {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
                      </button>
                    </form>
                  </div>

                  {/* Notifications */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 font-display mb-5 flex items-center gap-2 text-sm"><Bell className="w-5 h-5 text-blue-600" /> Notification Preferences</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Order Updates', desc: 'Notified when order status changes', state: notifyOrders, toggle: () => handleToggleNotification('notifyOrders', notifyOrders) },
                        { label: 'Delivery Alerts', desc: 'Real-time delivery notifications', state: notifyDelivery, toggle: () => handleToggleNotification('notifyDelivery', notifyDelivery) },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-4 py-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-xs text-slate-400">{item.desc}</p>
                          </div>
                          <button onClick={item.toggle} className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors shrink-0 ${item.state ? 'bg-blue-600' : 'bg-slate-200'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${item.state ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delete Account */}
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 border border-red-100 shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-red-700 text-sm">Delete Account</p>
                        <p className="text-xs text-red-500">Permanent — cannot be undone.</p>
                      </div>
                      {!showDeleteConfirm ? (
                        <button onClick={() => setShowDeleteConfirm(true)} className="shrink-0 bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95">Delete</button>
                      ) : (
                        <div className="bg-white p-4 rounded-xl border border-red-100 space-y-3 w-full sm:max-w-sm">
                          <p className="text-xs font-semibold text-slate-800">Type <span className="font-mono text-red-500 bg-red-50 px-1 rounded">delete permanent</span> to confirm:</p>
                          <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder="Type here..." className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-red-400 font-semibold" />
                          <div className="flex gap-2">
                            <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'delete permanent' || isDeleting} className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-lg text-xs disabled:opacity-40 active:scale-95 flex items-center justify-center gap-1.5 transition-all">
                              {isDeleting && <Loader2 className="w-3 h-3 animate-spin" />} Confirm
                            </button>
                            <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-lg text-xs hover:bg-slate-200 transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══════ HELP & SUPPORT ═══════ */}
              {activeTab === 'help' && (
                <motion.div key="help" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-xl font-bold font-display text-slate-900">Help & Support</h2>
                    <p className="text-xs text-slate-400 mt-1">Get help with orders, returns, or anything else.</p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <Link to="#" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">Help Center</p>
                      <p className="text-xs text-slate-400 mt-0.5">Browse common questions</p>
                    </Link>
                    <Link to="#" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                        <History className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">Returns Policy</p>
                      <p className="text-xs text-slate-400 mt-0.5">14-day return window</p>
                    </Link>
                    <Link to="/account?tab=orders" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-all">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                        <Package className="w-5 h-5 text-emerald-600" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">Track an Order</p>
                      <p className="text-xs text-slate-400 mt-0.5">Check delivery status</p>
                    </Link>
                  </div>

                  {/* Support */}
                  <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                          <HelpCircle className="w-5 h-5 text-blue-300" />
                        </div>
                        <div>
                          <h3 className="font-bold font-display text-white">Need Help?</h3>
                          <p className="text-slate-400 text-xs">Our team is here for you.</p>
                        </div>
                      </div>
                      {!isSupportOpen ? (
                        <button onClick={() => setIsSupportOpen(true)} className="bg-white text-slate-900 font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-100 transition-all active:scale-95">
                          Contact Support
                        </button>
                      ) : (
                        <form onSubmit={handleSendSupport} className="bg-white/10 rounded-xl p-4 space-y-3">
                          <textarea value={supportMessage} onChange={e => setSupportMessage(e.target.value)} placeholder="Describe your issue..." className="w-full px-3 py-2.5 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-white resize-none h-24" required />
                          <div className="flex gap-2">
                            <button type="submit" disabled={supportSending} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all">
                              {supportSending && <Loader2 className="w-3 h-3 animate-spin" />} Send
                            </button>
                            <button type="button" onClick={() => { setIsSupportOpen(false); setSupportMessage(''); }} className="bg-white/10 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-white/20 transition-colors">
                              Cancel
                            </button>
                          </div>
                          {supportStatus && <p className="text-xs text-emerald-400 font-medium">{supportStatus}</p>}
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══════ COMING SOON ═══════ */}
              {COMING_SOON_TABS.has(activeTab) && (
                <motion.div key="coming-soon" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                      <Box className="w-8 h-8 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Coming Soon</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">
                      This feature is currently under development and will be available soon.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ═══════ VENDOR STORE ═══════ */}
              {isVendor && !isAdminUser && activeTab === 'overview' && (
                <motion.div key="v-store" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {vendorProfile ? (
                    <>
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="h-40 sm:h-52 relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 group">
                          <input type="file" ref={bannerInputRef} onChange={handleVendorBannerUpload} accept="image/*" className="hidden" />
                          {vendorBannerUrl && <img src={vendorBannerUrl} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <button onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}
                            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100">
                            {uploadingBanner ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit3 className="w-3 h-3" />}
                            {uploadingBanner ? 'Uploading...' : 'Edit Banner'}
                          </button>
                        </div>
                        <div className="px-6 pb-6">
                          <div className="flex items-end gap-4 -mt-10 mb-5 relative z-10">
                            <div className="relative shrink-0">
                              <input type="file" ref={logoInputRef} onChange={handleVendorLogoUpload} accept="image/*" className="hidden" />
                              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-amber-50">
                                {vendorLogoUrl ? <img src={vendorLogoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-amber-500"><Store className="w-8 h-8" /></div>}
                              </div>
                              <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                                className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit3 className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="flex-1 pt-10 min-w-0">
                              <h2 className="font-bold text-xl text-slate-900 font-display truncate">{vendorProfile.name}</h2>
                              <div className="flex items-center gap-3 flex-wrap mt-1">
                                {vendorProfile.rating > 0 && <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /><span className="text-sm font-bold text-slate-700">{vendorProfile.rating}</span></div>}
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${vendorProfile.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{vendorProfile.status || 'pending'}</span>
                              </div>
                            </div>
                            <button onClick={() => navigate('/admin/profile')} className="shrink-0 flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95">
                              <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                          </div>
                          {vendorProfile.description && <p className="text-sm text-slate-600 leading-relaxed">{vendorProfile.description}</p>}
                          <div className="flex flex-wrap gap-8 mt-5 pt-5 border-t border-slate-100">
                            {[{ label: 'Products', value: vendorProfile.productCount || 0 }, { label: 'Total Sales', value: `$${(vendorProfile.totalSales || 0).toLocaleString()}` }, { label: 'Commission', value: `${vendorProfile.commissionRate || 8}%` }].map((stat, i) => (
                              <div key={i}><p className="text-2xl font-bold text-slate-900 font-display">{stat.value}</p><p className="text-[11px] text-slate-400 uppercase tracking-wide font-medium">{stat.label}</p></div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Products', icon: ShoppingBag, onClick: () => navigate('/admin/products'), color: 'bg-blue-50 text-blue-600' },
                          { label: 'Orders', icon: Package, onClick: () => navigate('/admin/orders'), color: 'bg-amber-50 text-amber-600' },
                          { label: 'Edit Store', icon: Edit3, onClick: () => navigate('/admin/profile'), color: 'bg-emerald-50 text-emerald-600' },
                          { label: 'Dashboard', icon: Store, onClick: () => navigate('/admin'), color: 'bg-purple-50 text-purple-600' },
                        ].map((card, i) => (
                          <button key={i} onClick={card.onClick} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-all group active:scale-95">
                            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}><card.icon className="w-5 h-5" /></div>
                            <p className="font-bold text-slate-900 text-sm">{card.label}</p>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
                      <Store className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 mb-4">Store not set up yet.</p>
                      <button onClick={() => navigate('/admin/profile')} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95">Set Up Store</button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══════ ADMIN OVERVIEW ═══════ */}
              {isAdminUser && activeTab === 'overview' && (
                <motion.div key="a-overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getRoleGradient()} flex items-center justify-center text-white font-bold text-2xl font-display shadow-lg`}>{getInitials(user.name)}</div>
                      <div>
                        <h2 className="font-bold text-slate-900 font-display text-xl">{user.name}</h2>
                        <p className="text-xs text-slate-400">{user.email}</p>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider mt-2 ${badge.cls}`}><Shield className="w-3 h-3" /> {badge.label}</span>
                      </div>
                    </div>
                    <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm font-bold text-blue-900 mb-1">You have full platform access.</p>
                      <p className="text-xs text-blue-700">Manage orders, products, vendors, users, and all platform settings from the admin dashboard.</p>
                    </div>
                    <button onClick={() => navigate('/admin')} className="mt-5 w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors active:scale-95">
                      Go to Admin Dashboard <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Orders', icon: Package, onClick: () => navigate('/admin/orders'), color: 'bg-blue-50 text-blue-600' },
                      { label: 'Products', icon: ShoppingBag, onClick: () => navigate('/admin/products'), color: 'bg-emerald-50 text-emerald-600' },
                      { label: 'Vendors', icon: Store, onClick: () => navigate('/admin/vendors'), color: 'bg-amber-50 text-amber-600' },
                      { label: 'Analytics', icon: Bell, onClick: () => navigate('/admin/analytics'), color: 'bg-purple-50 text-purple-600' },
                    ].map((card, i) => (
                      <button key={i} onClick={card.onClick} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-all group active:scale-95 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}><card.icon className="w-5 h-5" /></div>
                        <p className="font-bold text-slate-900 text-sm">{card.label}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
};