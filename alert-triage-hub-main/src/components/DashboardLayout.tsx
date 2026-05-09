import { ReactNode, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, LogOut, User, ShieldPlus, Crown, ShieldAlert, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: ReactNode;
}

const analystNavItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Alerts',    path: '/alerts',    icon: AlertTriangle    },
  { label: 'Escalated', path: '/escalated', icon: ShieldAlert },
];

const managerNavItems = [
  { label: 'Command Center', path: '/manager', icon: LayoutDashboard },
  { label: 'Threat Intel',   path: '/manager/threat-intel', icon: Globe },
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

  // Poll account status every 3s for analysts only.
  // Handles two forced-logout cases:
  //   Inactive → can self-reactivate by logging in again
  //   Suspended → hard block, cannot login until manager lifts it
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || isManager) return; // only poll for analysts

    const checkStatus = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/user/status?user_id=${user.id}`);
        if (!res.ok) return; // network hiccup — skip this cycle
        const data = await res.json();

        if (data.account_status === 'Inactive') {
          clearInterval(pollIntervalRef.current!);
          logout();
          navigate('/');
          setTimeout(() => {
            toast.warning(
              'Your status has been set to Inactive by the manager. Please log in again to reactivate your account.',
              { duration: 8000 }
            );
          }, 300);
        } else if (data.account_status === 'Suspended') {
          clearInterval(pollIntervalRef.current!);
          logout();
          navigate('/');
          setTimeout(() => {
            toast.error(
              'Your account has been suspended by the manager. You cannot log in until your access is restored.',
              { duration: 10000 }
            );
          }, 300);
        }
      } catch {
        // Silently ignore — backend may be temporarily unreachable
      }
    };

    // Run once immediately, then every 3 seconds (near-instant detection)
    checkStatus();
    pollIntervalRef.current = setInterval(checkStatus, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user, isManager]);

  const handleProfileClick = () => {
    navigate(isManager ? '/profile/manager' : '/profile/analyst');
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-card border-r border-border flex flex-col flex-shrink-0 relative z-40">
        
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
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto bg-background/50 relative">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md px-6 flex items-center justify-end">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-all p-1.5 rounded-xl hover:bg-secondary/50"
              onClick={handleProfileClick}
              title="View Profile Settings"
            >
              <div className="text-right">
                <p className="text-sm font-bold text-foreground leading-none group-hover:text-primary transition-colors">{user?.name}</p>
                <p className={`text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded border uppercase tracking-wider inline-block ${
                  isManager 
                    ? 'text-accent border-accent/20 bg-accent/5' 
                    : 'text-primary border-primary/20 bg-primary/5'
                }`}>
                  {isManager ? 'SOC Manager' : 'Junior Analyst'}
                </p>
              </div>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                isManager
                  ? 'bg-accent/10 border-accent/20 text-accent group-hover:bg-accent/20 shadow-[0_0_10px_rgba(232,127,53,0.1)]'
                  : 'bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/20 shadow-[0_0_10px_rgba(0,229,127,0.1)]'
              }`}>
                <User className="w-5 h-5" />
              </div>
            </div>
            
            <div className="h-6 w-[1px] bg-border" />

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-xs font-medium"
              title="Logout from session"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div key={location.key} className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
