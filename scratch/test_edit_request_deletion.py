import json
import os
import sys

sys.path.insert(0, '.')
import app as a

def run_tests():
    print("=== STARTING EDIT REQUESTS DELETION BACKEND TESTS ===")
    
    # Enable Flask testing mode
    a.app.config['TESTING'] = True
    client = a.app.test_client()
    
    # Backup existing edit requests
    backup_data = []
    if os.path.exists(a.EDIT_REQUESTS_FILE):
        try:
            with open(a.EDIT_REQUESTS_FILE, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            print("Successfully backed up existing edit requests database.")
        except Exception as e:
            print("Failed to backup database:", e)
            
    try:
        # 1. Login as Super Admin
        print("\n[Test 1] Logging in as Super Admin...")
        login_resp = client.post('/api/login', json={
            'employee_id': '22913',
            'password': 'Sang@1974'
        })
        print(f"Login Response: {login_resp.status_code}")
        assert login_resp.status_code == 200, "Super Admin login failed"
        assert login_resp.json['success'] is True, "Super Admin login was not successful"
        
        # 2. Setup mock edit requests
        # We need:
        # - REQ-TEST-PENDING (status: pending)
        # - REQ-TEST-APPROVED (status: approved)
        # - REQ-TEST-REJECTED (status: rejected)
        print("\n[Test 2] Setting up mock edit requests...")
        mock_requests = [
            {
                "request_id": "REQ-TEST-PENDING",
                "customer_id": "CUST-TEST-999",
                "requested_by": "SMPL",
                "requested_role": "store_employee",
                "original_data": {"customer_name": "Test Original Name"},
                "proposed_data": {"customer_name": "Test Proposed Name"},
                "reason": "Typo correction pending",
                "status": "pending",
                "created_at": "2026-06-03 12:00:00"
            },
            {
                "request_id": "REQ-TEST-APPROVED",
                "customer_id": "CUST-TEST-999",
                "requested_by": "SMPL",
                "requested_role": "store_employee",
                "original_data": {"customer_name": "Test Original Name"},
                "proposed_data": {"customer_name": "Test Proposed Name"},
                "reason": "Typo correction approved",
                "status": "approved",
                "approved_by": "22913",
                "approved_at": "2026-06-03 12:05:00",
                "created_at": "2026-06-03 12:00:00"
            },
            {
                "request_id": "REQ-TEST-REJECTED",
                "customer_id": "CUST-TEST-998",
                "requested_by": "SMPL",
                "requested_role": "store_employee",
                "original_data": {"customer_name": "Test Original Name 2"},
                "proposed_data": {"customer_name": "Test Proposed Name 2"},
                "reason": "Typo correction rejected",
                "status": "rejected",
                "admin_remarks": "Not needed",
                "rejected_by": "22913",
                "rejected_at": "2026-06-03 12:10:00",
                "created_at": "2026-06-03 12:00:00"
            }
        ]
        
        # Save mock requests to file
        with open(a.EDIT_REQUESTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(mock_requests, f, indent=4)
        print("Mock edit requests written to database file.")
        
        # 3. Test GET API
        print("\n[Test 3] Fetching edit requests...")
        get_resp = client.get('/api/edit-requests')
        print(f"GET Response: {get_resp.status_code}")
        assert get_resp.status_code == 200
        req_list = get_resp.json['data']
        print(f"Found {len(req_list)} requests in database.")
        ids = [r['request_id'] for r in req_list]
        print(f"Request IDs: {ids}")
        assert "REQ-TEST-PENDING" in ids
        assert "REQ-TEST-APPROVED" in ids
        assert "REQ-TEST-REJECTED" in ids
        
        # 4. Test DELETE /api/edit-requests/<request_id> (Individual Deletion)
        print("\n[Test 4] Deleting REQ-TEST-APPROVED...")
        del_resp = client.delete('/api/edit-requests/REQ-TEST-APPROVED')
        print(f"DELETE Response: {del_resp.status_code} - {del_resp.json}")
        assert del_resp.status_code == 200
        assert del_resp.json['success'] is True
        
        # Verify it was deleted
        get_resp2 = client.get('/api/edit-requests')
        req_list2 = get_resp2.json['data']
        ids2 = [r['request_id'] for r in req_list2]
        print(f"Request IDs after deletion: {ids2}")
        assert "REQ-TEST-APPROVED" not in ids2
        assert "REQ-TEST-PENDING" in ids2
        assert "REQ-TEST-REJECTED" in ids2
        print("Individual request deletion works perfectly.")
        
        # 5. Test POST /api/edit-requests/clear-history (Clear History Log)
        print("\n[Test 5] Clearing edit requests history...")
        clear_resp = client.post('/api/edit-requests/clear-history')
        print(f"Clear Response: {clear_resp.status_code} - {clear_resp.json}")
        assert clear_resp.status_code == 200
        assert clear_resp.json['success'] is True
        
        # Verify history is cleared and pending remains
        get_resp3 = client.get('/api/edit-requests')
        req_list3 = get_resp3.json['data']
        ids3 = [r['request_id'] for r in req_list3]
        print(f"Request IDs after clear-history: {ids3}")
        assert "REQ-TEST-REJECTED" not in ids3
        assert "REQ-TEST-APPROVED" not in ids3
        assert "REQ-TEST-PENDING" in ids3
        print("Clear history works perfectly (pending preserved, history deleted).")
        
        print("\n=== ALL BACKEND TESTS PASSED SUCCESSFULLY ===")
        
    finally:
        # Restore database
        print("\nRestoring original database...")
        with open(a.EDIT_REQUESTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=4)
        print("Database restored to original state.")

if __name__ == '__main__':
    run_tests()
