import DashboardLayout from '@/components/DashboardLayout';
import AlertTable from '@/components/AlertTable';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle } from 'lucide-react';

const Alerts = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'soc_manager';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alert Management</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">
              {isManager ? 'Full CRUD operations — Create, Edit, Delete alerts' : 'Triage alerts — Claim, Investigate, Close'}
            </p>
          </div>
        </div>
        <AlertTable />
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
