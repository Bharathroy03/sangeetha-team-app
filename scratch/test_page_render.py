import requests

BASE_URL = 'http://127.0.0.1:5000'

def test_pages():
    session = requests.Session()
    # Log in
    res = session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'Sang@1974'})
    assert res.status_code == 200, "Login failed"
    print("Logged in successfully.")

    # Try customer-entry
    res = session.get(f'{BASE_URL}/customer-entry')
    print(f"GET /customer-entry: Status {res.status_code}")
    if "jinja2.exceptions" in res.text or "TemplateAssertionError" in res.text or "Internal Server Error" in res.text:
        print("[FAIL] Template error found on /customer-entry!")
        print(res.text[:1000])
    else:
        print("[PASS] Standalone /customer-entry loaded successfully!")

    # Try dashboard
    res = session.get(f'{BASE_URL}/dashboard')
    print(f"GET /dashboard: Status {res.status_code}")

    # Try customer-records
    res = session.get(f'{BASE_URL}/customer-records')
    print(f"GET /customer-records: Status {res.status_code}")

    # Try crm-walkin-customers
    res = session.get(f'{BASE_URL}/crm-walkin-customers')
    print(f"GET /crm-walkin-customers: Status {res.status_code}")

if __name__ == '__main__':
    test_pages()
