import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Inbox, MailOpen, AlertCircle, TrendingUp, Sparkles,
  BarChart3, Activity, ArrowRight, Heart,
  Compass, Flame
} from 'lucide-react';

interface Analytics {
  total: number;
  unread: number;
  flagged: number;
  followup: number;
  read_pct: number;
  categories: { name: string; count: number }[];
  sentiments: { name: string; count: number }[];
  priority: any[];
}

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.emails.analytics(),
      api.accounts.list().catch(() => [])
    ])
      .then(([analyticsRes, accountsRes]) => {
        setData(analyticsRes);
        setAccounts(accountsRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100 flex flex-col justify-center items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-400 animate-pulse">Analyzing inbox analytics...</p>
      </div>
    </div>
  );

  const hasData = data && data.total > 0;

  // Sentiment Icon and Color Helper
  const getSentimentStyling = (name: string) => {
    switch (name.toLowerCase()) {
      case 'positive':
        return { icon: Heart, color: 'from-emerald-500 to-teal-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'negative':
        return { icon: Flame, color: 'from-rose-500 to-red-500', text: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
      default:
        return { icon: Compass, color: 'from-blue-500 to-indigo-500', text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' };
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100 min-h-screen">
      {/* Top Welcome / Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Workspace Dashboard
            </h1>
            {hasData && (
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Sync Active
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mt-1">Welcome back, <span className="font-semibold text-blue-400">{user?.full_name}</span>. Here is your AI triage overview.</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto px-4 py-2 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-lg">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">{user?.company || 'Enterprise Suite'}</span>
        </div>
      </div>

      {!hasData ? (
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="text-center py-20 bg-slate-900/25 border border-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl relative overflow-hidden max-w-3xl mx-auto"
        >
          {/* Subtle decoration glows */}
          <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-[80px]" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/35">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Connect Your Workspace</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Unlock real-time AI classification, sentiment analytics, and custom priorities by connecting your Gmail account.
            </p>
            <button 
              onClick={() => navigate('/accounts')} 
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Immersive Floating Stats Cards Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {[
              { key: 'total', icon: Inbox, label: 'Total Sync', color: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/5' },
              { key: 'unread', icon: MailOpen, label: 'Unread Stack', color: 'from-purple-500 to-indigo-500', glow: 'shadow-purple-500/5' },
              { key: 'followup', icon: AlertCircle, label: 'Attention Items', color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/5' },
              { key: 'read_pct', icon: Activity, label: 'Read Triage Rate', color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/5', suffix: '%' },
            ].map(({ key, icon: Icon, label, color, glow, suffix }, index) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={key}
                className={`relative group bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer shadow-xl ${glow}`}
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{label}</p>
                    <p className="text-4xl font-black mt-2 tracking-tight">
                      {key === 'read_pct' ? data.read_pct : (data as any)[key]}
                      {suffix || ''}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shadow-black/30`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Advanced Analytics Grid Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left side: Efficiency Dial & Category Analytics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="lg:col-span-8 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2.5">
                  <BarChart3 className="w-5 h-5 text-blue-400" /> Advanced Category Distributions
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold tracking-wider">Triage</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* SVG circular read rate gauge */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/40 rounded-2xl border border-slate-800/40 relative overflow-hidden">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" className="text-slate-800" fill="transparent" />
                      <circle 
                        cx="72" cy="72" r="60" stroke="currentColor" strokeWidth="8" className="text-blue-500" fill="transparent"
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={2 * Math.PI * 60 * (1 - data.read_pct / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-black">{data.read_pct}%</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-0.5">Read Rate</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-300 font-medium">Efficiency Index</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">Your inbox action speed is optimized for productivity.</p>
                  </div>
                </div>

                {/* Categories progress bars */}
                <div className="md:col-span-7 space-y-4">
                  {data.categories.length > 0 ? data.categories.map((c: any, index: number) => {
                    const percent = Math.round((c.count / data.total) * 100);
                    return (
                      <div key={c.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="capitalize text-slate-300">{c.name}</span>
                          <span className="text-slate-400">{c.count} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                          />
                        </div>
                      </div>
                    );
                  }) : <p className="text-xs text-slate-500 text-center py-6">No categorized emails yet.</p>}
                </div>
              </div>
            </motion.div>

            {/* Right side: Sentiment Vibe Analysis & Connected Accounts */}
            <div className="lg:col-span-4 space-y-6">
              {/* Sentiment Vibe Analysis */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.2 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" /> Vibe Analytics
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold tracking-wider font-sans">AI</span>
                </div>

                <div className="space-y-4">
                  {data.sentiments.length > 0 ? data.sentiments.map((s: any) => {
                    const style = getSentimentStyling(s.name);
                    const Icon = style.icon;
                    const pct = Math.round((s.count / data.total) * 100);
                    return (
                      <div key={s.name} className={`flex items-center justify-between p-3.5 rounded-2xl border ${style.bg} hover:scale-[1.01] transition-transform`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center shadow-md`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white capitalize">{s.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{s.count} matching emails</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-extrabold ${style.text}`}>{pct}%</span>
                        </div>
                      </div>
                    );
                  }) : <p className="text-xs text-slate-500 text-center py-6">No sentiments registered.</p>}
                </div>
              </motion.div>

              {/* Connected Accounts Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.25 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-blue-400" /> Connected Accounts
                  </h3>
                  <button 
                    onClick={() => navigate('/accounts')}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider font-sans"
                  >
                    Manage
                  </button>
                </div>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {accounts.length > 0 ? accounts.map((acc: any) => (
                    <div key={acc.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/30 border border-slate-800/50 hover:bg-slate-950/50 transition-all">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {acc.profile_picture ? (
                          <img
                            src={acc.profile_picture}
                            alt="avatar"
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-xl object-cover border border-slate-700/50 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-blue-500/10 flex-shrink-0">
                            <span className="text-xs font-bold text-blue-300 capitalize">{acc.provider[0]}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-200 truncate">{acc.email_address}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {acc.last_sync_at ? `Synced ${new Date(acc.last_sync_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Not synced'}
                          </p>
                        </div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 flex-shrink-0" />
                    </div>
                  )) : (
                    <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-500">No accounts connected.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom Area: High Priority Attention List */}
          {data.priority.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.3 }} 
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-4">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-500" /> High Attention Triage List
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25 font-bold uppercase tracking-wider">Critical</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.priority.map((e: any, index: number) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    key={e.id} 
                    onClick={() => navigate(`/inbox`)} 
                    className="group flex items-center justify-between p-4 bg-slate-950/30 hover:bg-slate-950/60 border border-slate-800/40 hover:border-slate-700/60 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-500 to-orange-500" />
                    <div className="pl-2">
                      <p className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">{e.subject || '(no subject)'}</p>
                      <p className="text-xs text-slate-400 mt-1">{e.sender_name} • Priority Score: <span className="font-extrabold text-rose-400">{(e.priority_score * 100).toFixed(0)}/100</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/25">High</span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
