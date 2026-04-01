import { useState } from 'react';
import { SecurityAlert } from '@/context/AlertContext';
import { useAlerts } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { X, Send, Hand } from 'lucide-react';

interface Props {
  alert: SecurityAlert;
  onClose: () => void;
}

const AlertDetailModal = ({ alert, onClose }: Props) => {
  const { addNote, claimAlert, investigateAlert, closeAlert } = useAlerts();
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const isManager = user?.role === 'soc_manager';

  const handleAddNote = () => {
    if (note.trim()) {
      addNote(alert.id, note.trim());
      setNote('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs text-muted-foreground">{alert.id}</span>
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h2 className="text-lg font-bold text-foreground">{alert.title}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-secondary-foreground leading-relaxed">{alert.description}</p>

          <div className="grid grid-cols-2 gap-4">
            {[
              ['Source', alert.source],
              ['Source IP', alert.sourceIp],
              ['Dest IP', alert.destIp],
              ['Timestamp', new Date(alert.timestamp).toLocaleString()],
              ['Claimed By', alert.claimedBy || '—'],
              ['Closed At', alert.closedAt ? new Date(alert.closedAt).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-secondary/50 rounded-lg p-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm font-mono text-foreground mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Actions for Junior Analyst */}
          {!isManager && (
            <div className="flex gap-2">
              {alert.status === 'new' && (
                <button onClick={() => claimAlert(alert.id, user!.name)} className="inline-flex items-center gap-1.5 bg-[#00e57f] text-black px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#00db79] transition-colors shadow-sm">
                  <Hand className="w-4 h-4" /> Claim
                </button>
              )}
              {alert.status === 'claimed' && alert.claimedBy === user?.name && (
                <button onClick={() => investigateAlert(alert.id)} className="px-4 py-2 bg-info/10 text-info border border-info/20 rounded-lg text-sm font-medium hover:bg-info/20 transition-colors">
                  Start Investigation
                </button>
              )}
              {(alert.status === 'claimed' || alert.status === 'investigating') && alert.claimedBy === user?.name && (
                <button onClick={() => closeAlert(alert.id)} className="px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-sm font-medium hover:bg-success/20 transition-colors">
                  Close Alert
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Investigation Notes</h3>
            <div className="space-y-2 mb-3">
              {alert.notes.length === 0 && <p className="text-sm text-muted-foreground italic">No notes yet.</p>}
              {alert.notes.map((n, i) => (
                <div key={i} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground border-l-2 border-primary/30">
                  {n}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..."
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={handleAddNote} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
