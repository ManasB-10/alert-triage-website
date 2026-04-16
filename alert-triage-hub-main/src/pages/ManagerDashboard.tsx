import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  Activity, Users, AlertTriangle, BarChart2, FilePlus, Shield,
  User, Loader2, RefreshCw, ShieldAlert, TrendingUp, Trash2, Plus, UserPlus, X, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import SeverityBadge from '@/components/SeverityBadge';
import StatusBadge from '@/components/StatusBadge';

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
type Tab = 'overview' | 'workload' | 'create' | 'analysts';

interface Stats {
  status_counts: Record<string, number>;
  severity_counts: Record<string, number>;
  total_alerts: number;
  active_analysts: number;
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
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Alert form state
  const [createForm, setCreateForm] = useState({
    event_type: '',
    source_ip: '',
    dest_ip: '',
    description: '',
    trigger_time: '',
    tags: '',
    detection_source: 'EDR',
    severity: 'medium',
  });
  const [isCurrentTime, setIsCurrentTime] = useState(false);
  const [creating, setCreating] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Add Analyst modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addingAnalyst, setAddingAnalyst] = useState(false);
  const [analystForm, setAnalystForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
  });
  const [analystFormErrors, setAnalystFormErrors] = useState<Record<string, string>>({});

  // Data Modal State (for Stats Cards)
  const [activeModalCard, setActiveModalCard] = useState<'total' | 'critical' | 'open' | 'analysts' | null>(null);
  const [modalAlerts, setModalAlerts] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmDeleteModalAlertId, setConfirmDeleteModalAlertId] = useState<number | null>(null);
  const [deletingModalAlertId, setDeletingModalAlertId] = useState<number | null>(null);

  const handleDeleteModalAlert = async (alertId: number) => {
    setDeletingModalAlertId(alertId);
    try {
      const res = await fetch(`${API}/api/manager/alerts/${alertId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Alert deleted successfully');
      setModalAlerts(prev => prev.filter(a => a.id !== alertId));
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete alert');
    } finally {
      setDeletingModalAlertId(null);
      setConfirmDeleteModalAlertId(null);
    }
  };

  const handleCardClick = async (cardId: 'total' | 'critical' | 'open' | 'analysts') => {
    setActiveModalCard(cardId);
    if (cardId === 'analysts') return;
    
    setModalLoading(true);
    try {
      let query = '';
      if (cardId === 'critical') query = '?severity=critical';
      else if (cardId === 'open') query = '?status_in=new,claimed,investigating';
      
      const res = await fetch(`${API}/api/alerts${query}`);
      const data = await res.json();
      setModalAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load card data');
    } finally {
      setModalLoading(false);
    }
  };

  // ── Fetch all data ─────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, workloadRes, perfRes, analystsRes] = await Promise.all([
        fetch(`${API}/api/manager/stats`),
        fetch(`${API}/api/manager/analyst-workload`),
        fetch(`${API}/api/manager/analyst-performance`),
        fetch(`${API}/api/manager/analysts`),
      ]);
      const [statsData, workloadData, perfData, analystsData] = await Promise.all([
        statsRes.json(), workloadRes.json(), perfRes.json(), analystsRes.json(),
      ]);
      setStats(statsData);
      setWorkload(Array.isArray(workloadData) ? workloadData : []);
      setPerformance(Array.isArray(perfData) ? perfData : []);
      setAnalysts(Array.isArray(analystsData) ? analystsData : []);
    } catch {
      toast.error('Failed to load dashboard data. Is Flask running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Create Alert ───────────────────────────────────────────────
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !createForm.event_type.trim() || 
      !createForm.source_ip.trim() || 
      !createForm.dest_ip.trim() || 
      !createForm.description.trim() || 
      !createForm.tags.trim() || 
      (!createForm.trigger_time && !isCurrentTime)
    ) {
      toast.error('All fields are mandatory to create an alert');
      return;
    }

    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/;
    if (!ipPattern.test(createForm.source_ip.trim())) {
      toast.error('Invalid Source IP format');
      return;
    }
    if (!ipPattern.test(createForm.dest_ip.trim())) {
      toast.error('Invalid Destination IP format');
      return;
    }

    if (createForm.description.trim() && createForm.description.trim().split(/\s+/).length > 200) {
      toast.error('Description must be 200 words or less');
      return;
    }

    setCreating(true);
    try {
      const payloadTime = isCurrentTime ? new Date().toISOString() : createForm.trigger_time;

      const res = await fetch(`${API}/api/manager/create-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, trigger_time: payloadTime, created_by: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`✅ Alert #${data.alert_id} created successfully`);
      setCreateForm({ event_type: '', source_ip: '', dest_ip: '', description: '', trigger_time: '', tags: '', detection_source: 'EDR', severity: 'medium' });
      setIsCurrentTime(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create alert');
    } finally {
      setCreating(false);
    }
  };

  // ── Delete Analyst ─────────────────────────────────────────────
  const handleDeleteAnalyst = async (analyst_id: number) => {
    setDeletingId(analyst_id);
    try {
      const res = await fetch(`${API}/api/manager/analysts/${analyst_id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Analyst removed successfully');
      setAnalysts(prev => prev.filter(a => a.user_id !== analyst_id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove analyst');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // ── Validate Analyst Form (same rules as signup) ───────────────
  const validateAnalystForm = () => {
    const errors: Record<string, string> = {};
    const valName     = analystForm.full_name.trim();
    const valUsername = analystForm.username.trim();
    const valEmail    = analystForm.email.trim();
    const valPassword = analystForm.password;

    // Full Name
    const nameRegex = /^[a-zA-Z]+(?:\s+[a-zA-Z]+)+$/;
    if (valName.length < 2 || valName.length > 50) {
      errors.full_name = 'Length must be 2–50 characters';
    } else if (!nameRegex.test(valName)) {
      errors.full_name = 'Provide first and surname (alphabets and space only)';
    }

    // Username
    if (valUsername.length < 3 || valUsername.length > 16) {
      errors.username = 'Length must be 3–16 characters';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(valUsername)) {
      errors.username = 'Must contain both alphabets and numbers';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(valUsername)) {
      errors.username = 'Only alphanumeric, underscores, and periods allowed';
    } else if (/^[_. ]|[_. ]$/.test(valUsername)) {
      errors.username = 'Cannot start or end with a special character';
    } else if (/[_.]{2,}/.test(valUsername)) {
      errors.username = 'Cannot have consecutive special characters';
    }

    // Email
    if (valEmail.length === 0 || valEmail.length > 254) {
      errors.email = 'Email must be 1–254 characters';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(valEmail)) {
      errors.email = 'Please enter a properly formatted email';
    }

    // Password
    if (valPassword.length < 6) {
      errors.password = 'Weak password: Minimum 6 characters required';
    } else if (!/[a-zA-Z]/.test(valPassword) || !/\d/.test(valPassword) || !/[^a-zA-Z0-9]/.test(valPassword)) {
      errors.password = 'Need alphabets, numbers, and a special character';
    }

    setAnalystFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearAnalystError = (field: string) => {
    if (analystFormErrors[field]) {
      setAnalystFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ── Create Analyst ─────────────────────────────────────────────
  const handleCreateAnalyst = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAnalystForm()) return;
    setAddingAnalyst(true);
    try {
      const res = await fetch(`${API}/api/manager/create-analyst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...analystForm, role: 'junior_analyst' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success(`✅ Analyst "${analystForm.full_name}" created successfully`);
      setAnalystForm({ username: '', full_name: '', email: '', password: '' });
      setShowAddModal(false);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create analyst');
    } finally {
      setAddingAnalyst(false);
    }
  };

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
  const workloadByAnalyst: Record<number, { name: string; username: string; alerts: any[] }> = {};
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
    { id: 'overview',  label: 'Overview',         icon: BarChart2  },
    { id: 'workload',  label: 'Analyst Workload',  icon: Users      },
    { id: 'create',    label: 'Create Alert',      icon: FilePlus   },
    { id: 'analysts',  label: 'Manage Analysts',   icon: Shield     },
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
            { id: 'analysts', label: 'Active Analysts', value: stats?.active_analysts  ?? '—', icon: Users,         color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20'   },
          ].map(card => (
            <div 
              key={card.label} 
              onClick={() => handleCardClick(card.id as any)}
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
                <TrendingUp className="w-4 h-4" /> Team Performance Summary
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Analyst', 'Total Assigned', 'Active', 'Closed', 'Completion Rate'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-mono text-muted-foreground uppercase first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map(p => {
                      const rate = p.total_handled > 0 ? Math.round((p.completed / p.total_handled) * 100) : 0;
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
                      <p className="text-xs font-mono text-muted-foreground">
                        @{analyst.username} &nbsp;·&nbsp;
                        <span className="text-accent">{analyst.alerts.length}</span> alert{analyst.alerts.length !== 1 ? 's' : ''} assigned
                      </p>
                    </div>
                  </div>

                  {analyst.alerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3 font-mono">No alerts assigned</p>
                  ) : (
                    <div className="space-y-2">
                      {analyst.alerts.map((alert: any) => (
                        <div key={alert.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                          <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                            ALT-{String(alert.id).padStart(3, '0')}
                          </span>
                          <SeverityBadge severity={alert.severity} />
                          <span className="flex-1 truncate text-sm text-foreground">{alert.event}</span>
                          <StatusBadge status={alert.status} />
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : '—'}
                          </span>
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

        {/* ══════════════════ Tab: CREATE ALERT ══════════════════ */}
        {activeTab === 'create' && (
          <div className="animate-in fade-in duration-300 w-full max-w-5xl">
            <div className="rounded-lg border border-accent/20 bg-card p-6 shadow-xl">
              {/* Form header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <FilePlus className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Create New Alert</h2>
                  <p className="text-xs text-muted-foreground font-mono">Manual entry — tagged as Manager Created</p>
                </div>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-6">
                
                {/* Top Section: Grid for shorter inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Event Type */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Event Type <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.event_type}
                      onChange={e => setCreateForm(f => ({ ...f, event_type: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all placeholder:text-muted-foreground/50"
                      placeholder="e.g. SQL Injection Attempt"
                    />
                  </div>

                  {/* Source IP */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Source IP <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.source_ip}
                      onChange={e => setCreateForm(f => ({ ...f, source_ip: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all placeholder:text-muted-foreground/50"
                      placeholder="e.g. 192.168.1.100"
                    />
                  </div>

                  {/* Dest IP */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Dest IP <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.dest_ip}
                      onChange={e => setCreateForm(f => ({ ...f, dest_ip: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all placeholder:text-muted-foreground/50"
                      placeholder="e.g. 10.0.0.50"
                    />
                  </div>

                  {/* Detection Source */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Detection Source <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={createForm.detection_source}
                      onChange={e => setCreateForm(f => ({ ...f, detection_source: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all"
                    >
                      <option value="EDR">EDR</option>
                      <option value="SIEM">SIEM</option>
                      <option value="Firewall">Firewall</option>
                      <option value="IDS/IPS">IDS/IPS</option>
                      <option value="Email Gateway">Email Gateway</option>
                      <option value="WAF">WAF</option>
                      <option value="Vulnerability Scanner">Vulnerability Scanner</option>
                      <option value="Unknown">Other / Unknown</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Tags <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={createForm.tags}
                      onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all placeholder:text-muted-foreground/50"
                      placeholder="e.g. Phishing, Malware"
                    />
                  </div>

                  {/* Trigger Time */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-foreground">
                        Trigger Date & Time <span className="text-destructive">*</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        <input 
                          type="checkbox" 
                          checked={isCurrentTime} 
                          onChange={e => setIsCurrentTime(e.target.checked)}
                          className="accent-accent"
                        />
                        Just Now
                      </label>
                    </div>
                    <input
                      type="datetime-local"
                      value={createForm.trigger_time}
                      onChange={e => setCreateForm(f => ({ ...f, trigger_time: e.target.value }))}
                      disabled={isCurrentTime}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                </div>

                {/* Bottom Section: Full Width */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-foreground">
                      Description <span className="text-destructive">*</span>
                    </label>
                    <span className={`text-xs font-mono ${createForm.description.trim().split(/\s+/).length > 200 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {createForm.description.trim() === '' ? 0 : createForm.description.trim().split(/\s+/).length} / 200 words
                    </span>
                  </div>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm transition-all placeholder:text-muted-foreground/50 resize-y"
                    placeholder="Provide incident context..."
                  />
                </div>

                {/* Severity Picker */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Severity</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setCreateForm(f => ({ ...f, severity: sev }))}
                        className="py-2 rounded-lg text-xs font-mono uppercase border transition-all"
                        style={
                          createForm.severity === sev
                            ? {
                                color: SEVERITY_COLORS[sev],
                                borderColor: SEVERITY_COLORS[sev],
                                backgroundColor: `${SEVERITY_COLORS[sev]}22`,
                                fontWeight: 700,
                              }
                            : { color: '#6b7280', borderColor: 'hsl(220 15% 18%)' }
                        }
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-accent hover:bg-accent/90 text-black font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {creating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating...' : 'Create Alert'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ══════════════════ Tab: MANAGE ANALYSTS ══════════════════ */}
        {activeTab === 'analysts' && (
          <div className="space-y-4 animate-in fade-in duration-300">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">Junior Analysts</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {analysts.length} analyst{analysts.length !== 1 ? 's' : ''} registered
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 text-sm font-semibold bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 hover:border-accent/60 px-4 py-2 rounded-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Add Analyst
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/20">
                  <tr>
                    {['Analyst', 'Email', 'Status', 'Joined', 'Action'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase last:text-center">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysts.map(analyst => (
                    <tr key={analyst.user_id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {analyst.full_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{analyst.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">@{analyst.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{analyst.email}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                          analyst.account_status === 'Active'
                            ? 'text-green-400 bg-green-400/10 border-green-400/30'
                            : 'text-muted-foreground bg-secondary border-border'
                        }`}>
                          {analyst.account_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {new Date(analyst.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {confirmDeleteId === analyst.user_id ? (
                          <div className="flex items-center gap-2 justify-center">
                            <span className="text-xs text-muted-foreground font-mono">Sure?</span>
                            <button
                              onClick={() => handleDeleteAnalyst(analyst.user_id)}
                              disabled={deletingId === analyst.user_id}
                              className="text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 rounded px-2 py-1 transition-all disabled:opacity-50"
                            >
                              {deletingId === analyst.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-muted-foreground border border-border hover:bg-secondary rounded px-2 py-1 transition-all"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(analyst.user_id)}
                            className="flex items-center gap-1.5 mx-auto text-xs text-destructive hover:bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {analysts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-xs text-muted-foreground font-mono">
                        No analysts registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ══ Stats Card Data Modal ══ */}
      {activeModalCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-xl border border-accent/30 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
                  {activeModalCard === 'analysts' ? <Users className="w-4 h-4 text-blue-400" /> : <Activity className="w-4 h-4 text-accent" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {activeModalCard === 'total' && 'All Alerts'}
                    {activeModalCard === 'critical' && 'Critical Alerts'}
                    {activeModalCard === 'open' && 'Open Alerts'}
                    {activeModalCard === 'analysts' && 'Active Analysts'}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono">Detailed view</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalCard(null)}
                className="p-2 -mr-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              {activeModalCard === 'analysts' ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border bg-secondary/20">
                      <tr>
                        {['Analyst', 'Email', 'Joined'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysts.filter(a => a.account_status === 'Active').map(analyst => (
                        <tr key={analyst.user_id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {analyst.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{analyst.full_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">@{analyst.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{analyst.email}</td>
                          <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                            {new Date(analyst.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {analysts.filter(a => a.account_status === 'Active').length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center py-10 text-xs text-muted-foreground font-mono">
                            No active analysts.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                modalLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border bg-secondary/20">
                         <tr>
                          {['ID', 'Event', 'Severity', 'Status', 'Source', 'Tags', 'Date', 'Action'].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-mono text-muted-foreground uppercase last:text-center">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modalAlerts.map(alert => (
                          <tr key={alert.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors group">
                            <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">ALT-{String(alert.id).padStart(3, '0')}</td>
                            <td className="py-3 px-4">
                              <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{alert.event_type}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{alert.source_ip} → {alert.dest_ip}</p>
                            </td>
                            <td className="py-3 px-4 text-xs"><SeverityBadge severity={alert.severity} /></td>
                            <td className="py-3 px-4 text-xs"><StatusBadge status={alert.status} /></td>
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
                              {confirmDeleteModalAlertId === alert.id ? (
                                <div className="flex items-center gap-2 justify-center">
                                  <span className="text-xs text-muted-foreground font-mono">Sure?</span>
                                  <button
                                    onClick={() => handleDeleteModalAlert(alert.id)}
                                    disabled={deletingModalAlertId === alert.id}
                                    className="text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 rounded px-2 py-1 transition-all disabled:opacity-50"
                                  >
                                    {deletingModalAlertId === alert.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteModalAlertId(null)}
                                    className="text-xs text-muted-foreground border border-border hover:bg-secondary rounded px-2 py-1 transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteModalAlertId(alert.id)}
                                  className="mx-auto text-xs text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 rounded px-2 py-1 transition-all flex items-center justify-center p-1"
                                  title="Delete Alert"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ Add Analyst Modal ══ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-xl border border-accent/30 bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Create Junior Analyst</h2>
                  <p className="text-xs text-muted-foreground font-mono">New account will be Active immediately</p>
                </div>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setAnalystForm({ username: '', full_name: '', email: '', password: '' }); setAnalystFormErrors({}); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAnalyst} className="p-5 space-y-4">

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={analystForm.full_name}
                  onChange={e => { setAnalystForm(f => ({ ...f, full_name: e.target.value })); clearAnalystError('full_name'); }}
                  className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 placeholder:text-muted-foreground/40 transition-all ${
                    analystFormErrors.full_name ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent/50'
                  }`}
                  placeholder="e.g. Arjun Sharma"
                  autoFocus
                />
                {analystFormErrors.full_name && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.full_name}</p>}
              </div>

              {/* Username */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Username <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={analystForm.username}
                  onChange={e => { setAnalystForm(f => ({ ...f, username: e.target.value })); clearAnalystError('username'); }}
                  className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 placeholder:text-muted-foreground/40 transition-all font-mono ${
                    analystFormErrors.username ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent/50'
                  }`}
                  placeholder="e.g. arjun01"
                />
                {analystFormErrors.username && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.username}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email <span className="text-destructive">*</span></label>
                <input
                  type="email"
                  value={analystForm.email}
                  onChange={e => { setAnalystForm(f => ({ ...f, email: e.target.value })); clearAnalystError('email'); }}
                  className={`w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 placeholder:text-muted-foreground/40 transition-all ${
                    analystFormErrors.email ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent/50'
                  }`}
                  placeholder="e.g. arjun@company.com"
                />
                {analystFormErrors.email && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Temporary Password <span className="text-destructive">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={analystForm.password}
                    onChange={e => { setAnalystForm(f => ({ ...f, password: e.target.value })); clearAnalystError('password'); }}
                    className={`w-full bg-background border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 placeholder:text-muted-foreground/40 transition-all font-mono ${
                      analystFormErrors.password ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent/50'
                    }`}
                    placeholder="e.g. Arjun@123"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {analystFormErrors.password && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.password}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAnalystForm({ username: '', full_name: '', email: '', password: '' }); setAnalystFormErrors({}); }}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAnalyst}
                  className="flex-1 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {addingAnalyst ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {addingAnalyst ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManagerDashboard;
