import React, { useState } from 'react';
import { Star, Search, Filter, ShieldAlert, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

export const AdminReviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const stats = [
    { label: 'Total Reviews', value: '1,248', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Average Rating', value: '4.6', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Pending Moderation', value: '14', icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const reviews = [
    { id: 'REV-101', product: 'Sony WH-1000XM5 Noise Canceling Headphones', user: 'Alex Walker', rating: 5, date: 'Oct 24, 2024', status: 'Pending', comment: 'Absolutely unreal sound quality. Best headphones I have ever owned, period.' },
    { id: 'REV-102', product: 'Nike Air Max 270', user: 'Samir N.', rating: 2, date: 'Oct 23, 2024', status: 'Rejected', comment: 'The box arrived completely crushed. Not happy with the shipping at all.' },
    { id: 'REV-103', product: 'Apple Watch Series 9', user: 'Lina M.', rating: 4, date: 'Oct 22, 2024', status: 'Approved', comment: 'Great smartwatch, but the battery life could still be a bit better.' },
    { id: 'REV-104', product: 'Oversized Vintage Graphic Tee', user: 'Dana R.', rating: 5, date: 'Oct 22, 2024', status: 'Approved', comment: 'Material is so soft and thick. Print looks exactly like the pictures!' },
    { id: 'REV-105', product: 'Sony WH-1000XM5 Noise Canceling Headphones', user: 'J. Smith', rating: 1, date: 'Oct 21, 2024', status: 'Pending', comment: 'Testing spam message http://scam-link.org buy watches cheap' },
  ];

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = r.product.toLowerCase().includes(searchTerm.toLowerCase()) || r.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                    <span className="text-xs text-slate-500">{review.date}</span>
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
            </div>

            {/* Moderation Actions */}
            <div className="flex md:flex-col gap-2 justify-center md:border-l md:border-slate-100 md:pl-6 shrink-0">
              {review.status === 'Pending' && (
                <>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors">
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-medium transition-colors">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {review.status === 'Approved' && (
                 <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
                   Revoke Approval
                 </button>
              )}
              {review.status === 'Rejected' && (
                 <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
                   Restore Review
                 </button>
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
