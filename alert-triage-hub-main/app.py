from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import re
import json
from datetime import datetime
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
    severity_filter = request.args.get('severity')
    status_in = request.args.get('status_in')
    assigned_to_user_id = request.args.get('assigned_to_user_id')
    viewing_user_id = request.args.get('viewing_user_id')
    limit = request.args.get('limit')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT a.id, a.source_ip, a.dest_ip, a.event_type, a.severity, a.status, 
               a.assigned_analyst_id, u.full_name as assigned_analyst_name, a.created_at, a.trigger_time, a.tags, a.description, a.detection_source,
               asst.asset_name, asst.asset_type, asst.criticality_score, asst.location as asset_location,
               t.resolution_notes, t.ai_score, t.ai_reasoning, t.updated_at as closed_at, t.assigned_to_user_id
        FROM alerts a
        LEFT JOIN assets asst ON a.asset_id = asst.asset_id
        LEFT JOIN tickets t ON a.id = t.alert_id
        LEFT JOIN users u ON a.assigned_analyst_id = u.user_id
    """
    conditions = []
    params = []

    # Apply global privacy rules:
    # 1. New alerts are visible to everyone
    # 2. Other alerts are only visible to the owner (unless it's a specific query for another user, e.g. for Manager views)
    if viewing_user_id:
        conditions.append("(a.status = 'new' OR a.assigned_analyst_id = %s OR t.assigned_to_user_id = %s)")
        params.extend([viewing_user_id, viewing_user_id])

    if status_filter:
        conditions.append("a.status = %s")
        params.append(status_filter)
    if severity_filter:
        conditions.append("a.severity = %s")
        params.append(severity_filter)
    if status_in:
        statuses = status_in.split(',')
        placeholders = ', '.join(['%s'] * len(statuses))
        conditions.append(f"a.status IN ({placeholders})")
        params.extend(statuses)
    if assigned_to_user_id:
        conditions.append("(a.assigned_analyst_id = %s OR t.assigned_to_user_id = %s)")
        params.extend([assigned_to_user_id, assigned_to_user_id])

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY a.id DESC"
    
    if limit:
        query += " LIMIT %s"
        params.append(int(limit))
    
    cursor.execute(query, tuple(params))
    alerts = cursor.fetchall()
    cursor.close()
    conn.close()
    
    for alert in alerts:
        if alert.get('created_at'):
            alert['created_at'] = str(alert['created_at'])
        if alert.get('closed_at'):
            alert['closed_at'] = str(alert['closed_at'])
            
    return jsonify(alerts)

# 3. Route for the CLAIM BUTTON functionality
@app.route('/api/claim-alert', methods=['POST'])
def claim_alert():
    data = request.json
    alert_id = data.get('alert_id')
    user_id = data.get('user_id') # Assigned analyst ID

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Updates status to 'claimed' and assigns it to the analyst
        query = "UPDATE alerts SET status = 'claimed', assigned_analyst_id = %s WHERE id = %s"
        cursor.execute(query, (user_id, alert_id))
        
        # Initialize a ticket workflow entry
        cursor.execute("SELECT id FROM tickets WHERE alert_id = %s", (alert_id,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO tickets (alert_id, assigned_to_user_id, resolution_notes) VALUES (%s, %s, %s)", 
                (alert_id, user_id, '{}')
            )
            
        conn.commit()
        # SYNC PERFORMANCE
        sync_analyst_performance(conn, user_id)
        return jsonify({"message": "Alert claimed successfully"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# 3.4. AI Scorer Helper
def calculate_ai_score(conn, alert_id, inv_data):
    """
    Calculates an 'AI Investigation Score' based on:
    1. Completeness (40%) - Depth of 5 W's
    2. Severity Accuracy (30%) - Match vs predefined
    3. Resolution Logic (30%) - Heuristic check
    """
    cursor = conn.cursor(dictionary=True)
    
    # Get original alert for baseline
    cursor.execute("SELECT severity, description, event_type FROM alerts WHERE id = %s", (alert_id,))
    alert = cursor.fetchone()
    if not alert:
        return 0, "Alert not found."

    score = 0
    reasoning = []
    
    # 1. Completeness Check (40 pts)
    fields = ['who', 'what', 'when', 'where', 'why']
    field_pts = 0
    for f in fields:
        val = inv_data.get(f, '')
        if len(val) > 20: 
            field_pts += 8
        elif len(val) > 5:
            field_pts += 4
    
    if field_pts >= 35:
        reasoning.append("✅ Excellent documentation: All 5 W's are thoroughly explained.")
    elif field_pts >= 20:
        reasoning.append("⚠️ Moderate documentation: Some investigation fields are brief.")
    else:
        reasoning.append("❌ Poor documentation: Investigation fields are missing or too sparse.")
    score += field_pts

    # 2. Severity Accuracy (30 pts)
    original_sev = alert['severity'].lower()
    final_sev = inv_data.get('severity', '').lower()
    
    sev_map = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
    o_val = sev_map.get(original_sev, 0)
    f_val = sev_map.get(final_sev, 0)
    
    if o_val == f_val:
        score += 30
        reasoning.append(f"✅ Accurate Criticality: Final assessment matches predicted {original_sev} severity.")
    elif abs(o_val - f_val) == 1:
        score += 15
        reasoning.append(f"⚠️ Divergent Criticality: Assessment differs slightly from prediction ({final_sev} vs {original_sev}).")
    else:
        reasoning.append(f"❌ Criticality Gap: Final assessment deviates significantly from predicted risk.")

    # 3. Resolution Logic (30 pts)
    resolution = inv_data.get('resolution', '')
    if original_sev in ['critical', 'high']:
        if resolution == 'True Positive':
            score += 30
            reasoning.append("✅ Sound Resolution: High-risk alert correctly escalated as True Positive.")
        else:
            reasoning.append("❌ Logic Gap: High-risk alert dismissed as False Positive without sufficient justification.")
    else:
        # Low/Medium alerts can be either
        score += 30
        reasoning.append("✅ Logical Resolution: Triage decision aligns with observed activity risk.")

    cursor.close()
    return min(100, score), " | ".join(reasoning)

def sync_analyst_performance(conn, user_id):
    """
    Recalculates and updates the analyst_performance table for a specific user.
    """
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Basic Counts - Purely based on Ticket Ownership
        # Total handled: Any unique alert the analyst has submitted a ticket for
        cursor.execute("SELECT COUNT(DISTINCT alert_id) as total FROM tickets WHERE assigned_to_user_id = %s", (user_id,))
        total_handled = cursor.fetchone()['total'] or 0

        # In progress: Alerts handled by this analyst that are still 'claimed' or 'investigating'
        cursor.execute("""
            SELECT COUNT(*) as in_p 
            FROM alerts a 
            JOIN tickets t ON a.id = t.alert_id 
            WHERE t.assigned_to_user_id = %s AND a.status IN ('claimed', 'investigating')
        """, (user_id,))
        in_progress = cursor.fetchone()['in_p'] or 0

        # Completed: Alerts handled by this analyst that are 'closed' or 'escalated'
        cursor.execute("""
            SELECT COUNT(*) as comp 
            FROM alerts a 
            JOIN tickets t ON a.id = t.alert_id 
            WHERE t.assigned_to_user_id = %s AND a.status IN ('closed', 'escalated')
        """, (user_id,))
        completed = cursor.fetchone()['comp'] or 0

        # 2. Performance Metrics
        cursor.execute("SELECT AVG(ai_score) as avg_score FROM tickets WHERE assigned_to_user_id = %s AND ai_score > 0", (user_id,))
        avg_score = cursor.fetchone()['avg_score'] or 0

        # Calculate average resolution time (minutes)
        cursor.execute("""
            SELECT AVG(TIMESTAMPDIFF(MINUTE, a.created_at, t.updated_at)) as avg_time
            FROM tickets t
            JOIN alerts a ON a.id = t.alert_id
            WHERE t.assigned_to_user_id = %s AND a.status IN ('closed', 'escalated')
        """, (user_id,))
        avg_time = cursor.fetchone()['avg_time'] or 0

        # 3. Update the table
        cursor.execute("SELECT performance_id FROM analyst_performance WHERE user_id = %s", (user_id,))
        perf_row = cursor.fetchone()

        if perf_row:
            cursor.execute("""
                UPDATE analyst_performance 
                SET total_alerts_handled = %s, in_progress_count = %s, completed_count = %s, 
                    average_resolution_time_minutes = %s, average_ai_score = %s
                WHERE user_id = %s
            """, (total_handled, in_progress, completed, int(avg_time), float(avg_score), user_id))
        else:
            cursor.execute("""
                INSERT INTO analyst_performance (user_id, total_alerts_handled, in_progress_count, completed_count, average_resolution_time_minutes, average_ai_score)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (user_id, total_handled, in_progress, completed, int(avg_time), float(avg_score)))
        
        conn.commit()
    except Exception as e:
        print(f"Error syncing performance for user {user_id}: {e}")
    finally:
        cursor.close()

# 3.5. Route for SAVING RESOLUTION NOTES
@app.route('/api/alerts/<int:alert_id>/resolution', methods=['POST'])
def save_resolution(alert_id):
    data = request.json
    resolution_notes = data.get('notes', {}) # Expecting a JSON dict of the 5 W's
    status = data.get('status')
    severity = data.get('severity')

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Build dynamic update for alerts table based on what is provided
        fields_to_update = []
        params_to_update = []
        
        if status:
            fields_to_update.append("status = %s")
            params_to_update.append(status)
        if severity:
            fields_to_update.append("severity = %s")
            params_to_update.append(severity)
        
        if fields_to_update:
            alerts_query = f"UPDATE alerts SET {', '.join(fields_to_update)} WHERE id = %s"
            params_to_update.append(alert_id)
            cursor.execute(alerts_query, tuple(params_to_update))
            
        # 3. Handle Ticket Table (Upsert Logic)
        if 'notes' in data:
            resolution_notes = data.get('notes')
            
            # CALCULATE AI SCORE if closing or escalating
            ai_score = 0
            ai_reasoning = ""
            if status in ['closed', 'escalated']:
                ai_score, ai_reasoning = calculate_ai_score(conn, alert_id, resolution_notes)

            # Check if ticket exists
            cursor.execute("SELECT id FROM tickets WHERE alert_id = %s", (alert_id,))
            ticket = cursor.fetchone()
            
            if ticket:
                # Update existing
                cursor.execute(
                    "UPDATE tickets SET resolution_notes = %s, ai_score = %s, ai_reasoning = %s WHERE alert_id = %s", 
                    (json.dumps(resolution_notes), ai_score, ai_reasoning, alert_id)
                )
            else:
                # Create if missing (sanity check)
                # Try to find assigned analyst id from alerts table
                cursor.execute("SELECT assigned_analyst_id FROM alerts WHERE id = %s", (alert_id,))
                alert_row = cursor.fetchone()
                analyst_id = alert_row[0] if alert_row else 1
                cursor.execute(
                    "INSERT INTO tickets (alert_id, assigned_to_user_id, resolution_notes, ai_score, ai_reasoning) VALUES (%s, %s, %s, %s, %s)", 
                    (alert_id, analyst_id or 1, json.dumps(resolution_notes), ai_score, ai_reasoning)
                )
        
        # Get the analyst ID from the alert or ticket to sync their performance
        cursor.execute("SELECT assigned_analyst_id FROM alerts WHERE id = %s", (alert_id,))
        row = cursor.fetchone()
        user_id = row[0] if row else None
        
        if not user_id:
            cursor.execute("SELECT assigned_to_user_id FROM tickets WHERE alert_id = %s", (alert_id,))
            row = cursor.fetchone()
            user_id = row[0] if row else None

        conn.commit()
        
        if user_id:
            sync_analyst_performance(conn, user_id)

        return jsonify({"message": "Resolution details saved successfully"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

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
            # Check if user account is suspended
            if user.get('account_status') == 'Suspended':
                return jsonify({"message": "Your account has been suspended. Please contact your manager."}), 403

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
                   p.total_alerts_handled as total_handled, p.in_progress_count as in_progress, p.completed_count as completed,
                   p.average_ai_score as avg_ai_score, p.average_resolution_time_minutes as avg_time
            FROM users u
            LEFT JOIN analyst_performance p ON u.user_id = p.user_id
            WHERE u.role = 'Junior_Analyst'
            ORDER BY u.user_id
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
            SELECT u.user_id, u.username, u.full_name, u.email, u.account_status, u.created_at,
                   COALESCE(p.average_ai_score, 0) as avg_ai_score
            FROM users u
            LEFT JOIN analyst_performance p ON u.user_id = p.user_id
            WHERE u.role = 'Junior_Analyst'
            ORDER BY u.created_at DESC
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


# M-5: Manager creates a Junior Analyst account
@app.route('/api/manager/create-analyst', methods=['POST'])
def create_analyst():
    data = request.json
    username  = data.get('username')
    full_name = data.get('full_name')
    email     = data.get('email')
    password  = data.get('password')

    if not all([username, full_name, email, password]):
        return jsonify({"message": "All fields are required"}), 400

    password_hash = generate_password_hash(password)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM users WHERE email = %s OR username = %s", (email, username))
        if cursor.fetchone():
            return jsonify({"message": "A user with this email or username already exists"}), 409

        cursor.execute(
            "INSERT INTO users (username, full_name, email, password_hash, role) VALUES (%s, %s, %s, %s, 'Junior_Analyst')",
            (username, full_name, email, password_hash)
        )
        conn.commit()
        return jsonify({"message": "Analyst created successfully", "user_id": cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-6: Delete a Junior Analyst
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


# M-7: Toggle Analyst Status (Active/Suspended)
@app.route('/api/manager/analysts/<int:user_id>/toggle-status', methods=['POST'])
def toggle_analyst_status(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get current status
        cursor.execute("SELECT account_status FROM users WHERE user_id = %s AND role = 'Junior_Analyst'", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'message': 'Analyst not found'}), 404
            
        new_status = 'Suspended' if user['account_status'] == 'Active' else 'Active'
        
        cursor.execute("UPDATE users SET account_status = %s WHERE user_id = %s", (new_status, user_id))
        conn.commit()
        
        return jsonify({
            'message': f'Analyst status updated to {new_status}',
            'new_status': new_status
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# M-6: Manager creates an alert manually
# M-6: Manager creates an alert manually
@app.route('/api/manager/create-alert', methods=['POST'])
def create_alert():
    data = request.json
    event_type = data.get('event_type')
    source_ip = data.get('source_ip')
    severity = data.get('severity', 'medium')
    asset_id = data.get('asset_id')
    created_by = data.get('created_by')
    
    # New fields
    dest_ip = data.get('dest_ip')
    description = data.get('description', '')
    trigger_time = data.get('trigger_time')
    tags = data.get('tags', '')
    detection_source = data.get('detection_source', 'Unknown')

    if not all([event_type, source_ip, dest_ip, severity, detection_source, description, tags, trigger_time]):
        return jsonify({'message': 'All fields are strictly required'}), 400

    valid_severities = ['critical', 'high', 'medium', 'low']
    if severity not in valid_severities:
        return jsonify({'message': f'severity must be one of {valid_severities}'}), 400

    # IP Validation
    ip_pattern = re.compile(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$")
    if not ip_pattern.match(source_ip):
        return jsonify({'message': 'Invalid Source IP format'}), 400
    if not ip_pattern.match(dest_ip):
        return jsonify({'message': 'Invalid Destination IP format'}), 400

    # Description Validation (max 200 words)
    if len(description.split()) > 200:
        return jsonify({'message': 'Description exceeds the 200 words limit'}), 400

    if not trigger_time:
        trigger_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            INSERT INTO alerts (source_ip, dest_ip, event_type, severity, asset_id, status, created_by, entry_method, description, trigger_time, tags, detection_source)
            VALUES (%s, %s, %s, %s, %s, 'new', %s, 'Manual', %s, %s, %s, %s)
        """
        cursor.execute(query, (
            source_ip, dest_ip, event_type, severity,
            int(asset_id) if asset_id else None,
            int(created_by) if created_by else None,
            description, trigger_time, tags, detection_source
        ))
        conn.commit()
        return jsonify({'message': 'Alert created successfully', 'alert_id': cursor.lastrowid}), 201
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# M-7: Manager deletes an alert
@app.route('/api/manager/alerts/<int:alert_id>', methods=['DELETE'])
def delete_alert(alert_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM alerts WHERE id = %s", (alert_id,))
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'message': 'Alert not found'}), 404
        return jsonify({'message': 'Alert deleted successfully'}), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# M-8: Update User Profile
@app.route('/api/user/update-profile', methods=['POST'])
def update_profile():
    data = request.json
    user_id   = data.get('user_id')
    full_name = data.get('full_name')
    email     = data.get('email')

    if not all([user_id, full_name, email]):
        return jsonify({"message": "Missing required fields"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Check if email is already taken by ANOTHER user
        cursor.execute("SELECT * FROM users WHERE email = %s AND user_id != %s", (email, user_id))
        if cursor.fetchone():
            return jsonify({"message": "This email is already taken by another account"}), 409

        # 2. Update user
        cursor.execute(
            "UPDATE users SET full_name = %s, email = %s WHERE user_id = %s",
            (full_name, email, user_id)
        )
        conn.commit()

        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "id": str(user_id),
                "name": full_name,
                "email": email
            }
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    # Runs the server on port 5000
    app.run(debug=True, port=5000)