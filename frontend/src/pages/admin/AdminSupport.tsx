import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Filter, Mail, Clock, CheckCircle, RotateCcw, Inbox } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { toast } from 'react-hot-toast';

interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  message: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

export const AdminSupport = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'supportMessages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage)));
      setLoading(false);
    }, (error) => {
      console.error('Support messages subscription error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const stats = [
    { label: 'Total Messages', value: String(messages.length), icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open', value: String(messages.filter(m => m.status === 'open').length), icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved', value: String(messages.filter(m => m.status === 'resolved').length), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const handleToggleStatus = async (message: SupportMessage) => {
    const nextStatus = message.status === 'open' ? 'resolved' : 'open';
    setUpdatingId(message.id);
    try {
      await updateDoc(doc(db, 'supportMessages', message.id), { status: nextStatus });
      toast.success(nextStatus === 'resolved' ? 'Marked as resolved.' : 'Reopened.');
    } catch (error) {
      console.error('Failed to update support message:', error);
      toast.error('Failed to update. You may not have permission.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredMessages = messages.filter(m => {
    const matchesSearch = (m.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.message || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Customer Support</h1>
          <p className="text-slate-500 text-sm mt-1">Messages submitted from customer accounts via Contact Support.</p>
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
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="All">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => (
            <div key={message.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2 gap-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{message.userName || 'Unknown'}</h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs">
                      <Mail className="w-3.5 h-3.5" />
                      <a href={`mailto:${message.userEmail}`} className="hover:text-blue-600 hover:underline">{message.userEmail}</a>
                      <span className="text-slate-300">•</span>
                      <Clock className="w-3.5 h-3.5" />
                      {message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Unknown'}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                    message.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {message.status === 'resolved' ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mt-3">"{message.message}"</p>
              </div>

              <div className="flex md:flex-col gap-2 justify-center md:border-l md:border-slate-100 md:pl-6 shrink-0">
                <a
                  href={`mailto:${message.userEmail}?subject=Re: Your Trendit support message`}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" /> Reply by Email
                </a>
                <button
                  onClick={() => handleToggleStatus(message)}
                  disabled={updatingId === message.id}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    message.status === 'open'
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {message.status === 'open'
                    ? <><CheckCircle className="w-4 h-4" /> Mark Resolved</>
                    : <><RotateCcw className="w-4 h-4" /> Reopen</>}
                </button>
              </div>
            </div>
          ))}

          {filteredMessages.length === 0 && (
            <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No messages found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
