import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SecurityAlert } from '@/context/AlertContext';
import { useAlerts } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { X, Hand, ShieldCheck, Save, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  alert: SecurityAlert;
  onClose: () => void;
}

const AlertDetailModal = ({ alert, onClose }: Props) => {
  const { claimAlert, investigateAlert, closeAlert, saveInvestigationDetails, setFilter, setSelectedAlertId } = useAlerts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = user?.role === 'soc_manager';

  const [showDetails, setShowDetails] = useState(alert.status === 'new' || alert.status === 'closed');

  const [invData, setInvData] = useState({
    who: '',
    what: '',
    when: '',
    where: '',
    why: '',
    additionalNotes: '',
    l2Escalation: '',
    l2Reason: '',
    resolution: '',
    severity: alert.severity || '',
  });

  useEffect(() => {
    if (alert.resolutionNotes && Object.keys(alert.resolutionNotes).length > 0) {
      setInvData({
        who: alert.resolutionNotes.who || '',
        what: alert.resolutionNotes.what || '',
        when: alert.resolutionNotes.when || '',
        where: alert.resolutionNotes.where || '',
        why: alert.resolutionNotes.why || '',
        additionalNotes: alert.resolutionNotes.additionalNotes || '',
        l2Escalation: alert.resolutionNotes.l2Escalation || '',
        l2Reason: alert.resolutionNotes.l2Reason || '',
        resolution: alert.resolutionNotes.resolution || '',
        severity: alert.resolutionNotes.severity || alert.severity || '',
      });
    }
  }, [alert.resolutionNotes, alert.id, alert.severity]); // Tie to ID as well to ensure it resets when switching alerts

  const handleChange = (field: string, value: string) => {
    if (alert.status === 'closed') return;
    setInvData(prev => ({ ...prev, [field]: value }));
  };

  const isEditable = !isManager && alert.status === 'investigating';

  const mustEscalate = ['critical', 'high'].includes(invData.severity) || invData.resolution === 'True Positive';

  // Automatically sync l2Escalation state with mustEscalate requirement
  useEffect(() => {
    if (mustEscalate && invData.l2Escalation !== 'Yes') {
      setInvData(prev => ({ ...prev, l2Escalation: 'Yes' }));
    }
  }, [mustEscalate, invData.l2Escalation]);

  const MIN_LEN = 8;

  const isFormComplete = Boolean(
    invData.severity &&
    invData.who.trim().length >= MIN_LEN &&
    invData.what.trim().length >= MIN_LEN &&
    invData.when.trim().length >= MIN_LEN &&
    invData.where.trim().length >= MIN_LEN &&
    invData.why.trim().length >= MIN_LEN &&
    (invData.l2Escalation || mustEscalate) &&
    invData.l2Reason.trim().length >= MIN_LEN &&
    invData.resolution
  );

  const handleInvestigate = async () => {
    await investigateAlert(alert.id);
    setFilter('investigating');
    setSelectedAlertId(alert.id);
    toast.success("Investigation phase started.");
    navigate('/alerts');
  };

  const handleReopen = async () => {
    await investigateAlert(alert.id);
    setFilter('investigating');
    toast.success("Alert successfully reopened.");
    onClose();
  };

  const handleSaveInvestigation = async () => {
    await saveInvestigationDetails(alert.id, invData, undefined, invData.severity);
    toast.success("Progress saved successfully.", {
      description: "You can continue this investigation later."
    });
  };

  const handleCloseAlert = async () => {
    if (mustEscalate) {
      toast.error("This alert must be escalated due to its severity or resolution status.");
      return;
    }
    if (isFormComplete) {
      await saveInvestigationDetails(alert.id, invData, 'closed', invData.severity);
      closeAlert(alert.id);
      toast.success("Investigation finalized and saved.");
      toast.success("Alert status set to Closed.");
      onClose(); // Automatically close the modal after verification
    } else {
      toast.error("Please complete all required fields (*) in the investigation form.");
    }
  };

  const handleEscalate = async () => {
    if (isFormComplete) {
      toast('Confirm Escalation', {
        description: 'Are you sure you want to escalate this alert to the L2 team?',
        action: {
          label: 'Yes, Escalate',
          onClick: async () => {
            await saveInvestigationDetails(alert.id, invData, 'escalated', invData.severity);
            toast.success("Alert successfully escalated to L2 team.");
            onClose();
          }
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {}
        }
      });
    } else {
      toast.error("Please complete all required fields (*) before escalating.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-up flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border bg-card sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-xs text-muted-foreground">{alert.id}</span>
              <SeverityBadge severity={alert.severity} />
              <StatusBadge status={alert.status} />
            </div>
            <h2 className="text-lg font-bold text-foreground">{alert.title}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-2 bg-secondary rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">

          {/* Details Toggle */}
          {alert.status !== 'new' && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg text-sm font-medium text-foreground hover:bg-secondary transition-colors border border-border"
            >
              <span>{showDetails ? 'Hide Alert Details' : 'View Alert Details'}</span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}

          {/* Original Details (Collapsible when claimed) */}
          {showDetails && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-sm text-secondary-foreground leading-relaxed">{alert.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  ['Source', alert.source],
                  ['Source IP', alert.sourceIp],
                  ['Dest IP', alert.destIp],
                  ['Timestamp', new Date(alert.timestamp).toLocaleString()],
                  ['Tags', alert.tags || '—'],
                  ['Claimed By', alert.claimedBy || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="bg-secondary/50 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-mono text-foreground mt-1 truncate" title={value as string}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Affected Asset Info */}
              {alert.assetName && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Affected Asset Details
                    </h3>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${(alert.assetCriticality || 0) >= 8
                      ? 'bg-destructive/20 text-destructive border border-destructive/30'
                      : 'bg-primary/20 text-primary border border-primary/30'
                      }`}>
                      Criticality: {alert.assetCriticality}/10
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-4">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Asset Name</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{alert.assetName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Type</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{alert.assetType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Location</p>
                      <p className="text-sm text-foreground mt-0.5">{alert.assetLocation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Ownership</p>
                      <p className="text-sm text-foreground mt-0.5">Corporate</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions for Junior Analyst */}
          {!isManager && alert.status === 'new' && (
            <div className="pt-4 border-t border-border mt-6">
              <button 
                onClick={async () => {
                  await claimAlert(alert.id, user!.id);
                  onClose();
                  navigate('/dashboard'); // Redirect to dashboard to see the 'Claimed' view
                }} 
                className="w-full justify-center inline-flex items-center gap-2 bg-[#00e57f] text-black px-6 py-4 rounded-xl text-md font-bold hover:bg-[#00db79] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                <Hand className="w-5 h-5" /> Claim Alert & Begin Investigation
              </button>
            </div>
          )}

          {/* Investigation Form (Visible only after claiming) */}
          {alert.status !== 'new' && (
            <div key={alert.status} className="mt-2 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

              {alert.status === 'closed' && (
                <div className="bg-muted border border-border rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                    <ShieldCheck className="w-4 h-4" />
                    This alert is closed. Investigation data is read-only.
                  </div>
                  <button onClick={handleReopen} className="text-xs font-bold text-warning hover:underline uppercase tracking-widest">
                    Re-open to edit
                  </button>
                </div>
              )}

              <div className="bg-secondary/30 p-5 rounded-xl border border-secondary">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  1. Criticality Assessment
                </h3>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Evaluate Final Severity</label>
                  <select
                    value={invData.severity}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    disabled={!isEditable}
                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="critical">🚨 Critical</option>
                    <option value="high">🔴 High</option>
                    <option value="medium">🟠 Medium</option>
                    <option value="low">🟡 Low</option>
                  </select>
                </div>
              </div>

              <div className="bg-secondary/30 p-5 rounded-xl border border-secondary">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  2. Resolution Status
                </h3>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Select Final Resolution</label>
                  <select
                    value={invData.resolution}
                    onChange={(e) => handleChange('resolution', e.target.value)}
                    disabled={!isEditable}
                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>Select a resolution...</option>
                    <option value="True Positive">🔥 True Positive (Malicious Activity Verified)</option>
                    <option value="False Negative">✅ False Positive (Benign/Authorized Activity)</option>
                  </select>
                </div>
              </div>

              <div className="bg-secondary/30 p-5 rounded-xl border border-secondary space-y-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  3. The 5 W's Investigation Log
                </h3>

                <div className="space-y-4">
                  {/* WHO */}
                  <div>
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">Who <span className="text-muted-foreground font-normal">(User/IP that triggered the alert)</span> <span className="text-destructive">*</span></label>
                    <input
                      value={invData.who} onChange={(e) => handleChange('who', e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g. Unauthenticated user from 192.168.1.100"
                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary disabled:opacity-75 ${
                        invData.who.trim().length > 0 && invData.who.trim().length < 8 ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {invData.who.trim().length > 0 && invData.who.trim().length < 8 && (
                      <p className="text-[11px] text-destructive mt-1 font-mono">Minimum 8 characters required ({invData.who.trim().length}/8)</p>
                    )}
                  </div>
                  {/* WHAT */}
                  <div>
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">What <span className="text-muted-foreground font-normal">(Action or consequence)</span> <span className="text-destructive">*</span></label>
                    <input
                      value={invData.what} onChange={(e) => handleChange('what', e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g. Attempted multiple SQL injections on login form"
                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary disabled:opacity-75 ${
                        invData.what.trim().length > 0 && invData.what.trim().length < 8 ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {invData.what.trim().length > 0 && invData.what.trim().length < 8 && (
                      <p className="text-[11px] text-destructive mt-1 font-mono">Minimum 8 characters required ({invData.what.trim().length}/8)</p>
                    )}
                  </div>
                  {/* WHEN */}
                  <div>
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">When <span className="text-muted-foreground font-normal">(Timeline of activity)</span> <span className="text-destructive">*</span></label>
                    <input
                      value={invData.when} onChange={(e) => handleChange('when', e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g. Between 08:23 UTC and 08:35 UTC"
                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary disabled:opacity-75 ${
                        invData.when.trim().length > 0 && invData.when.trim().length < 8 ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {invData.when.trim().length > 0 && invData.when.trim().length < 8 && (
                      <p className="text-[11px] text-destructive mt-1 font-mono">Minimum 8 characters required ({invData.when.trim().length}/8)</p>
                    )}
                  </div>
                  {/* WHERE */}
                  <div>
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">Where <span className="text-muted-foreground font-normal">(Target Asset/Network area)</span> <span className="text-destructive">*</span></label>
                    <input
                      value={invData.where} onChange={(e) => handleChange('where', e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g. Web-Server-01 in the DMZ"
                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary disabled:opacity-75 ${
                        invData.where.trim().length > 0 && invData.where.trim().length < 8 ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {invData.where.trim().length > 0 && invData.where.trim().length < 8 && (
                      <p className="text-[11px] text-destructive mt-1 font-mono">Minimum 8 characters required ({invData.where.trim().length}/8)</p>
                    )}
                  </div>
                  {/* WHY */}
                  <div>
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">Why <span className="text-muted-foreground font-normal">(Root Cause)</span> <span className="text-destructive">*</span></label>
                    <textarea
                      value={invData.why} onChange={(e) => handleChange('why', e.target.value)}
                      disabled={!isEditable}
                      placeholder="e.g. Automated scanning script targeting exposed login endpoints."
                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary min-h-[60px] disabled:opacity-75 ${
                        invData.why.trim().length > 0 && invData.why.trim().length < 8 ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {invData.why.trim().length > 0 && invData.why.trim().length < 8 && (
                      <p className="text-[11px] text-destructive mt-1 font-mono">Minimum 8 characters required ({invData.why.trim().length}/8)</p>
                    )}
                  </div>
                  {/* ADDITIONAL NOTES */}
                  <div>
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span></label>
                    <textarea
                      value={invData.additionalNotes} onChange={(e) => handleChange('additionalNotes', e.target.value)}
                      disabled={!isEditable}
                      placeholder="Any other observations, IOCs, context, or notes..."
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary min-h-[60px] disabled:opacity-75"
                    />
                  </div>
                </div>
              </div>

              {/* L2 Escalation */}
              <div className="bg-secondary/30 p-5 rounded-xl border border-secondary space-y-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  4. Escalation Protocol
                </h3>

                {mustEscalate && (
                  <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex items-start gap-3 mb-2 animate-in fade-in slide-in-from-left-2">
                    <ShieldCheck className="w-4 h-4 text-warning mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-warning">Mandatory L2 Escalation</p>
                      <p className="text-[11px] text-warning/80 leading-relaxed mt-0.5">
                        Alerts with Critical/High severity or True Positive resolution require immediate escalation to L2 experts.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-foreground flex gap-1 mb-3">Escalate to L2? <span className="text-destructive">*</span></label>
                  <div className="flex gap-4">
                    <label className={`flex items-center gap-2 text-sm cursor-pointer hover:bg-background px-3 py-2 border border-input rounded-lg flex-1 ${!isEditable ? 'opacity-75 cursor-not-allowed' : ''}`}>
                      <input type="radio" name="l2" value="Yes" checked={invData.l2Escalation === 'Yes' || mustEscalate} onChange={(e) => handleChange('l2Escalation', e.target.value)} disabled={!isEditable} className="text-primary focus:ring-primary" />
                      Yes, escalate it
                    </label>
                    {!mustEscalate && (
                      <label className={`flex items-center gap-2 text-sm cursor-pointer hover:bg-background px-3 py-2 border border-input rounded-lg flex-1 ${!isEditable ? 'opacity-75 cursor-not-allowed' : ''}`}>
                        <input type="radio" name="l2" value="No" checked={invData.l2Escalation === 'No' && !mustEscalate} onChange={(e) => handleChange('l2Escalation', e.target.value)} disabled={!isEditable} className="text-primary focus:ring-primary" />
                        No
                      </label>
                    )}
                  </div>
                </div>

                {(invData.l2Escalation || mustEscalate) && (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <label className="text-xs font-bold text-foreground flex gap-1 mb-1">
                      {(invData.l2Escalation === 'Yes' || mustEscalate) ? 'Reason for Escalation' : 'Reason for resolving locally'}
                      <span className="text-destructive"> *</span>
                    </label>
                    <textarea
                      value={invData.l2Reason} onChange={(e) => handleChange('l2Reason', e.target.value)}
                      disabled={!isEditable}
                      placeholder={(invData.l2Escalation === 'Yes' || mustEscalate) ? "Provide detailed reasoning for L2 intervention..." : "Why does this not require L2 execution? Explain..."}
                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary min-h-[80px] disabled:opacity-75 ${
                        invData.l2Reason.trim().length > 0 && invData.l2Reason.trim().length < 8 ? 'border-destructive' : 'border-input'
                      }`}
                    />
                    {invData.l2Reason.trim().length > 0 && invData.l2Reason.trim().length < 8 && (
                      <p className="text-[11px] text-destructive mt-1 font-mono">Minimum 8 characters required ({invData.l2Reason.trim().length}/8)</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Floating Action Bar for Investigating Analysts */}
        {!isManager && alert.status !== 'new' && (
          <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border p-4 px-6 flex justify-between items-center z-20 rounded-b-xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <div className="text-xs text-muted-foreground">
              {isFormComplete ? (
                <span className="flex items-center text-success font-medium gap-1"><CheckCircle className="w-4 h-4" /> Ready to submit</span>
              ) : (
                <span className="text-destructive">Please fill all required fields (*)</span>
              )}
            </div>

            <div className="flex gap-3">
              {alert.status === 'claimed' && (
                <button onClick={handleInvestigate} className="px-4 py-2 bg-info/10 text-info border border-info/20 rounded-lg text-sm font-medium hover:bg-info/20 transition-colors flex items-center gap-2">
                  <Hand className="w-4 h-4" /> Start Investigation
                </button>
              )}
              {alert.status === 'closed' && (
                <button onClick={handleReopen} className="px-4 py-2 bg-warning/10 text-warning border border-warning/20 rounded-lg text-sm font-medium hover:bg-warning/20 transition-colors flex items-center gap-2">
                  <Hand className="w-4 h-4" /> Re-open Alert
                </button>
              )}
              {alert.status === 'investigating' && (
                <>
                  <button onClick={handleSaveInvestigation} className="px-4 py-2 bg-info/10 text-info border border-info/20 rounded-lg text-sm font-medium hover:bg-info/20 transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Draft
                  </button>

                  {(mustEscalate || invData.l2Escalation === 'Yes') ? (
                    <button
                      onClick={handleEscalate}
                      disabled={!isFormComplete}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${isFormComplete
                        ? 'bg-purple-600 text-white hover:bg-purple-700 glow-purple'
                        : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-70'
                        }`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Escalate to L2
                    </button>
                  ) : (
                    <button
                      onClick={handleCloseAlert}
                      disabled={!isFormComplete}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${isFormComplete
                        ? 'bg-success text-success-foreground hover:bg-success/90'
                        : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-70'
                        }`}
                    >
                      Verify & Close Alert
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AlertDetailModal;

