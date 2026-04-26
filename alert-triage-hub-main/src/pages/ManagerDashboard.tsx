import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  User, Loader2, RefreshCw, ShieldAlert, TrendingUp, Trash2, X, Eye, EyeOff,
  BarChart2, Users, AlertTriangle, Activity, RotateCcw, ShieldPlus, ChevronUp, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import SeverityBadge from '@/components/SeverityBadge';
import StatusBadge from '@/components/StatusBadge';
import AlertDetailModal from '@/components/AlertDetailModal';

const API = 'http://localhost:5000';

// ── Colour palettes ──────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#e84057',
  high: '#e87f35',
  medium: '#e8a735',
  low: '#38bdf8',
};
const STATUS_COLORS: Record<string, string> = {
  new: '#e84057',
  claimed: '#e8a735',
  investigating: '#38bdf8',
  closed: '#22c55e',
};
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(220 18% 12%)',
  border: '1px solid hsl(220 15% 18%)',
  borderRadius: '8px',
  color: '#e0e0e0',
  fontSize: '12px',
  fontFamily: 'JetBrains Mono',
};

// ── Types ────────────────────────────────────────────────────────
type Tab = 'overview' | 'workload';

interface Stats {
  status_counts: Record<string, number>;
  severity_counts: Record<string, number>;
  total_alerts: number;
  active_analysts: number;
  escalated_count?: number;
}
interface WorkloadRow {
  user_id: number;
  username: string;
  full_name: string;
  alert_id: number | null;
  event_type: string | null;
  severity: string | null;
  status: string | null;
  created_at: string | null;
}
interface PerformanceRow {
  user_id: number;
  username: string;
  full_name: string;
  total_handled: number;
  in_progress: number;
  completed: number;
  avg_ai_score: number;
}
interface Analyst {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  account_status: string;
  created_at: string;
}

// ── Component ────────────────────────────────────────────────────
const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [workload, setWorkload] = useState<WorkloadRow[]>([]);
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Data Modal State (for Stats Cards)
  interface ModalAlert {
    id: number;
    event_type?: string;
    description?: string;
    severity: string;
    status: string;
    source_ip: string;
    dest_ip: string;
    trigger_time?: string;
    created_at?: string;
    detection_source?: string;
    tags?: string;
    assigned_analyst_name?: string;
    asset_id?: number;
    asset_name?: string;
    asset_type?: string;
    criticality_score?: number;
    asset_location?: string;
    resolution_notes?: string;
    [key: string]: unknown;
  }
  const [activeModalCard, setActiveModalCard] = useState<'total' | 'critical' | 'open' | 'analysts' | 'escalated' | null>(null);
  const [modalAlerts, setModalAlerts] = useState<ModalAlert[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDeleteModalAlertId, setConfirmDeleteModalAlertId] = useState<number | null>(null);
  const [deletingModalAlertId, setDeletingModalAlertId] = useState<number | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<number | null>(null);

  // Modal Table State
  const [modalPage, setModalPage] = useState(1);
  const [modalSortCol, setModalSortCol] = useState('id');
  const [modalSortDir, setModalSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedModalAlert, setSelectedModalAlert] = useState<ModalAlert | null>(null);

  const handleDeleteModalAlert = async (alertId: number) => {
    setDeletingModalAlertId(alertId);
    try {
      const res = await fetch(`${API}/api/manager/alerts/${alertId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Alert deleted successfully');
      setModalAlerts(prev => prev.filter(a => a.id !== alertId));
      fetchAll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete alert');
    } finally {
      setDeletingModalAlertId(null);
      setConfirmDeleteModalAlertId(null);
    }
  };
  const handleCardClick = async (cardId: 'total' | 'critical' | 'open' | 'analysts' | 'escalated') => {
    setActiveModalCard(cardId);
    setModalLoading(true);
    setModalPage(1); // reset to page 1 on open
    try {
      let query = '?per_page=1000';
      if (cardId === 'critical') query += '&severity=critical';
      else if (cardId === 'open') query += '&status_in=new,claimed,investigating';
      else if (cardId === 'escalated') query += '&status=escalated';
      
      const res = await fetch(`${API}/api/alerts${query}`);
      const data = await res.json();
      const fetchedAlerts = Array.isArray(data) ? data : (data.alerts || []);
      setModalAlerts(fetchedAlerts);
    } catch (err: unknown) {
      toast.error('Failed to load card data');
    } finally {
      setModalLoading(false);
    }
  };
  const handleUnclaimAlert = async (alertId: number) => {
    setUnclaimingId(alertId);
    try {
      const res = await fetch(`${API}/api/manager/unclaim-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      toast.success('Alert returned to new pool');
      fetchAll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to unclaim alert');
    } finally {
      setUnclaimingId(null);
    }
  };

  const sortedModalAlerts = React.useMemo(() => {
    return [...modalAlerts].sort((a, b) => {
      let valA = a[modalSortCol];
      let valB = b[modalSortCol];

      if (modalSortCol === 'timestamp') {
         valA = new Date(a.trigger_time || a.created_at || 0).getTime();
         valB = new Date(b.trigger_time || b.created_at || 0).getTime();
      } else if (modalSortCol === 'event') {
         valA = a.event_type;
         valB = b.event_type;
      }

      if (valA < valB) return modalSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return modalSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [modalAlerts, modalSortCol, modalSortDir]);

  const paginatedModalAlerts = React.useMemo(() => {
    const startIndex = (modalPage - 1) * 10;
    return sortedModalAlerts.slice(startIndex, startIndex + 10);
  }, [sortedModalAlerts, modalPage]);

  // ── Fetch all data ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, workloadRes, perfRes] = await Promise.all([
        fetch(`${API}/api/manager/stats`),
        fetch(`${API}/api/manager/analyst-workload`),
        fetch(`${API}/api/manager/analyst-performance`),
      ]);
      const [statsData, workloadData, perfData] = await Promise.all([
        statsRes.json(), workloadRes.json(), perfRes.json(),
      ]);
      setStats(statsData);
      setWorkload(Array.isArray(workloadData) ? workloadData : []);
      setPerformance(Array.isArray(perfData) ? perfData : []);
    } catch {
      toast.error('Failed to load dashboard data. Is Flask running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Chart data ─────────────────────────────────────────────────
  const statusChartData = stats
    ? Object.entries(stats.status_counts).map(([name, value]) => ({ name, value }))
    : [];
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  const severityChartData = stats
    ? Object.entries(stats.severity_counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => severityOrder.indexOf(a.name) - severityOrder.indexOf(b.name))
    : [];
  const perfChartData = performance.map(p => ({
    name: p.username,
    Active: p.in_progress,
    Closed: p.completed,
  }));

  // Group workload rows by analyst
  interface WorkloadAlert {
    id: number;
    event: string;
    severity: string;
    status: string;
    created_at: string;
  }
  const workloadByAnalyst: Record<number, { name: string; username: string; alerts: WorkloadAlert[] }> = {};
  workload.forEach(row => {
    if (!workloadByAnalyst[row.user_id]) {
      workloadByAnalyst[row.user_id] = { name: row.full_name, username: row.username, alerts: [] };
    }
    if (row.alert_id) {
      workloadByAnalyst[row.user_id].alerts.push({
        id: row.alert_id, event: row.event_type,
        severity: row.severity, status: row.status, created_at: row.created_at,
      });
    }
  });

  const openCount = stats
    ? (stats.status_counts['new'] || 0) + (stats.status_counts['claimed'] || 0) + (stats.status_counts['investigating'] || 0)
    : 0;

  // ── Tab definitions ────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',  label: 'Department Overview',         icon: BarChart2  },
    { id: 'workload',  label: 'Live Analyst Workload',       icon: Users      },
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Command Center,{' '}
              <span className="text-accent" style={{ textShadow: '0 0 20px hsl(45 100% 55% / 0.4)' }}>
                {user?.name?.split(' ')[0]}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'total', label: 'Total Alerts',    value: stats?.total_alerts    ?? '—', icon: AlertTriangle, color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20'     },
            { id: 'critical', label: 'Critical',        value: stats?.severity_counts?.critical ?? '—', icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
            { id: 'open', label: 'Open',            value: openCount || '—',              icon: Activity,      color: 'text-accent',      bg: 'bg-accent/10',      border: 'border-accent/20'      },
            { id: 'escalated', label: 'Escalated', value: stats?.escalated_count ?? '—', icon: ShieldPlus, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
          ].map(card => (
            <div 
              key={card.label} 
              onClick={() => handleCardClick(card.id as 'total' | 'critical' | 'open' | 'analysts' | 'escalated')}
              className={`rounded-lg border ${card.border} ${card.bg} p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition-transform shadow-sm`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg} border ${card.border} shrink-0`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex flex-wrap gap-1 bg-secondary/30 p-1 rounded-lg w-fit border border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════ Tab: OVERVIEW ══════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-300">

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Status Pie */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">Alert Status</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                        {statusChartData.map(entry => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {statusChartData.map(entry => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] }} />
                      <span className="text-muted-foreground font-mono uppercase">{entry.name}</span>
                      <span className="text-foreground font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity Pie */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">Severity Breakdown</h3>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                        {severityChartData.map(entry => (
                          <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {severityChartData.map(entry => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[entry.name] }} />
                      <span className="text-muted-foreground font-mono uppercase">{entry.name}</span>
                      <span className="text-foreground font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst Performance Bar */}
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">Analyst Activity</h3>
                <div className="h-44">
                  {perfChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={perfChartData} barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 18%)" />
                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                        <Bar dataKey="Active" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Closed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-mono">
                      No analyst data yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Performance Table */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Analyst Performance Ratings
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Analyst', 'Total Assigned', 'Active', 'Closed', 'AI Rating', 'Completion Rate'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-mono text-muted-foreground uppercase first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map(p => {
                      const rate = p.total_handled > 0 ? Math.round((p.completed / p.total_handled) * 100) : 0;
                      const aiScore = Math.round(p.avg_ai_score || 0);
                      return (
                        <tr key={p.user_id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-3 first:pl-0">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                {p.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">{p.full_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">@{p.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-foreground">{p.total_handled}</td>
                          <td className="py-3 px-3"><span className="text-blue-400 font-mono font-bold">{p.in_progress}</span></td>
                          <td className="py-3 px-3"><span className="text-green-400 font-mono font-bold">{p.completed}</span></td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              aiScore >= 80 ? 'text-green-400 bg-green-400/10' :
                              aiScore >= 50 ? 'text-yellow-400 bg-yellow-400/10' :
                              'text-destructive bg-destructive/10'
                            }`}>
                              {aiScore}%
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {performance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-xs text-muted-foreground font-mono">
                          No performance data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ Tab: ANALYST WORKLOAD ══════════════════ */}
        {activeTab === 'workload' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : Object.keys(workloadByAnalyst).length === 0 ? (
              <div className="text-sm text-center text-muted-foreground py-12 font-mono">
                No analysts or assignments found.
              </div>
            ) : (
              Object.values(workloadByAnalyst).map(analyst => (
                <div key={analyst.username} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                      {analyst.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{analyst.name}</p>
                      {analyst.alerts.length >= 5 && (
                        <span className="text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded ml-2">OVERLOADED</span>
                      )}
                      <p className="text-xs font-mono text-muted-foreground">
                        @{analyst.username} &nbsp;·&nbsp;
                        <span className="text-accent">{analyst.alerts.length}</span> alert{analyst.alerts.length !== 1 ? 's' : ''} assigned
                      </p>
                      {/* Workload Bar */}
                      <div className="mt-2 w-48 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${analyst.alerts.length >= 5 ? 'bg-destructive' : 'bg-accent'}`} 
                          style={{ width: `${Math.min((analyst.alerts.length / 5) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  {analyst.alerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3 font-mono">No alerts assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {analyst.alerts.map((alert: WorkloadAlert) => (
                        <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                            ALT-{String(alert.id).padStart(3, '0')}
                          </span>
                          <SeverityBadge severity={alert.severity as any} />
                          <span className="flex-1 truncate text-sm text-foreground">{alert.event}</span>
                          <StatusBadge status={alert.status as any} />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono shrink-0">
                              {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : '—'}
                            </span>
                            {alert.status === 'claimed' && (
                              <button
                                onClick={() => handleUnclaimAlert(alert.id)}
                                disabled={unclaimingId === alert.id}
                                title="Return to New Alerts"
                                className="p-1.5 rounded-md hover:bg-accent/10 text-muted-foreground hover:text-accent transition-all active:scale-90 disabled:opacity-50"
                              >
                                {unclaimingId === alert.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Performance Summary Table */}
            {!loading && performance.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Performance Summary
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Analyst', 'Total', 'Active', 'Closed', 'Completion'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-xs font-mono text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {performance.map(p => {
                        const rate = p.total_handled > 0 ? Math.round((p.completed / p.total_handled) * 100) : 0;
                        return (
                          <tr key={p.user_id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="py-2.5 px-3">
                              <p className="font-medium text-foreground">{p.full_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">@{p.username}</p>
                            </td>
                            <td className="py-2.5 px-3 font-mono">{p.total_handled}</td>
                            <td className="py-2.5 px-3"><span className="text-blue-400 font-mono font-bold">{p.in_progress}</span></td>
                            <td className="py-2.5 px-3"><span className="text-green-400 font-mono font-bold">{p.completed}</span></td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full bg-green-400 rounded-full" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-mono text-muted-foreground">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}



      </div>

      {/* ══ Stats Card Data Modal ══ */}
      {activeModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-6xl max-h-[80vh] flex flex-col rounded-xl border border-accent/30 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground capitalize">{activeModalCard} View</h2>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Incident Drilldown</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveModalCard(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {modalLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-secondary/20">
                       <tr>
                        {[
                          { id: 'id', label: 'ID' },
                          { id: 'event', label: 'Event' },
                          { id: 'severity', label: 'Severity' },
                          { id: 'status', label: 'Status' },
                          { id: 'detection_source', label: 'Source' },
                          { id: 'tags', label: 'Tags' },
                          { id: 'timestamp', label: 'Date' },
                          { id: null, label: 'Action' }
                        ].map(h => (
                          <th 
                            key={h.label} 
                            onClick={() => {
                              if (h.id) {
                                if (modalSortCol === h.id) {
                                  setModalSortDir(modalSortDir === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setModalSortCol(h.id);
                                  setModalSortDir('asc');
                                }
                              }
                            }}
                            className={`text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase last:text-center ${h.id ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              {h.label}
                              {h.id && modalSortCol === h.id && (
                                modalSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedModalAlerts.map(alert => (
                        <tr 
                          key={alert.id} 
                          onClick={() => setSelectedModalAlert(alert)}
                          className="border-b border-border/40 hover:bg-secondary/20 transition-colors group cursor-pointer"
                        >
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">ALT-{String(alert.id).padStart(3, '0')}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-foreground">{alert.event_type}</p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{alert.source_ip} → {alert.dest_ip}</p>
                          </td>
                          <td className="py-3 px-4 text-xs"><SeverityBadge severity={alert.severity as any} /></td>
                          <td className="py-3 px-4 text-xs"><StatusBadge status={alert.status as any} /></td>
                          <td className="py-3 px-4 text-[10px] text-muted-foreground font-mono uppercase whitespace-nowrap">{alert.detection_source || '—'}</td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {alert.tags ? alert.tags.split(',').map(tag => (
                                <span key={tag} className="text-[8px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground font-mono uppercase">
                                  {tag.trim()}
                                </span>
                              )) : <span className="text-muted-foreground text-[10px]">—</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                            {alert.trigger_time ? new Date(alert.trigger_time).toLocaleDateString() : (alert.created_at ? new Date(alert.created_at).toLocaleDateString() : '—')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {['new', 'closed'].includes(alert.status) ? (
                              confirmDeleteModalAlertId === alert.id ? (
                                <div className="flex items-center gap-2 justify-center">
                                  <span className="text-xs text-muted-foreground font-mono">Sure?</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteModalAlert(alert.id); }}
                                    disabled={deletingModalAlertId === alert.id}
                                    className="text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 rounded px-2 py-1 transition-all disabled:opacity-50"
                                  >
                                    {deletingModalAlertId === alert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteModalAlertId(null); }}
                                    className="text-xs text-muted-foreground border border-border hover:bg-secondary rounded px-2 py-1 transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteModalAlertId(alert.id); }}
                                  className="mx-auto text-xs text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 rounded px-2 py-1 transition-all flex items-center justify-center p-1"
                                  title="Delete Alert"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            ) : (
                              <span
                                title={`Cannot delete — alert is currently ${alert.status}`}
                                className="flex items-center justify-center opacity-30 cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {modalAlerts.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-xs text-muted-foreground font-mono">
                            No alerts found for this category.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {modalAlerts.length > 10 && (
                    <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/20">
                      <p className="text-xs text-muted-foreground font-mono">
                        Showing {(modalPage - 1) * 10 + 1} to {Math.min(modalPage * 10, sortedModalAlerts.length)} of {sortedModalAlerts.length}
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setModalPage(p => Math.max(1, p - 1))}
                          disabled={modalPage === 1}
                          className="px-3 py-1 rounded border border-border text-xs disabled:opacity-50 hover:bg-secondary transition-colors"
                        >
                          Prev
                        </button>
                        <button 
                          onClick={() => setModalPage(p => p + 1)}
                          disabled={modalPage * 10 >= sortedModalAlerts.length}
                          className="px-3 py-1 rounded border border-border text-xs disabled:opacity-50 hover:bg-secondary transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {selectedModalAlert && (
        <AlertDetailModal 
          alert={{
            id: String(selectedModalAlert.id),
            title: selectedModalAlert.event_type || selectedModalAlert.description || '',
            severity: selectedModalAlert.severity as any,
            status: selectedModalAlert.status as any,
            sourceIp: selectedModalAlert.source_ip,
            destIp: selectedModalAlert.dest_ip,
            timestamp: selectedModalAlert.trigger_time || selectedModalAlert.created_at || '',
            source: selectedModalAlert.detection_source as any || '',
            description: selectedModalAlert.description || '',
            tags: selectedModalAlert.tags || '',
            claimedBy: selectedModalAlert.assigned_analyst_name,
            assetName: selectedModalAlert.asset_name,
            assetType: selectedModalAlert.asset_type,
            assetCriticality: selectedModalAlert.criticality_score,
            assetLocation: selectedModalAlert.asset_location,
            notes: [],
            resolutionNotes: selectedModalAlert.resolution_notes ? JSON.parse(selectedModalAlert.resolution_notes) : undefined,
          }} 
          onClose={() => setSelectedModalAlert(null)} 
        />
      )}

    </DashboardLayout>
  );
};

export default ManagerDashboard;
