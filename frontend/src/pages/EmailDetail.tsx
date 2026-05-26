import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import {
  ArrowLeft, Reply, Trash2, Sparkles,
  Paperclip, Tag, Calendar, UserPlus, Circle,
} from 'lucide-react';

function Toast({ toast }: { toast: { message: string; type: 'error' | 'success' } | null }) {
  if (!toast) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-semibold shadow-xl"
      style={{
        background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
        border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
        color: toast.type === 'error' ? '#f87171' : '#34d399',
        backdropFilter: 'blur(12px)',
        willChange: 'transform, opacity',
      }}
    >
      {toast.message}
    </motion.div>
  );
}

export function EmailDetail({ emailId, initialData, onClose }: { emailId?: number, initialData?: any, onClose?: () => void }) {
  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = emailId || paramId;
  const [email, setEmail] = useState<any>(initialData || null);
  const [team, setTeam] = useState<any[]>([]);
  const [followupNote, setFollowupNote] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [labelName, setLabelName] = useState('');
  const [assignId, setAssignId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(!initialData);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Go back, preserving any folder/account params stored in browser history state or referrer
  const handleClose = () => {
    if (onClose) { onClose(); return; }
    // Check if there's a previous history entry with inbox params
    const state = location.state as any;
    if (state?.from) navigate(state.from);
    else navigate(-1); // use browser back — preserves URL params
  };

  useEffect(() => {
    if (!id) return;
    if (!initialData) setLoading(true);
    Promise.all([api.emails.get(Number(id)), api.team.list().catch(() => [])])
      .then(([emailRes, teamRes]) => { setEmail(emailRes); setTeam(teamRes); })
      .catch(handleClose)
      .finally(() => setLoading(false));
  }, [id, initialData]);

  const handleAssign   = async () => { if (!assignId || !email) return; await api.emails.assign(email.id, assignId); showToast('Assigned to team member'); };
  const handleFollowup = async () => { if (!email) return; await api.emails.followup(email.id, followupNote, followupDate); setFollowupNote(''); setFollowupDate(''); const u = await api.emails.get(email.id); setEmail(u); showToast('Follow-up saved'); };
  const handleLabel    = async () => { if (!labelName || !email) return; await api.emails.label(email.id, labelName); setLabelName(''); const u = await api.emails.get(email.id); setEmail(u); showToast('Label added'); };
  const handleDelete   = async () => { if (!email) return; try { await api.emails.delete(email.id); showToast('Email deleted'); setTimeout(handleClose, 1000); } catch { showToast('Failed to delete', 'error'); } };
  const handleUnread   = async () => { if (!email) return; try { await api.emails.toggleRead(email.id, false); showToast('Marked as unread'); setTimeout(handleClose, 1000); } catch { showToast('Failed', 'error'); } };

  if (loading) return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-4 animate-pulse">
      <div className="h-6 rounded-lg w-1/3" style={{ background: 'rgba(30,41,59,0.8)' }} />
      <div className="h-4 rounded w-1/2" style={{ background: 'rgba(30,41,59,0.5)' }} />
      <div className="h-64 rounded-2xl" style={{ background: 'rgba(15,23,42,0.5)' }} />
    </div>
  );

  if (!email) return null;

  const initials = (email.sender_name || email.sender || '?')[0].toUpperCase();

  const inputStyle = {
    background: 'rgba(8,12,20,0.7)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#e2e8f0',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
  };

  const actionBar = (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.15, ease: "easeOut" }}
      className="flex items-center justify-center py-3 px-4"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,12,20,0.85)',
        backdropFilter: 'blur(12px)',
        flexShrink: 0,
        willChange: 'transform, opacity',
      }}
    >
      <div className="flex items-center gap-1 p-1.5 rounded-full"
        style={{
          background: 'rgba(15,20,35,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {[
          { label: 'Back',   icon: ArrowLeft,  onClick: handleClose,                           color: '#94a3b8', hoverBg: 'rgba(255,255,255,0.06)', className: "px-4 py-2 text-[12.5px]", defaultBg: 'transparent' },
          { label: 'Reply',  icon: Reply,      onClick: () => navigate(`/compose?to=${email.sender}`), color: '#60a5fa', hoverBg: 'rgba(96,165,250,0.1)', className: "px-4 py-2 text-[12.5px]", defaultBg: 'transparent' },
          { label: 'Unread', icon: Circle,     onClick: handleUnread,                          color: '#fff', hoverBg: 'rgba(99,102,241,0.25)', className: "px-5 py-2.5 text-[12.5px] border border-slate-700/50", defaultBg: 'rgba(255,255,255,0.08)', iconSize: 14 },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={`flex items-center gap-2 rounded-full font-bold transition-all ${btn.className}`}
            style={{ color: btn.color, background: btn.defaultBg }}
            onMouseEnter={e => (e.currentTarget.style.background = btn.hoverBg)}
            onMouseLeave={e => (e.currentTarget.style.background = btn.defaultBg)}
          >
            <btn.icon style={{ width: btn.iconSize || 14, height: btn.iconSize || 14 }} />
            {btn.label}
          </button>
        ))}
        <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <button
          onClick={handleDelete}
          className="p-2 rounded-full transition-all"
          style={{ color: '#f87171' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title="Delete"
        >
          <Trash2 style={{ width: 15, height: 15 }} />
        </button>
      </div>
    </motion.div>
  );

  const content = (
    <div className="flex flex-col flex-1 min-h-0" onClick={e => e.stopPropagation()}>
      <AnimatePresence>{toast && <Toast toast={toast} />}</AnimatePresence>

      {/* Scrollable email content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-5 py-6">
        {/* Email card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(12,18,30,0.45)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', willChange: 'transform, opacity' }}
        >
          {/* Header */}
          <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h1 className="text-xl font-bold text-white mb-5 leading-snug">
              {email.subject || '(no subject)'}
            </h1>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-200 text-[14px]">{email.sender_name}</p>
                <p className="text-[12px] text-slate-600">{email.sender}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11.5px] text-slate-600">
                  <span>To: <span className="text-slate-500">{email.recipients}</span></span>
                  {email.cc && <span>Cc: <span className="text-slate-500">{email.cc}</span></span>}
                  <span className="ml-auto text-[11px] px-2.5 py-1 rounded-lg" style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {email.received_at ? new Date(email.received_at).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Labels */}
            {email.labels?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {email.labels.map((l: any) => (
                  <span key={l.id} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white" style={{ background: l.color }}>
                    {l.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="text-[14px] text-slate-400 whitespace-pre-wrap leading-7">
              {email.body_text || email.body_html || 'No content'}
            </div>

            {/* Attachments */}
            {email.attachments?.length > 0 && (
              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 className="text-[12px] font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <Paperclip style={{ width: 13, height: 13 }} /> Attachments
                </h4>
                <div className="flex flex-wrap gap-2">
                  {email.attachments.map((a: any, i: number) => (
                    <div key={i} className="px-3 py-2 rounded-xl text-[12px] font-medium text-slate-400 cursor-pointer transition-all"
                      style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
                      {a.filename}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {email.ai_category && (
              <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 className="text-[12px] font-semibold text-slate-500 mb-3 flex items-center gap-2">
                  <Sparkles style={{ width: 13, height: 13, color: '#a78bfa' }} /> AI Insights
                </h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {email.ai_category && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize" style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {email.ai_category}
                    </span>
                  )}
                  {email.ai_sentiment && (
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize ${
                      email.ai_sentiment === 'positive' ? 'text-emerald-400' : email.ai_sentiment === 'negative' ? 'text-rose-400' : 'text-slate-400'
                    }`} style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {email.ai_sentiment}
                    </span>
                  )}
                  {email.priority_score > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>
                      Priority {(email.priority_score * 100).toFixed(0)}/100
                    </span>
                  )}
                </div>
                {email.ai_summary && (
                  <p className="text-[13px] text-slate-500 leading-relaxed p-3 rounded-xl" style={{ background: 'rgba(8,12,20,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {email.ai_summary}
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Action panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Assign */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.15, ease: "easeOut" }}
            className="p-5 rounded-2xl"
            style={{ background: 'rgba(12,18,30,0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', willChange: 'transform, opacity' }}
          >
            <h4 className="text-[12px] font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <UserPlus style={{ width: 13, height: 13, color: '#60a5fa' }} /> Assign Member
            </h4>
            <div className="flex gap-2">
              <select value={assignId || ''} onChange={e => setAssignId(Number(e.target.value))}
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.06)')}>
                <option value="" className="bg-slate-900">Select member</option>
                {team.map((m: any) => <option key={m.id} value={m.id} className="bg-slate-900">{m.full_name}</option>)}
              </select>
              <button onClick={handleAssign}
                className="px-4 py-2.5 rounded-xl text-[12.5px] font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}>
                Assign
              </button>
            </div>
          </motion.div>

          {/* Label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.15, ease: "easeOut" }}
            className="p-5 rounded-2xl"
            style={{ background: 'rgba(12,18,30,0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', willChange: 'transform, opacity' }}
          >
            <h4 className="text-[12px] font-semibold text-slate-500 mb-3 flex items-center gap-2">
              <Tag style={{ width: 13, height: 13, color: '#a78bfa' }} /> Add Label
            </h4>
            <div className="flex gap-2">
              <input type="text" value={labelName} onChange={e => setLabelName(e.target.value)}
                placeholder="Label name" style={{ ...inputStyle, flex: 1 }}
                onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'rgba(167,139,250,0.4)')}
                onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.06)')} />
              <button onClick={handleLabel}
                className="px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
                Add
              </button>
            </div>
          </motion.div>
        </div>

        {/* Follow-up */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.15, ease: "easeOut" }}
          className="p-5 rounded-2xl mt-4"
          style={{ background: 'rgba(12,18,30,0.4)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', willChange: 'transform, opacity' }}
        >
          <h4 className="text-[12px] font-semibold text-slate-500 mb-4 flex items-center gap-2">
            <Calendar style={{ width: 13, height: 13, color: '#34d399' }} /> Follow-ups
          </h4>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input type="text" value={followupNote} onChange={e => setFollowupNote(e.target.value)}
              placeholder="Add a note..." style={{ ...inputStyle, flex: 1 }}
              onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'rgba(52,211,153,0.4)')}
              onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.06)')} />
            <input type="date" value={followupDate} onChange={e => setFollowupDate(e.target.value)}
              style={{ ...inputStyle, width: 160 }}
              onFocus={e => ((e.target as HTMLInputElement).style.borderColor = 'rgba(52,211,153,0.4)')}
              onBlur={e => ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.06)')} />
            <button onClick={handleFollowup}
              className="px-4 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', whiteSpace: 'nowrap' }}>
              Save
            </button>
          </div>

          {email.followups?.length > 0 ? (
            <div className="space-y-2">
              {email.followups.map((f: any) => (
                <div key={f.id} className="flex gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(8,12,20,0.5)', borderLeft: '2px solid rgba(99,102,241,0.4)' }}>
                  <div className="flex-1">
                    <p className="text-[13px] text-slate-400">{f.note || 'No note'}</p>
                    {f.due_date && <p className="text-[11px] text-slate-600 mt-1">Due: {new Date(f.due_date).toLocaleDateString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-5 rounded-xl" style={{ background: 'rgba(8,12,20,0.4)', border: '1px dashed rgba(255,255,255,0.06)' }}>
              <p className="text-[12px] text-slate-700">No follow-ups yet</p>
            </div>
          )}
        </motion.div>
      </div>
      </div>

      {/* Sticky action bar at the bottom - never scrolls */}
      {actionBar}
    </div>
  );

  if (onClose) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(2, 6, 23, 0.4)', backdropFilter: 'blur(4px)', willChange: 'opacity' }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
          style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', willChange: 'transform, opacity' }}
          onClick={e => e.stopPropagation()}
        >
          {content}
        </motion.div>
      </motion.div>
    );
  }

  // Standalone page — content is self-contained (scroll + sticky bar)
  return (
    <div className="h-full flex flex-col" style={{ background: 'transparent' }}>
      {content}
    </div>
  );
}

