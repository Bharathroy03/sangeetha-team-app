import os
import json
import requests
from datetime import datetime

BASE_URL = 'http://127.0.0.1:5000'
USERS_FILE = r'c:\Users\91845\Desktop\Store_sales_aData\sangeetha-team-app\data\users.json'

def run_tests():
    print("==================================================")
    print("Starting Authentication & RBAC API validation...")
    print("==================================================")
    
    # Setup test sessions
    anon_session = requests.Session()
    employee_session = requests.Session()
    admin_session = requests.Session()
    super_admin_session = requests.Session()

    # 1. Anonymous Access Checks
    print("\n--- 1. Testing Anonymous Access Limits ---")
    
    # Access page that needs login
    res = anon_session.get(f'{BASE_URL}/dashboard', allow_redirects=False)
    print(f"Anon GET /dashboard (expect redirect): Status {res.status_code}")
    assert res.status_code == 302
    assert '/login' in res.headers.get('Location', '')
    print("[PASS] Anonymous /dashboard redirect verified.")

    res = anon_session.get(f'{BASE_URL}/payment-tracker', allow_redirects=False)
    print(f"Anon GET /payment-tracker (expect redirect): Status {res.status_code}")
    assert res.status_code == 302
    assert '/login' in res.headers.get('Location', '')
    print("[PASS] Anonymous /payment-tracker redirect verified.")

    # Access API that needs login
    res = anon_session.get(f'{BASE_URL}/api/users')
    print(f"Anon GET /api/users (expect 401): Status {res.status_code}")
    assert res.status_code == 401
    print("[PASS] Anonymous /api/users blocked.")

    # 2. Login Failure Checks
    print("\n--- 2. Testing Login Failure Scenarios ---")
    res = anon_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'wrongpassword'})
    print(f"Login with incorrect password: Status {res.status_code}")
    assert res.status_code == 401
    assert res.json()['success'] is False
    print("[PASS] Incorrect password login rejected.")

    res = anon_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'NON_EXISTENT', 'password': 'somepassword'})
    print(f"Login with non-existent Employee ID: Status {res.status_code}")
    assert res.status_code == 401
    assert res.json()['success'] is False
    print("[PASS] Non-existent employee ID login rejected.")

    # 3. Store Employee Access checks (SMPL)
    print("\n--- 3. Testing Store Employee (SMPL) Role Restrictions ---")
    
    # Login as employee
    res = employee_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'Sang@1974'})
    print(f"Employee Login: Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    assert employee_session.cookies.get('session') is not None
    print("[PASS] Store employee logged in successfully.")

    # Verify pages accessible to store_employee
    res = employee_session.get(f'{BASE_URL}/dashboard')
    print(f"Employee GET /dashboard: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] Store employee can access dashboard.")

    res = employee_session.get(f'{BASE_URL}/customer-history')
    print(f"Employee GET /customer-history: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] Store employee can access customer history page.")

    # Verify pages restricted from store_employee (should return 403)
    res = employee_session.get(f'{BASE_URL}/payment-tracker', allow_redirects=False)
    print(f"Employee GET /payment-tracker (expect 403): Status {res.status_code}")
    assert res.status_code == 403
    print("[PASS] Store employee blocked from payment tracker page.")

    res = employee_session.get(f'{BASE_URL}/admin/users', allow_redirects=False)
    print(f"Employee GET /admin/users (expect 403): Status {res.status_code}")
    assert res.status_code == 403
    print("[PASS] Store employee blocked from user management page.")

    # Verify APIs restricted from store_employee
    res = employee_session.get(f'{BASE_URL}/api/users')
    print(f"Employee GET /api/users (expect 403): Status {res.status_code}")
    assert res.status_code == 403
    print("[PASS] Store employee blocked from GET /api/users API.")

    res = employee_session.get(f'{BASE_URL}/api/raw-data')
    print(f"Employee GET /api/raw-data (expect 403): Status {res.status_code}")
    assert res.status_code == 403
    print("[PASS] Store employee blocked from GET /api/raw-data API.")

    res = employee_session.delete(f'{BASE_URL}/api/customers/1')
    print(f"Employee DELETE /api/customers/1 (expect 403): Status {res.status_code}")
    assert res.status_code == 403
    print("[PASS] Store employee blocked from deleting customers.")

    # 4. Super Admin / Admin access verification
    print("\n--- 4. Testing Super Admin (22913) & Admin (6909) Access ---")
    
    # Login as Super Admin
    res = super_admin_session.post(f'{BASE_URL}/api/login', json={'employee_id': '22913', 'password': 'Bharathroy@03'})
    print(f"Super Admin Login: Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    print("[PASS] Super Admin logged in successfully.")

    # Verify access to admin view/routes
    res = super_admin_session.get(f'{BASE_URL}/payment-tracker')
    print(f"Super Admin GET /payment-tracker: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] Super Admin can access payment tracker page.")

    res = super_admin_session.get(f'{BASE_URL}/admin/users')
    print(f"Super Admin GET /admin/users: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] Super Admin can access user management page.")

    res = super_admin_session.get(f'{BASE_URL}/api/users')
    print(f"Super Admin GET /api/users: Status {res.status_code}")
    assert res.status_code == 200
    user_list = res.json()['data']
    print(f"Fetched {len(user_list)} users.")
    # Ensure password hashes are not returned
    for u in user_list:
        assert 'password_hash' not in u
    print("[PASS] GET /api/users returned users list and stripped password hashes.")

    # Login as Admin
    res = admin_session.post(f'{BASE_URL}/api/login', json={'employee_id': '6909', 'password': 'Ramesh@6909'})
    print(f"Admin Login: Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    print("[PASS] Admin logged in successfully.")

    # Verify access to admin view/routes
    res = admin_session.get(f'{BASE_URL}/payment-tracker')
    print(f"Admin GET /payment-tracker: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] Admin can access payment tracker page.")

    # 5. User CRUD operations by Admin
    print("\n--- 5. Testing User Management CRUD Actions ---")
    
    # Create new store_employee user
    new_user_payload = {
        "username": "Test Employee",
        "employee_id": "TEST_EMP_01",
        "password": "Password@123",
        "role": "store_employee"
    }
    res = admin_session.post(f'{BASE_URL}/api/users', json=new_user_payload)
    print(f"Create User Status: {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    created_user = res.json()['data']
    assert created_user['username'] == "Test Employee"
    assert created_user['employee_id'] == "TEST_EMP_01"
    assert created_user['role'] == "store_employee"
    assert created_user['status'] == "active"
    created_user_id = created_user['user_id']
    print("[PASS] Created new user successfully.")

    # Verify duplicate Employee ID is blocked
    res = admin_session.post(f'{BASE_URL}/api/users', json=new_user_payload)
    print(f"Create Duplicate User Status: {res.status_code}, Body {res.json()}")
    assert res.status_code == 400
    assert "Duplicate Employee ID" in res.json()['message']
    print("[PASS] Duplicate employee ID block verified.")

    # Edit user (update role and username)
    update_payload = {
        "username": "Test Employee Updated",
        "role": "admin"
    }
    res = admin_session.put(f'{BASE_URL}/api/users/{created_user_id}', json=update_payload)
    print(f"Update User Status: {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    updated_user = res.json()['data']
    assert updated_user['username'] == "Test Employee Updated"
    assert updated_user['role'] == "admin"
    print("[PASS] Updated user info successfully.")

    # Test login with updated user and verify new admin role permissions
    test_user_session = requests.Session()
    res = test_user_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'TEST_EMP_01', 'password': 'Password@123'})
    print(f"Login as new user (now admin): Status {res.status_code}")
    assert res.status_code == 200
    # Access payment-tracker (admin can, store_employee could not)
    res = test_user_session.get(f'{BASE_URL}/payment-tracker')
    print(f"New user (admin) GET /payment-tracker: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] New user successfully logged in and exercised admin permission.")

    # Deactivate the user
    deactivate_payload = {
        "status": "inactive"
    }
    res = admin_session.put(f'{BASE_URL}/api/users/{created_user_id}', json=deactivate_payload)
    print(f"Deactivate User Status: {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    assert res.json()['data']['status'] == "inactive"
    print("[PASS] User deactivated successfully.")

    # Try login as deactivated user
    test_user_session_2 = requests.Session()
    res = test_user_session_2.post(f'{BASE_URL}/api/login', json={'employee_id': 'TEST_EMP_01', 'password': 'Password@123'})
    print(f"Login as deactivated user (expect 403): Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 403
    assert "deactivated" in res.json()['message']
    print("[PASS] Deactivated user blocked from logging in.")

    # 6. Security Self-Update & Self-Deletion Constraints
    print("\n--- 6. Testing Self-Update and Self-Deletion Constraints ---")
    
    # Get own user record ID
    res = admin_session.get(f'{BASE_URL}/api/users')
    own_user = next((u for u in res.json()['data'] if u['employee_id'] == '6909'), None)
    assert own_user is not None
    own_user_id = own_user['user_id']

    # Try to deactivate self
    res = admin_session.put(f'{BASE_URL}/api/users/{own_user_id}', json={"status": "inactive"})
    print(f"Deactivate self Status (expect 400): Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 400
    assert "cannot deactivate your own account" in res.json()['message']
    print("[PASS] Deactivating self rejected correctly.")

    # Try to downgrade own role
    res = admin_session.put(f'{BASE_URL}/api/users/{own_user_id}', json={"role": "store_employee"})
    print(f"Downgrade self Status (expect 400): Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 400
    assert "cannot change your own role" in res.json()['message']
    print("[PASS] Downgrading own role rejected correctly.")

    # Try to delete self
    res = admin_session.delete(f'{BASE_URL}/api/users/{own_user_id}')
    print(f"Delete self Status (expect 400): Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 400
    assert "cannot delete your own account" in res.json()['message']
    print("[PASS] Deleting own account rejected correctly.")

    # Clean up test user
    res = admin_session.delete(f'{BASE_URL}/api/users/{created_user_id}')
    print(f"Delete test user: Status {res.status_code}")
    assert res.status_code == 200
    print("[PASS] Deleted test user successfully.")

    # 7. Logout checks
    print("\n--- 7. Testing Logout ---")
    res = admin_session.post(f'{BASE_URL}/api/logout')
    print(f"Admin Logout: Status {res.status_code}, Body {res.json()}")
    assert res.status_code == 200
    
    # Try calling api/users after logout
    res = admin_session.get(f'{BASE_URL}/api/users')
    print(f"GET /api/users after logout (expect 401): Status {res.status_code}")
    assert res.status_code == 401
    print("[PASS] Session successfully cleared upon logout.")

    print("\n==================================================")
    print("ALL AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
