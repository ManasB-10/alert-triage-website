import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'new' | 'claimed' | 'investigating' | 'closed' | 'escalated';
export type AlertSource = 'Vulnerability Scanner' | 'IDS/IPS' | 'SIEM' | 'EDR' | 'Firewall' | 'Email Gateway' | 'WAF';

export interface SecurityAlert {
  id: string;
  rawId?: number; // Internal db id
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  source: AlertSource;
  sourceIp: string;
  destIp: string;
  timestamp: string;
  tags: string;
  claimedBy?: string;
  closedAt?: string;
  notes: string[];
  assetName?: string;
  assetType?: string;
  assetCriticality?: number;
  assetLocation?: string;
  resolutionNotes?: any;
}

interface AlertContextType {
  alerts: SecurityAlert[];
  addAlert: (alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'status' | 'notes'>) => void;
  updateAlert: (id: string, updates: Partial<SecurityAlert>) => void;
  deleteAlert: (id: string) => void;
  claimAlert: (id: string, userId: string) => void;
  closeAlert: (id: string) => void;
  addNote: (id: string, note: string) => void;
  saveInvestigationDetails: (id: string, notes: any, status?: string, severity?: string) => Promise<void>;
  investigateAlert: (id: string) => Promise<void>;
  setFilter: (status: AlertStatus | null) => void;
  activeFilter: AlertStatus | null;
}

const MOCK_ALERTS: SecurityAlert[] = [
  {
    id: 'ALT-001', title: 'SQL Injection Attempt Detected', description: 'Multiple SQL injection patterns detected in HTTP POST requests targeting /api/login endpoint. Payloads include UNION-based and boolean-based blind injection attempts.',
    severity: 'critical', status: 'new', source: 'WAF', sourceIp: '192.168.1.105', destIp: '10.0.0.50', timestamp: '2026-03-09T08:23:15Z', tags: 'SQLi', notes: [],
  },
  {
    id: 'ALT-002', title: 'Brute Force SSH Login', description: 'Over 500 failed SSH login attempts from single IP within 10 minutes. Target account: root.',
    severity: 'high', status: 'new', source: 'IDS/IPS', sourceIp: '203.0.113.42', destIp: '10.0.0.22', timestamp: '2026-03-09T07:45:00Z', tags: 'Brute Force', notes: [],
  },
  {
    id: 'ALT-003', title: 'Malware C2 Communication', description: 'Endpoint detected communicating with known Command & Control server. Beacon interval: 60s.',
    severity: 'critical', status: 'claimed', source: 'EDR', sourceIp: '10.0.1.15', destIp: '198.51.100.77', timestamp: '2026-03-09T06:12:30Z', tags: 'Malware, C2', claimedBy: 'Alex Chen', notes: ['Initial triage started'],
  },
  {
    id: 'ALT-004', title: 'Suspicious PowerShell Execution', description: 'Encoded PowerShell command executed with bypass execution policy. Downloaded payload from external URL.',
    severity: 'high', status: 'investigating', source: 'EDR', sourceIp: '10.0.2.88', destIp: '172.16.0.1', timestamp: '2026-03-09T05:30:00Z', tags: 'PowerShell', claimedBy: 'Alex Chen', notes: ['Encoded command decoded', 'Payload analysis in progress'],
  },
  {
    id: 'ALT-005', title: 'Phishing Email Detected', description: 'Email with malicious attachment detected. Subject: "Invoice #4521". Attachment contains macro-enabled document.',
    severity: 'medium', status: 'new', source: 'Email Gateway', sourceIp: '198.51.100.10', destIp: '10.0.0.5', timestamp: '2026-03-09T04:55:12Z', tags: 'Phishing', notes: [],
  },
  {
    id: 'ALT-006', title: 'Port Scan Detected', description: 'Sequential port scan (ports 1-1024) detected from external IP targeting DMZ servers.',
    severity: 'low', status: 'closed', source: 'Firewall', sourceIp: '203.0.113.99', destIp: '10.0.0.0/24', timestamp: '2026-03-08T22:10:00Z', tags: 'Scan', closedAt: '2026-03-09T01:00:00Z', notes: ['Blocked at firewall', 'IP added to blocklist'],
  },
  {
    id: 'ALT-007', title: 'CVE-2026-1234 Vulnerability Found', description: 'Critical RCE vulnerability detected in Apache Struts 2.5.30 on web server.',
    severity: 'critical', status: 'new', source: 'Vulnerability Scanner', sourceIp: 'N/A', destIp: '10.0.0.80', timestamp: '2026-03-09T03:00:00Z', tags: 'Vulnerability', notes: [],
  },
  {
    id: 'ALT-008', title: 'Unusual Data Exfiltration', description: 'Large outbound data transfer (2.3GB) to external IP detected outside business hours.',
    severity: 'high', status: 'new', source: 'SIEM', sourceIp: '10.0.3.44', destIp: '198.51.100.200', timestamp: '2026-03-09T02:15:00Z', tags: 'Exfiltration', notes: [],
  },
  {
    id: 'ALT-009', title: 'Failed Login Anomaly', description: '15 failed login attempts across 3 different user accounts from same workstation.',
    severity: 'medium', status: 'claimed', source: 'SIEM', sourceIp: '10.0.1.33', destIp: '10.0.0.1', timestamp: '2026-03-09T01:45:00Z', tags: 'Anomaly', claimedBy: 'Alex Chen', notes: ['Checking user activity logs'],
  },
  {
    id: 'ALT-010', title: 'SSL Certificate Expiring', description: 'SSL certificate for portal.company.com expires in 7 days.',
    severity: 'low', status: 'new', source: 'Vulnerability Scanner', sourceIp: 'N/A', destIp: '10.0.0.90', timestamp: '2026-03-09T00:00:00Z', tags: 'Maintenance', notes: [],
  },
];

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [activeFilter, setActiveFilter] = useState<AlertStatus | null>(null);

  const loadAlerts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/alerts');
      const data = await res.json();
      
      const getSource = (type: string): AlertSource => {
        const t = (type || '').toLowerCase();
        if (t.includes('sql') || t.includes('waf')) return 'WAF';
        if (t.includes('brute') || t.includes('anomaly')) return 'IDS/IPS';
        if (t.includes('malware') || t.includes('powershell')) return 'EDR';
        if (t.includes('email') || t.includes('phishing')) return 'Email Gateway';
        if (t.includes('port') || t.includes('firewall')) return 'Firewall';
        if (t.includes('vulnerabil') || t.includes('ssl')) return 'Vulnerability Scanner';
        return 'SIEM';
      };

      const mapped = data.map((d: any) => {
        let parsedNotes = null;
        if (d.resolution_notes) {
          if (typeof d.resolution_notes === 'string') {
            try {
              parsedNotes = JSON.parse(d.resolution_notes);
            } catch (e) {
              console.error("Failed to parse resolution notes string", e);
            }
          } else {
            parsedNotes = d.resolution_notes; // Already an object
          }
        }
        
        return {
        id: `ALT-${String(d.id).padStart(3, '0')}`,
        rawId: d.id,
        title: d.event_type,
        description: d.description || 'Auto-generated alert via Sentinel Hub.',
        severity: d.severity,
        status: d.status,
        source: getSource(d.event_type),
        sourceIp: d.source_ip,
        destIp: d.dest_ip,
        timestamp: d.trigger_time || d.created_at,
        tags: d.tags || '',
        claimedBy: d.assigned_analyst_name || d.claimed_by, // handle different join scenarios
        notes: d.notes ? d.notes.split('|') : [],
        resolutionNotes: parsedNotes,
        assetName: d.asset_name,
        assetType: d.asset_type,
        assetCriticality: d.criticality_score,
        assetLocation: d.asset_location,
        detection_source: d.detection_source
      };
      });
      setAlerts(mapped);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  };

  React.useEffect(() => {
    loadAlerts();
  }, [activeFilter]); // Refresh if activeFilter changes, or could be polled

  const addAlert = (alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'status' | 'notes'>) => {
    // Implement POST if required, fallback for now
    loadAlerts();
  };

  const updateAlert = (id: string, updates: Partial<SecurityAlert>) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const claimAlert = async (id: string, userId: string) => {
    const rawId = parseInt(id.replace('ALT-', ''), 10);
    try {
      await fetch('http://localhost:5000/api/claim-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: rawId, user_id: parseInt(userId, 10) })
      });
      await loadAlerts();
    } catch (err) {
      console.error("Error claiming alert:", err);
    }
  };

  const investigateAlert = async (id: string) => {
    const rawId = parseInt(id.replace('ALT-', ''), 10);
    try {
      await fetch(`http://localhost:5000/api/alerts/${rawId}/resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'investigating' })
      });
      await loadAlerts();
    } catch (err) {
      console.error("Error updating status to investigating:", err);
    }
  };

  const closeAlert = (id: string) => {
    updateAlert(id, { status: 'closed', closedAt: new Date().toISOString() });
  };

  const addNote = (id: string, note: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, notes: [...a.notes, note] } : a));
  };

  const setFilter = (status: AlertStatus | null) => {
    setActiveFilter(status);
  };

  const saveInvestigationDetails = async (id: string, notes: any, status?: string, severity?: string) => {
    const rawId = parseInt(id.replace('ALT-', ''), 10);
    try {
      await fetch(`http://localhost:5000/api/alerts/${rawId}/resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, status, severity })
      });
      await loadAlerts();
    } catch (err) {
      console.error("Error saving resolution:", err);
    }
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, updateAlert, deleteAlert, claimAlert, investigateAlert, closeAlert, addNote, saveInvestigationDetails, setFilter, activeFilter }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts must be used within AlertProvider');
  return ctx;
}
