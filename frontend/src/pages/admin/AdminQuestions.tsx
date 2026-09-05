import React, { useState, useEffect } from 'react';
import { HelpCircle, Search, Filter, MessageCircle, Loader2, Reply } from 'lucide-react';
import { collection, onSnapshot, query, where, limit, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export const AdminQuestions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [questions, setQuestions] = useState<any[]>([]);
  const { user, isAdmin, isSuperAdmin, isVendor, vendorProfile } = useAuth();
  const [currentVendorId, setCurrentVendorId] = useState<string | null>(null);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    const questionsQuery = isVendor && !isAdmin && !isSuperAdmin && currentVendorId
      ? query(collection(db, 'questions'), where('vendorId', '==', currentVendorId))
      : collection(db, 'questions');

    const unsub = onSnapshot(questionsQuery, (snapshot) => {
      const qs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setQuestions(qs as any[]);
    }, (error) => {
      console.error('Questions subscription error:', error);
      setQuestions([]);
    });

    return () => unsub();
  }, [isVendor, isAdmin, isSuperAdmin, currentVendorId]);

  const stats = [
    { label: 'Total Questions', value: String(questions.length), icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Awaiting Reply', value: String(questions.filter(q => q.status === 'Pending').length), icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Answered', value: String(questions.filter(q => q.status === 'Answered').length), icon: Reply, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  const filteredQuestions = questions.filter(q => {
    const productText = (q.product || '').toString();
    const question = (q.question || '').toString();
    const matchesSearch = productText.toLowerCase().includes(searchTerm.toLowerCase()) || question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAnswer = (question: any) => {
    setAnsweringId(question.id);
    setAnswerText(question.answer || '');
  };

  const handleCancelAnswer = () => {
    setAnsweringId(null);
    setAnswerText('');
  };

  const handleSendAnswer = async (question: any) => {
    if (!answerText.trim()) return;
    setUpdatingId(question.id);
    try {
      const answeredByName = (isVendor && !isAdmin && !isSuperAdmin)
        ? (vendorProfile?.name || user?.name || 'Seller')
        : (user?.name || 'Trendit Team');

      await updateDoc(doc(db, 'questions', question.id), {
        answer: answerText.trim(),
        answeredBy: answeredByName,
        answeredAt: new Date().toISOString(),
        status: 'Answered',
      });

      if (question.userId) {
        await addDoc(collection(db, 'users', question.userId, 'notifications'), {
          type: 'question_answered',
          questionId: question.id,
          productId: question.productId,
          productTitle: question.product || 'your question',
          answer: answerText.trim(),
          answeredBy: answeredByName,
          read: false,
          createdAt: new Date().toISOString(),
        }).catch(e => console.error('Failed to notify asker:', e));
      }

      toast.success('Answer sent.');
      setAnsweringId(null);
      setAnswerText('');
    } catch (error) {
      console.error('Failed to send answer:', error);
      toast.error('Failed to send answer. You may not have permission.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Product Questions</h1>
          <p className="text-slate-500 text-sm mt-1">Answer customer questions asked directly on product pages.</p>
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
            placeholder="Search questions by product or keyword..."
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
              <option value="Pending">Awaiting Reply</option>
              <option value="Answered">Answered</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((question) => (
          <div key={question.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 line-clamp-1">{question.product}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-slate-700">{question.user}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{question.date ? new Date(question.date).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                   question.status === 'Answered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {question.status === 'Answered' ? 'Answered' : 'Awaiting Reply'}
                </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">"{question.question}"</p>

              {question.answer && answeringId !== question.id && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{question.answeredBy || 'Seller'} answered</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{question.answer}</p>
                </div>
              )}

              {answeringId === question.id && (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Write your answer..."
                    rows={3}
                    maxLength={2000}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSendAnswer(question)}
                      disabled={updatingId === question.id || !answerText.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {updatingId === question.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}
                      Send Answer
                    </button>
                    <button onClick={handleCancelAnswer} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {answeringId !== question.id && (
              <div className="flex md:flex-col gap-2 justify-center md:border-l md:border-slate-100 md:pl-6 shrink-0">
                <button onClick={() => handleOpenAnswer(question)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors">
                  <Reply className="w-4 h-4" /> {question.answer ? 'Edit Answer' : 'Answer'}
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-slate-200 shadow-sm text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No questions found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
