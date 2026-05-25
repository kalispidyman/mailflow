import { Sidebar } from './Sidebar';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function Layout() {
  const location = useLocation();

  return (
    <div className="bg-gradient-moving flex h-screen text-slate-100 font-sans overflow-hidden">

      {/* Ambient background glows with looping CSS float animations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-15%] left-[-15%] w-[700px] h-[700px] rounded-full bg-orb-1"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(99,102,241,0.08) 50%, transparent 70%)', filter: 'blur(90px)' }} />
        <div className="absolute bottom-[-15%] right-[-15%] w-[800px] h-[800px] rounded-full bg-orb-2"
          style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(236,72,153,0.06) 50%, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute top-[30%] left-[20%] w-[600px] h-[600px] rounded-full bg-orb-3"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)', filter: 'blur(90px)' }} />
      </div>

      <Sidebar />

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1 overflow-y-auto relative z-10 flex flex-col"
          style={{ minWidth: 0 }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
