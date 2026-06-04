import os
import json
import requests
from datetime import datetime

BASE_URL = 'http://127.0.0.1:5000'

def run_tests():
    print("==================================================")
    print("Starting Customer Entry Management System (CEMS)")
    print("Integration & Flow Validation...")
    print("==================================================")

    # Setup sessions
    employee_session = requests.Session()
    admin_session = requests.Session()

    # 1. Authenticate users
    print("\n--- 1. Authenticating sessions ---")
    res = employee_session.post(f'{BASE_URL}/api/login', json={'employee_id': 'SMPL', 'password': 'Sang@1974'})
    assert res.status_code == 200, f"Employee login failed: {res.text}"
    print("[PASS] Store employee (SMPL) logged in.")

    res = admin_session.post(f'{BASE_URL}/api/login', json={'employee_id': '6909', 'password': 'Sang@1974'})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    print("[PASS] Admin (6909) logged in.")

    # 2. Test positive split validation (Non-Finance Mode)
    print("\n--- 2. Testing Non-Finance Split Validations ---")
    
    # Negative split value
    payload_neg = {
        "customer_name": "Test Positive Math",
        "mobile_number": "9876543210",
        "transaction_mode": "Non-Finance",
        "cash_amount": -100,
        "card_amount": 200,
        "ewallet_amount": 0,
        "item_model": "iPhone 15 Pro",
        "imei_number": "123456789012345",
        "exchange_status": "No",
        "sales_person": "Ramesh T - Cashier"
    }
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload_neg)
    print(f"Post customer negative split (expect 400): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 400
    assert "positive numbers" in res.json()['message']
    print("[PASS] Negative split amount rejected.")

    # Zero/empty split sum
    payload_zero = payload_neg.copy()
    payload_zero["cash_amount"] = 0
    payload_zero["card_amount"] = 0
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload_zero)
    print(f"Post customer zero total (expect 400): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 400
    assert "greater than zero" in res.json()['message']
    print("[PASS] Zero total received split rejected.")

    # Valid Non-Finance split
    payload_valid_non_fin = payload_neg.copy()
    payload_valid_non_fin["customer_name"] = "test casing logic"
    payload_valid_non_fin["cash_amount"] = 15000.50
    payload_valid_non_fin["card_amount"] = 5000.25
    payload_valid_non_fin["ewallet_amount"] = 0.25
    
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload_valid_non_fin)
    print(f"Post customer valid Non-Finance split (expect 200): Status {res.status_code}")
    assert res.status_code == 200
    res_data = res.json()
    assert res_data['success'] is True
    cust = res_data['customer']
    assert cust['customer_name'] == "Test Casing Logic" # auto capitalization
    assert cust['total_amount_received'] == 20001.00 # 15000.50 + 5000.25 + 0.25
    cust_id = cust['customer_id']
    print(f"[PASS] Valid Non-Finance customer created: {cust_id} with auto-calculated total: {cust['total_amount_received']}")

    # 3. Test Finance Mode Validations
    print("\n--- 3. Testing Finance Mode Validations ---")
    
    # Missing finance provider
    payload_fin_invalid = {
        "customer_name": "Finance Customer",
        "mobile_number": "8765432109",
        "transaction_mode": "Finance",
        "down_payment_mode": "Cash",
        "down_payment_value": 5000.0,
        "item_model": "Samsung Galaxy S24",
        "imei_number": "987654321098765",
        "exchange_status": "No",
        "sales_person": "Bharath Kumar - Manager"
    }
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload_fin_invalid)
    print(f"Post Finance customer missing provider (expect 400): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 400
    assert "Provider is required" in res.json()['message']
    print("[PASS] Missing finance provider rejected.")

    # Invalid provider
    payload_fin_invalid["finance_provider"] = "Google Finserv"
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload_fin_invalid)
    print(f"Post Finance customer invalid provider (expect 400): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 400
    assert "Invalid Finance Provider selected" in res.json()['message']
    print("[PASS] Invalid finance provider rejected.")

    # Valid Finance Mode
    payload_fin_valid = payload_fin_invalid.copy()
    payload_fin_valid["finance_provider"] = "Bajaj Finserv Lending Financier"
    res = employee_session.post(f'{BASE_URL}/api/customers', json=payload_fin_valid)
    print(f"Post Finance customer valid (expect 200): Status {res.status_code}")
    assert res.status_code == 200
    cust_fin = res.json()['customer']
    assert cust_fin['total_amount_received'] == 5000.0
    assert cust_fin['cash_amount'] == 0.0
    assert cust_fin['card_amount'] == 0.0
    assert cust_fin['ewallet_amount'] == 0.0
    cust_fin_id = cust_fin['customer_id']
    print(f"[PASS] Valid Finance customer created: {cust_fin_id} with total equal to down payment: {cust_fin['total_amount_received']}")

    # 4. Store Employee submits edit request
    print("\n--- 4. Testing Edit Request Submission by Employee ---")
    
    proposed_data = cust.copy()
    proposed_data["customer_name"] = "Updated Suresh Kumar"
    proposed_data["mobile_number"] = "9999988888"
    
    req_payload = {
        "reason": "Customer corrected their mobile number and spelling.",
        "proposed_data": proposed_data
    }
    
    res = employee_session.post(f'{BASE_URL}/api/customers/{cust_id}/edit-request', json=req_payload)
    print(f"Employee submit edit request: Status {res.status_code}")
    assert res.status_code == 200
    req_data = res.json()
    assert req_data['success'] is True
    req_id = req_data['data']['request_id']
    assert req_data['data']['status'] == "pending"
    assert req_data['data']['proposed_data']['customer_name'] == "Updated Suresh Kumar"
    assert req_data['data']['proposed_data']['mobile_number'] == "9999988888"
    print(f"[PASS] Edit request submitted as Pending: {req_id}")

    # 5. Permission check: employee cannot approve or reject
    print("\n--- 5. Testing Permission Gate for Employees ---")
    
    # Try approve
    res = employee_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/approve')
    print(f"Employee try approve request (expect 403): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 403
    print("[PASS] Employee blocked from approving edit request.")

    # Try reject
    res = employee_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/reject', json={"admin_remarks": "No way"})
    print(f"Employee try reject request (expect 403): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 403
    print("[PASS] Employee blocked from rejecting edit request.")

    # 6. Direct edit /api/customers/<customer_id> PUT API with admin session
    print("\n--- 6. Testing Direct Edit as Admin ---")
    
    admin_direct_payload = cust_fin.copy()
    admin_direct_payload["customer_name"] = "Direct Admin Change"
    
    res = admin_session.put(f'{BASE_URL}/api/customers/{cust_fin_id}', json=admin_direct_payload)
    print(f"Admin PUT /api/customers/{cust_fin_id}: Status {res.status_code}")
    assert res.status_code == 200
    updated_direct_cust = res.json()['customer']
    assert updated_direct_cust['customer_name'] == "Direct Admin Change"
    print("[PASS] Admin successfully performed direct update on customer record.")

    # Try direct edit as employee (should be blocked)
    res = employee_session.put(f'{BASE_URL}/api/customers/{cust_fin_id}', json=admin_direct_payload)
    print(f"Employee PUT /api/customers/{cust_fin_id} (expect 403): Status {res.status_code}, Body {res.text}")
    assert res.status_code == 403
    print("[PASS] Employee blocked from direct customer edits.")

    # 7. Reject edit request as Admin, check details
    print("\n--- 7. Testing Rejection Flow as Admin ---")
    
    # Create another edit request from employee first
    proposed_data_2 = cust_fin.copy()
    proposed_data_2["customer_name"] = "Reject Candidate Name"
    req_payload_2 = {
        "reason": "Typo correction attempt",
        "proposed_data": proposed_data_2
    }
    res = employee_session.post(f'{BASE_URL}/api/customers/{cust_fin_id}/edit-request', json=req_payload_2)
    assert res.status_code == 200
    req_id_2 = res.json()['data']['request_id']
    print(f"Created second edit request: {req_id_2}")
    
    # Reject request as admin
    rejection_body = {"admin_remarks": "Changes are not valid based on invoice receipt."}
    res = admin_session.post(f'{BASE_URL}/api/edit-requests/{req_id_2}/reject', json=rejection_body)
    print(f"Admin reject request {req_id_2}: Status {res.status_code}")
    assert res.status_code == 200
    rejected_req = res.json()['data']
    assert rejected_req['status'] == "rejected"
    assert rejected_req['admin_remarks'] == "Changes are not valid based on invoice receipt."
    
    # Verify original customer is untouched
    res = admin_session.get(f'{BASE_URL}/api/customers')
    custs = res.json()['data']
    orig_c = next((c for c in custs if c.get('customer_id') == cust_fin_id), None)
    assert orig_c is not None
    assert orig_c['customer_name'] != "Reject Candidate Name"
    print("[PASS] Rejection flow successfully rejected request and left database untouched.")

    # 8. Approve edit request as Admin, verify database merge
    print("\n--- 8. Testing Approval Flow as Admin ---")
    
    # Approve the first edit request (REQ-1001 / req_id)
    res = admin_session.post(f'{BASE_URL}/api/edit-requests/{req_id}/approve')
    print(f"Admin approve request {req_id}: Status {res.status_code}")
    assert res.status_code == 200
    
    # Verify request status in API is Approved
    res = admin_session.get(f'{BASE_URL}/api/edit-requests')
    reqs = res.json()['data']
    approved_req = next((r for r in reqs if r.get('request_id') == req_id), None)
    assert approved_req is not None
    assert approved_req['status'] == "approved"
    
    # Verify customer database is merged/updated
    res = admin_session.get(f'{BASE_URL}/api/customers')
    custs_after = res.json()['data']
    merged_c = next((c for c in custs_after if c.get('customer_id') == cust_id), None)
    assert merged_c is not None
    assert merged_c['customer_name'] == "Updated Suresh Kumar"
    assert merged_c['mobile_number'] == "9999988888"
    print("[PASS] Approval flow successfully updated the customer record.")

    print("\n==================================================")
    print("ALL CEMS INTEGRATION & FLOW TESTS PASSED!")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
