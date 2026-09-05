import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AIElevatorPitch } from '../components/AIElevatorPitch';
import { ProductCard } from '../components/ProductCard';
import { ProductDetailSkeleton } from '../components/Skeletons';
import { motion } from 'motion/react';
import { SEO } from '../components/SEO';
import {
  Star,
  ChevronRight,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  CheckCircle2,
  Package,
  Clock,
  ArrowRight,
  ShieldAlert,
  Gem,
  Loader2,
  Send,
  Edit3,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { allProducts, ProductType, getDisplayPrice } from '../data/products';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, setDoc, query, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toast } from 'react-hot-toast';

interface ReviewType {
  id: string;
  productId: string;
  vendorId?: string;
  userId: string;
  user: string;
  rating: number;
  comment: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  reply?: string;
  repliedBy?: string;
  repliedAt?: string;
}

interface QuestionType {
  id: string;
  productId: string;
  vendorId?: string;
  userId: string;
  user: string;
  question: string;
  status: 'Pending' | 'Answered';
  date: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
}

export const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mainImage, setMainImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);

  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'products', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as unknown as ProductType;
        setProduct(data);
        setMainImage(data.images?.[0] || data.image);
        setSelectedColor(data.colors?.[0] || '');
        setSelectedSize(data.sizeOptions?.[0] || data.sizes?.[0] || '');
      } else {
        // No demo-data fallback: an id that isn't in the catalog is a 404.
        setProduct(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  // Record this view in the user's browsing history
  useEffect(() => {
    if (!user || !product) return;
    setDoc(doc(db, 'users', user.id, 'browsingHistory', product.id.toString()), {
      title: product.title,
      image: product.image || product.images?.[0] || '',
      price: product.price,
      viewedAt: new Date().toISOString(),
    }).catch((error) => console.error('Failed to record browsing history:', error));
  }, [user, product]);

  // Everything lives on one page now (no tabs) — deep links like ?tab=reviews
  // just scroll to that section instead of switching a tab.
  const scrollToSection = (sectionId: string, behavior: ScrollBehavior = 'smooth') => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior, block: 'start' });
  };

  useEffect(() => {
    if (!product) return;
    const tab = searchParams.get('tab');
    if (tab === 'reviews' || tab === 'questions' || tab === 'specs') {
      // Instant on landing — an animated scroll on page load reads as a glitch, not a feature.
      setTimeout(() => scrollToSection(tab, 'auto'), 100);
    }
  }, [product, searchParams]);

  // Fetch real vendor from Firestore
  useEffect(() => {
    if (!product?.vendorId) return;

    const unsub = onSnapshot(doc(db, 'vendors', product.vendorId), (docSnap) => {
      if (docSnap.exists()) {
        setVendor({ id: docSnap.id, ...docSnap.data() });
      } else {
        setVendor(null);
      }
    });

    return () => unsub();
  }, [product?.vendorId]);

  // Subscribe to reviews for this product
  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, 'reviews'), where('productId', '==', id.toString()));
    const unsub = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReviewType));
      revs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setReviews(revs);
    }, (error) => {
      console.error('Reviews subscription error:', error);
      setReviews([]);
    });

    return () => unsub();
  }, [id]);

  // Subscribe to Q&A for this product
  useEffect(() => {
    if (!id) return;

    const q = query(collection(db, 'questions'), where('productId', '==', id.toString()));
    const unsub = onSnapshot(q, (snapshot) => {
      const qs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as QuestionType));
      qs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setQuestions(qs);
    }, (error) => {
      console.error('Questions subscription error:', error);
      setQuestions([]);
    });

    return () => unsub();
  }, [id]);

  // Other colors of this product are separate, linked listings — fetch them
  // so shoppers can jump straight to the color they want.
  const [colorSiblings, setColorSiblings] = useState<ProductType[]>([]);
  useEffect(() => {
    if (!product?.variantGroupId) { setColorSiblings([]); return; }
    const q = query(collection(db, 'products'), where('variantGroupId', '==', product.variantGroupId));
    const unsub = onSnapshot(q, (snapshot) => {
      setColorSiblings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as ProductType)));
    }, (error) => {
      console.error('Color variant lookup error:', error);
      setColorSiblings([]);
    });
    return () => unsub();
  }, [product?.variantGroupId]);

  // Real related products from the same live category, not the static demo catalog.
  const [relatedProducts, setRelatedProducts] = useState<ProductType[]>([]);
  useEffect(() => {
    if (!product?.categoryId || !product?.id) { setRelatedProducts([]); return; }
    const q = query(collection(db, 'products'), where('categoryId', '==', product.categoryId), limit(9));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as unknown as ProductType))
        .filter(p => p.id.toString() !== product.id.toString());
      setRelatedProducts(items.slice(0, 4));
    }, (error) => {
      console.error('Related products fetch error:', error);
      setRelatedProducts([]);
    });
    return () => unsub();
  }, [product?.categoryId, product?.id]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y });
  };

  const isWishlisted = product ? isInWishlist(product.id) : false;

  if (loading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white m-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-100">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-12 h-12 text-slate-300" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 font-display uppercase tracking-tight mb-2">Product not found.</h2>
        <p className="text-slate-500 font-medium mb-8">It might have been removed or the link is incorrect.</p>
        <Link to="/" className="bg-blue-600 text-white font-bold px-8 py-3 rounded-2xl shadow-xl shadow-blue-100">Return to Home</Link>
      </div>
    );
  }

  const discount = product.oldPrice && product.oldPrice > product.price ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;

  const estimatedDeliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // ── Size matrix — colors are separate linked products (see colorSiblings), not an in-product axis ──
  const hasSizeOptions = (product.sizeOptions?.length || 0) > 0;
  const usesVariantMatrix = (product.variants?.length || 0) > 0 && hasSizeOptions;
  const selectionComplete = !hasSizeOptions || !!selectedSize;
  const selectedVariant = usesVariantMatrix && selectionComplete
    ? product.variants!.find(v => v.size === selectedSize)
    : undefined;
  const needsSelection = usesVariantMatrix && !selectionComplete;

  const variantEffectivePrices = usesVariantMatrix ? product.variants!.map(v => v.price ?? product.price) : [];
  const minVariantPrice = variantEffectivePrices.length ? Math.min(...variantEffectivePrices) : product.price;
  const maxVariantPrice = variantEffectivePrices.length ? Math.max(...variantEffectivePrices) : product.price;
  const showPriceRange = usesVariantMatrix && !selectionComplete && minVariantPrice !== maxVariantPrice;
  const displayPrice = selectedVariant?.price != null ? selectedVariant.price : product.price;

  const effectiveStock = usesVariantMatrix ? selectedVariant?.stock : product.stock;
  const isOutOfStock = usesVariantMatrix ? (selectionComplete && (selectedVariant?.stock ?? 0) === 0) : product.stock === 0;
  const isLowStock = effectiveStock !== undefined && effectiveStock > 0 && effectiveStock < 10;

  // schema.org Product markup. Every value here is the one actually shown on
  // the page — price includes the platform fee, availability follows real stock.
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || undefined,
    image: [product.image, ...(product.images || [])].filter(Boolean).slice(0, 5),
    sku: String(product.id),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      priceCurrency: 'USD',
      price: getDisplayPrice(displayPrice, product.feePercentage).toFixed(2),
      availability: isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
    // Only claim ratings when real reviews exist — inventing them is a manual
    // action risk, and Google validates aggregateRating against visible content.
    ...(product.rating && product.reviews
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating).toFixed(1),
            reviewCount: Number(product.reviews),
          },
        }
      : {}),
  };

  const buildCartItem = () => ({
    productId: product.id,
    title: product.title,
    price: getDisplayPrice(displayPrice, product.feePercentage),
    image: product.image || (product.images && product.images[0]) || 'https://placehold.co/600x600?text=No+Image',
    images: product.images || [],
    selectedColor,
    selectedSize,
    variantId: selectedVariant?.id,
    sku: selectedVariant?.sku,
    quantity,
    vendorId: product.vendorId,
  });

  const isSizeSoldOut = (sizeName: string) => {
    if (!usesVariantMatrix) return false;
    const relevant = product.variants!.filter(v => v.size === sizeName);
    return relevant.length > 0 && relevant.every(v => v.stock === 0);
  };

  // Legacy demo products still use a flat multi-choice colors[] array (no linked siblings)
  const hasLegacyColorChoice = colorSiblings.length === 0 && (product.colors?.length || 0) > 1;

  const approvedReviews = reviews.filter(r => r.status === 'Approved');
  const liveRating = approvedReviews.length > 0
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
    : (product.rating || 0);
  const liveReviewCount = approvedReviews.length > 0 ? approvedReviews.length : (product.reviews || 0);
  const ownReview = reviews.find(r => r.userId === user?.id);
  const visibleReviews = reviews
    .filter(r => r.status === 'Approved' && r.id !== ownReview?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    if (newRating < 1) {
      toast.error('Please select a star rating.');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Please write a comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: product.id.toString(),
        vendorId: product.vendorId || '',
        userId: user.id,
        user: user.name,
        product: product.title,
        rating: newRating,
        comment: newComment.trim(),
        status: 'Pending',
        date: new Date().toISOString(),
      });
      setNewComment('');
      setNewRating(0);
      toast.success('Review submitted! It will appear once approved.');
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const startEditingReview = () => {
    if (!ownReview) return;
    setNewRating(ownReview.rating);
    setNewComment(ownReview.comment);
    setIsEditingReview(true);
  };

  const cancelEditingReview = () => {
    setIsEditingReview(false);
    setNewRating(0);
    setNewComment('');
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownReview) return;
    if (newRating < 1) {
      toast.error('Please select a star rating.');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Please write a comment.');
      return;
    }

    setSubmittingReview(true);
    try {
      await updateDoc(doc(db, 'reviews', ownReview.id), {
        rating: newRating,
        comment: newComment.trim(),
        status: 'Pending',
        updatedAt: new Date().toISOString(),
      });
      setIsEditingReview(false);
      setNewComment('');
      setNewRating(0);
      toast.success('Review updated! It will need to be re-approved.');
    } catch (error) {
      console.error('Failed to update review:', error);
      toast.error('Failed to update review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!ownReview) return;
    if (!confirm('Delete your review? This cannot be undone.')) return;
    setDeletingReview(true);
    try {
      await deleteDoc(doc(db, 'reviews', ownReview.id));
      toast.success('Review deleted.');
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review. Please try again.');
    } finally {
      setDeletingReview(false);
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;
    if (!newQuestion.trim()) {
      toast.error('Please write a question.');
      return;
    }

    setSubmittingQuestion(true);
    try {
      await addDoc(collection(db, 'questions'), {
        productId: product.id.toString(),
        vendorId: product.vendorId || '',
        userId: user.id,
        user: user.name,
        product: product.title,
        question: newQuestion.trim(),
        status: 'Pending',
        date: new Date().toISOString(),
      });
      setNewQuestion('');
      toast.success('Question submitted! The seller will be notified.');
    } catch (error) {
      console.error('Failed to submit question:', error);
      toast.error('Failed to submit question. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-12">
        <SEO 
          title={product.title} 
          description={product.description} 
          image={product.image || 'https://placehold.co/600x600?text=No+Image'}
          url={window.location.href}
          type="product"
          jsonLd={productJsonLd}
        />
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-8 overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to={`/category/${product.categoryId}`} className="hover:text-blue-600">{product.categoryId.replace('-', ' ')}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-900 truncate max-w-[150px]">{product.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-12 xl:gap-16 mb-12">
        {/* Gallery Section */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col-reverse md:flex-row gap-4">
            {/* Thumbnails */}
            <div className="flex md:flex-col gap-3 overflow-x-auto md:w-24 no-scrollbar">
              {product.images?.map((img, idx) => (
                <button
                  key={idx}
                  onMouseEnter={() => setMainImage(img)}
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${mainImage === img ? 'border-blue-600 ring-4 ring-blue-100' : 'border-slate-100'}`}
                >
                  <img src={img || 'https://placehold.co/600x600?text=No+Image'} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Display */}
            <div
              className="relative aspect-square w-full max-w-xl mx-auto rounded-[2.5rem] bg-slate-50 overflow-hidden cursor-zoom-in group"
              onMouseEnter={() => setIsZoomed(true)}
              onMouseLeave={() => setIsZoomed(false)}
              onMouseMove={handleMouseMove}
            >
              <img 
                src={mainImage || 'https://placehold.co/600x600?text=No+Image'} 
                alt={product.title} 
                className={`w-full h-full object-contain p-20 mix-blend-multiply transition-transform duration-200 ease-out ${isZoomed ? 'scale-150' : 'scale-100'}`}
                style={isZoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
              />
              
              <div className="absolute top-6 left-6 flex flex-col gap-2">
                {discount && <span className="bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-xl shadow-lg">-{discount}% OFF</span>}
                {vendor?.verified && (
                  <span className="bg-white/80 backdrop-blur-md text-slate-900 font-bold text-xs px-3 py-1 rounded-xl shadow-lg border border-white">VERIFIED SELLER</span>
                )}
              </div>

              <button 
                onClick={() => toggleWishlist(product.id)}
                className={`absolute top-6 right-6 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center transition-all ${isWishlisted ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
              >
                <Heart className={`w-6 h-6 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <button onClick={() => scrollToSection('reviews')} className="flex items-center gap-2 mb-4 group">
             <div className="flex text-yellow-400">
               {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Math.round(liveRating) ? 'fill-current' : 'text-slate-200'}`} />)}
             </div>
             <span className="text-sm font-bold text-slate-900">{liveRating.toFixed(1)}</span>
             <span className="text-sm font-medium text-slate-400 group-hover:text-blue-600 transition-colors">({liveReviewCount} Reviews)</span>
          </button>

          <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 leading-[0.9] tracking-tighter mb-4 uppercase">
            {product.title}
          </h1>

          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
            <Link to={`/vendor/${vendor?.id}`} className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-full border-2 border-white shadow-xl overflow-hidden group-hover:border-blue-600 transition-colors">
                <img src={vendor?.image || 'https://placehold.co/600x600?text=No+Image'} alt={vendor?.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">Sold By</p>
                <p className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{vendor?.name}</p>
              </div>
            </Link>
            {vendor?.verified && (
              <>
                <div className="w-px h-8 bg-slate-100"></div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl">
                   <ShieldCheck className="w-4 h-4" />
                   <span className="text-[11px] font-bold uppercase tracking-wide">Verified Merchant</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-baseline gap-4 mb-8">
            {showPriceRange ? (
              <span className="text-5xl font-bold text-slate-900 tracking-tighter">
                ${getDisplayPrice(minVariantPrice, product.feePercentage).toFixed(2)} – ${getDisplayPrice(maxVariantPrice, product.feePercentage).toFixed(2)}
              </span>
            ) : (
              <span className="text-5xl font-bold text-slate-900 tracking-tighter">${getDisplayPrice(displayPrice, product.feePercentage).toFixed(2)}</span>
            )}
            {product.oldPrice && (
              <span className="text-xl text-slate-400 line-through font-bold">${getDisplayPrice(product.oldPrice, product.feePercentage).toFixed(2)}</span>
            )}
            <div className={`ml-auto hidden sm:flex items-center gap-2 font-bold text-xs uppercase tracking-wide px-4 py-2 rounded-2xl ${
              needsSelection ? 'text-slate-500 bg-slate-100' : isOutOfStock ? 'text-rose-600 bg-rose-50' : isLowStock ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
            }`}>
               <div className={`w-2 h-2 rounded-full ${needsSelection ? 'bg-slate-400' : isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></div>
               {needsSelection ? 'Select Options' : isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${effectiveStock} Left` : 'In Stock'}
            </div>
          </div>

          {/* Description — right under the price, no scrolling/tab needed */}
          {product.description && (
            <p className="text-slate-600 leading-relaxed font-medium mb-6">
              {product.description}
            </p>
          )}

          {/* AI SMART SUMMARY */}
          <AIElevatorPitch
            productTitle={product.title}
            productDescription={product.description}
            brand={product.brand}
          />

          {/* Options */}
          <div className="space-y-8 mb-10">
            {/* Available Colors — each is its own linked product */}
            {colorSiblings.length > 0 && (
              <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Color: <span className="text-slate-900">{product.variantColor || 'This one'}</span>
                </p>
                <div className="flex gap-3 flex-wrap">
                  {colorSiblings.map(sibling => {
                    const isCurrent = sibling.id === product.id;
                    const siblingOutOfStock = (sibling.stock ?? 0) === 0;
                    return (
                      <Link
                        key={sibling.id}
                        to={`/product/${sibling.id}`}
                        title={`${sibling.variantColor || 'Color'}${siblingOutOfStock ? ' (sold out)' : ''}`}
                        className={`w-16 h-16 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative overflow-hidden ${isCurrent ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'} ${siblingOutOfStock ? 'opacity-40' : ''}`}
                      >
                        <img
                          src={sibling.image || sibling.images?.[0] || 'https://placehold.co/600x600?text=No+Image'}
                          className="w-full h-full object-cover"
                          alt={sibling.variantColor || 'Color variant'}
                        />
                        {siblingOutOfStock && <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-0.5 bg-rose-500 rotate-45"></div></div>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legacy demo data: a real multi-choice colors[] array with no linked siblings */}
            {hasLegacyColorChoice && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Selected Color: <span className="text-slate-900">{selectedColor || 'None'}</span></p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {(product.colors || []).map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      title={color}
                      className={`w-12 h-12 rounded-2xl border-2 transition-all flex items-center justify-center ${selectedColor === color ? 'border-blue-600 ring-4 ring-blue-50' : 'border-slate-100'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl shadow-inner ${color === 'White' ? 'bg-white border' : 'bg-slate-900'}`} style={{ backgroundColor: color.toLowerCase().replace(/\s/g, '') }}></div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {(hasSizeOptions ? product.sizeOptions! : (product.sizes || [])).length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Selected Size: <span className="text-slate-900">{selectedSize || 'None'}</span></p>
                  <button type="button" className="text-[11px] font-bold text-blue-600 uppercase tracking-wide hover:underline">Size Guide</button>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {(hasSizeOptions ? product.sizeOptions! : (product.sizes || [])).map(size => {
                    const soldOut = isSizeSoldOut(size);
                    return (
                      <button
                        key={size}
                        onClick={() => !soldOut && setSelectedSize(size)}
                        disabled={soldOut}
                        className={`min-w-[50px] h-12 px-4 rounded-2xl border-2 font-bold text-xs uppercase transition-all ${selectedSize === size ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-600 hover:border-slate-300'} ${soldOut ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-6">
               <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Quantity</p>
                  <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl w-32 border border-slate-200">
                    <button 
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-center font-bold text-sm">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               
               <div className="flex-1 pt-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-[2rem]">
                     <Clock className="w-5 h-5 text-blue-600" />
                     <div>
                        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide leading-none mb-0.5">Fastest Delivery</p>
                        <p className="text-xs font-bold text-slate-700">Tomorrow, {estimatedDeliveryDate}</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Action BTNs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
             <button
              onClick={() => addToCart(buildCartItem())}
              disabled={isOutOfStock || needsSelection}
              className={`flex-1 font-bold py-6 rounded-[2rem] transition-all text-sm uppercase tracking-wide font-display ${
                isOutOfStock || needsSelection
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-2xl shadow-red-200 active:scale-95'
              }`}
             >
                {isOutOfStock ? 'Out of Stock' : needsSelection ? 'Select Options' : 'Add to Cart'}
             </button>
             <button
              onClick={() => navigate('/checkout', { state: { buyNowItem: buildCartItem() } })}
              disabled={isOutOfStock || needsSelection}
              className={`flex-1 font-bold py-6 rounded-[2rem] transition-all text-sm uppercase tracking-wide font-display border-2 ${
                isOutOfStock || needsSelection
                  ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed'
                  : 'bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border-blue-100 active:scale-95'
              }`}
             >
                Buy It Now
             </button>
          </div>

          {/* Trust Points */}
          <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
             <div className="flex items-start gap-4">
                <Truck className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mb-1">Fast Shipping</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Islandwide delivery in 24-48h.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <RotateCcw className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mb-1">14 Day Returns</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Hassle-free Lebanese returns.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mb-1">Authentic Gear</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Verified original and quality check.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <Package className="w-6 h-6 text-slate-900" />
                <div>
                  <h5 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide mb-1">Cash On Delivery</h5>
                  <p className="text-[11px] text-slate-500 font-medium">Pay safe at your doorstep.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="mb-20 space-y-16">
         {Object.keys(product.specs || {}).length > 0 && (
           <motion.section
             id="specs"
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
           >
             <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight mb-6">Specifications</h2>
             <div className="max-w-3xl bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
               {Object.entries(product.specs || {}).map(([k, v]) => (
                 <div key={k} className="flex justify-between px-6 py-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{k}</span>
                    <span className="text-sm font-extrabold text-slate-900">{v}</span>
                 </div>
               ))}
             </div>
           </motion.section>
         )}

         <motion.section
           id="shipping"
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
         >
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight mb-6">Shipping & Returns</h2>
            <div className="grid sm:grid-cols-2 gap-6 max-w-4xl">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4">
                  <Truck className="w-8 h-8 text-primary shrink-0" />
                  <div>
                     <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Standard Lebanon Shipping</h4>
                     <p className="text-xs text-slate-500 font-medium mb-3">Free shipping on orders over $50. Flat $4 fee for smaller orders.</p>
                     <div className="flex gap-2">
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">Beirut: 24h</div>
                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600">Provinces: 48h</div>
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4">
                  <RotateCcw className="w-8 h-8 text-secondary shrink-0" />
                  <div>
                     <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-1">Hassle-Free Returns</h4>
                     <p className="text-xs text-slate-500 font-medium">14-day money back guarantee if the item is in original condition with tags. We'll pick it up from your place for free!</p>
                  </div>
               </div>
            </div>
         </motion.section>

         <motion.section
           id="reviews"
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
         >
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight mb-6">Reviews ({liveReviewCount})</h2>
            <div className="max-w-3xl bg-white rounded-3xl border border-slate-100 overflow-hidden">
                    <div className="p-6 bg-slate-50/60 border-b border-slate-100">
                    {user ? (
                      ownReview && !isEditingReview ? (
                        <div>
                          <div className="flex items-center justify-between mb-2 gap-3">
                            <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Your Review</p>
                            <div className="flex items-center gap-2 shrink-0">
                              {ownReview.status !== 'Approved' && (
                                <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg ${ownReview.status === 'Pending' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'}`}>
                                  {ownReview.status === 'Pending' ? 'Awaiting Moderation' : 'Not Approved'}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={startEditingReview}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-colors"
                                title="Edit review"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteReview}
                                disabled={deletingReview}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50"
                                title="Delete review"
                              >
                                {deletingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 mb-2">
                            {[1, 2, 3, 4, 5].map(n => (
                              <Star key={n} className={`w-4 h-4 ${n <= ownReview.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                            ))}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">{ownReview.comment}</p>
                          {ownReview.reply && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{ownReview.repliedBy || 'Store'} replied</p>
                              <p className="text-sm text-slate-700 leading-relaxed">{ownReview.reply}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={isEditingReview ? handleUpdateReview : handleSubmitReview} className="space-y-4">
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{isEditingReview ? 'Edit Your Review' : 'Write a Review'}</p>
                          <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                type="button"
                                key={n}
                                onMouseEnter={() => setHoverRating(n)}
                                onClick={() => setNewRating(n)}
                              >
                                <Star className={`w-7 h-7 transition-colors ${n <= (hoverRating || newRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share your experience with this product..."
                            rows={3}
                            maxLength={2000}
                            className="w-full p-4 rounded-2xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white"
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="submit"
                              disabled={submittingReview}
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-wide"
                            >
                              {submittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {isEditingReview ? 'Save Changes' : 'Submit Review'}
                            </button>
                            {isEditingReview && (
                              <button
                                type="button"
                                onClick={cancelEditingReview}
                                className="text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-900 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      )
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-3">Log in to share your experience with this product.</p>
                        <Link to="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-2xl text-xs uppercase tracking-wide transition-all active:scale-95">
                          Log In
                        </Link>
                      </div>
                    )}
                    </div>

                    {visibleReviews.length === 0 ? (
                      <p className="p-6 text-sm text-slate-400 font-medium">No reviews yet. Be the first to review this product.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {visibleReviews.map(r => (
                          <div key={r.id} className="p-6">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-bold text-slate-900">{r.user}</span>
                              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{new Date(r.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-0.5 mb-2">
                              {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                              ))}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>
                            {r.reply && (
                              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{r.repliedBy || 'Store'} replied</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{r.reply}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
            </div>
         </motion.section>

         <motion.section
           id="questions"
           initial={{ opacity: 0, y: 20 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
         >
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight mb-6">Questions & Answers ({questions.length})</h2>
            <div className="max-w-3xl bg-white rounded-3xl border border-slate-100 overflow-hidden">
                    <div className="p-6 bg-slate-50/60 border-b border-slate-100">
                    {user ? (
                      <form onSubmit={handleSubmitQuestion} className="space-y-4">
                        <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Ask a Question</p>
                        <textarea
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          placeholder="Ask the seller about this product..."
                          rows={3}
                          maxLength={1000}
                          className="w-full p-4 rounded-2xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all bg-white"
                        />
                        <button
                          type="submit"
                          disabled={submittingQuestion}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 text-xs uppercase tracking-wide"
                        >
                          {submittingQuestion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Submit Question
                        </button>
                      </form>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-3">Log in to ask a question about this product.</p>
                        <Link to="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-2xl text-xs uppercase tracking-wide transition-all active:scale-95">
                          Log In
                        </Link>
                      </div>
                    )}
                    </div>

                    {questions.length === 0 ? (
                      <p className="p-6 text-sm text-slate-400 font-medium">No questions yet. Be the first to ask.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {questions.map(q => (
                          <div key={q.id} className="p-6">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <HelpCircle className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-bold text-slate-900">{q.user}</span>
                                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{new Date(q.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{q.question}</p>
                              </div>
                            </div>
                            {q.answer ? (
                              <div className="mt-4 ml-11 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">{q.answeredBy || 'Seller'} answered</p>
                                <p className="text-sm text-slate-700 leading-relaxed">{q.answer}</p>
                              </div>
                            ) : (
                              <p className="mt-3 ml-11 text-[11px] font-bold text-amber-600 uppercase tracking-wide">Awaiting seller reply</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
            </div>
         </motion.section>
      </div>

      {/* Frequently bought together */}
      {relatedProducts.length > 0 && (
        <div className="mb-20">
           <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight uppercase mb-8 flex items-center gap-2">
              AI Choice: <span className="text-blue-600">Perfect Pairing.</span>
           </h2>
           <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
              <div className="flex items-center gap-4 relative z-10">
                 <div className="w-32 h-32 bg-white rounded-3xl p-4 shadow-2xl">
                    <img src={product.image || 'https://placehold.co/600x600?text=No+Image'} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                 </div>
                 <Plus className="w-6 h-6 text-white" />
                 <div className="w-32 h-32 bg-white rounded-3xl p-4 shadow-2xl relative">
                    <img src={relatedProducts[0].image || relatedProducts[0].images?.[0] || 'https://placehold.co/600x600?text=No+Image'} className="w-full h-full object-contain mix-blend-multiply" alt="" />
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white border-2 border-slate-900">
                       <Gem className="w-5 h-5" />
                    </div>
                 </div>
              </div>
              <div className="flex-1 relative z-10 text-center md:text-left">
                 <h4 className="text-white font-bold text-2xl uppercase tracking-tighter leading-tight mb-2">Buy the Bundle & Save 10%</h4>
                 <p className="text-slate-400 font-medium text-sm mb-6">Our AI suggested this combo for your lifestyle. Complete your outfit with this curated match.</p>
                 <button
                  disabled={isOutOfStock || needsSelection || (relatedProducts[0].stock ?? 0) === 0}
                  onClick={() => {
                    addToCart(buildCartItem());
                    const pair = relatedProducts[0];
                    addToCart({
                      productId: pair.id,
                      title: pair.title,
                      price: getDisplayPrice(pair.price, pair.feePercentage) * 0.9,
                      image: pair.image || pair.images?.[0] || 'https://placehold.co/600x600?text=No+Image',
                      images: pair.images || [],
                      quantity: 1,
                      vendorId: pair.vendorId,
                    });
                  }}
                  className="bg-white text-slate-900 font-bold px-10 py-4 rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-xl shadow-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-900"
                 >
                    Get Bundle $ {(getDisplayPrice(product.price, product.feePercentage) + getDisplayPrice(relatedProducts[0].price, relatedProducts[0].feePercentage) * 0.9).toFixed(2)}
                 </button>
              </div>

              {/* Background blur */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2" />
           </div>
        </div>
      )}

      {/* Related Products */}
      <section>
         <div className="flex justify-between items-end mb-10">
            <h2 className="text-4xl font-bold text-slate-900 font-display tracking-tight uppercase">Similar Vibes.</h2>
            <Link to={`/category/${product.categoryId}`} className="text-blue-600 font-bold text-xs uppercase tracking-wide hover:underline flex items-center gap-1">
              Explore More <ArrowRight className="w-4 h-4" />
            </Link>
         </div>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => <ProductCard key={p.id} product={p} />)}
         </div>
      </section>
    </main>
  );
};