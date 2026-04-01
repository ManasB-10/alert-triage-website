USE sentinel_hub;

INSERT INTO alerts (source_ip, event_type, severity, status) VALUES 
('192.168.1.105', 'SQL Injection Attempt', 'critical', 'new'),
('203.0.113.42', 'Brute Force SSH Login', 'high', 'new'),
('10.0.1.15', 'Malware C2 Communication', 'critical', 'claimed'),
('10.0.2.88', 'Suspicious PowerShell Execution', 'high', 'investigating'),
('198.51.100.10', 'Phishing Email Detected', 'medium', 'new'),
('203.0.113.99', 'Port Scan Detected', 'low', 'closed'),
('10.0.0.80', 'CVE-2026-1234 Vulnerability Found', 'critical', 'new'),
('10.0.3.44', 'Unusual Data Exfiltration', 'high', 'new'),
('10.0.1.33', 'Failed Login Anomaly', 'medium', 'claimed'),
('10.0.0.90', 'SSL Certificate Expiring', 'info', 'new');
