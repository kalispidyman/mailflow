import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { BarChart3, TrendingUp, PieChart, Activity, AlertCircle } from 'lucide-react';

interface Analytics {
  total: number; unread: number; flagged: number; followup: number;
  read_pct: number; categories: { name: string; count: number }[];
  sentiments: { name: string; count: number }[];
  daily: { date: string; count: number }[];
  priority: any[];
}

export function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.emails.analytics().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-6 md:p-10 space-y-6 min-h-screen text-slate-100">
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-4 gap-5">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800/80 rounded-3xl" />)}
      </div>
      <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="h-64 bg-slate-800/80 rounded-3xl" />
        <div className="h-64 bg-slate-800/80 rounded-3xl" />
      </div>
    </div>
  );

  if (!data || data.total === 0) return (
    <div className="p-8 text-center py-32 min-h-screen">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-900/50 flex items-center justify-center border border-slate-800/80 shadow-2xl">
        <BarChart3 className="w-10 h-10 text-slate-500" />
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Awaiting Data</h2>
      <p className="text-slate-400 font-medium max-w-sm mx-auto">Sync your email accounts to generate deep AI-powered analytics and historical insights.</p>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto min-h-[calc(100vh-2rem)] text-slate-100 relative">
      {/* Background glow */}
      <div className="absolute top-[0%] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

      <div className="flex items-center gap-4 mb-10 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Analytics Engine</h1>
          <p className="text-slate-400 mt-1 font-medium">Deep insights into your communication flow</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 relative z-10">
        {[
          { label: 'Total Scanned', value: data.total, color: 'text-blue-400', shadow: 'shadow-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Unread Items', value: data.unread, color: 'text-purple-400', shadow: 'shadow-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Completion Rate', value: `${data.read_pct}%`, color: 'text-emerald-400', shadow: 'shadow-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Follow-ups Needed', value: data.followup, color: 'text-amber-400', shadow: 'shadow-amber-500/10', border: 'border-amber-500/20' },
        ].map((s, i) => (
          <motion.div 
            key={s.label} 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 border ${s.border} hover:bg-slate-800/60 transition-colors shadow-xl ${s.shadow} flex flex-col items-start`}
          >
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-4xl font-black mt-3 tracking-tight ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-800/80">
          <h3 className="font-bold text-slate-200 mb-6 flex items-center gap-2 text-lg"><PieChart className="w-5 h-5 text-blue-400" /> Volume by Category</h3>
          <div className="space-y-4">
            {data.categories.map((c: any) => (
              <div key={c.name} className="flex items-center justify-between group">
                <span className="text-sm font-semibold text-slate-300 capitalize tracking-wide w-24">{c.name}</span>
                <div className="flex-1 flex items-center gap-4 ml-4">
                  <div className="flex-1 h-3 bg-slate-950/50 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${(c.count / data.total) * 100}%` }} transition={{ duration: 1, delay: 0.2 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    />
                  </div>
                  <span className="text-sm font-black text-slate-200 w-10 text-right">{c.count}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-800/80">
          <h3 className="font-bold text-slate-200 mb-6 flex items-center gap-2 text-lg"><TrendingUp className="w-5 h-5 text-purple-400" /> Aggregate Sentiment</h3>
          <div className="space-y-4">
            {['positive', 'neutral', 'negative'].map(s => {
              const found = data.sentiments.find((x: any) => x.name === s);
              const count = found?.count || 0;
              const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
              
              let colorClasses = 'from-slate-500 to-slate-400';
              let shadowClass = '';
              if (s === 'positive') { colorClasses = 'from-emerald-500 to-teal-400'; shadowClass = 'shadow-[0_0_10px_rgba(16,185,129,0.5)]'; }
              if (s === 'negative') { colorClasses = 'from-rose-500 to-red-400'; shadowClass = 'shadow-[0_0_10px_rgba(244,63,94,0.5)]'; }

              return (
                <div key={s} className="flex items-center justify-between group">
                  <span className="text-sm font-semibold text-slate-300 capitalize tracking-wide w-24">{s}</span>
                  <div className="flex-1 flex items-center gap-4 ml-4">
                    <div className="flex-1 h-3 bg-slate-950/50 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 }}
                        className={`h-full rounded-full bg-gradient-to-r ${colorClasses} ${shadowClass}`} 
                      />
                    </div>
                    <span className="text-sm font-black text-slate-200 w-10 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {data.daily.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-800/80 mb-6 relative z-10">
          <h3 className="font-bold text-slate-200 mb-8 flex items-center gap-2 text-lg"><Activity className="w-5 h-5 text-emerald-400" /> Processing Volume (Last 30 days)</h3>
          <div className="flex items-end gap-1.5 overflow-x-auto pb-4 h-48 scrollbar-hide">
            {data.daily.reverse().map((d: any, idx: number) => {
              const maxCount = Math.max(...data.daily.map((x: any) => x.count), 1);
              const height = (d.count / maxCount) * 100;
              return (
                <div key={d.date} className="flex flex-col items-center justify-end gap-2 min-w-[28px] h-full group">
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${Math.max(height, 5)}%` }} transition={{ duration: 0.8, delay: idx * 0.02 }}
                    className="w-full bg-gradient-to-t from-blue-600/40 to-blue-400 rounded-md cursor-pointer hover:from-purple-500 hover:to-purple-400 transition-all border border-blue-400/20 shadow-[0_0_8px_rgba(59,130,246,0.3)] relative"
                    title={`${d.date}: ${d.count} emails`}
                  >
                     <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none transition-opacity z-20">
                       {d.count}
                     </div>
                  </motion.div>
                  <span className="text-[10px] font-bold text-slate-500 -rotate-45 origin-left whitespace-nowrap mt-2">
                    {d.date?.slice(5) || ''}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {data.priority.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-800/80 relative z-10">
          <h3 className="font-bold text-slate-200 mb-6 flex items-center gap-2 text-lg"><AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" /> Critical Priority Triage</h3>
          <div className="space-y-3">
            {data.priority.map((e: any) => (
              <div key={e.id} onClick={() => navigate(`/inbox/${e.id}`)} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800/50 cursor-pointer transition-all shadow-sm hover:shadow-md group">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[15px] font-bold text-slate-200 truncate group-hover:text-blue-400 transition-colors">{e.subject || '(no subject)'}</p>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">{e.sender_name} <span className="mx-2 text-slate-700">•</span> Score: <span className="text-amber-400 font-bold">{(e.priority_score * 100).toFixed(0)}/100</span></p>
                </div>
                <div className="mt-3 sm:mt-0 flex-shrink-0">
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                    {e.ai_category || 'high risk'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
