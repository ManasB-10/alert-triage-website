import { Severity } from '@/context/AlertContext';

const config: Record<Severity, { label: string; className: string }> = {
  critical: { label: 'CRITICAL', className: 'bg-severity-critical/15 text-severity-critical border-severity-critical/30' },
  high: { label: 'HIGH', className: 'bg-severity-high/15 text-severity-high border-severity-high/30' },
  medium: { label: 'MEDIUM', className: 'bg-severity-medium/15 text-severity-medium border-severity-medium/30' },
  low: { label: 'LOW', className: 'bg-severity-low/15 text-severity-low border-severity-low/30' },

};

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const c = config[severity];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${c.className}`}>
      {c.label}
    </span>
  );
};

export default SeverityBadge;
