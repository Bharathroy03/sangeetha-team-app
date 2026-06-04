"""Check JSON vs Database data sources."""
import json
import sqlite3
import os

# Check JSON file
json_path = os.path.join("data", "customers.json")
if os.path.exists(json_path):
    with open(json_path) as f:
        json_data = json.load(f)
    print(f"customers.json: {len(json_data)} records")
    for c in json_data[:3]:
        print(f"  {c.get('customer_id')}: {c.get('customer_name')}, date={c.get('created_at', c.get('registration_date', 'N/A'))}")
else:
    print("customers.json: FILE NOT FOUND")

# Check SQLite database
db_path = os.path.join("data", "sangeetha.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM customers")
print(f"\nSQLite customers table: {c.fetchone()[0]} records")
c.execute("SELECT customer_id, customer_name, created_at FROM customers")
for r in c.fetchall():
    print(f"  {r[0]}: {r[1]}, date={r[2]}")
conn.close()

# Check if save_customers writes to JSON
print("\n--- Checking save_customers in app.py ---")
with open("app.py") as f:
    code = f.read()
    
# Find save_customers and save_to_json
if "save_to_json" in code:
    print("FOUND: save_to_json function - app may be saving to JSON files")
if "json.dump" in code:
    print("FOUND: json.dump calls - app writes to JSON files")
if "Customer.query" in code:
    print("FOUND: Customer.query - app reads from SQLite database")
if "db.session.add" in code:
    print("FOUND: db.session.add - app writes to SQLite database")
