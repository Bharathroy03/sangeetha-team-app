"""Quick end-to-end verification."""
import requests
from datetime import datetime

BASE = "http://localhost:5000"
s = requests.Session()

# Login
r = s.post(f"{BASE}/api/login", json={"employee_id": "22913", "password": "Sang@1974"})
print(f"Login: {r.status_code}")

# Customers
r = s.get(f"{BASE}/api/customers")
data = r.json()
customers = data.get("data", [])
today = datetime.now().strftime("%Y-%m-%d")
today_count = sum(1 for c in customers if c.get("created_at", "")[:10] == today)
finance_count = sum(1 for c in customers if (c.get("transaction_mode") or "").lower() == "finance")

print(f"\nTotal Customers: {len(customers)}")
print(f"Today's Customers (date={today}): {today_count}")
print(f"Finance Customers: {finance_count}")

for c in customers:
    print(f"  {c.get('customer_id')}: {c.get('customer_name')}, date={c.get('created_at')}, mode={c.get('transaction_mode', 'N/A')}")

# CRM walk-ins
r = s.get(f"{BASE}/api/crm-walkin-customers")
if r.status_code == 200:
    walkins = r.json().get("data", [])
    print(f"\nCRM Walk-ins: {len(walkins)}")
else:
    print(f"\nCRM Walk-ins API: {r.status_code}")

# Payments
r = s.get(f"{BASE}/api/payments")
if r.status_code == 200:
    payments = r.json().get("data", r.json().get("payments", []))
    print(f"Payments: {len(payments)}")

# Pages
for page in ["/dashboard", "/customer-records", "/customer-history", "/payment-tracker"]:
    r = s.get(f"{BASE}{page}")
    print(f"Page {page}: {r.status_code}")

print("\nDone!")
