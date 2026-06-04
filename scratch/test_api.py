from app import app
import json

with app.test_client() as client:
    # We need to simulate login or bypass the login check for testing, 
    # or simulate session data.
    with client.session_transaction() as sess:
        sess['user_id'] = 'USR-1001'
        sess['employee_id'] = '22913'
        sess['username'] = 'Bharath Kumar R'
        sess['role'] = 'super_admin'
    
    response = client.get('/api/customers')
    print("Status code:", response.status_code)
    print("Headers:", dict(response.headers))
    try:
        data = response.get_json()
        print("Success field:", data.get('success'))
        print("Number of customers returned:", len(data.get('data', [])))
        for i, c in enumerate(data.get('data', [])):
            print(f"  Cust {i}: ID={c.get('customer_id')}, Name={c.get('customer_name')}, Mode={c.get('transaction_mode')}, Date={c.get('created_at')}")
    except Exception as e:
        print("Error decoding json:", e)
        print("Body content:", response.data)
