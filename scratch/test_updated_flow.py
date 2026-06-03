import os
import json
import requests
from datetime import datetime

BASE_URL = 'http://127.0.0.1:5000'

def run_tests():
    print("==================================================")
    print("Starting Updated Customer Edit Permission System Validation...")
    print("==================================================")

    # Setup sessions
    employee_session = requests.Session()
    admin_session = requests.Session()

    # Authenticate sessions
    print("\n--- 1. Authenticating sessions ---")
    res = employee_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'Sang@1974'})
    assert res.status_code == 200, f"Employee login failed: {res.text}"
    print("[PASS] Store employee logged in.")

    res = admin_session.post(f'{BASE_URL}/api/login', json={'employee_id': '6909', 'password': 'Ramesh@6909'})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    print("[PASS] Admin logged in.")

    # Create a fresh customer record as employee
    print("\n--- 2. Creating a test customer record ---")
    payload = {
        "customer_name": "original client",
        "mobile_number": "9090909090",
        "transaction_mode": "Non-Finance",
        "cash_amount": 10000,
        "card_amount": 0,
        "ewallet_amount": 0,
        "item_model": "Oppo A57 Blue",
        "imei_number": "111112222233333",
        "exchange_status": "No",
        "sales_person": "Ramesh T - Cashier"
    }
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload)
    assert res.status_code == 200, f"Customer creation failed: {res.text}"
    cust = res.json()['customer']
    cust_id = cust['customer_id']
    print(f"[PASS] Created customer {cust_id} successfully.")

    # Test 3: Store Employee cannot direct edit
    print("\n--- 3. Testing Store Employee direct edit restriction ---")
    direct_edit_payload = cust.copy()
    direct_edit_payload["customer_name"] = "Direct Edited Client"
    res = employee_session.put(f'{BASE_URL}/api/customers/{cust_id}', json=direct_edit_payload)
    print(f"Employee PUT /api/customers/{cust_id} (expect 403): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 403
    print("[PASS] Store employee direct edit blocked.")

    # Test 4: Store Employee cannot delete
    print("\n--- 4. Testing Store Employee delete restriction ---")
    res = employee_session.delete(f'{BASE_URL}/api/customers/{cust_id}')
    print(f"Employee DELETE /api/customers/{cust_id} (expect 403): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 403
    print("[PASS] Store employee delete blocked.")

    # Test 5: Store Employee submits edit request
    print("\n--- 5. Testing Store Employee edit request submission ---")
    proposed_data = cust.copy()
    proposed_data["customer_name"] = "Proposed Client Name"
    
    req_payload = {
        "reason": "Correcting typo in customer name.",
        "proposed_data": proposed_data
    }
    res = employee_session.post(f'{BASE_URL}/api/customers/{cust_id}/edit-request', json=req_payload)
    print(f"Employee POST edit request: Status {res.status_code}, Body {res.text}")
    assert res.status_code == 200
    res_data = res.json()
    assert res_data['success'] is True
    assert "Waiting for admin approval" in res_data['message']
    req = res_data['data']
    req_id = req['request_id']
    
    # Assert schema matches requirement
    assert req['customer_id'] == cust_id
    assert req['requested_by'] == 'SMPL'
    assert req['requested_role'] == 'store_employee'
    assert req['status'] == 'pending'
    assert req['admin_remarks'] == ''
    assert req['created_at'] is not None
    print("[PASS] Edit request created. Schema verified.")

    # Test 6: Prevent duplicate pending requests
    print("\n--- 6. Testing duplicate pending request prevention ---")
    res = employee_session.post(f'{BASE_URL}/api/customers/{cust_id}/edit-request', json=req_payload)
    print(f"Employee POST duplicate request (expect 400): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 400
    assert "already have a pending edit request" in res.json()['message']
    print("[PASS] Duplicate pending edit request blocked.")

    # Test 7: Store Employee cannot access approval/rejection APIs
    print("\n--- 7. Testing Employee approval/rejection API gating ---")
    res = employee_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/approve')
    print(f"Employee POST approve (expect 403): Status {res.status_code}")
    assert res.status_code == 403

    res = employee_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/reject', json={"admin_remarks": "No"})
    print(f"Employee POST reject (expect 403): Status {res.status_code}")
    assert res.status_code == 403
    print("[PASS] Employee blocked from approval/rejection endpoints.")

    # Test 8: Admin reject edit request. Validation: admin_remarks is required.
    print("\n--- 8. Testing Admin rejection validation (admin_remarks required) ---")
    res = admin_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/reject', json={})
    print(f"Admin reject without remarks (expect 400): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 400
    assert "remarks are required" in res.json()['message']
    print("[PASS] Rejection without remarks blocked.")

    # Admin reject successfully
    print("\n--- 9. Testing Admin rejection success ---")
    res = admin_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/reject', json={"admin_remarks": "Rejecting because the request reason is unclear."})
    print(f"Admin reject with remarks (expect 200): Status {res.status_code}")
    assert res.status_code == 200
    rejected_req = res.json()['data']
    assert rejected_req['status'] == 'rejected'
    assert rejected_req['rejected_by'] == '6909'
    assert rejected_req['rejected_at'] is not None
    assert rejected_req['admin_remarks'] == "Rejecting because the request reason is unclear."

    # Verify original customer is unchanged
    res = admin_session.get(f'{BASE_URL}/api/customers')
    custs = res.json()['data']
    orig_c = next((c for c in custs if c.get('customer_id') == cust_id), None)
    assert orig_c['customer_name'] == "Original Client"
    print("[PASS] Request rejected. Customer data remains unchanged.")

    # Test 10: Store Employee can submit again since previous request is rejected (no longer pending)
    print("\n--- 10. Testing Employee re-submission after rejection ---")
    res = employee_session.post(f'{BASE_URL}/api/customers/{cust_id}/edit-request', json=req_payload)
    print(f"Employee POST re-submission (expect 200): Status {res.status_code}")
    assert res.status_code == 200
    req_id_2 = res.json()['data']['request_id']
    print("[PASS] Re-submission succeeded.")

    # Test 11: Admin approve request
    print("\n--- 11. Testing Admin approval and DB merge ---")
    import time
    time.sleep(1.1)
    res = admin_session.post(f'{BASE_URL}/api/edit-requests/{req_id_2}/approve', json={"admin_remarks": "Approved after confirmation."})
    print(f"Admin approve request (expect 200): Status {res.status_code}")
    assert res.status_code == 200

    # Verify requests status
    res = admin_session.get(f'{BASE_URL}/api/edit-requests')
    reqs = res.json()['data']
    approved_req = next((r for r in reqs if r.get('request_id') == req_id_2), None)
    assert approved_req['status'] == 'approved'
    assert approved_req['approved_by'] == '6909'
    assert approved_req['approved_at'] is not None
    assert approved_req['admin_remarks'] == "Approved after confirmation."

    # Verify customer database is merged/updated and fields preserved
    res = admin_session.get(f'{BASE_URL}/api/customers')
    custs_after = res.json()['data']
    merged_c = next((c for c in custs_after if c.get('customer_id') == cust_id), None)
    assert merged_c is not None
    assert merged_c['customer_name'] == "Proposed Client Name"
    # Preserved fields
    assert merged_c['customer_id'] == cust_id
    assert merged_c['created_at'] == cust['created_at']
    assert merged_c['created_by'] == cust['created_by']
    # Updated timestamp
    assert merged_c['updated_at'] != cust['updated_at']
    print("[PASS] Approval merged customer record and preserved audit fields.")

    print("\n==================================================")
    print("ALL FLOW VALIDATION TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
