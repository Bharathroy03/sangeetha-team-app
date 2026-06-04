"""Quick database inspection script."""
import sqlite3
import os

db_path = os.path.join("data", "sangeetha.db")
print(f"DB exists: {os.path.exists(db_path)}")
if os.path.exists(db_path):
    print(f"DB size: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
c = conn.cursor()

# List tables
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in c.fetchall()]
print(f"Tables: {tables}")

# Count each table
for t in tables:
    c.execute(f"SELECT COUNT(*) FROM [{t}]")
    print(f"  {t}: {c.fetchone()[0]} rows")

# Show customer records
print("\n--- CUSTOMER RECORDS ---")
c.execute("SELECT customer_id, customer_name, created_at FROM customers LIMIT 15")
for r in c.fetchall():
    print(f"  {r}")

# Show user records
print("\n--- USER RECORDS ---")
c.execute("SELECT id, employee_name, employee_id, role FROM users LIMIT 15")
for r in c.fetchall():
    print(f"  {r}")

conn.close()
