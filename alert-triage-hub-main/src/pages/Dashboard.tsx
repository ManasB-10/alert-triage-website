import DashboardLayout from '@/components/DashboardLayout';
import StatsCards from '@/components/StatsCards';
import AlertsChart from '@/components/AlertsChart';
import { useAlerts, SecurityAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import SeverityBadge from '@/components/SeverityBadge';
import StatusBadge from '@/components/StatusBadge';
import AlertDetailModal from '@/components/AlertDetailModal';
import { Clock, Activity, Hand, ShieldPlus, RotateCcw, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { type AlertStatus } from '@/context/AlertContext';

const Dashboard = () => {
  const { alerts, activeFilter, claimAlert, setFilter, refreshAlerts } = useAlerts();
  const { user } = useAuth();
  const isManager = user?.role === 'soc_manager';
  const navigate = useNavigate();
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [flashedStatus, setFlashedStatus] = useState<AlertStatus | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-refresh when page is opened
  useEffect(() => {
    refreshAlerts();
  }, []); // Run only on mount

  // Per-status panel glow styles (temporary flash)
  const panelGlowMap: Record<string, string> = {
    new:           'border-destructive/70 shadow-[0_0_28px_6px_rgba(239,68,68,0.45)]',
    claimed:       'border-warning/70 shadow-[0_0_28px_6px_rgba(234,179,8,0.45)]',
    investigating: 'border-info/70 shadow-[0_0_28px_6px_rgba(59,130,246,0.45)]',
    closed:        'border-success/70 shadow-[0_0_28px_6px_rgba(34,197,94,0.45)]',
  };

  const handleFilterClick = (status: AlertStatus) => {
    setFilter(status);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashedStatus(status);
    flashTimer.current = setTimeout(() => setFlashedStatus(null), 700);
  };


  const displayedAlerts = [...alerts]
    .filter(a => {
      // By default, only show 'new' alerts in the recent list
      if (!activeFilter && a.status !== 'new') return false;
      // Junior analysts should only see escalated alerts in the dedicated Escalated section
      if (!isManager && a.status === 'escalated') return false;
      if (activeFilter) return a.status === activeFilter;
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, activeFilter ? undefined : 5); // Show all if filtered, else top 5

  const getAgeText = (timestamp: string) => {
    const diffMs = new Date().getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let text = '';
    if (minutes < 60) {
      text = `${Math.max(1, minutes)} Minute${minutes !== 1 ? 's' : ''} Ago`;
    } else if (hours < 24) {
      text = `${hours} Hour${hours !== 1 ? 's' : ''} Ago`;
    } else {
      text = `${days} Day${days !== 1 ? 's' : ''} Ago`;
    }

    return <span className="ml-2 text-[10px] text-muted-foreground font-mono">{text}</span>;
  };

  const criticalCount = alerts.filter(a => 
    a.severity === 'critical' && 
    (isManager ? a.status !== 'closed' : a.status === 'new')
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, <span className="text-primary text-glow-primary">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => refreshAlerts()}
              className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2 hover:bg-secondary/80 transition-all active:scale-[0.98] group"
              title="Refresh Alerts"
            >
              <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:rotate-180 transition-all duration-500" />
              <span className="text-sm font-mono text-foreground font-medium">REFRESH</span>
            </button>
            {criticalCount > 0 && (
              <button 
                onClick={() => navigate('/critical')}
                className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 glow-danger hover:bg-destructive/20 transition-colors cursor-pointer"
              >
                <Activity className="w-4 h-4 text-destructive animate-pulse-glow" />
                <span className="text-sm font-mono text-destructive font-bold">{criticalCount} CRITICAL</span>
              </button>
            )}
          </div>
        </div>

        <StatsCards onFilterClick={handleFilterClick} />
        <AlertsChart />

        {/* Recent / Filtered Alerts Panel */}
        <div className={`rounded-lg border bg-card p-5 transition-all duration-300 ${
          flashedStatus ? panelGlowMap[flashedStatus] : 'border-border'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                {activeFilter ? `${activeFilter} Alerts` : 'Recent Alerts'}
              </h3>
            </div>
            {activeFilter && (
              <button
                onClick={() => setFilter(null)}
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                title="Clear Filter"
              >
                Show Recent Alerts
              </button>
            )}
          </div>
          <div className="space-y-2">
            {displayedAlerts.map((alert) => (
              <div 
                key={alert.id} 
                onClick={() => setSelectedAlert(alert)}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <span className="font-mono text-xs text-muted-foreground w-16">{alert.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                    {alert.hasIntelMatch && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-mono font-bold animate-pulse">
                        <Globe className="w-2.5 h-2.5" />
                        INTEL MATCH
                      </div>
                    )}
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{alert.sourceIp} → {alert.destIp}</p>
                  {alert.tags && (
                    <div className="flex gap-1 mt-1.5 overflow-hidden">
                      {alert.tags.split(',').map(tag => (
                        <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground font-mono uppercase">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <StatusBadge status={alert.status} />
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {getAgeText(alert.timestamp)}
                </div>
                
                {/* Claim Button */}
                {!isManager && alert.status === 'new' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      claimAlert(alert.id, user!.id);
                    }}
                    className="ml-2 flex flex-shrink-0 items-center gap-1.5 bg-[#00e57f] text-black px-3 py-1.5 rounded text-sm font-semibold hover:bg-[#00db79] transition-colors shadow-sm"
                  >
                    <Hand className="w-4 h-4" /> Claim
                  </button>
                )}
              </div>
            ))}
            {displayedAlerts.length === 0 && (
              <div className="text-sm text-center text-muted-foreground py-4">
                No alerts found.
              </div>
            )}
          </div>
        </div>
      </div>
      
      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
