import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, LogOut, User, ShieldPlus, Crown } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const analystNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Alerts',    path: '/alerts',    icon: AlertTriangle    },
];

const managerNavItems = [
  { label: 'Command Center', path: '/manager', icon: LayoutDashboard },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isManager = user?.role === 'soc_manager';
  const navItems  = isManager ? managerNavItems : analystNavItems;
  const homeRoute = isManager ? '/manager' : '/dashboard';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div
            onClick={() => navigate(homeRoute)}
            className="flex items-center gap-3 cursor-pointer group"
            title="Return to Dashboard"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isManager
                ? 'bg-accent/10 border border-accent/30 group-hover:bg-accent/20'
                : 'bg-primary/10 border border-primary/30 group-hover:bg-primary/20'
            }`}>
              <ShieldPlus className={`w-5 h-5 ${isManager ? 'text-accent' : 'text-primary'}`} />
            </div>
            <div className="group-hover:opacity-80 transition-opacity">
              <h1 className="text-base font-bold text-foreground leading-none">
                Sentinel<span className={isManager ? 'text-accent' : 'text-primary'}>One</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SOC TRIAGE v1.0</p>
            </div>
          </div>
        </div>

        {/* Manager badge */}
        {isManager && (
          <div className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <Crown className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-mono text-accent uppercase tracking-wider">Manager View</span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? isManager
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isManager
                ? 'bg-accent/10 border border-accent/20'
                : 'bg-primary/10 border border-primary/20'
            }`}>
              <User className={`w-4 h-4 ${isManager ? 'text-accent' : 'text-primary'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase">
                {isManager ? 'SOC Manager' : 'Junior Analyst'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
