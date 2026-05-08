import { useState, useEffect } from 'react';
import { useAlerts, SecurityAlert, Severity, AlertStatus } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import AlertDetailModal from './AlertDetailModal';
import AlertFormModal from './AlertFormModal';
import { Eye, Hand, Search, XCircle, Plus, Pencil, Trash2, Filter, Globe } from 'lucide-react';

const AlertTable = () => {
  const { alerts, activeFilter, setFilter, claimAlert, investigateAlert, closeAlert, deleteAlert, selectedAlertId, setSelectedAlertId } = useAlerts();
  const { user } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [editAlert, setEditAlert] = useState<SecurityAlert | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Table state
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Use context filter if available, otherwise 'all'
  const filterStatus = activeFilter || 'all';
  const setFilterStatus = (status: AlertStatus | 'all') => {
    setFilter(status === 'all' ? null : status);
  };

  const isManager = user?.role === 'soc_manager';

  useEffect(() => {
    if (selectedAlertId && alerts.length > 0) {
      const alert = alerts.find(a => a.id === selectedAlertId);
      if (alert) {
        setSelectedAlert(alert);
        // Clear it so it doesn't reopen if the user navigates back to this page
        setSelectedAlertId(null);
      }
    }
  }, [selectedAlertId, alerts, setSelectedAlertId]);

  const filtered = alerts
    .filter(a => filterSeverity === 'all' || a.severity === filterSeverity)
    .filter(a => {
      if (!isManager && a.status === 'escalated') return false;
      return filterStatus === 'all' || a.status === filterStatus;
    })
    .filter(a => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        a.title.toLowerCase().includes(term) ||
        a.sourceIp.toLowerCase().includes(term) ||
        a.destIp.toLowerCase().includes(term) ||
        a.source.toLowerCase().includes(term) ||
        (a.tags && a.tags.toLowerCase().includes(term)) ||
        (a.id && a.id.toLowerCase().includes(term))
      );
    });

  const sortedAlerts = [...filtered].sort((a: SecurityAlert, b: SecurityAlert) => {
    let valA = (a as any)[sortCol];
    let valB = (b as any)[sortCol];

    if (sortCol === 'timestamp') {
      valA = new Date(a.timestamp).getTime();
      valB = new Date(b.timestamp).getTime();
    } else if (sortCol === 'title') {
      valA = a.title;
      valB = b.title;
    }

    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedAlerts = sortedAlerts.slice((page - 1) * 10, page * 10);

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

  return (
    <>
      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as Severity | 'all')}
            className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'all')}
            className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="claimed">Claimed</option>
            <option value="investigating">Investigating</option>
            <option value="closed">Closed</option>
            {isManager && <option value="escalated">Escalated</option>}
          </select>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by alert, IP, source or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-1.5 text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isManager && (
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors glow-primary"
          >
            <Plus className="w-4 h-4" />
            Create Alert
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {[
                  { id: 'id', label: 'ID' },
                  { id: 'title', label: 'Alert' },
                  { id: 'severity', label: 'Severity' },
                  { id: 'status', label: 'Status' },
                  { id: 'source', label: 'Source' },
                  { id: 'tags', label: 'Tags' },
                  { id: 'timestamp', label: 'Time' },
                  { id: null, label: 'Actions' }
                ].map(h => (
                  <th
                    key={h.label}
                    onClick={() => {
                      if (h.id) {
                        if (sortCol === h.id) {
                          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortCol(h.id);
                          setSortDir('asc');
                        }
                      }
                    }}
                    className={`text-left px-4 py-3 text-[10px] font-mono text-muted-foreground uppercase tracking-wider ${h.id ? 'cursor-pointer hover:text-foreground select-none' : 'text-right'}`}
                  >
                    {h.label}
                    {h.id && sortCol === h.id && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedAlerts.map((alert) => (
                <tr
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{alert.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate max-w-[280px]">{alert.title}</p>
                      {alert.hasIntelMatch && (
                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono font-bold animate-pulse"
                          title={`Threat Intel Match: ${alert.intelThreatType} (${alert.intelConfidence}% Confidence)`}
                        >
                          <Globe className="w-3 h-3" />
                          INTEL MATCH
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{alert.sourceIp} → {alert.destIp}</p>
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={alert.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono uppercase">{alert.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      {alert.tags ? alert.tags.split(',').map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground font-mono">
                          {tag.trim()}
                        </span>
                      )) : <span className="text-muted-foreground text-[10px]">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {getAgeText(alert.timestamp)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* View icon removed as requested, row is now clickable */}

                      {/* Junior Analyst Actions */}
                      {!isManager && alert.status === 'new' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            claimAlert(alert.id, user!.id);
                          }}
                          className="inline-flex items-center gap-1.5 bg-[#00e57f] text-black px-3 py-1.5 rounded text-sm font-semibold hover:bg-[#00db79] transition-colors shadow-sm"
                          title="Claim"
                        >
                          <Hand className="w-4 h-4" /> Claim
                        </button>
                      )}
                      {!isManager && alert.status === 'claimed' && alert.claimedBy === user?.name && (
                        <button onClick={(e) => { e.stopPropagation(); investigateAlert(alert.id); }} className="p-1.5 rounded hover:bg-info/10 text-muted-foreground hover:text-info transition-colors" title="Investigate">
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isManager && (alert.status === 'claimed' || alert.status === 'investigating') && alert.claimedBy === user?.name && (
                        <button onClick={(e) => { e.stopPropagation(); closeAlert(alert.id); }} className="p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success transition-colors" title="Close">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Manager Actions */}
                      {isManager && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setEditAlert(alert); }} className="p-1.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No alerts match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 10 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
            <p className="text-xs text-muted-foreground font-mono">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, filtered.length)} of {filtered.length} alerts
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-border text-xs disabled:opacity-50 hover:bg-secondary transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 10 >= filtered.length}
                className="px-3 py-1 rounded border border-border text-xs disabled:opacity-50 hover:bg-secondary transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
        {filtered.length <= 10 && (
          <div className="px-4 py-3 border-t border-border bg-secondary/30 text-xs text-muted-foreground font-mono">
            Showing {filtered.length} of {alerts.length} alerts
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
      {(showCreate || editAlert) && (
        <AlertFormModal alert={editAlert} onClose={() => { setShowCreate(false); setEditAlert(null); }} />
      )}
    </>
  );
};

export default AlertTable;
