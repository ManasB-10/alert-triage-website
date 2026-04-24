import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { User, Mail, Shield, Save, Loader2, Award, CheckCircle, AlertTriangle, Activity, Target, BrainCircuit, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:5000';

const AnalystProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
      });
      fetchAnalystData();
    }
  }, [user]);

  const fetchAnalystData = async () => {
    setFetchingData(true);
    try {
      // 1. Fetch overall performance stats
      const perfRes = await fetch(`${API}/api/manager/analyst-performance`);
      const perfData = await perfRes.json();
      console.log("Full Performance Data from Server:", perfData);

      const myPerf = Array.isArray(perfData) ? perfData.find((a: any) => String(a.user_id) === String(user?.id)) : null;
      console.log("My Statistics Found for User ID", user?.id, ":", myPerf);

      setStats(myPerf || { total_handled: 0, in_progress: 0, completed: 0, avg_ai_score: 0, avg_time: 0 });

      // 2. Fetch recent alerts handled by this analyst (Limited to 10 most recent)
      // Including both closed and escalated alerts for the performance feed
      const alertsRes = await fetch(`${API}/api/alerts?assigned_to_user_id=${user?.id}&status_in=closed,escalated&limit=10`);
      const myAlerts = await alertsRes.json();
      setRecentAlerts(Array.isArray(myAlerts) ? myAlerts : []);
    } catch (e) {
      console.error('Failed to fetch analyst data:', e);
    } finally {
      setFetchingData(false);
    }
  };

  const handleSave = async () => {
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

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(0,229,127,0.1)]">
              <User className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{user?.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/30 text-[10px] font-mono text-primary uppercase tracking-widest font-bold">
                  Junior Analyst
                </span>
                <span className="text-sm text-muted-foreground font-mono">ID: #{user?.id}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-secondary/30 px-6 py-3 rounded-xl border border-border flex flex-col items-center">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Average Score</p>
              <div className="flex items-center gap-2">
                <Award className={`w-5 h-5 ${stats?.avg_ai_score >= 80 ? 'text-yellow-400' : 'text-primary'}`} />
                <span className="text-2xl font-bold font-mono text-foreground">
                  {stats ? Math.round(stats.avg_ai_score) : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Profile Settings & Quick Stats */}
          <div className="lg:col-span-1 space-y-8">

            {/* Performance Widgets */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4 rounded-xl space-y-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Total Triage</p>
                <p className="text-2xl font-bold text-foreground">{stats?.total_handled || 0}</p>
              </div>
              <div className="bg-card border border-border p-4 rounded-xl space-y-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Completed</p>
                <p className="text-2xl font-bold text-foreground">{stats?.completed || 0}</p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border bg-secondary/20">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Profile Configuration
                </h3>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: AI Triage Performance Feed */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">AI Triage Performance Feed</h3>
                  <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Quality score per investigation</p>
                </div>
              </div>
              <button
                onClick={fetchAnalystData}
                disabled={fetchingData}
                className="flex items-center gap-2 px-4 py-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg text-sm font-mono text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingData ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by alert name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all font-mono"
              />
            </div>

            <div className="space-y-4">
              {fetchingData ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 bg-card/40 border border-border rounded-2xl animate-pulse" />
                ))
              ) : (() => {
                const filtered = recentAlerts.filter(alert =>
                  alert.event_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  String(alert.id).includes(searchQuery)
                );
                return filtered.length > 0 ? (
                  filtered.map((alert) => (
                    <div key={alert.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-primary/30 transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground uppercase tracking-tighter">#{alert.id}</span>
                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{alert.event_type}</h4>
                            {/* Status label to differentiate closed vs escalated score */}
                            {alert.status === 'closed' ? (
                              <span className="px-2 py-0.5 rounded-md bg-green-500/10 border border-green-500/30 text-[10px] font-mono text-green-400 uppercase tracking-widest font-bold">
                                Closed Alert Score
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold">
                                Escalated Alert Score
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {alert.status === 'closed' ? 'Resolved' : 'Escalated'}: {alert.closed_at ? new Date(alert.closed_at).toLocaleString() : 'Recently'}
                          </p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-center border shrink-0 ml-4 ${
                          (alert.ai_score ?? 0) >= 80 ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                          (alert.ai_score ?? 0) >= 50 ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                          'bg-destructive/10 border-destructive/30 text-destructive'
                        }`}>
                          <p className="text-[10px] font-mono uppercase tracking-widest font-bold mb-0.5">Rating</p>
                          <p className="text-xl font-bold font-mono leading-none">{alert.ai_score ?? '--'}%</p>
                        </div>
                      </div>

                      <div className="bg-secondary/20 rounded-xl p-4 border border-border/50">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <BrainCircuit className="w-3 h-3 text-primary" />
                          AI Feedback Reasoning
                        </p>
                        <div className="space-y-2">
                          {alert.ai_reasoning && typeof alert.ai_reasoning === 'string' ? (
                            alert.ai_reasoning.split(' | ').filter(line => line.trim()).map((line: string, i: number) => (
                              <div key={i} className="flex gap-2 text-xs text-foreground/90 leading-relaxed font-mono">
                                <span className="shrink-0">•</span>
                                <span>{line}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic font-mono">No AI feedback available for this session.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 bg-secondary/10 border border-dashed border-border rounded-2xl">
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm font-mono">
                      {searchQuery ? `No results found for "${searchQuery}"` : 'No triaged alerts yet. Start your investigation to earn AI ratings.'}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalystProfile;
