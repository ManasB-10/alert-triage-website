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

if __name__ == '__main__':
    # Runs the server on port 5000
    app.run(debug=True, port=5000)