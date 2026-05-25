import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import {
  Mail, RefreshCw, Trash2, Plus, CheckCircle, AlertCircle, Clock
} from 'lucide-react';

function TimeAgo({ date }: { date: string | null }) {
  if (!date) return <span className="text-slate-500">Not synced yet</span>;
  
  const d = new Date(date);
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  
  return (
    <span className="text-slate-300 font-medium">
      Last Synced: {dateStr} at {timeStr}
    </span>
  );
}

export function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const email = searchParams.get('email');

  const fetchAccounts = async () => {
    try {
      const a = await api.accounts.list();
      setAccounts(a);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const { url } = await api.google.url();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConnectOutlook = async () => {
    try {
      const { url } = await api.outlook.url();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSync = async (id: number) => {
    setSyncing(id);
    try {
      await api.accounts.sync(id);
      // Visual feedback that it's running in background
      setTimeout(() => setSyncing(null), 1500);
      // Auto refresh in 5 seconds to show updated last_sync_at
      setTimeout(fetchAccounts, 5000);
    } catch {
      setSyncing(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await api.accounts.syncAll();
      // Visual feedback that it's running in background
      setTimeout(() => setSyncingAll(false), 1500);
      // Auto refresh in 5 seconds to show updated last_sync_at
      setTimeout(fetchAccounts, 5000);
    } catch {
      setSyncingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this account?')) return;
    await api.accounts.delete(id);
    await fetchAccounts();
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto min-h-[calc(100vh-2rem)] text-slate-100 relative">
      {/* Background glow */}
      <div className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Email Providers</h1>
          <p className="text-slate-400 mt-2 font-medium">Connect and manage your unified inboxes</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || accounts.length === 0}
            className="px-6 py-3.5 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 hover:bg-slate-850 text-slate-200 rounded-2xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:pointer-events-none"
          >
            <RefreshCw className={`w-5 h-5 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Syncing All...' : 'Sync All Accounts'}
          </button>
          <button
            onClick={handleConnectGoogle}
            className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-bold tracking-wide shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" /> Add Gmail Account
          </button>
          <button
            onClick={handleConnectOutlook}
            className="px-6 py-3.5 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 text-white rounded-2xl font-bold tracking-wide shadow-lg shadow-sky-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" /> Add Outlook Account
          </button>
        </div>
      </div>

      {status === 'success' && email && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3 relative z-10 shadow-lg shadow-emerald-500/10">
          <CheckCircle className="w-5 h-5" /> Successfully connected {email}
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-5 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3 relative z-10 shadow-lg shadow-rose-500/10">
          <AlertCircle className="w-5 h-5 text-rose-500" /> {searchParams.get('message') || 'Failed to connect Google account.'}
        </motion.div>
      )}

      <div className="space-y-4 relative z-10">
        {loading ? (
          [1,2].map(i => (
            <div key={i} className="animate-pulse bg-slate-900/30 rounded-3xl p-6 border border-slate-800/50 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-slate-800/80 rounded w-1/3" />
                <div className="h-3 bg-slate-800/50 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : accounts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50 shadow-inner">
              <Mail className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No accounts connected</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">Connect your first Gmail account to enable live background syncing and AI analysis.</p>
            <button onClick={handleConnectGoogle} className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
              Link Provider
            </button>
          </motion.div>
        ) : (
          accounts.map((a, idx) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border border-slate-800/80 shadow-lg hover:bg-slate-800/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 group"
            >
              <div className="flex items-center gap-5">
                {a.profile_picture ? (
                  <img
                    src={a.profile_picture}
                    alt="Profile Avatar"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-700/50 shadow-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                )}
                <div>
                  <p className="font-extrabold text-lg text-white tracking-wide">{a.email_address}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-semibold text-slate-400">
                    <span className="capitalize px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-slate-300 tracking-wider">{a.provider}</span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" /> 
                      <TimeAgo date={a.last_sync_at} />
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pl-14 sm:pl-0">
                <button
                  onClick={() => handleSync(a.id)}
                  disabled={syncing === a.id}
                  className="px-4 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                  title="Manual Sync"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing === a.id ? 'animate-spin' : ''}`} />
                  {syncing === a.id ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                  title="Remove Account"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10 bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-800/80 relative z-10 shadow-2xl">
        <h3 className="font-bold text-slate-200 mb-5 flex items-center gap-2 text-lg">
          <AlertCircle className="w-5 h-5 text-purple-400" /> Setup & Authorization Guide
        </h3>
        <ol className="space-y-3 text-sm text-slate-400 list-decimal list-inside font-medium leading-relaxed">
          <li>Click <strong className="text-slate-200">"Add Gmail Account"</strong> or <strong className="text-slate-200">"Add Outlook Account"</strong> to securely open the respective consent screen.</li>
          <li>Grant MailFlow the permissions to securely read, send, and modify your emails.</li>
          <li>Upon successful authorization, the account will appear active in your unified dashboard.</li>
          <li>Our backend engine will immediately begin <strong className="text-emerald-400">Live Background Syncing</strong>.</li>
        </ol>
        <div className="mt-6 p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-sm text-blue-300 font-medium leading-relaxed">
          <strong className="text-blue-200 font-bold tracking-wide block mb-1">Developer Notice:</strong> 
          Ensure your Google Cloud Project has the Gmail API enabled and the OAuth redirect URIs properly configured.
        </div>
      </motion.div>
    </div>
  );
}
