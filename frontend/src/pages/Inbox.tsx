import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import {
  Search, Send, AlertTriangle, Trash2, RefreshCw,
  Mail, Sparkles, Star, Inbox as InboxIcon, CheckCircle2, Circle, RotateCcw,
} from 'lucide-react';
import { EmailDetail } from './EmailDetail';

const folders = [
  { key: 'INBOX', icon: InboxIcon, label: 'Inbox' },
  { key: 'SENT', icon: Send, label: 'Sent' },
  { key: 'STARRED', icon: Star, label: 'Starred' },
  { key: 'SPAM', icon: AlertTriangle, label: 'Spam' },
  { key: 'TRASH', icon: Trash2, label: 'Trash' },
];

function Toast({ toast }: { toast: { message: string; type: 'error' | 'success' } | null }) {
  if (!toast) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold shadow-2xl"
      style={{
        background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
        border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
        color: toast.type === 'error' ? '#f87171' : '#34d399',
        backdropFilter: 'blur(20px)',
      }}
    >
      {toast.message}
    </motion.div>
  );
}

function StatCard({
  label, value, icon: Icon, color, active, onClick,
}: {
  label: string; value: number; icon: any; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-3.5 rounded-2xl text-left transition-all duration-200 relative overflow-hidden group"
      style={{
        background: active ? `${color}12` : 'rgba(15,23,42,0.4)',
        border: active ? `1px solid ${color}35` : '1px solid rgba(255,255,255,0.05)',
        boxShadow: active ? `0 0 20px ${color}15` : 'none',
      }}
    >
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-white">{value}</p>
      </div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ background: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </button>
  );
}

function EmailRow({ email, accounts, onNavigate, onToggleRead, onDelete, onRestore }: {
  email: any; accounts: any[];
  onNavigate: (id: number) => void;
  onToggleRead: (e: React.MouseEvent, email: any) => void;
  onDelete: (e: React.MouseEvent, id: number) => void;
  onRestore?: (e: React.MouseEvent, id: number) => void;
}) {
  const account = accounts.find(a => a.id === email.account_id);
  const initials = (email.sender_name || email.sender || '?')[0].toUpperCase();
  const dateStr = email.received_at
    ? new Date(email.received_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : '';

  // Unified luxury obsidian slate-glass theme (zero funky or frosted colors)
  const currentBg = !email.is_read ? 'rgba(24, 32, 50, 0.55)' : 'rgba(13, 18, 30, 0.42)';
  const currentBorder = !email.is_read ? '1px solid rgba(99, 102, 241, 0.28)' : '1px solid rgba(255, 255, 255, 0.035)';
  const currentShadow = !email.is_read ? '0 4px 14px rgba(99, 102, 241, 0.04)' : 'none';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => onNavigate(email.id)}
      className="group flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150 relative mb-2.5"
      style={{
        background: currentBg,
        border: currentBorder,
        boxShadow: currentShadow,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(30, 41, 59, 0.45)';
        (e.currentTarget as HTMLElement).style.border = '1px solid rgba(255, 255, 255, 0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = currentBg;
        (e.currentTarget as HTMLElement).style.border = currentBorder;
      }}
    >
      {/* Premium left blue-indigo dot for unread status */}
      {!email.is_read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
      )}

      {/* Avatar */}
      <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 select-none shadow-md"
        style={{
          background: !email.is_read
            ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
            : 'rgba(30, 41, 59, 0.65)',
          color: !email.is_read ? '#fff' : '#8892b0',
        }}>
        {initials}
        
        {/* Connected Account Profile Badge */}
        {account && (
          <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full border-[1.5px] border-[#0f172a] shadow-sm flex items-center justify-center overflow-hidden" 
               style={{ background: 'rgba(30,41,59,1)' }}>
            {account.profile_picture ? (
              <img 
                src={account.profile_picture} 
                alt="Account" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[9px] font-bold text-slate-300 uppercase">
                {account.provider[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pl-1 space-y-1">
        {/* Row 1: Sender & Date/Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[16px] truncate ${!email.is_read ? 'font-black text-white' : 'font-semibold text-slate-200'}`}>
              {email.sender_name || email.sender || 'Unknown'}
            </span>
            {!email.is_read && (
              <span className="w-2 h-2 rounded-full flex-shrink-0 unread-dot"
                style={{ background: '#6366f1' }} />
            )}
            <span className={`text-[13.5px] truncate text-slate-400 font-normal`}>
              · {account?.email_address || '—'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Date - hidden on hover */}
            <span className={`text-[13px] group-hover:hidden ${!email.is_read ? 'text-slate-200 font-bold' : 'text-slate-400'}`}>
              {dateStr}
            </span>
            
            {/* Hover action buttons */}
            <div className="hidden group-hover:flex items-center gap-1.5">
              <button
                onClick={ev => onToggleRead(ev, email)}
                className="px-3 py-1.5 rounded-xl text-[12.5px] font-bold text-slate-200 hover:text-sky-400 hover:bg-sky-400/10 border border-slate-800/80 transition-all flex items-center gap-1.5"
                title={email.is_read ? 'Mark unread' : 'Mark read'}
              >
                {email.is_read ? <Circle style={{ width: 14, height: 14 }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                <span>{email.is_read ? 'Mark Unread' : 'Mark Read'}</span>
              </button>
              {email.folder === 'TRASH' && onRestore ? (
                <button
                  onClick={ev => onRestore(ev, email.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 border border-slate-800/80 transition-all"
                  title="Restore to Inbox"
                >
                  <RotateCcw style={{ width: 14, height: 14 }} />
                </button>
              ) : (
                <button
                  onClick={ev => onDelete(ev, email.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 border border-slate-800/80 transition-all"
                  title="Delete"
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Subject */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[14.5px] truncate flex-1 ${!email.is_read ? 'text-white font-extrabold' : 'text-slate-250 font-bold'}`}>
            {email.subject || '(no subject)'}
          </span>
          {email.needs_followup && (
            <Sparkles style={{ width: 12, height: 12, color: '#f59e0b', flexShrink: 0 }} />
          )}
        </div>

        {/* Row 3: Body snippet */}
        <p className={`text-[13.5px] truncate ${!email.is_read ? 'text-slate-200 font-normal' : 'text-slate-400 font-normal'}`}>
          {email.ai_summary || email.body_text || '(no content)'}
        </p>
      </div>
    </motion.div>
  );
}

export function Inbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const folder = searchParams.get('folder') || 'INBOX';
  const selectedAccountParam = searchParams.get('account');
  const selectedAccount = selectedAccountParam ? parseInt(selectedAccountParam) : undefined;
  const setSelectedAccount = (id?: number) => {
    setSearchParams(prev => {
      if (id === undefined) prev.delete('account');
      else prev.set('account', id.toString());
      return prev;
    });
  };

  const [emails, setEmails] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openEmailId, setOpenEmailId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'action' | 'read'>('all');
  const [providerFilter, setProviderFilter] = useState<'all' | 'gmail' | 'outlook'>('all');

  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEmails = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.emails.list({ folder, account_id: selectedAccount, limit: 100 });
      // Only update state if there is a change to prevent React from unnecessarily unmounting/flickering
      setEmails(prev => {
        if (JSON.stringify(prev) === JSON.stringify(res.emails)) return prev;
        return res.emails || [];
      });
      setTotal(res.total || 0);
    } catch { } finally { if (!silent) setLoading(false); }
  }, [folder, selectedAccount]);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    showToast('Syncing all accounts...');
    try {
      await api.accounts.syncAll();
      setTimeout(() => {
        setSyncingAll(false);
        fetchEmails(true);
      }, 1500);
    } catch {
      setSyncingAll(false);
      showToast('Failed to sync accounts', 'error');
    }
  };

  useEffect(() => { api.accounts.list().then(setAccounts).catch(() => { }); }, []);
  useEffect(() => {
    fetchEmails();
    const id = setInterval(() => fetchEmails(true), 800);
    return () => clearInterval(id);
  }, [fetchEmails]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { fetchEmails(); return; }
    setLoading(true);
    try {
      const res = await api.emails.search(searchQuery);
      setEmails(res.emails || []);
      setTotal(res.emails?.length || 0);
    } catch { } finally { setLoading(false); }
  };

  const handleToggleRead = async (ev: React.MouseEvent, email: any) => {
    ev.stopPropagation();
    const next = !email.is_read;
    setEmails(em => em.map(e => e.id === email.id ? { ...e, is_read: next } : e));
    try { await api.emails.toggleRead(email.id, next); showToast(next ? 'Marked as read' : 'Marked as unread'); }
    catch { fetchEmails(true); showToast('Failed', 'error'); }
  };

  const handleDelete = async (ev: React.MouseEvent, emailId: number) => {
    ev.stopPropagation();
    setEmails(em => em.filter(e => e.id !== emailId));
    setTotal(t => Math.max(0, t - 1));
    try { await api.emails.delete(emailId); showToast('Deleted'); }
    catch { fetchEmails(true); showToast('Failed to delete', 'error'); }
  };

  const handleRestore = async (ev: React.MouseEvent, emailId: number) => {
    ev.stopPropagation();
    setEmails(em => em.filter(e => e.id !== emailId));
    setTotal(t => Math.max(0, t - 1));
    try { await api.emails.restore(emailId); showToast('Restored to Inbox'); }
    catch { fetchEmails(true); showToast('Failed to restore', 'error'); }
  };

  const filtered = emails.filter(e => {
    if (filterMode === 'unread' && e.is_read) return false;
    if (filterMode === 'read' && !e.is_read) return false;
    if (filterMode === 'action' && !e.needs_followup) return false;
    
    if (providerFilter !== 'all') {
      const account = accounts.find(a => a.id === e.account_id);
      if (account && account.provider !== providerFilter) return false;
    }
    return true;
  });

  const stats = [
    { label: 'Total', value: total, key: 'all', icon: Mail, color: '#3b82f6' },
    { label: 'Unread', value: emails.filter(e => !e.is_read).length, key: 'unread', icon: InboxIcon, color: '#6366f1' },
    { label: 'Action', value: emails.filter(e => e.needs_followup).length, key: 'action', icon: Sparkles, color: '#f59e0b' },
    { label: 'Read', value: emails.filter(e => e.is_read).length, key: 'read', icon: CheckCircle2, color: '#10b981' },
  ];

  return (
    <div className="h-full flex text-slate-100 overflow-hidden">
      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>
      <AnimatePresence>{openEmailId && <EmailDetail emailId={openEmailId} onClose={() => setOpenEmailId(null)} />}</AnimatePresence>

      {/* ─── Left sidebar: Folders + Accounts ─── */}
      <div className="w-56 flex flex-col flex-shrink-0 relative z-10"
        style={{ background: 'rgba(8,12,20,0.45)', borderRight: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>

        {/* Folder header */}
        <div className="px-4 pt-5 pb-3">
          <p className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Folders</p>
          <div className="space-y-0.5">
            {folders.map(f => (
              <button
                key={f.key}
                onClick={() => { setSearchParams(prev => { prev.set('folder', f.key); return prev; }); setFilterMode('all'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[15.5px] font-semibold transition-all duration-150"
                style={folder === f.key ? {
                  background: 'rgba(99,102,241,0.12)',
                  color: '#818cf8',
                  border: '1px solid rgba(99,102,241,0.2)',
                } : {
                  color: '#94a3b8',
                  border: '1px solid transparent',
                }}
                onMouseEnter={e => { if (folder !== f.key) (e.currentTarget as HTMLElement).style.color = '#ffffff'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (folder !== f.key) { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
              >
                <f.icon style={{ width: 18, height: 18, flexShrink: 0 }} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-4 my-2 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Accounts */}
        <div className="px-4 pb-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/40 pb-2">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-indigo-400" />
              <p className="text-[12px] font-extrabold text-slate-300 uppercase tracking-widest">Inboxes</p>
            </div>
          </div>
          
          {/* Provider Toggle */}
          <div className="flex p-1 bg-slate-900/50 rounded-xl mb-4 border border-slate-800/50">
            <button
              onClick={() => setProviderFilter('all')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${providerFilter === 'all' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setProviderFilter('gmail')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${providerFilter === 'gmail' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Gmail
            </button>
            <button
              onClick={() => setProviderFilter('outlook')}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${providerFilter === 'outlook' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Outlook
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedAccount(undefined)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14.5px] font-semibold transition-all"
              style={!selectedAccount ? {
                background: 'rgba(99,102,241,0.15)',
                color: '#fff',
                border: '1px solid rgba(99,102,241,0.3)',
              } : {
                color: '#94a3b8',
                border: '1px solid transparent',
              }}
              onMouseEnter={e => { if (selectedAccount) (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
              onMouseLeave={e => { if (selectedAccount) (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
            >
              <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: !selectedAccount ? 'linear-gradient(135deg,#3b82f6,#8b5cf6)' : 'rgba(30,41,59,0.8)' }}>
                <InboxIcon style={{ width: 11, height: 11, color: '#fff' }} />
              </div>
              <span className="truncate">All Accounts</span>
            </button>
            {accounts.filter(a => providerFilter === 'all' || a.provider === providerFilter).map(a => {
              const avatarUrl = a.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.display_name || a.email_address)}&background=random&color=fff&bold=true`;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAccount(a.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14.5px] font-semibold transition-all"
                  style={selectedAccount === a.id ? {
                    background: 'rgba(99,102,241,0.15)',
                    color: '#fff',
                    border: '1px solid rgba(99,102,241,0.3)',
                  } : {
                    color: '#94a3b8',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => { if (selectedAccount !== a.id) (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { if (selectedAccount !== a.id) (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                >
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0 border border-slate-700/50"
                  />
                  <span className="truncate text-left flex-1" title={a.email_address}>{a.email_address}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Main email area ─── */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'rgba(8,12,20,0.25)', backdropFilter: 'blur(16px)' }}>

        {/* Top bar */}
        <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,12,20,0.45)', backdropFilter: 'blur(24px)' }}>
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" style={{ width: 15, height: 15 }} />
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search emails..."
              className="w-full pl-9 pr-4 py-2.5 text-[14px] text-white placeholder:text-slate-700 outline-none transition-all rounded-xl"
              style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}
            />
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="p-2.5 rounded-xl transition-all text-slate-500 hover:text-indigo-400 disabled:opacity-50"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            title="Sync All Accounts"
          >
            <RefreshCw className={`transition-transform ${syncingAll ? 'animate-spin text-indigo-400' : ''}`} style={{ width: 15, height: 15 }} />
          </button>
          <button
            onClick={() => fetchEmails()}
            className="p-2.5 rounded-xl transition-all text-slate-500 hover:text-sky-400"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            title="Refresh List"
          >
            <RefreshCw className={`transition-transform ${loading && !syncingAll ? 'animate-spin text-sky-400' : ''}`} style={{ width: 15, height: 15 }} />
          </button>
          <button
            onClick={() => navigate('/compose')}
            className="px-4.5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
              boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            }}
          >
            + Compose
          </button>
        </div>

        {/* Stat cards */}
        <div className="px-4 py-3 grid grid-cols-4 gap-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {stats.map(s => (
            <StatCard
              key={s.key}
              label={s.label} value={s.value} icon={s.icon} color={s.color}
              active={filterMode === s.key}
              onClick={() => setFilterMode(s.key as any)}
            />
          ))}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="space-y-1 px-2 pt-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(30,41,59,0.8)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-2.5 rounded animate-pulse w-1/3" style={{ background: 'rgba(30,41,59,0.8)' }} />
                    <div className="h-2 rounded animate-pulse w-2/3" style={{ background: 'rgba(30,41,59,0.5)' }} />
                  </div>
                  <div className="h-2 rounded animate-pulse w-10" style={{ background: 'rgba(30,41,59,0.5)' }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-16">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Mail className="text-slate-700" style={{ width: 28, height: 28 }} />
              </div>
              <h3 className="text-base font-bold text-slate-400 mb-1">
                {filterMode === 'unread' ? 'No unread mail' :
                  filterMode === 'action' ? 'No action items' :
                    filterMode === 'read' ? 'No read mail' : 'Inbox Zero 🎉'}
              </h3>
              <p className="text-[13px] text-slate-600">You're all caught up!</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map(e => (
                <EmailRow
                  key={e.id} email={e} accounts={accounts}
                  onNavigate={id => setOpenEmailId(id)}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 flex items-center justify-between text-[11px] flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#334155' }}>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · syncs
          </span>
          <span>{total} conversations</span>
        </div>
      </div>
    </div>
  );
}
