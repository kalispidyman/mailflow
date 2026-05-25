import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export function Register() {
  const [form, setForm] = useState({ company_name: '', full_name: '', email: '', username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100 overflow-hidden relative">
      {/* Immersive blurred backdrop glows */}
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />
      
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
            <h1 className="text-2xl font-bold text-white mb-2">Get Started</h1>
            <p className="text-slate-400 text-sm">Create your premium workspace</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm flex items-center justify-center">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(['company_name', 'full_name', 'email', 'username', 'password'] as const).map(f => (
              <div key={f}>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5 tracking-wide capitalize">{f.replace('_', ' ')}</label>
                {f === 'password' ? (
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-700/60 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all bg-slate-950/50 text-white pr-10 placeholder:text-slate-500"
                      placeholder={`Enter ${f.replace('_', ' ')}`} required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                ) : (
                  <input
                    type={f === 'email' ? 'email' : 'text'}
                    value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-700/60 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all bg-slate-950/50 text-white placeholder:text-slate-500"
                    required={f !== 'email'}
                    placeholder={`Enter ${f.replace('_', ' ')}`}
                  />
                )}
              </div>
            ))}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold tracking-wide transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-400 transition-all">Sign in</Link>
          </p>
        </motion.div>
      </div>

      {/* Right panel - decorative */}
      <div className="hidden lg:flex flex-1 bg-slate-900 border-l border-slate-800/80 items-center justify-center p-12 relative overflow-hidden z-10">
        <div className="absolute inset-0">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-blue-900/20 to-slate-950" />
           <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
           <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
        </div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative text-white text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl">
            <Sparkles className="w-12 h-12 text-purple-400" />
          </div>
          <h2 className="text-4xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">One Platform</h2>
          <p className="text-lg text-slate-400 max-w-md mx-auto leading-relaxed">All your emails. One dashboard. Full team collaboration with AI-powered insights.</p>
        </motion.div>
      </div>
    </div>
  );
}
