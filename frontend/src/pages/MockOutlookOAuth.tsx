import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function MockOutlookOAuth() {
  const [searchParams] = useSearchParams();
  const state = searchParams.get('state') || '';
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const demoAccounts = [
    { email: 'demo.user@outlook.com', name: 'Demo User', avatar: 'DU' },
    { email: 'sandbox.test@outlook.com', name: 'Sandbox Tester', avatar: 'ST' },
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
    const callbackUrl = `http://localhost:8000/api/auth/outlook/callback?code=mock_oauth_code_${Math.random().toString(36).substr(2, 9)}&state=${encodeURIComponent(state)}&email=${encodeURIComponent(selectedEmail)}`;
    
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
            <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-gray-700">Connecting your Outlook account...</p>
          </div>
        )}

        <div>
          {/* Microsoft Logo placeholder */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2">
                <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-4 h-4 bg-[#f25022]"></div>
                    <div className="w-4 h-4 bg-[#7fba00]"></div>
                    <div className="w-4 h-4 bg-[#00a4ef]"></div>
                    <div className="w-4 h-4 bg-[#ffb900]"></div>
                </div>
                <span className="text-2xl font-semibold text-gray-700">Microsoft</span>
            </div>
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
                  <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Sign in with Microsoft</h1>
                  <p className="text-sm text-gray-500 mt-2">Choose an account to continue to <span className="font-semibold text-sky-600">MailFlow</span></p>
                </div>

                <div className="space-y-2.5">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleSelectEmail(account.email)}
                      className="w-full flex items-center justify-between p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-sm">
                          {account.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{account.name}</p>
                          <p className="text-xs text-gray-500">{account.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-sky-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                    </button>
                  ))}

                  <form onSubmit={handleCustomSubmit} className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 mb-2">OR USE A CUSTOM OUTLOOK</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="yourname@outlook.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-gray-800"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-medium shadow-md shadow-sky-500/10 transition-colors"
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
                <div className="flex items-center gap-2 p-3 bg-sky-50/50 border border-sky-100 rounded-xl mb-6">
                  <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                    {selectedEmail.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Logged in as</p>
                    <p className="text-sm font-medium text-gray-700">{selectedEmail}</p>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-2">MailFlow wants to access your Microsoft Account</h2>
                <p className="text-sm text-gray-500 mb-6">This will allow MailFlow to:</p>

                <div className="space-y-3.5 bg-gray-50 p-4 rounded-xl border border-gray-200/50 mb-6 text-sm text-gray-600">
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-sky-600 border-gray-300 focus:ring-sky-500" />
                    <div>
                      <p className="font-semibold text-gray-800">Read and search your emails</p>
                      <p className="text-xs text-gray-500">Needed to triage folders and show emails in Inbox.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-sky-600 border-gray-300 focus:ring-sky-500" />
                    <div>
                      <p className="font-semibold text-gray-800">Send and compose new emails</p>
                      <p className="text-xs text-gray-500">Needed to compose replies directly from MailFlow.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" defaultChecked disabled className="mt-1 rounded text-sky-600 border-gray-300 focus:ring-sky-500" />
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
                    className="w-1/2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02]"
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
