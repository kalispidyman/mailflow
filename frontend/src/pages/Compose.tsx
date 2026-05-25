import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { Send, X, ArrowLeft, Mail, Users, Tag, Save, MessageSquare } from 'lucide-react';

export function Compose() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    account_id: '',
    to: searchParams.get('to') || '',
    cc: '',
    subject: '',
    body: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.accounts.list().then(a => {
      setAccounts(a);
      if (a.length > 0) setForm(f => ({ ...f, account_id: String(a[0].id) }));
    }).catch(() => {});
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.account_id) { setError('Select an account'); return; }
    setSending(true);
    setError('');
    try {
      await api.emails.send(form);
      navigate('/inbox');
    } catch (err: any) {
      setError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto min-h-[calc(100vh-2rem)] flex flex-col text-slate-100 relative">
      {/* Background glow */}
      <div className="absolute top-[10%] left-[30%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <div className="flex items-center gap-4 mb-8 relative z-10">
        <button onClick={() => navigate(-1)} className="p-2.5 rounded-full hover:bg-slate-800/50 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Send className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">New Message</h1>
          <p className="text-sm text-slate-400 font-medium">Draft a premium email</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/80 p-8 relative z-10 flex flex-col">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center justify-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-6 flex-1 flex flex-col mt-2">
          {/* Sender */}
          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1.5 bg-slate-900/40 backdrop-blur-md text-[10px] font-black text-blue-400 uppercase tracking-widest z-10">Sending As</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <select
                value={form.account_id}
                onChange={e => setForm({ ...form, account_id: e.target.value })}
                className="w-full border border-slate-700/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-slate-950/50 hover:bg-slate-900/80 text-white font-medium placeholder:text-slate-500 shadow-inner appearance-none cursor-pointer transition-all"
                required
              >
                <option value="" disabled className="bg-slate-900 text-slate-400">Select an active account...</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-900 text-white">{a.email_address}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* To */}
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 px-1.5 bg-slate-900/40 backdrop-blur-md text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 group-focus-within:text-purple-400 transition-colors">To</label>
              <div className="relative flex items-center">
                <Users className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })}
                  className="w-full border border-slate-700/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 bg-slate-950/50 hover:bg-slate-900/80 text-white font-medium placeholder:text-slate-600 shadow-inner transition-all"
                  placeholder="recipient@example.com" required
                />
              </div>
            </div>
            
            {/* Cc */}
            <div className="relative group">
              <label className="absolute -top-2.5 left-4 px-1.5 bg-slate-900/40 backdrop-blur-md text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 group-focus-within:text-purple-400 transition-colors">Cc</label>
              <div className="relative flex items-center">
                <Users className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text" value={form.cc} onChange={e => setForm({ ...form, cc: e.target.value })}
                  className="w-full border border-slate-700/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 bg-slate-950/50 hover:bg-slate-900/80 text-white font-medium placeholder:text-slate-600 shadow-inner transition-all"
                  placeholder="cc@example.com"
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="relative group">
            <label className="absolute -top-2.5 left-4 px-1.5 bg-slate-900/40 backdrop-blur-md text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 group-focus-within:text-blue-400 transition-colors">Subject</label>
            <div className="relative flex items-center">
              <Tag className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-slate-700/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-slate-950/50 hover:bg-slate-900/80 text-white font-bold placeholder:text-slate-600 shadow-inner transition-all"
                placeholder="What is this about?" required
              />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col relative group">
            <label className="absolute -top-2.5 left-4 px-1.5 bg-slate-900/40 backdrop-blur-md text-[10px] font-black text-slate-400 uppercase tracking-widest z-10 group-focus-within:text-emerald-400 transition-colors">Message</label>
            <MessageSquare className="absolute top-4 left-4 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors z-10" />
            <textarea
              value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              className="w-full flex-1 min-h-[250px] border border-slate-700/60 rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 bg-slate-950/50 hover:bg-slate-900/80 text-slate-200 leading-relaxed font-medium placeholder:text-slate-600 shadow-inner resize-none transition-all"
              placeholder="Start typing your message here..."
              required
            />
          </div>

          <div className="flex items-center justify-between pt-6 mt-auto border-t border-slate-800/60">
            <button type="button" onClick={() => navigate(-1)} className="px-5 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-sm font-bold flex items-center gap-2">
              <X className="w-4 h-4" /> Discard
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button" disabled={sending}
                onClick={() => alert("Drafts feature coming soon!")}
                className="px-6 py-3.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 border border-slate-700/50"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                type="submit" disabled={sending}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> {sending ? 'Dispatching...' : 'Send Message'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
