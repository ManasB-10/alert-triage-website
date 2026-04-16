-- Populate Assets
INSERT INTO assets (asset_name, ip_address, asset_type, criticality_score, location) VALUES
('Primary Domain Controller', '10.0.0.1', 'Server', 10, 'On-Premise DC'),
('Production SQL Database', '10.0.0.5', 'Database', 9, 'Azure East US'),
('Corporate Web Server', '10.0.0.80', 'Server', 8, 'DMZ Zone'),
('Billing System Host', '10.0.0.90', 'Server', 7, 'Internal Network'),
('Executive Workstation (CEO)', '10.0.5.10', 'Workstation', 8, 'Headquarters'),
('HR Portal Server', '10.0.0.12', 'Server', 6, 'Internal Network'),
('Core VPN Gateway', '172.16.0.1', 'Network_Device', 9, 'Edge Perimeter'),
('Backup Storage Array', '10.0.1.55', 'Server', 7, 'Secure Vault'),
('Developer Sandbox', '10.0.2.88', 'Workstation', 3, 'Lab Network'),
('Guest WiFi Controller', '192.168.10.1', 'Network_Device', 4, 'Headquarters');

-- Link existing alerts to assets based on Destination IP matching
UPDATE alerts SET asset_id = 1 WHERE dest_ip = '10.0.0.1';
UPDATE alerts SET asset_id = 2 WHERE dest_ip = '10.0.0.5';
UPDATE alerts SET asset_id = 3 WHERE dest_ip = '10.0.0.80';
UPDATE alerts SET asset_id = 4 WHERE dest_ip = '10.0.0.90';
UPDATE alerts SET asset_id = 7 WHERE dest_ip = '172.16.0.1';
UPDATE alerts SET asset_id = 9 WHERE dest_ip = '10.0.2.88';

-- Randomly distribute remaining alerts if they don't have a direct IP match
UPDATE alerts SET asset_id = (SELECT asset_id FROM assets ORDER BY RAND() LIMIT 1) WHERE asset_id IS NULL;
