import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100 overflow-hidden relative">
      {/* Immersive blurred backdrop glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />
      
      {/* Left panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/35">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">MailFlow</span>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-slate-400 text-sm">Sign in to your premium workspace</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-center">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5 tracking-wide">Username</label>
              <input
                type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700/60 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all bg-slate-950/50 text-white placeholder:text-slate-500"
                placeholder="Enter your username" required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5 tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-700/60 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all bg-slate-950/50 text-white pr-10 placeholder:text-slate-500"
                  placeholder="Enter your password" required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold tracking-wide transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign in to Workspace'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-400 transition-all">Create one</Link>
          </p>
        </motion.div>
      </div>

      {/* Right panel - decorative */}
      <div className="hidden lg:flex flex-1 bg-slate-900 border-l border-slate-800/80 items-center justify-center p-12 relative overflow-hidden z-10">
        <div className="absolute inset-0">
           {/* Deep atmospheric gradients instead of solid colors for glassmorphism match */}
           <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-slate-950" />
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative text-white text-center"
        >
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl">
            <Sparkles className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">Unified Email Hub</h2>
          <p className="text-lg text-slate-400 max-w-md mx-auto leading-relaxed">
            Connect multiple Gmail accounts. Analyze, respond, and collaborate — all from one beautifully designed dashboard.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 max-w-xs mx-auto">
            {['Gmail', 'Outlook'].map(p => (
              <div key={p} className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 text-center hover:-translate-y-1 transition-transform cursor-pointer group">
                <div className="text-2xl mb-1 text-slate-300 group-hover:text-blue-400 transition-colors font-bold">{p === 'Gmail' ? 'G' : 'O'}</div>
                <div className="text-xs text-slate-500 font-medium tracking-wide">{p}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
