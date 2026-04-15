import mysql.connector

if __name__ == "__main__":
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='Manas@1005',
        database='sentinel_hub'
    )
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET severity = 'low' WHERE severity = 'info'")
    conn.commit()
    print(f"Updated {cursor.rowcount} alerts from 'info' to 'low'.")
    cursor.close()
    conn.close()
