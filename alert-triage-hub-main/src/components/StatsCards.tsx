import React from 'react';
import { useAlerts, type AlertStatus } from '@/context/AlertContext';
import { AlertTriangle, ShieldAlert, Search, CheckCircle } from 'lucide-react';

interface Props {
  onFilterClick?: (status: AlertStatus) => void;
}

const StatsCards = ({ onFilterClick }: Props) => {
  const { alerts, setFilter } = useAlerts();

  type StatCard = {
    label: string;
    status: AlertStatus;
    value: number;
    icon: React.FC<{ className?: string }>;
    color: string;
    bg: string;
  };

  const stats: StatCard[] = [
    {
      label: 'New Alerts',
      status: 'new',
      value: alerts.filter(a => a.status === 'new').length,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10 border-destructive/20',
    },
    {
      label: 'Claimed',
      status: 'claimed',
      value: alerts.filter(a => a.status === 'claimed').length,
      icon: ShieldAlert,
      color: 'text-warning',
      bg: 'bg-warning/10 border-warning/20',
    },
    {
      label: 'Investigating',
      status: 'investigating',
      value: alerts.filter(a => a.status === 'investigating').length,
      icon: Search,
      color: 'text-info',
      bg: 'bg-info/10 border-info/20',
    },
    {
      label: 'Closed',
      status: 'closed',
      value: alerts.filter(a => a.status === 'closed').length,
      icon: CheckCircle,
      color: 'text-success',
      bg: 'bg-success/10 border-success/20',
    },
  ];

  const handleClick = (status: AlertStatus) => {
    setFilter(status);
    onFilterClick?.(status);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => handleClick(s.status)}
          className={`relative text-left rounded-lg border p-5 ${s.bg} transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                {s.label}
              </p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>
                {s.value}
              </p>
            </div>
            <s.icon className={`w-8 h-8 ${s.color} opacity-40`} />
          </div>
        </button>
      ))}
    </div>
  );
};

export default StatsCards;