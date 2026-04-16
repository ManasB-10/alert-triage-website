import mysql.connector

def run_sql():
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='Manas@1005',
        database='sentinel_hub'
    )
    cursor = conn.cursor()
    
    with open('../populate_assets.sql', 'r') as f:
        sql = f.read()
    
    # Split by semicolon but ignore ones inside strings if they existed
    # In this case, simple split is fine as the SQL is controlled.
    queries = sql.split(';')
    
    for query in queries:
        if query.strip():
            cursor.execute(query)
            
    conn.commit()
    cursor.close()
    conn.close()
    print("Database populated successfully.")

if __name__ == '__main__':
    run_sql()
