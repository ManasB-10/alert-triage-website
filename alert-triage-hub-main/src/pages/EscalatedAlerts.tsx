import DashboardLayout from '@/components/DashboardLayout';
import StatusBadge from '@/components/StatusBadge';
import AlertDetailModal from '@/components/AlertDetailModal';
import { useAlerts, SecurityAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Hand, ShieldPlus, ChevronRight, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';

const EscalatedAlerts = () => {
  const { alerts, claimAlert, refreshAlerts } = useAlerts();
  const { user } = useAuth();
  const isManager = user?.role === 'soc_manager';
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  useEffect(() => {
    refreshAlerts();
  }, []);

  const escalatedAlerts = alerts
    .filter(a => a.status === 'escalated')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center gap-4 bg-purple-500/5 border border-purple-500/20 p-6 rounded-2xl shadow-sm">
          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <ShieldPlus className="w-10 h-10 text-purple-400 animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Escalated <span className="text-purple-400 text-glow-purple">Alerts</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1 max-w-lg">
              Incidents requiring Level 2 expert analysis and immediate response coordination.
            </p>
          </div>
        </div>

        {/* Board */}
        <div className="rounded-2xl border border-purple-500/20 bg-card overflow-hidden shadow-xl">
          <div className="bg-purple-500/10 p-5 border-b border-purple-500/20 flex items-center justify-between">
            <h3 className="font-semibold text-purple-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-purple-400/80" /> 
              Escalated for L2 Review
            </h3>
            <span className="text-xs font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full font-bold">
              {escalatedAlerts.length} Total
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-6 py-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">ID</th>
                  <th className="text-left px-6 py-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">Event Detail</th>
                  <th className="text-left px-6 py-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">Source / Destination</th>
                  <th className="text-right px-6 py-4 text-xs font-mono text-muted-foreground uppercase tracking-widest h-14">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {escalatedAlerts.map(alert => (
                  <tr 
                    key={alert.id} 
                    onClick={() => setSelectedAlert(alert)}
                    className="group hover:bg-purple-500/5 transition-all cursor-pointer"
                  >
                    <td className="px-6 py-1 pr-0">
                      <span className="font-mono text-xs text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10">
                        {alert.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-foreground group-hover:text-purple-400 transition-colors">{alert.title}</p>
                        {alert.hasIntelMatch && (
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-mono font-bold animate-pulse">
                            <Globe className="w-2.5 h-2.5" />
                            INTEL MATCH
                          </div>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${
                          alert.severity === 'critical' ? 'bg-destructive/20 text-destructive border border-destructive/20' :
                          alert.severity === 'high' ? 'bg-warning/20 text-warning border border-warning/20' :
                          'bg-info/20 text-info border border-info/20'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">
                        Detected at {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-mono text-foreground font-semibold">{alert.sourceIp}</p>
                        <p className="text-[10px] font-mono text-muted-foreground opacity-50">→ {alert.destIp}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex items-center justify-end gap-2 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[10px] uppercase font-bold tracking-widest">Review Details</span>
                         <ChevronRight className="w-4 h-4" />
                       </div>
                    </td>
                  </tr>
                ))}
                {escalatedAlerts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-700">
                        <div className="w-20 h-20 bg-purple-500/5 rounded-full flex items-center justify-center border border-purple-500/10 mb-2">
                           <ShieldPlus className="w-10 h-10 text-purple-500/30" />
                        </div>
                        <p className="text-xl font-bold text-foreground">Clean Slate</p>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                          Zero escalated alerts currently require L2 attention. Everything is running smooth.
                        </p>
                      </div>
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

export default EscalatedAlerts;
