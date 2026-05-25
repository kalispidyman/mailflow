import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Inbox, BarChart3, Mail, Users, LogOut,
  ChevronLeft, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: 'text-sky-400' },
  { to: '/inbox',     icon: Inbox,           label: 'Inbox',     color: 'text-indigo-400' },
  { to: '/compose',   icon: Mail,            label: 'Compose',   color: 'text-violet-400' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics', color: 'text-purple-400' },
  { to: '/accounts',  icon: Zap,             label: 'Accounts',  color: 'text-fuchsia-400' },
  { to: '/team',      icon: Users,           label: 'Team',      color: 'text-pink-400' },
];
export function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-screen flex flex-col flex-shrink-0 relative z-20 backdrop-blur-xl"
      style={{
        background: 'rgba(8,12,20,0.3)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="font-extrabold text-base tracking-tight text-gradient whitespace-nowrap"
            >
              MailFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive ? 'nav-active' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isActive ? color : 'group-hover:text-slate-200'}`} style={{ width: 18, height: 18 }} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className={`text-[14px] font-medium whitespace-nowrap ${isActive ? 'text-white' : ''}`}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-2 pb-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
        <div className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-1 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)' }}>
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-[14px] font-semibold text-slate-200 truncate">{user?.full_name}</p>
                <p className="text-[12px] text-slate-500 capitalize">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/8 transition-all text-[14px]"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-1/2 -right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-50 cursor-pointer"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 8px rgba(99,102,241,0.15)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5), 0 0 12px rgba(99,102,241,0.3)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5), 0 0 8px rgba(99,102,241,0.15)';
        }}
      >
        <ChevronLeft className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </motion.aside>
  );
}
