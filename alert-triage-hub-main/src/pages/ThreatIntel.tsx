import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { ShieldAlert, Plus, Trash2, Activity, Search, Loader2, RefreshCw, X, CheckCircle2, AlertTriangle, Globe } from 'lucide-react';
import { toast } from 'sonner';

const API = 'http://localhost:5000';

interface ThreatIndicator {
  intel_id: number;
  indicator_value: string;
  threat_type: string;
  confidence_score: number;
  source_provider: string;
  last_seen: string;
  is_active: boolean;
}

const ThreatIntel = () => {
  const { user } = useAuth();
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    indicator_value: '',
    threat_type: '',
    other_threat_type: '',
    confidence_score: '',
    source_provider: ''
  });

  const fetchThreatIntel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/manager/threat-intel`);
      const data = await res.json();
      setIndicators(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load threat intelligence feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatIntel();
  }, []);

  const handleAddIndicator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.indicator_value.trim()) return;

    if (!formData.indicator_value.trim() || !formData.threat_type || !formData.source_provider) {
      toast.error('Please fill in all mandatory fields');
      return;
    }
    if (formData.threat_type === 'Other' && !formData.other_threat_type.trim()) {
      toast.error('Please specify the custom threat type');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalPayload = {
        indicator_value: formData.indicator_value,
        threat_type: formData.threat_type === 'Other' ? formData.other_threat_type : formData.threat_type,
        confidence_score: parseInt(String(formData.confidence_score || 0)),
        source_provider: formData.source_provider
      };

      const res = await fetch(`${API}/api/manager/threat-intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      toast.success('Threat indicator added successfully');
      setShowAddModal(false);
      setFormData({
        indicator_value: '',
        threat_type: '',
        other_threat_type: '',
        confidence_score: '',
        source_provider: ''
      });
      fetchThreatIntel();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add indicator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: number) => {
    try {
      const res = await fetch(`${API}/api/manager/threat-intel/${id}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setIndicators(prev => prev.map(ind =>
        ind.intel_id === id ? { ...ind, is_active: data.is_active } : ind
      ));
      toast.success('Indicator status updated');
    } catch (e) {
      toast.error('Failed to update indicator status');
    }
  };

  const deleteIndicator = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this threat indicator?')) return;

    try {
      const res = await fetch(`${API}/api/manager/threat-intel/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setIndicators(prev => prev.filter(ind => ind.intel_id !== id));
      toast.success('Threat indicator removed');
    } catch (e) {
      toast.error('Failed to delete indicator');
    }
  };

  const filteredIndicators = indicators.filter(ind =>
    (ind.indicator_value || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ind.threat_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (ind.source_provider || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-accent/10 border-2 border-accent/20 flex items-center justify-center text-accent shadow-[0_0_30px_rgba(232,127,53,0.1)]">
              <Globe className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Global Threat Intelligence</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                  Indicator Feed
                </span>
                <span className="text-sm text-muted-foreground font-mono">Real-time enrichment active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-accent text-black font-bold text-sm px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-accent/90 transition-all shadow-lg shadow-accent/10"
            >
              <Plus className="w-4 h-4" />
              Add Indicator
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-6 rounded-2xl space-y-2">
            <Activity className="w-5 h-5 text-accent" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Active Indicators</p>
            <p className="text-3xl font-bold text-foreground">{indicators.filter(i => i.is_active).length}</p>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl space-y-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">High Confidence</p>
            <p className="text-3xl font-bold text-foreground">{indicators.filter(i => i.confidence_score >= 90).length}</p>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl space-y-2">
            <Globe className="w-5 h-5 text-blue-400" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Total Sources</p>
            <p className="text-3xl font-bold text-foreground">{new Set(indicators.map(i => i.source_provider)).size}</p>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl space-y-2">
            <RefreshCw className="w-5 h-5 text-green-400" />
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Last Sync</p>
            <p className="text-xl font-bold text-foreground truncate">Recently</p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search indicators, types or providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent transition-all font-mono"
            />
          </div>
          <button
            onClick={fetchThreatIntel}
            className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-muted-foreground hover:text-accent transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Feed
          </button>
        </div>

        {/* Indicators Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-secondary/30 border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Indicator (IP/Domain)</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Threat Type</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Confidence</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Provider</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Last Seen</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50 animate-pulse">
                      <td colSpan={7} className="px-6 py-8"><div className="h-4 bg-secondary rounded w-full"></div></td>
                    </tr>
                  ))
                ) : filteredIndicators.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground italic font-mono">
                      No indicators found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredIndicators.map(ind => (
                    <tr key={ind.intel_id} className="border-b border-border/50 hover:bg-secondary/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="bg-secondary/50 px-2 py-1 rounded text-xs text-foreground font-mono font-bold border border-border">
                            {ind.indicator_value}
                          </code>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-tighter ${ind.threat_type === 'Malware' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            ind.threat_type === 'C2 Server' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              'bg-accent/10 text-accent border border-accent/20'
                          }`}>
                          {ind.threat_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${ind.confidence_score >= 90 ? 'bg-red-400' :
                                  ind.confidence_score >= 70 ? 'bg-accent' :
                                    'bg-blue-400'
                                }`}
                              style={{ width: `${ind.confidence_score}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold">{ind.confidence_score}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{ind.source_provider}</td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        {new Date(ind.last_seen).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(ind.intel_id)}
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight border transition-all ${ind.is_active
                              ? 'bg-green-500/10 border-green-500/20 text-green-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}
                        >
                          {ind.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteIndicator(ind.intel_id)}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card border border-accent/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg text-accent">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">Add New Intelligence</h2>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <form onSubmit={handleAddIndicator} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1 text-accent font-bold">Indicator Value (IP / Domain)*</label>
                  <input
                    required
                    placeholder="e.g. 192.168.1.100"
                    value={formData.indicator_value}
                    onChange={e => setFormData(f => ({ ...f, indicator_value: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1 text-accent font-bold">Threat Type*</label>
                    <select
                      required
                      value={formData.threat_type}
                      onChange={e => setFormData(f => ({ ...f, threat_type: e.target.value as any }))}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none"
                    >
                      <option value="" disabled>Select Threat Type</option>
                      <option value="Malware">Malware</option>
                      <option value="Phishing">Phishing</option>
                      <option value="Botnet">Botnet</option>
                      <option value="Brute Force">Brute Force</option>
                      <option value="C2 Server">C2 Server</option>
                      <option value="Other">Other (Specify)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1 text-accent font-bold">Confidence ({formData.confidence_score || 0}%)*</label>
                    <input
                      required
                      type="range"
                      min="0"
                      max="100"
                      value={formData.confidence_score || 0}
                      onChange={e => setFormData(f => ({ ...f, confidence_score: e.target.value }))}
                      className="w-full h-10 accent-accent cursor-pointer"
                    />
                  </div>
                </div>

                {formData.threat_type === 'Other' && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1 text-accent font-bold">Specify Threat Type*</label>
                    <input
                      required
                      placeholder="e.g. Zero-Day Exploit"
                      value={formData.other_threat_type}
                      onChange={e => setFormData(f => ({ ...f, other_threat_type: e.target.value }))}
                      className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none font-mono"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest ml-1 text-accent font-bold">Source Provider*</label>
                  <input
                    required
                    placeholder="e.g. VirusTotal, AbuseIPDB"
                    value={formData.source_provider}
                    onChange={e => setFormData(f => ({ ...f, source_provider: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:ring-1 focus:ring-accent outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldAlert className="w-5 h-5" />}
                  Register Threat Indicator
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ThreatIntel;
