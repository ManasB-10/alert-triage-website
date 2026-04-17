-- 1. Setup Database
CREATE DATABASE IF NOT EXISTS sentinel_hub;
USE sentinel_hub;

-- 2. Table: Users (Analyst & Manager Accounts)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    role ENUM('Manager', 'Junior_Analyst') DEFAULT 'Junior_Analyst',
    account_status ENUM('Active', 'Suspended', 'Inactive') DEFAULT 'Active',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: Assets (Company Infrastructure)
CREATE TABLE assets (
    asset_id INT AUTO_INCREMENT PRIMARY KEY,
    asset_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    asset_type ENUM('Server', 'Workstation', 'Database', 'Network_Device'),
    criticality_score INT DEFAULT 5, -- Scale of 1-10
    location VARCHAR(100)
);

-- 4. Table: Alerts (Raw Security Events)
CREATE TABLE alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_ip VARCHAR(45) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    severity ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
    asset_id INT, -- Linked to assets table
    status ENUM('new', 'claimed', 'investigating', 'closed') DEFAULT 'new',
    assigned_analyst_id INT DEFAULT NULL, -- Linked to users table
    created_by INT DEFAULT NULL, -- For manual entries
    entry_method ENUM('Automatic', 'Manual') DEFAULT 'Automatic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_analyst_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 5. Table: Tickets (Incident Investigation Workflow)
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_id INT,
    assigned_to_user_id INT, -- Better to link to User ID than just a name string
    resolution_notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(user_id)
);

-- 6. Table: Threat Intelligence (External Feed Data)
CREATE TABLE threat_intel (
    intel_id INT PRIMARY KEY AUTO_INCREMENT,
    indicator_value VARCHAR(255) NOT NULL UNIQUE, 
    threat_type ENUM('Malware', 'Phishing', 'Botnet', 'Brute Force', 'C2 Server') NOT NULL,
    confidence_score INT DEFAULT 0,
    source_provider VARCHAR(100),
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 7. Table: Analyst Performance (Analytics for Manager)
CREATE TABLE analyst_performance (
    performance_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_alerts_handled INT DEFAULT 0,
    in_progress_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    average_resolution_time_minutes INT DEFAULT 0,
    last_action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 8. Table: System Configuration (Backend Settings)
CREATE TABLE system_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value VARCHAR(100),
    description TEXT
);

-- ---------------------------------------------------------
-- 9. Sample Data Insertion
-- ---------------------------------------------------------

INSERT INTO threat_intel (indicator_value, threat_type, confidence_score, source_provider)
VALUES 
('192.168.1.50', 'Brute Force', 85, 'Internal Monitor'),
('45.33.22.11', 'C2 Server', 98, 'AbuseIPDB'),
('103.24.11.5', 'Phishing', 60, 'VirusTotal');

-- ---------------------------------------------------------
-- 10. Manager Analytics Queries (Run these for your Dashboard)
-- ---------------------------------------------------------

-- View 1: Alert Distribution by Status
SELECT status, COUNT(*) as count 
FROM alerts 
GROUP BY status;

-- View 2: Workload Leaderboard
SELECT u.username, 
       COUNT(CASE WHEN a.status = 'investigating' THEN 1 END) as active_tasks,
       COUNT(CASE WHEN a.status = 'closed' THEN 1 END) as finished_tasks
FROM users u
LEFT JOIN alerts a ON u.user_id = a.assigned_analyst_id
WHERE u.role = 'Junior_Analyst'
GROUP BY u.user_id, u.username;
select * from users;
select * from alerts;
select * from assets;
select * from tickets;