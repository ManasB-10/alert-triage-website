import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import AlertDetailModal from '@/components/AlertDetailModal';
import { useAlerts, SecurityAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { AlertOctagon, Hand, ShieldAlert, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

const CriticalAlerts = () => {
  const { alerts, claimAlert, refreshAlerts } = useAlerts();
  const { user } = useAuth();
  const isManager = user?.role === 'soc_manager';
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  useEffect(() => {
    refreshAlerts();
  }, []);

  const criticalAlerts = alerts
    .filter(a => a.severity === 'critical' && (isManager || a.status === 'new'))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertOctagon className="w-8 h-8 text-destructive animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Critical <span className="text-destructive text-glow-danger">Incidents</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">
              High priority security events requiring immediate escalation
            </p>
          </div>
        </div>

        {/* Action Required Board */}
        <div className="rounded-lg border border-destructive/30 bg-card overflow-hidden glow-danger-subtle">
          <div className="bg-destructive/10 p-4 border-b border-destructive/20 flex items-center justify-between">
            <h3 className="font-semibold text-destructive flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> 
              Requires Immediate Action
            </h3>
            <span className="text-xs font-mono bg-destructive text-destructive-foreground px-2 py-1 rounded">
              {criticalAlerts.length} Total
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">ID</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Event</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Source IP</th>
                  <th className="text-right px-5 py-3 text-xs font-mono text-muted-foreground uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {criticalAlerts.map(alert => (
                  <tr 
                    key={alert.id} 
                    onClick={() => setSelectedAlert(alert)}
                    className="border-b border-border/50 hover:bg-destructive/5 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{alert.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{alert.title}</p>
                        {alert.hasIntelMatch && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-mono font-bold animate-pulse">
                            <Globe className="w-2.5 h-2.5" />
                            INTEL MATCH
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        Detected at {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={alert.status} /></td>
                    <td className="px-5 py-4 font-mono text-sm">{alert.sourceIp}</td>
                    <td className="px-5 py-4 text-right">
                      {!isManager && alert.status === 'new' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            claimAlert(alert.id, user!.id);
                          }}
                          className="inline-flex items-center gap-1.5 bg-[#00e57f] text-black px-3 py-1.5 rounded text-sm font-semibold hover:bg-[#00db79] transition-colors shadow-sm"
                        >
                          <Hand className="w-4 h-4" /> Claim
                        </button>
                      )}
                      {(alert.status === 'claimed' || alert.status === 'investigating') && (
                        <span className="text-xs font-mono text-muted-foreground px-3 py-1 bg-secondary rounded border border-border">
                          Assigned: {alert.claimedBy || 'Unknown'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {criticalAlerts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <ShieldAlert className="w-12 h-12 text-success/50 mx-auto mb-3" />
                      <p className="text-lg font-medium text-foreground">No Critical Incidents</p>
                      <p className="text-sm">Your infrastructure is currently secure.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </DashboardLayout>
  );
};

export default CriticalAlerts;
