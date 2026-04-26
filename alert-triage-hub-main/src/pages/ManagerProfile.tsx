import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { User, Mail, Save, Loader2, Plus, UserPlus, Trash2, Eye, EyeOff, X, Activity, ShieldCheck, Key, Settings, UserCheck, UserX, Search } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:5000';

const ManagerProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [analysts, setAnalysts] = useState<any[]>([]);
  const [fetchingAnalysts, setFetchingAnalysts] = useState(true);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Create Alert state
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [createForm, setCreateForm] = useState({
    event_type: '',
    source_ip: '',
    dest_ip: '',
    description: '',
    trigger_time: '',
    tags: '',
    detection_source: 'EDR',
    severity: 'medium',
    useCurrentTime: true
  });

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

  // Delete analyst state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
      });
      fetchAnalysts();
    }
  }, [user]);

  const fetchAnalysts = async () => {
    setFetchingAnalysts(true);
    try {
      const res = await fetch(`${API}/api/manager/analysts`);
      const data = await res.json();
      setAnalysts(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load analysts');
    } finally {
      setFetchingAnalysts(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Name and Email are required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/user/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          full_name: formData.name,
          email: formData.email,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      updateUser({ name: formData.name, email: formData.email });
      toast.success('Profile updated successfully');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const isPrivateIP = (ip: string) => {
    const parts = ip.split('.').map(p => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return false;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    // IP Validation
    if (!isPrivateIP(createForm.source_ip)) {
      toast.error('Source IP must be a Private IP address (10.x, 172.16-31.x, or 192.168.x)');
      return;
    }
    if (!isPrivateIP(createForm.dest_ip)) {
      toast.error('Destination IP must be a Private IP address (10.x, 172.16-31.x, or 192.168.x)');
      return;
    }

    // Word Count Validation
    const wordCount = createForm.description.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) {
      toast.error('Context is too short. Please provide at least 10 words for a professional report.');
      return;
    }
    if (wordCount > 200) {
      toast.error('Context exceeds the 200 word limit.');
      return;
    }

    // Trigger Time Validation (Must not be in the future)
    // We check this AFTER preparing the payload to ensure even 'Current Time' is within bounds
    const finalTriggerTime = createForm.useCurrentTime
      ? new Date().getTime()
      : new Date(createForm.trigger_time).getTime();

    const now = new Date().getTime();

    // Allow 5 second grace period for processing lag
    if (finalTriggerTime > now + 5000) {
      toast.error('Trigger Time cannot be in the future');
      return;
    }

    if (!createForm.event_type || !createForm.tags || !createForm.detection_source) {
      toast.error('Please fill all mandatory fields including Tags and Detection Source');
      return;
    }

    setCreatingAlert(true);
    try {
      // Helper to get local date/time for MySQL (YYYY-MM-DD HH:mm:ss)
      const getLocalISO = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      };

      const payload = {
        ...createForm,
        trigger_time: createForm.useCurrentTime
          ? getLocalISO()
          : createForm.trigger_time.replace('T', ' '),
        created_by: user?.id
      };

      const res = await fetch(`${API}/api/manager/create-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success('Alert created successfully');
      setCreateForm({
        event_type: '',
        source_ip: '',
        dest_ip: '',
        description: '',
        trigger_time: '',
        tags: '',
        detection_source: 'EDR',
        severity: 'medium',
        useCurrentTime: true
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create alert');
    } finally {
      setCreatingAlert(false);
    }
  };

  const validateCreateAnalyst = () => {
    const errors: Record<string, string> = {};
    const valName = analystForm.full_name.trim();
    const valUsername = analystForm.username.trim();
    const valEmail = analystForm.email.trim();
    const valPassword = analystForm.password;

    // 1. Full Name Validation
    const nameRegex = /^[a-zA-Z]+(?:\s+[a-zA-Z]+)+$/;
    if (valName.length < 2 || valName.length > 50) {
      errors.full_name = 'Length must be 2-50 characters';
    } else if (!nameRegex.test(valName)) {
      errors.full_name = 'Provide first and surname (alphabets and space between only)';
    }

    // 2. Username Validation
    if (valUsername.length < 3 || valUsername.length > 16) {
      errors.username = 'Length must be 3-16 characters';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(valUsername)) {
      errors.username = 'Must contain both alphabets and numbers';
    } else if (!/^[a-zA-Z0-9_.]+$/.test(valUsername)) {
      errors.username = 'Only alphanumeric, underscores, and periods allowed';
    } else if (/^[_. ]|[_. ]$/.test(valUsername)) {
      errors.username = 'Cannot start or end with a special character';
    } else if (/[_.]{2,}/.test(valUsername)) {
      errors.username = 'Cannot have consecutive special characters';
    }

    // 3. Email Validation
    if (valEmail.length === 0 || valEmail.length > 254) {
      errors.email = 'Email must be exactly 1 to 254 characters';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(valEmail)) {
        errors.email = 'Please enter a properly formatted email';
      }
    }

    // 4. Password Validation
    if (valPassword.length < 6) {
      errors.password = 'Weak password: Minimum 6 characters required';
    } else if (!/[a-zA-Z]/.test(valPassword) || !/\d/.test(valPassword) || !/[^a-zA-Z0-9]/.test(valPassword)) {
      errors.password = 'Weak password: Need alphabets, numbers, and special chars';
    }

    setAnalystFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAnalyst = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateAnalyst()) return;

    setAddingAnalyst(true);
    try {
      const res = await fetch(`${API}/api/manager/create-analyst`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analystForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success('Analyst account created');
      setShowAddModal(false);
      setAnalystForm({ username: '', full_name: '', email: '', password: '' });
      fetchAnalysts();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to create analyst');
    } finally {
      setAddingAnalyst(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/manager/analysts/${id}/toggle-status`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setAnalysts(prev => prev.map(a =>
        a.user_id === id ? { ...a, account_status: data.new_status } : a
      ));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    }
  };

  const handleDeleteAnalyst = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API}/api/manager/analysts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Analyst removed');
      setAnalysts(prev => prev.filter(a => a.user_id !== id));
    } catch (e) {
      toast.error('Deletion failed');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const filteredAnalysts = analysts.filter(a =>
    a.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(232,127,53,0.1)]">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{user?.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                  SOC Manager
                </span>
                <span className="text-sm text-muted-foreground font-mono">ID: #{user?.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-secondary/30 px-4 py-2 rounded-lg border border-border flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Root Administrative Access</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* LEFT: Profile & Create Alert (5 cols) */}
          <div className="xl:col-span-4 space-y-8">

            {/* Profile Settings */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border bg-accent/5 flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Manager Identity</h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider ml-1 text-[10px]">Full Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider ml-1 text-[10px]">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-accent/20 active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Update Profile
                </button>
              </div>
            </div>

            {/* Create Alert Form (Simpler version for Profile) */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border bg-accent/5 flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Quick Incident Broadcast</h3>
              </div>
              <form onSubmit={handleCreateAlert} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Event Type</label>
                  <input
                    placeholder="e.g. Unusual Data Transfer"
                    value={createForm.event_type}
                    onChange={e => setCreateForm(f => ({ ...f, event_type: e.target.value }))}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Source IP</label>
                    <input
                      placeholder="10.0.0.1"
                      value={createForm.source_ip}
                      onChange={e => setCreateForm(f => ({ ...f, source_ip: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Dest IP</label>
                    <input
                      placeholder="172.16.0.5"
                      value={createForm.dest_ip}
                      onChange={e => setCreateForm(f => ({ ...f, dest_ip: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Severity</label>
                  <select
                    value={createForm.severity}
                    onChange={e => setCreateForm(f => ({ ...f, severity: e.target.value }))}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Detection Source</label>
                    <select
                      value={createForm.detection_source}
                      onChange={e => setCreateForm(f => ({ ...f, detection_source: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none"
                      required
                    >
                      <option value="EDR">EDR (SentinelOne)</option>
                      <option value="SIEM">SIEM (Splunk)</option>
                      <option value="Firewall">Firewall (PaloAlto)</option>
                      <option value="IDS/IPS">IDS/IPS (Snort)</option>
                      <option value="Email">Email Security (Mimecast)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Tags</label>
                    <input
                      placeholder="malware, lateral, hq-1"
                      value={createForm.tags}
                      onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Trigger Time</label>
                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setCreateForm(f => ({ ...f, useCurrentTime: !f.useCurrentTime }))}>
                      <input
                        type="checkbox"
                        checked={createForm.useCurrentTime}
                        readOnly
                        className="w-3 h-3 accent-accent cursor-pointer"
                      />
                      <span className="text-[9px] font-mono text-muted-foreground group-hover:text-accent transition-colors">CURRENT TIME</span>
                    </div>
                  </div>
                  {!createForm.useCurrentTime ? (
                    <input
                      type="datetime-local"
                      value={createForm.trigger_time}
                      max={(() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                      })()}
                      onChange={e => setCreateForm(f => ({ ...f, trigger_time: e.target.value }))}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none animate-in slide-in-from-top-1 duration-200"
                      required
                    />
                  ) : (
                    <div className="w-full bg-secondary/10 border border-border/50 rounded-lg px-3 py-2 text-xs text-muted-foreground italic font-mono flex items-center gap-2">
                      <Activity className="w-3 h-3" />
                      Real-time capture active
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Context</label>
                    <span className={`text-[9px] font-mono ${createForm.description.trim().split(/\s+/).filter(Boolean).length < 10
                      ? 'text-red-400'
                      : 'text-green-400'
                      }`}>
                      {createForm.description.trim().split(/\s+/).filter(Boolean).length}/10 WORDS MIN
                    </span>
                  </div>
                  <textarea
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none min-h-[80px]"
                    placeholder="Provide a detailed incident description (min 10 words)..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingAlert}
                  className="w-full bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {creatingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Broadcast Alert
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Analyst Management (8 cols) */}
          <div className="xl:col-span-8 space-y-6">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight uppercase">Operational Personnel</h3>
                  <p className="text-xs text-muted-foreground font-mono">Registered Junior Triage Analysts</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-accent/10 border border-accent/20 px-2 py-2 rounded-lg text-accent font-mono uppercase tracking-wider whitespace-nowrap">
                  Total Analysts: {analysts.length}
                </span>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-secondary/40 border border-border rounded-lg pl-8 pr-3 py-2 text-[11px] text-foreground focus:ring-1 focus:ring-accent outline-none w-32 lg:w-40 transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-accent text-black font-bold text-[11px] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Recruit Analyst
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/30 border-b border-border">
                      {['Personnel', 'Email', 'Joined Date', 'Last Login', 'Avg Score', 'Status', 'Actions'].map(h => (
                        <th key={h} className={`text-left px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fetchingAnalysts ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={7} className="px-6 py-4 bg-secondary/10 border-b border-border">
                            <div className="h-4 bg-secondary rounded w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredAnalysts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic font-mono text-xs">
                          No personnel matching "{searchTerm}" found.
                        </td>
                      </tr>
                    ) : (
                      filteredAnalysts.map(analyst => (
                        <tr key={analyst.user_id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                {analyst.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{analyst.full_name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">@{analyst.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground">{analyst.email}</td>
                          <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground">{new Date(analyst.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground">
                            {analyst.last_login ? new Date(analyst.last_login).toLocaleString() : 'Never'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-bold ${analyst.avg_ai_score >= 80 ? 'text-green-400' :
                                analyst.avg_ai_score >= 50 ? 'text-accent' : 'text-red-400'
                                }`}>
                                {parseFloat(analyst.avg_ai_score).toFixed(1)}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border ${analyst.account_status === 'Active'
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}>
                              {analyst.account_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleToggleStatus(analyst.user_id)}
                                title={analyst.account_status === 'Active' ? 'Suspend Analyst' : 'Activate Analyst'}
                                className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${analyst.account_status === 'Active'
                                  ? 'text-muted-foreground hover:bg-red-500/10 hover:text-red-400'
                                  : 'text-green-400 hover:bg-green-500/10'
                                  }`}
                              >
                                {analyst.account_status === 'Active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>

                              {confirmDeleteId === analyst.user_id ? (
                                <div className="flex items-center gap-2 justify-end">
                                  <button onClick={() => handleDeleteAnalyst(analyst.user_id)} disabled={deletingId === analyst.user_id} className="text-accent hover:underline text-xs font-bold">YES</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="text-muted-foreground hover:underline text-xs">NO</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(analyst.user_id)}
                                  className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Analyst Modal (Restyled for Gold) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card border border-accent/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Recruit New Analyst</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <form onSubmit={handleCreateAnalyst} className="p-6 space-y-4" noValidate>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Full Name</label>
                <input value={analystForm.full_name} onChange={e => { setAnalystForm(f => ({ ...f, full_name: e.target.value })); if (analystFormErrors.full_name) setAnalystFormErrors(p => ({ ...p, full_name: '' })); }} className={`w-full bg-secondary/50 border ${analystFormErrors.full_name ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent'} rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 outline-none`} placeholder="First Last" />
                {analystFormErrors.full_name && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.full_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Username</label>
                  <input value={analystForm.username} onChange={e => { setAnalystForm(f => ({ ...f, username: e.target.value })); if (analystFormErrors.username) setAnalystFormErrors(p => ({ ...p, username: '' })); }} className={`w-full bg-secondary/50 border ${analystFormErrors.username ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent'} rounded-lg px-4 py-2 text-sm text-foreground font-mono focus:ring-1 outline-none`} placeholder="j.doe" />
                  {analystFormErrors.username && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.username}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Temp Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={analystForm.password} onChange={e => { setAnalystForm(f => ({ ...f, password: e.target.value })); if (analystFormErrors.password) setAnalystFormErrors(p => ({ ...p, password: '' })); }} className={`w-full bg-secondary/50 border ${analystFormErrors.password ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent'} rounded-lg px-4 py-2 pr-10 text-sm text-foreground font-mono focus:ring-1 outline-none`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {analystFormErrors.password && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.password}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Corporate Email</label>
                <input type="email" value={analystForm.email} onChange={e => { setAnalystForm(f => ({ ...f, email: e.target.value })); if (analystFormErrors.email) setAnalystFormErrors(p => ({ ...p, email: '' })); }} className={`w-full bg-secondary/50 border ${analystFormErrors.email ? 'border-destructive focus:ring-destructive/50' : 'border-border focus:ring-accent'} rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 outline-none`} placeholder="name@company.com" />
                {analystFormErrors.email && <p className="text-xs text-destructive animate-fade-in">{analystFormErrors.email}</p>}
              </div>
              <button type="submit" disabled={addingAnalyst} className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4">
                {addingAnalyst ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManagerProfile;
