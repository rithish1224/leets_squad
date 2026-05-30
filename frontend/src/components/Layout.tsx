import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Trophy,
  BarChart3,
  Settings,
  LogOut,
  Code2,
  Flame,
  Target,
  Zap,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard, color: 'text-[#00e699]' },
  { path: '/groups', label: 'Groups', Icon: Users, color: 'text-sky-400' },
  { path: '/leaderboard', label: 'Leaderboard', Icon: Trophy, color: 'text-amber-400' },
  { path: '/analytics', label: 'Analytics', Icon: BarChart3, color: 'text-violet-400' },
  { path: '/settings', label: 'Settings', Icon: Settings, color: 'text-rose-400' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black flex">
      <aside className="hidden md:flex flex-col w-64 glass border-r border-white/10 fixed h-full z-20">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">LeetSquad</h1>
              <p className="text-xs text-gray-500 mt-0.5">@{user?.username}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ path, label, Icon, color }) => {
            const active = location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'glass-strong text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? color : 'text-gray-500'}`} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 md:ml-64 min-h-screen flex flex-col">
        <header className="md:hidden glass-nav px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-accent" />
            <span className="font-bold text-sm">LeetSquad</span>
          </div>
          <button onClick={() => setLogoutConfirmOpen(true)} className="text-xs text-gray-400 hover:text-red-400 transition-colors duration-200 cursor-pointer">
            Logout
          </button>
        </header>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-nav flex z-20 px-1 pb-safe">
          {navItems.map(({ path, label, Icon, color }) => (
            <Link
              key={path}
              to={path}
              className={`flex-1 flex flex-col items-center py-2.5 text-[10px] gap-0.5 ${
                location.pathname.startsWith(path) ? color : 'text-gray-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>

        <main className="p-4 md:p-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full">{children}</main>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Are you sure?"
        description="Do you really want to log out? You can sign back in anytime."
        icon={<LogOut className="w-6 h-6 text-red-500" />}
        confirmLabel="Logout"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 md:p-6 ${className}`}>{children}</div>
  );
}

const statIcons = {
  indigo: Zap,
  green: Target,
  yellow: Flame,
  red: Trophy,
  blue: Calendar,
};

export function StatCard({
  label,
  value,
  sub,
  color = 'green',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'indigo' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const iconColors = {
    indigo: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    green: 'text-[#00e699] bg-[#00e699]/10 border-[#00e699]/20',
    yellow: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    red: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
    blue: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  };

  const Icon = statIcons[color];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-400 truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 text-white truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-1 truncate">{sub}</p>}
        </div>
        <div className={`p-2 rounded-xl border shrink-0 ${iconColors[color]}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: 'bg-[#00e699]/10 text-[#00e699] border-[#00e699]/25',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/25',
    PENDING: 'bg-amber-400/10 text-amber-400 border-amber-400/25',
  };

  return (
    <span
      className={`inline-flex px-3 py-0.5 rounded-full text-xs font-medium border ${
        styles[status] ?? styles.PENDING
      }`}
    >
      {status}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const variants = {
    primary:
      'bg-accent hover:bg-[#00c282] text-black font-semibold shadow-[0_0_20px_rgba(0,230,153,0.15)]',
    secondary:
      'glass text-white hover:bg-white/10 border border-white/10',
    danger:
      'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2.5 rounded-full text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  return (
    <div>
      {label && (
        <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
      )}
      <input
        {...props}
        className="w-full px-4 py-3 glass rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
      />
      {hint && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
    </div>
  );
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div>
      {label && (
        <label className="block text-sm text-gray-400 mb-1.5 font-medium">{label}</label>
      )}
      <select
        {...props}
        className="w-full px-4 py-3 glass rounded-xl text-white focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
      >
        {children}
      </select>
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-white/5 rounded-full h-2">
      <div
        className="bg-accent h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-gray-400 text-xs sm:text-sm mt-1 truncate">{subtitle}</p>}
      </div>
      {action && (
        <div className="w-full sm:w-auto flex justify-center sm:justify-end">
          {action}
        </div>
      )}
    </div>
  );
}

export function Alert({
  type,
  children,
}: {
  type: 'error' | 'success' | 'info';
  children: React.ReactNode;
}) {
  const styles = {
    error: 'bg-red-500/10 border-red-500/25 text-red-400',
    success: 'bg-[#00e699]/10 border-[#00e699]/25 text-[#00e699]',
    info: 'bg-sky-400/10 border-sky-400/25 text-sky-400',
  };
  return (
    <div className={`px-4 py-3 rounded-xl text-sm border ${styles[type]}`}>{children}</div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-md">
      <div className="glass-strong w-full max-w-md rounded-3xl border border-white/10 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-gray-300">{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={onCancel} className="w-full">
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} className="w-full">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
