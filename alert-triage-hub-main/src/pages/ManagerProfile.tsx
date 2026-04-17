import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { User, Mail, Save, Loader2, Plus, UserPlus, Trash2, Eye, EyeOff, X, Activity, ShieldCheck, Key, Settings } from 'lucide-react';
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

  // Delete analyst state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.event_type || !createForm.source_ip || !createForm.dest_ip) {
      toast.error('Please fill all mandatory fields');
      return;
    }

    setCreatingAlert(true);
    try {
      const res = await fetch(`${API}/api/manager/create-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          trigger_time: createForm.trigger_time || new Date().toISOString().slice(0, 19).replace('T', ' '),
          created_by: user?.id
        })
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
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to create alert');
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleCreateAnalyst = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to create analyst');
    } finally {
      setAddingAnalyst(false);
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
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1">Context</label>
                   <textarea 
                    value={createForm.description}
                    onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none min-h-[80px]"
                    placeholder="Brief description..."
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
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-accent text-black font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-accent/90 transition-all shadow-lg shadow-accent/10"
              >
                <UserPlus className="w-4 h-4" />
                Recruit Analyst
              </button>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/30 border-b border-border">
                      {['Personnel', 'Endpoint ID', 'Joined Date', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fetchingAnalysts ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={5} className="px-6 py-4 bg-secondary/10 border-b border-border">
                            <div className="h-4 bg-secondary rounded w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      analysts.map(analyst => (
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
                          <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border ${
                                analyst.account_status === 'Active' 
                                  ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                  : 'bg-secondary border-border text-muted-foreground'
                             }`}>
                                {analyst.account_status}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
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
              <form onSubmit={handleCreateAnalyst} className="p-6 space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Full Name</label>
                    <input value={analystForm.full_name} onChange={e => setAnalystForm(f => ({ ...f, full_name: e.target.value }))} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none" placeholder="First Last" required />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Username</label>
                      <input value={analystForm.username} onChange={e => setAnalystForm(f => ({ ...f, username: e.target.value }))} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none" placeholder="j.doe" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Temp Password</label>
                       <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={analystForm.password} onChange={e => setAnalystForm(f => ({ ...f, password: e.target.value }))} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 pr-10 text-sm text-foreground font-mono focus:ring-1 focus:ring-accent outline-none" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                       </div>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Corporate Email</label>
                    <input type="email" value={analystForm.email} onChange={e => setAnalystForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none" placeholder="name@company.com" required />
                 </div>
                 <button type="submit" disabled={addingAnalyst} className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4">
                    {addingAnalyst ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    Authorize & Create Account
                 </button>
              </form>
           </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManagerProfile;
