import requests

BASE_URL = 'http://127.0.0.1:5000'

def run_tests():
    print("==================================================")
    print("Testing New API Endpoints & Routes...")
    print("==================================================")

    # 1. Test session without login (should fail / return 401)
    session = requests.Session()
    print("\n--- 1. Testing GET /api/session without login ---")
    res = session.get(f'{BASE_URL}/api/session')
    print(f"Status: {res.status_code}, Body: {res.text}")
    assert res.status_code == 401
    assert "Unauthorized" in res.text
    print("[PASS] Session check without login blocked with 401.")

    # 2. Login as admin
    print("\n--- 2. Logging in as admin ---")
    res = session.post(f'{BASE_URL}/api/login', json={'employee_id': '6909', 'password': 'Sang@1974'})
    assert res.status_code == 200, f"Login failed: {res.text}"
    print("[PASS] Logged in successfully.")

    # 3. Test session after login
    print("\n--- 3. Testing GET /api/session after login ---")
    res = session.get(f'{BASE_URL}/api/session')
    print(f"Status: {res.status_code}, Body: {res.text}")
    assert res.status_code == 200
    data = res.json()
    assert data['success'] is True
    assert data['data']['employee_id'] == '6909'
    assert data['data']['role'] == 'admin'
    print("[PASS] Session retrieved and validated.")

    # 4. Test GET /api/customers/today
    print("\n--- 4. Testing GET /api/customers/today ---")
    res = session.get(f'{BASE_URL}/api/customers/today')
    print(f"Status: {res.status_code}, count: {len(res.json().get('data', []))}")
    assert res.status_code == 200
    assert res.json()['success'] is True
    print("[PASS] Today's customers API functional.")

    # 5. Test GET /api/customers/finance
    print("\n--- 5. Testing GET /api/customers/finance ---")
    res = session.get(f'{BASE_URL}/api/customers/finance')
    print(f"Status: {res.status_code}, count: {len(res.json().get('data', []))}")
    assert res.status_code == 200
    assert res.json()['success'] is True
    # Verify that all returned customers have transaction_mode == 'Finance'
    for c in res.json().get('data', []):
        assert c['transaction_mode'] == 'Finance', f"Non-finance customer in list: {c}"
    print("[PASS] Finance customers API functional and validated.")

    # 6. Test GET /api/customers/<customer_id>
    print("\n--- 6. Testing GET /api/customers/<customer_id> ---")
    # First get a customer ID
    customers_res = session.get(f'{BASE_URL}/api/customers')
    customers = customers_res.json().get('data', [])
    if customers:
        cust_id = customers[0]['customer_id']
        res = session.get(f'{BASE_URL}/api/customers/{cust_id}')
        print(f"Status: {res.status_code}, Customer ID: {cust_id}")
        assert res.status_code == 200
        assert res.json()['success'] is True
        assert res.json()['data']['customer_id'] == cust_id
        print("[PASS] Single customer detail API functional.")
    else:
        print("[SKIP] No customers in database to test detail API.")

    # 7. Test GET /403 page
    print("\n--- 7. Testing GET /403 page ---")
    res = session.get(f'{BASE_URL}/403')
    print(f"Status: {res.status_code}, Page HTML preview: {res.text[:100]}...")
    assert res.status_code == 403
    assert "Access Denied" in res.text
    print("[PASS] 403 page route functional.")

    # 8. Test API endpoint HTTP 403 JSON response
    # We try to access an admin-only endpoint as a store employee
    print("\n--- 8. Testing API endpoint HTTP 403 JSON response ---")
    emp_session = requests.Session()
    emp_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'Sang@1974'})
    # store employee trying to access admin user list (GET /api/users)
    res = emp_session.get(f'{BASE_URL}/api/users')
    print(f"Status: {res.status_code}, Body: {res.text}")
    assert res.status_code == 403
    assert res.headers.get('content-type', '').startswith('application/json')
    assert res.json()['success'] is False
    assert "do not have permission" in res.json()['message']
    print("[PASS] API JSON error handler for 403 functional.")

    print("\n==================================================")
    print("ALL NEW ENDPOINT TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
