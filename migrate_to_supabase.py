import sqlite3
import requests
import json
import sys

# Supabase Credentials
SUPABASE_URL = "https://uumcsdvssgejpygxuxmj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bWNzZHZzc2dlanB5Z3h1eG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njk3NTksImV4cCI6MjA5NjE0NTc1OX0.MSaIZoe8rplvoKsEAhdOszsYIpD091I6tO9VuJ4zOyg"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def read_sqlite_table(table_name):
    try:
        conn = sqlite3.connect('data/sangeetha.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return rows
    except Exception as e:
        print(f"Error reading SQLite table {table_name}: {e}")
        return []

def clear_supabase_table(table_name, pk_col):
    # To delete all rows from a table in PostgREST, we filter by pk_col is not null
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?{pk_col}=not.is.null"
    response = requests.delete(url, headers=headers)
    if response.status_code not in [200, 204]:
        print(f"Warning: Failed to clear Supabase table {table_name}: {response.status_code} - {response.text}")
    else:
        print(f"Cleared Supabase table {table_name}")

def insert_supabase_table(table_name, rows):
    if not rows:
        print(f"No records to insert for {table_name}")
        return
    
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    # PostgREST supports bulk insert by POSTing a JSON array
    response = requests.post(url, json=rows, headers=headers)
    if response.status_code not in [200, 201, 204]:
        print(f"ERROR: Failed to insert rows into {table_name}: {response.status_code} - {response.text}")
        sys.exit(1)
    else:
        print(f"Successfully migrated {len(rows)} records into {table_name}")

def main():
    print("==================================================")
    print("Starting Migration: Local SQLite to Supabase HTTP")
    print("==================================================")

    # Define tables and primary keys
    tables = [
        {"name": "users", "pk": "user_id"},
        {"name": "customers", "pk": "customer_id"},
        {"name": "crm_walkin_customers", "pk": "crm_customer_id"},
        {"name": "customer_edit_requests", "pk": "request_id"},
        {"name": "audit_log", "pk": "id"},
        {"name": "payments", "pk": "payment_id"},
        {"name": "payment_history", "pk": "id"}
    ]

    # Load SQLite data
    data = {}
    for t in tables:
        table_name = t["name"]
        print(f"Reading local SQLite table '{table_name}'...")
        data[table_name] = read_sqlite_table(table_name)
        print(f"Found {len(data[table_name])} records.")

    # Confirm migration
    print("\nStarting data transfer to Supabase...")

    # Order of deletion (child tables first to avoid FK violations)
    clear_order = ["payment_history", "payments", "audit_log", "customer_edit_requests", "crm_walkin_customers", "customers", "users"]
    for table_name in clear_order:
        # Find PK column name
        pk_col = next(t["pk"] for t in tables if t["name"] == table_name)
        clear_supabase_table(table_name, pk_col)

    # Order of insertion (parent tables first)
    insert_order = ["users", "customers", "crm_walkin_customers", "customer_edit_requests", "audit_log", "payments", "payment_history"]
    for table_name in insert_order:
        insert_supabase_table(table_name, data[table_name])

    print("\n==================================================")
    print("SUCCESS: Database migration completed successfully!")
    print("==================================================")

if __name__ == "__main__":
    main()
