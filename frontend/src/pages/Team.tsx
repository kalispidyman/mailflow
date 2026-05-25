import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, Mail } from 'lucide-react';

export function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: '', email: '', username: '', password: '', role: 'member' });

  const fetchTeam = async () => {
    try {
      const m = await api.team.list();
      setMembers(m);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.team.invite(form);
      setForm({ full_name: '', email: '', username: '', password: '', role: 'member' });
      await fetchTeam();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto min-h-[calc(100vh-2rem)] text-slate-100 relative">
      {/* Background glow */}
      <div className="absolute top-[5%] left-[20%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />

      <div className="flex items-center gap-4 mb-10 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Users className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Team Directory</h1>
          <p className="text-slate-400 mt-1 font-medium">Manage members and workspace access</p>
        </div>
      </div>

      {user?.role === 'admin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-slate-800/80 mb-8 relative z-10">
          <h3 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" /> Invite New Member
          </h3>
          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
              <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="w-full border border-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-950/50 text-white placeholder:text-slate-500 shadow-inner transition-all" placeholder="Jane Doe" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-950/50 text-white placeholder:text-slate-500 shadow-inner transition-all" placeholder="jane@example.com" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Username</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                className="w-full border border-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-950/50 text-white placeholder:text-slate-500 shadow-inner transition-all" placeholder="janedoe" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-950/50 text-white placeholder:text-slate-500 shadow-inner transition-all" placeholder="••••••••" required minLength={6} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full border border-slate-700/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 bg-slate-950/50 text-white placeholder:text-slate-500 shadow-inner appearance-none cursor-pointer">
                <option value="member">Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex items-end pt-1">
              <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-sm font-bold tracking-wide shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all hover:-translate-y-0.5">
                Dispatch Invite
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-800/80 overflow-hidden relative z-10">
        {loading ? (
          <div className="p-8 space-y-5">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-5 p-4 rounded-2xl bg-slate-800/30">
                <div className="w-12 h-12 rounded-full bg-slate-800/80" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-slate-800/80 rounded w-1/4" />
                  <div className="h-3 bg-slate-800/50 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50 shadow-inner">
               <Users className="w-10 h-10 text-slate-500" />
            </div>
            <p className="text-xl font-bold text-white mb-2">No team members</p>
            <p className="text-slate-400 font-medium">Invite colleagues to start collaborating.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/50">
            {members.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center gap-5 px-8 py-6 hover:bg-slate-800/30 transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-black flex-shrink-0 shadow-lg shadow-blue-500/20">
                  {m.full_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{m.full_name}</p>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1.5 text-sm font-medium text-slate-400">
                    <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-500" /> {m.email}</span>
                    <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-slate-500" /> <span className="capitalize">{m.role}</span></span>
                    <span className="flex items-center gap-1.5 text-slate-500 bg-slate-950/50 px-2 py-0.5 rounded-md border border-slate-800/50">{m.account_count} Connected Accounts</span>
                  </div>
                </div>
                <div className="mt-3 sm:mt-0 flex-shrink-0">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm ${
                    m.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
                  }`}>
                    {m.role}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
