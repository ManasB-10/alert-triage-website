import { AlertStatus } from '@/context/AlertContext';

const config: Record<AlertStatus, { label: string; className: string; dot: string }> = {
  new: { label: 'New', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive animate-pulse-glow' },
  claimed: { label: 'Claimed', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  investigating: { label: 'Investigating', className: 'bg-info/10 text-info border-info/20', dot: 'bg-info animate-pulse-glow' },
  closed: { label: 'Closed', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  escalated: { label: 'Escalated', className: 'bg-purple-500/10 text-purple-400 border-purple-500/20', dot: 'bg-purple-500 animate-pulse-glow' },
};

const StatusBadge = ({ status }: { status: AlertStatus }) => {
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export default StatusBadge;
