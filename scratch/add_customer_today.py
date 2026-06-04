import requests
from datetime import datetime

BASE_URL = "http://127.0.0.1:5000"

print("Logging in...")
session = requests.Session()
login_res = session.post(f"{BASE_URL}/api/login", json={
    "employee_id": "22913",
    "password": "Sang@1974"
})
print("Login result:", login_res.json())

# Form payload matching the Customer schema
payload = {
    "customer_name": "Today Customer",
    "mobile_number": "9876543210",
    "item_model": "iPhone 15 Pro",
    "imei_number": "358901234567890",
    "transaction_mode": "Non-Finance",
    "down_payment_mode": "",
    "down_payment_value": 0,
    "cash_amount": 50000,
    "card_amount": 0,
    "ewallet_amount": 0,
    "exchange_status": "No",
    "exchange_brand": "",
    "exchange_value": 0,
    "sales_person": "Bharath Kumar R — Manager",
    "remarks": "Added today for timezone verification."
}

print("\nSubmitting new customer entry...")
post_res = session.post(f"{BASE_URL}/api/customers", json=payload)
print("POST status:", post_res.status_code)
print("POST response:", post_res.json())

print("\nQuerying /api/customers to verify inclusion...")
get_res = session.get(f"{BASE_URL}/api/customers")
try:
    data = get_res.json().get("data", [])
    print(f"Total customers returned: {len(data)}")
    today_count = 0
    today_str = datetime.now().strftime('%Y-%m-%d')
    for c in data:
        if c.get("created_at", "").startswith(today_str):
            today_count += 1
            print(f"  Found today's customer: ID={c.get('customer_id')}, Name={c.get('customer_name')}, Date={c.get('created_at')}")
    print(f"Today's customer count in API response: {today_count}")
except Exception as e:
    print("Error:", e)
