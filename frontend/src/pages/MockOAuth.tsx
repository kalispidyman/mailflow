import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function MockOAuth() {
  const [searchParams] = useSearchParams();
  const state = searchParams.get('state') || '';
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const demoAccounts = [
    { email: 'demo.user@gmail.com', name: 'Demo User', avatar: 'DU' },
    { email: 'sandbox.test@gmail.com', name: 'Sandbox Tester', avatar: 'ST' },
  ];

  const handleSelectEmail = (email: string) => {
    setSelectedEmail(email);
    setStep(2);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmail && customEmail.includes('@')) {
      setSelectedEmail(customEmail);
      setStep(2);
    }
  };

  const handleApprove = () => {
    setIsConnecting(true);
    // Redirect browser directly to callback URL on backend
    const callbackUrl = `http://localhost:8000/api/auth/google/callback?code=mock_oauth_code_${Math.random().toString(36).substr(2, 9)}&state=${encodeURIComponent(state)}&email=${encodeURIComponent(selectedEmail)}`;
    
    // Simulate lightweight redirection latency
    setTimeout(() => {
      window.location.href = callbackUrl;
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden p-8 flex flex-col min-h-[500px] justify-between relative"
      >
        {isConnecting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-700">Connecting your Gmail account...</p>
          </div>
        )}

        <div>
          {/* Google Logo */}
          <div className="flex justify-center mb-6">
            <svg className="w-[74px] h-[24px]" viewBox="0 0 74 24" fill="none">
              <path d="M7.78 15.35c-2.45 0-4.52-1.95-4.52-4.52s2.07-4.52 4.52-4.52c2.45 0 4.52 1.95 4.52 4.52s-2.07 4.52-4.52 4.52zm0-11.23c-3.76 0-6.83 3.01-6.83 6.71s3.07 6.71 6.83 6.71c3.76 0 6.83-3.01 6.83-6.71s-3.07-6.71-6.83-6.71z" fill="#EA4335" />
              <path d="M22.78 15.35c-2.45 0-4.52-1.95-4.52-4.52s2.07-4.52 4.52-4.52c2.45 0 4.52 1.95 4.52 4.52s-2.07 4.52-4.52 4.52zm0-11.23c-3.76 0-6.83 3.01-6.83 6.71s3.07 6.71 6.83 6.71c3.76 0 6.83-3.01 6.83-6.71s-3.07-6.71-6.83-6.71z" fill="#FBBC05" />
              <path d="M37.6 15.42c-2.39 0-4.22-1.95-4.22-4.46v-.12c0-2.45 1.83-4.46 4.22-4.46 2.39 0 4.16 2.01 4.16 4.46v.12c0 2.51-1.77 4.46-4.16 4.46zm3.96-10.98h-2.31v1.07h-.08c-.73-.88-2-1.51-3.69-1.51-3.4 0-6.42 2.95-6.42 6.71s3.02 6.71 6.42 6.71c1.69 0 2.96-.63 3.69-1.55h.08v1.01c0 2.58-1.38 3.96-3.6 3.96-1.81 0-2.94-1.31-3.36-2.39l-2.03.85c.59 1.42 2.15 3.58 5.39 3.58 3.49 0 6.44-2.06 6.44-6.99V4.44z" fill="#4285F4" />
              <path d="M47.78 4.44h2.4v17.15h-2.4V4.44z" fill="#34A853" />
              <path d="M57.73 15.35c-1.87 0-3.32-.98-4.04-2.42l7.74-3.21-.27-.67c-.5-.13-1.83-2.17-4.66-2.17-2.8 0-5.18 2.21-5.18 6.01 0 3.51 2.36 6.71 5.92 6.71 2.87 0 4.54-1.75 5.23-2.77l-1.71-1.14c-.58.82-1.38 1.66-3.03 1.66zm-.22-8.52c1.47 0 2.72.75 3.13 1.81l-5.19 2.15c0-2.28 1.66-3.96 2.06-3.96zm-51.15.53c.69-.97 1.87-1.55 3.39-1.55 2.51 0 4.67 1.88 4.67 4.46s-2.16 4.46-4.67 4.46c-1.52 0-2.7-.58-3.39-1.55v-5.82zm0-2.92v2.1c-.81-.98-2.13-1.63-3.8-1.63-3.4 0-6.42 2.95-6.42 6.71s3.02 6.71 6.42 6.71c1.67 0 2.99-.65 3.8-1.63v2.1h2.31V4.44H6.36z" fill="#4285F4" />
            </svg>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex-1 flex flex-col"
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Sign in with Google</h1>
                  <p className="text-sm text-gray-500 mt-2">Choose an account to continue to <span className="font-semibold text-blue-600">MailFlow</span></p>
                </div>

                <div className="space-y-2.5">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleSelectEmail(account.email)}
                      className="w-full flex items-center justify-between p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                          {account.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{account.name}</p>
                          <p className="text-xs text-gray-500">{account.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                    </button>
                  ))}

                  <form onSubmit={handleCustomSubmit} className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 mb-2">OR USE A CUSTOM GMAIL</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-800"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/10 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 flex flex-col"
              >
                <div className="flex items-center gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl mb-6">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {selectedEmail.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Logged in as</p>
                    <p className="text-sm font-medium text-gray-700">{selectedEmail}</p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-2">MailFlow wants to access your Google Account</h2>
                <p className="text-sm text-gray-500 mb-6">This will allow MailFlow to:</p>

                <div className="space-y-3.5 bg-gray-50 p-4 rounded-xl border border-gray-200/50 mb-6 text-sm text-gray-600">
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-800">Read and search your emails</p>
                      <p className="text-xs text-gray-500">Needed to triage folders and show emails in Inbox.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-800">Send and compose new emails</p>
                      <p className="text-xs text-gray-500">Needed to compose replies directly from MailFlow.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-800">Modify email labels & categories</p>
                      <p className="text-xs text-gray-500">Needed to sync folders, archive, and apply AI tags.</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 mt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="w-1/2 px-4 py-2.5 text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApprove}
                    className="w-1/2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                  >
                    Allow & Sync
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-[11px] text-gray-400 text-center border-t border-gray-100 pt-4 flex flex-col gap-1">
          <p>This is a simulated secure authentication sandbox provided by MailFlow.</p>
          <div className="flex justify-center gap-3 mt-1">
            <span className="hover:underline cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
