import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Manas@1005",
        database="sentinel_hub"
    )

def populate_threat_intel():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Clear existing public IPs
        print("Cleaning up public IPs from threat_intel...")
        cursor.execute("DELETE FROM threat_intel WHERE indicator_value NOT LIKE '192.168.%' AND indicator_value NOT LIKE '10.%' AND indicator_value NOT LIKE '172.%'")
        
        # 2. Add some random private IPs
        threats = [
            ('192.168.1.105', 'Brute Force', 95, 'Internal IDS'),
            ('10.0.1.15', 'Malware', 98, 'EDR Feed'),
            ('172.16.0.50', 'Botnet', 82, 'Honeypot'),
            ('192.168.1.200', 'C2 Server', 100, 'Sentinel Intel'),
            ('10.20.30.40', 'Phishing', 75, 'Email Filter'),
            ('192.168.5.12', 'Brute Force', 88, 'Log Analysis'),
            ('172.18.99.1', 'C2 Server', 92, 'Network Monitor'),
            ('10.0.0.22', 'Brute Force', 99, 'BruteForce Shield')
        ]
        
        print("Populating private threat indicators...")
        query = "INSERT IGNORE INTO threat_intel (indicator_value, threat_type, confidence_score, source_provider) VALUES (%s, %s, %s, %s)"
        cursor.executemany(query, threats)
        
        conn.commit()
        print(f"Successfully added {cursor.rowcount} indicators.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    populate_threat_intel()
