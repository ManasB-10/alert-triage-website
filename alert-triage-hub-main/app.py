from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)  # This allows your React frontend to talk to this Python backend

# 1. Database Connection Configuration
def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Manas@1005", # Replaced with actual MySQL password
        database="sentinel_hub"
    )

# 2. Route to GET alerts (Includes the filtering logic for your StatsCards)
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    status_filter = request.args.get('status')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if status_filter:
        # Filters data for the specific card clicked (New, Claimed, etc.)
        query = "SELECT * FROM alerts WHERE status = %s ORDER BY id DESC"
        cursor.execute(query, (status_filter,))
    else:
        query = "SELECT * FROM alerts ORDER BY id DESC"
        cursor.execute(query)

    alerts = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(alerts)

# 3. Route for the CLAIM BUTTON functionality
@app.route('/api/claim-alert', methods=['POST'])
def claim_alert():
    data = request.json
    alert_id = data.get('alert_id')
    user_id = data.get('user_id') # Assigned analyst ID

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Updates status to 'claimed' and assigns it to the analyst
    query = "UPDATE alerts SET status = 'claimed', assigned_analyst_id = %s WHERE id = %s"
    cursor.execute(query, (user_id, alert_id))
    
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Alert claimed successfully"}), 200

# 4. Route for USER SIGNUP
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    role_frontend = data.get('role')

    if not all([username, full_name, email, password, role_frontend]):
        return jsonify({"message": "Missing required fields"}), 400

    role_db = 'Manager' if role_frontend == 'soc_manager' else 'Junior_Analyst'
    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s OR username = %s", (email, username))
        if cursor.fetchone():
            return jsonify({"message": "User with this email or username already exists"}), 409
            
        query = """
            INSERT INTO users (username, full_name, email, password_hash, role)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (username, full_name, email, password_hash, role_db))
        conn.commit()
        
        user_info = {
            "id": str(cursor.lastrowid),
            "name": full_name,
            "email": email,
            "role": role_frontend
        }
        return jsonify({"message": "User created successfully", "user": user_info}), 201
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# 5. Route for USER LOGIN
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    role_frontend = data.get('role')

    if not all([email, password, role_frontend]):
        return jsonify({"message": "Missing required fields"}), 400

    role_db = 'Manager' if role_frontend == 'soc_manager' else 'Junior_Analyst'

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE email = %s AND role = %s", (email, role_db))
        user = cursor.fetchone()

        if user and check_password_hash(user['password_hash'], password):
            user_info = {
                "id": str(user['user_id']),
                "name": user['full_name'],
                "email": user['email'],
                "role": role_frontend
            }
            return jsonify({"message": "Login successful", "user": user_info}), 200
        else:
            return jsonify({"message": "Invalid email or password for selected role"}), 401
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# 6. Route for VERIFYING IDENTITY (Step 1 Forgot Password)
@app.route('/api/verify-user', methods=['POST'])
def verify_user():
    data = request.json
    email = data.get('email')
    username = data.get('username')
    role_frontend = data.get('role')

    if not all([email, username, role_frontend]):
        return jsonify({"message": "Missing required fields"}), 400

    role_db = 'Manager' if role_frontend == 'soc_manager' else 'Junior_Analyst'

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE email = %s AND username = %s AND role = %s", (email, username, role_db))
        user = cursor.fetchone()

        if user:
            return jsonify({"message": "User verified successfully"}), 200
        else:
            return jsonify({"message": "Identity Verification Failed. Check your Username and Email."}), 401
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# 7. Route for FORGOT PASSWORD (Step 2 Reset)
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    username = data.get('username')
    new_password = data.get('new_password')
    role_frontend = data.get('role')

    if not all([email, username, new_password, role_frontend]):
        return jsonify({"message": "Missing required fields"}), 400

    role_db = 'Manager' if role_frontend == 'soc_manager' else 'Junior_Analyst'

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE email = %s AND username = %s AND role = %s", (email, username, role_db))
        user = cursor.fetchone()

        if user:
            new_password_hash = generate_password_hash(new_password)
            cursor.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", (new_password_hash, user['user_id']))
            conn.commit()
            return jsonify({"message": "Password successfully reset!"}), 200
        else:
            return jsonify({"message": "Identity Verification Failed. Check your Username and Email."}), 401
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ──────────────────────────────────────────
# MANAGER ENDPOINTS
# ──────────────────────────────────────────

# M-1: Dashboard stats overview
@app.route('/api/manager/stats', methods=['GET'])
def manager_stats():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT status, COUNT(*) as count FROM alerts GROUP BY status")
        status_counts = {row['status']: row['count'] for row in cursor.fetchall()}

        cursor.execute("SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity")
        severity_counts = {row['severity']: row['count'] for row in cursor.fetchall()}

        cursor.execute("SELECT COUNT(*) as total FROM alerts")
        total = cursor.fetchone()['total']

        cursor.execute("SELECT COUNT(*) as total FROM users WHERE role = 'Junior_Analyst' AND account_status = 'Active'")
        analysts = cursor.fetchone()['total']

        return jsonify({
            'status_counts': status_counts,
            'severity_counts': severity_counts,
            'total_alerts': total,
            'active_analysts': analysts
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-2: Analyst workload (who is assigned to which alert)
@app.route('/api/manager/analyst-workload', methods=['GET'])
def analyst_workload():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT u.user_id, u.username, u.full_name,
                   a.id as alert_id, a.event_type, a.severity, a.status,
                   a.created_at
            FROM users u
            LEFT JOIN alerts a ON u.user_id = a.assigned_analyst_id
            WHERE u.role = 'Junior_Analyst'
            ORDER BY u.user_id, a.created_at DESC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        # Convert datetime objects to strings for JSON
        for row in rows:
            if row.get('created_at'):
                row['created_at'] = str(row['created_at'])
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-3: Analyst performance metrics
@app.route('/api/manager/analyst-performance', methods=['GET'])
def analyst_performance():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = """
            SELECT u.user_id, u.username, u.full_name,
                   COUNT(a.id) as total_handled,
                   COUNT(CASE WHEN a.status IN ('claimed', 'investigating') THEN 1 END) as in_progress,
                   COUNT(CASE WHEN a.status = 'closed' THEN 1 END) as completed
            FROM users u
            LEFT JOIN alerts a ON u.user_id = a.assigned_analyst_id
            WHERE u.role = 'Junior_Analyst'
            GROUP BY u.user_id, u.username, u.full_name
        """
        cursor.execute(query)
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-4: Get all Junior Analysts
@app.route('/api/manager/analysts', methods=['GET'])
def get_analysts():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, username, full_name, email, account_status, created_at
            FROM users WHERE role = 'Junior_Analyst'
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        for row in rows:
            if row.get('created_at'):
                row['created_at'] = str(row['created_at'])
            if row.get('last_login'):
                row['last_login'] = str(row['last_login'])
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-5: Delete a Junior Analyst
@app.route('/api/manager/analysts/<int:user_id>', methods=['DELETE'])
def delete_analyst(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM users WHERE user_id = %s AND role = 'Junior_Analyst'",
            (user_id,)
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'message': 'Analyst not found or not a Junior Analyst'}), 404
        return jsonify({'message': 'Analyst removed successfully'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-6: Manager creates an alert manually
@app.route('/api/manager/create-alert', methods=['POST'])
def create_alert():
    data = request.json
    event_type = data.get('event_type')
    source_ip = data.get('source_ip')
    severity = data.get('severity', 'medium')
    asset_id = data.get('asset_id')
    created_by = data.get('created_by')

    if not all([event_type, source_ip, severity]):
        return jsonify({'message': 'event_type, source_ip and severity are required'}), 400

    valid_severities = ['critical', 'high', 'medium', 'low', 'info']
    if severity not in valid_severities:
        return jsonify({'message': f'severity must be one of {valid_severities}'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO alerts (source_ip, event_type, severity, asset_id, status, created_by, entry_method)
            VALUES (%s, %s, %s, %s, 'new', %s, 'Manual')
        """
        cursor.execute(query, (
            source_ip, event_type, severity,
            int(asset_id) if asset_id else None,
            int(created_by) if created_by else None
        ))
        conn.commit()
        return jsonify({'message': 'Alert created successfully', 'alert_id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    # Runs the server on port 5000
    app.run(debug=True, port=5000)