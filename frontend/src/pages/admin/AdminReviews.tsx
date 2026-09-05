import React, { useState, useEffect } from 'react';
import { Star, Search, Filter, ShieldAlert, CheckCircle, XCircle, MessageSquare, Loader2, Reply } from 'lucide-react';
import { collection, onSnapshot, query, where, limit, doc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';


export const AdminReviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reviews, setReviews] = useState<any[]>([]);
  const { user, isAdmin, isSuperAdmin, isVendor, vendorProfile } = useAuth();
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const stats = [
    { label: 'Total Reviews', value: String(reviews.length), icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Average Rating', value: reviews.length ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Pending Moderation', value: String(reviews.filter(r => r.status === 'Pending').length), icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  useEffect(() => {
    if (!isVendor || isAdmin || isSuperAdmin || !user) {
      setCurrentVendorId(null);
      return;
    }

    const q = query(collection(db, 'vendors'), where('ownerId', '==', user.id), limit(1));
    const unsub = onSnapshot(q, (snapshot) => {
      const vendorDoc = snapshot.docs[0];
      setCurrentVendorId(vendorDoc ? vendorDoc.id : null);
    }, (error) => {
      console.error('Vendor lookup error:', error);
      setCurrentVendorId(null);
    });

    return () => unsub();
  }, [isVendor, isAdmin, isSuperAdmin, user]);

  useEffect(() => {
    const reviewsQuery = isVendor && !isAdmin && !isSuperAdmin && currentVendorId
      ? query(collection(db, 'reviews'), where('vendorId', '==', currentVendorId))
      : collection(db, 'reviews');

    const unsub = onSnapshot(reviewsQuery, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(revs as any[]);
    }, (error) => {
      console.error('Reviews subscription error:', error);
      setReviews([]);
    });

    return () => unsub();
  }, [isVendor, isAdmin, isSuperAdmin, currentVendorId]);

  const filteredReviews = reviews.filter(r => {
    const productText = (r.product || r.productName || '').toString();
    const comment = (r.comment || '').toString();
    const matchesSearch = productText.toLowerCase().includes(searchTerm.toLowerCase()) || comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const syncProductRating = async (productId: string) => {
    if (!productId) return;
    try {
      const approvedQuery = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        where('status', '==', 'Approved')
      );
      const snap = await getDocs(approvedQuery);
      const approved = snap.docs.map(d => d.data());
      const count = approved.length;
      const avgRating = count > 0 ? approved.reduce((sum, r: any) => sum + (r.rating || 0), 0) / count : 0;

      await updateDoc(doc(db, 'products', productId), {
        rating: Math.round(avgRating * 10) / 10,
        reviews: count,
      });
    } catch (error) {
      console.error('Failed to sync product rating:', error);
    }
  };

  const handleStatusChange = async (review: any, newStatus: 'Approved' | 'Rejected' | 'Pending') => {
    setUpdatingId(review.id);
    try {
      await updateDoc(doc(db, 'reviews', review.id), { status: newStatus });
      await syncProductRating(review.productId);
      toast.success(`Review ${newStatus.toLowerCase()}.`);
    } catch (error) {
      console.error('Failed to update review status:', error);
      toast.error('Failed to update review. You may not have permission.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenReply = (review: any) => {
    setReplyingId(review.id);
    setReplyText(review.reply || '');
  };

  const handleCancelReply = () => {
    setReplyingId(null);
    setReplyText('');
  };

  const handleSendReply = async (review: any) => {
    if (!replyText.trim()) return;
    setUpdatingId(review.id);
    try {
      const repliedByName = (isVendor && !isAdmin && !isSuperAdmin)
        ? (vendorProfile?.name || user?.name || 'Store')
        : (user?.name || 'Trendit Team');

      await updateDoc(doc(db, 'reviews', review.id), {
        reply: replyText.trim(),
        repliedBy: repliedByName,
        repliedAt: new Date().toISOString(),
      });

      if (review.userId) {
        await addDoc(collection(db, 'users', review.userId, 'notifications'), {
          type: 'review_reply',
          reviewId: review.id,
          productId: review.productId,
          productTitle: review.product || 'your product',
          reply: replyText.trim(),
          repliedBy: repliedByName,
          read: false,
          createdAt: new Date().toISOString(),
        }).catch(e => console.error('Failed to notify reviewer:', e));
      }

      toast.success('Reply sent.');
      setReplyingId(null);
      setReplyText('');
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply. You may not have permission.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Review Moderation</h1>
          <p className="text-slate-500 text-sm mt-1">Approve, manage, and verify customer product reviews to maintain platform trust.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg flex-shrink-0 ${s.bg} ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
                {s.label === 'Average Rating' && <Star className="w-4 h-4 text-amber-400 fill-amber-400 mt-1" />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search reviews by product or keyword..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex w-full sm:w-auto gap-4">
          <div className="relative flex-1 sm:flex-none sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div key={review.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
            
            {/* Review Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 line-clamp-1">{review.product}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-slate-700">{review.user}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{review.date ? new Date(review.date).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                   review.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                   review.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                   'bg-amber-100 text-amber-700' 
                }`}>
                  {review.status}
                </div>
              </div>
              
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`w-4 h-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                  />
                ))}
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">
                "{review.comment}"
              </p>

              {review.reply && replyingId !== review.id && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{review.repliedBy || 'Store'} replied</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{review.reply}</p>
                </div>
              )}

              {replyingId === review.id && (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a public reply to this review..."
                    rows={3}
                    maxLength={2000}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSendReply(review)}
                      disabled={updatingId === review.id || !replyText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {updatingId === review.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}
                      Send Reply
                    </button>
                    <button onClick={handleCancelReply} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Moderation Actions */}
            <div className="flex md:flex-col gap-2 justify-center md:border-l md:border-slate-100 md:pl-6 shrink-0">
              {updatingId === review.id && replyingId !== review.id ? (
                <div className="flex items-center justify-center px-4 py-2">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : (
                <>
                  {review.status === 'Pending' && (
                    <>
                      <button onClick={() => handleStatusChange(review, 'Approved')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => handleStatusChange(review, 'Rejected')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-medium transition-colors">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {review.status === 'Approved' && (
                     <button onClick={() => handleStatusChange(review, 'Pending')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
                       Revoke Approval
                     </button>
                  )}
                  {review.status === 'Rejected' && (
                     <button onClick={() => handleStatusChange(review, 'Pending')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
                       Restore Review
                     </button>
                  )}
                  {replyingId !== review.id && (
                    <button onClick={() => handleOpenReply(review)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors">
                      <Reply className="w-4 h-4" /> {review.reply ? 'Edit Reply' : 'Reply'}
                    </button>
                  )}
                </>
              )}
            </div>

          </div>
        ))}
        
        {filteredReviews.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No reviews found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
