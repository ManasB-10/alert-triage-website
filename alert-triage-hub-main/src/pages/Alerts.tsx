import DashboardLayout from '@/components/DashboardLayout';
import AlertTable from '@/components/AlertTable';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useAlerts } from '@/context/AlertContext';

const Alerts = () => {
  const { user } = useAuth();
  const { refreshAlerts } = useAlerts();
  const isManager = user?.role === 'soc_manager';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Alert Management</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">
                {isManager ? 'Full CRUD operations — Create, Edit, Delete alerts' : 'Triage alerts — Claim, Investigate, Close'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => refreshAlerts()}
            className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-4 py-2 hover:bg-secondary/80 transition-all active:scale-[0.98] group"
            title="Refresh Alerts"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:rotate-180 transition-all duration-500" />
            <span className="text-sm font-mono text-foreground font-medium uppercase">Refresh</span>
          </button>
        </div>
        <AlertTable />
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
