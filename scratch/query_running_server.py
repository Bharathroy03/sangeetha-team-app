import requests

BASE_URL = "http://127.0.0.1:5000"

print("Simulating login to live server...")
session = requests.Session()
login_res = session.post(f"{BASE_URL}/api/login", json={
    "employee_id": "22913",
    "password": "Sang@1974"
})
print("Login status:", login_res.status_code)
print("Login response:", login_res.json())

print("\nFetching customers from live server /api/customers...")
cust_res = session.get(f"{BASE_URL}/api/customers")
print("Status code:", cust_res.status_code)
try:
    data = cust_res.json()
    print("Success:", data.get("success"))
    print("Customer count:", len(data.get("data", [])))
    for i, c in enumerate(data.get("data", [])):
        print(f"  [{i}]: ID={c.get('customer_id')}, Name={c.get('customer_name')}, Date={c.get('created_at')}")
except Exception as e:
    print("Error parsing json:", e)
    print("Response text:", cust_res.text)
