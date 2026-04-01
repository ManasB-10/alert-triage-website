import { useState } from 'react';
import { useAlerts, SecurityAlert, Severity, AlertSource, AlertStatus } from '@/context/AlertContext';
import { X } from 'lucide-react';

interface Props {
  alert?: SecurityAlert | null;
  onClose: () => void;
}

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SOURCES: AlertSource[] = ['Vulnerability Scanner', 'IDS/IPS', 'SIEM', 'EDR', 'Firewall', 'Email Gateway', 'WAF'];
const STATUSES: AlertStatus[] = ['new', 'claimed', 'investigating', 'closed'];

const AlertFormModal = ({ alert, onClose }: Props) => {
  const { addAlert, updateAlert } = useAlerts();
  const isEdit = !!alert;

  const [title, setTitle] = useState(alert?.title || '');
  const [description, setDescription] = useState(alert?.description || '');
  const [severity, setSeverity] = useState<Severity>(alert?.severity || 'medium');
  const [source, setSource] = useState<AlertSource>(alert?.source || 'SIEM');
  const [sourceIp, setSourceIp] = useState(alert?.sourceIp || '');
  const [destIp, setDestIp] = useState(alert?.destIp || '');
  const [status, setStatus] = useState<AlertStatus>(alert?.status || 'new');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      updateAlert(alert!.id, { title, description, severity, source, sourceIp, destIp, status });
    } else {
      addAlert({ title, description, severity, source, sourceIp, destIp });
    }
    onClose();
  };

  const selectClass = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary";
  const inputClass = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? 'Edit Alert' : 'Create Alert'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} h-24 resize-none`} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className={selectClass}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value as AlertSource)} className={selectClass}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Source IP</label>
              <input value={sourceIp} onChange={(e) => setSourceIp(e.target.value)} className={inputClass} placeholder="192.168.1.1" required />
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Dest IP</label>
              <input value={destIp} onChange={(e) => setDestIp(e.target.value)} className={inputClass} placeholder="10.0.0.1" required />
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AlertStatus)} className={selectClass}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
              Cancel
            </button>
            <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors glow-primary">
              {isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AlertFormModal;
