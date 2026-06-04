import os
import json
from app import app
from database import db, User, Customer, CRMWalkin, Payment, EditRequest

with app.app_context():
    print("=== SQL Database Counts ===")
    print(f"User count: {User.query.count()}")
    print(f"Customer count: {Customer.query.count()}")
    print(f"CRMWalkin count: {CRMWalkin.query.count()}")
    print(f"Payment count: {Payment.query.count()}")
    print(f"EditRequest count: {EditRequest.query.count()}")
    
    print("\n=== Sample Customers in SQL ===")
    for c in Customer.query.all():
        print(f"  Cust: ID={c.customer_id}, Name={c.customer_name}, Mode={c.transaction_mode}, Date={c.created_at}")

    print("\n=== Sample CRM Walk-ins in SQL ===")
    for w in CRMWalkin.query.all():
        print(f"  Walk-in: ID={w.crm_customer_id}, Name={w.customer_name}, Date={w.created_at}")

print("\n=== JSON File Counts ===")
for filename in ['users.json', 'customers.json', 'crm_walkin_customers.json', 'payments.json', 'customer_edit_requests.json']:
    path = os.path.join("data", filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                print(f"  {filename}: {len(data)} records")
                if filename == 'crm_walkin_customers.json':
                    for i, w in enumerate(data):
                        print(f"    JSON Walk-in [{i}]: ID={w.get('crm_customer_id')}, Name={w.get('customer_name')}, Date={w.get('created_at')}")
            except Exception as e:
                print(f"  {filename}: error reading ({e})")
    else:
        print(f"  {filename}: missing")

