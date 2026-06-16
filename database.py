import os
import json
import requests

# Supabase Configuration
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    # Default fallback to the provided credentials
    SUPABASE_URL = "https://uumcsdvssgejpygxuxmj.supabase.co"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bWNzZHZzc2dlanB5Z3h1eG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njk3NTksImV4cCI6MjA5NjE0NTc1OX0.MSaIZoe8rplvoKsEAhdOszsYIpD091I6tO9VuJ4zOyg"

# Custom Exception Classes
class SupabaseError(Exception):
    """Base exception class for all Supabase operations."""
    def __init__(self, message, status_code=None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details

class SupabaseConnectionError(SupabaseError):
    """Raised when connecting to Supabase fails or times out."""
    pass

class SupabaseQueryError(SupabaseError):
    """Raised when query fails (e.g. table not found)."""
    pass

class SupabaseRlsError(SupabaseError):
    """Raised when authorization or RLS policies reject request."""
    pass

class SupabaseOperationError(SupabaseError):
    """Raised when insert, update, or delete fails."""
    pass

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

def safe_request(method, url, **kwargs):
    """Execute request safely, wrapping raw network/connection errors."""
    if "timeout" not in kwargs:
        kwargs["timeout"] = 10  # 10s default timeout
    try:
        return requests.request(method, url, **kwargs)
    except requests.exceptions.RequestException as e:
        raise SupabaseConnectionError(f"Database connection failed: {str(e)}")

def check_response(response, action_type="query"):
    """Inspect response status code and raise detailed SupabaseError subclass on failure."""
    if response.status_code in [200, 201, 204]:
        return
        
    status = response.status_code
    text = response.text
    details = None
    message = f"Database returned status {status}."
    
    try:
        err_json = response.json()
        if isinstance(err_json, dict):
            details = err_json.get("details") or err_json.get("hint")
            message = err_json.get("message") or message
    except Exception:
        pass
        
    if status in [401, 403]:
        raise SupabaseRlsError(f"Permission denied: {message}", status_code=status, details=details)
    elif status == 404:
        raise SupabaseQueryError(f"Resource not found (Table may not exist): {message}", status_code=status, details=details)
    elif status >= 500:
        raise SupabaseConnectionError(f"Database server error: {message}", status_code=status, details=details)
    else:
        raise SupabaseOperationError(f"Database {action_type} failed: {message}", status_code=status, details=details)

# --- DATABASE WRAPPER FUNCTIONS ---

def db_load_users():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/users"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    return r.json()

def db_save_users(users_list):
    headers = get_headers()
    current_users = db_load_users()
    current_ids = {u['user_id'] for u in current_users}
    new_ids = {u['user_id'] for u in users_list}
    
    # Delete removed users
    for uid in (current_ids - new_ids):
        r = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/users?user_id=eq.{uid}", headers=headers)
        check_response(r, "delete")
        
    # Upsert new/updated users
    if users_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/users", json=users_list, headers=headers_upsert)
        check_response(r, "upsert")

def _parse_customer_record(c):
    c["down_payment_value"] = float(c.get("down_payment_value", 0.0) or 0.0)
    c["cash_amount"] = float(c.get("cash_amount", 0.0) or 0.0)
    c["card_amount"] = float(c.get("card_amount", 0.0) or 0.0)
    c["ewallet_amount"] = float(c.get("ewallet_amount", 0.0) or 0.0)
    c["total_amount_received"] = float(c.get("total_amount_received", 0.0) or 0.0)
    c["exchange_value"] = float(c.get("exchange_value", 0.0) or 0.0)
    
    # Bill completion verification defaults
    c["billing_status"] = c.get("billing_status") or "Pending Verification"
    c["billing_verified"] = bool(c.get("billing_verified", False))
    c["billing_verified_by"] = c.get("billing_verified_by") or None
    c["billing_verified_at"] = c.get("billing_verified_at") or None
    c["billing_admin_remarks"] = c.get("billing_admin_remarks") or None
    c["record_locked"] = bool(c.get("record_locked", False))
    c["locked_by"] = c.get("locked_by") or None
    c["locked_at"] = c.get("locked_at") or None
    c["reopened_by"] = c.get("reopened_by") or None
    c["reopened_at"] = c.get("reopened_at") or None
    c["reopen_reason"] = c.get("reopen_reason") or None
    return c

def db_load_customers():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customers?order=created_at.desc"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    customers = r.json()
    return [_parse_customer_record(c) for c in customers]

def db_save_customers(customers_list):
    headers = get_headers()
    current_customers = db_load_customers()
    current_ids = {c['customer_id'] for c in current_customers}
    new_ids = {c['customer_id'] for c in customers_list}
    
    # Delete removed customers
    for cid in (current_ids - new_ids):
        r = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/customers?customer_id=eq.{cid}", headers=headers)
        check_response(r, "delete")
        
    # Upsert new/updated customers
    if customers_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/customers", json=customers_list, headers=headers_upsert)
        check_response(r, "upsert")

def db_get_customers_created_today(today_str):
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customers?created_at=like.{today_str}%25&order=created_at.desc"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    customers = r.json()
    return [_parse_customer_record(c) for c in customers]

def db_get_finance_customers():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customers?transaction_mode=eq.Finance&order=created_at.desc"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    customers = r.json()
    return [_parse_customer_record(c) for c in customers]

def db_load_crm_walkin():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/crm_walkin_customers"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    return r.json()

def db_save_crm_walkin(crm_list):
    headers = get_headers()
    current_crm = db_load_crm_walkin()
    current_ids = {c['crm_customer_id'] for c in current_crm}
    new_ids = {c['crm_customer_id'] for c in crm_list}
    
    # Delete removed walkins
    for cid in (current_ids - new_ids):
        r = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/crm_walkin_customers?crm_customer_id=eq.{cid}", headers=headers)
        check_response(r, "delete")
        
    # Upsert new/updated walkins
    if crm_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/crm_walkin_customers", json=crm_list, headers=headers_upsert)
        check_response(r, "upsert")

def db_load_payments():
    headers = get_headers()
    
    # Load payments
    r_pay = safe_request("GET", f"{SUPABASE_URL}/rest/v1/payments", headers=headers)
    check_response(r_pay, "query")
    payments = r_pay.json()
    
    # Load payment histories
    r_hist = safe_request("GET", f"{SUPABASE_URL}/rest/v1/payment_history", headers=headers)
    check_response(r_hist, "query")
    histories = r_hist.json()
    
    # Group histories by payment_id
    history_map = {}
    for h in histories:
        pid = h.get("payment_id")
        if pid not in history_map:
            history_map[pid] = []
        history_map[pid].append({
            "date_time": h.get("date_time"),
            "amount_added": float(h.get("amount_added", 0.0) or 0.0),
            "received_by": h.get("received_by"),
            "remarks": h.get("remarks")
        })
        
    # Attach history list to payments
    for p in payments:
        p["payment_history"] = history_map.get(p["payment_id"], [])
        p["total_bill_amount"] = float(p.get("total_bill_amount", 0.0) or 0.0)
        p["amount_received"] = float(p.get("amount_received", 0.0) or 0.0)
        p["pending_amount"] = float(p.get("pending_amount", 0.0) or 0.0)
    return payments

def db_save_payments(payments_list):
    headers = get_headers()
    current_payments = db_load_payments()
    current_ids = {p['payment_id'] for p in current_payments}
    new_ids = {p['payment_id'] for p in payments_list}
    
    # Delete removed payments
    for pid in (current_ids - new_ids):
        r = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/payments?payment_id=eq.{pid}", headers=headers)
        check_response(r, "delete")
        
    payments_to_upsert = []
    histories_to_insert = []
    
    for p in payments_list:
        p_copy = p.copy()
        histories = p_copy.pop("payment_history", [])
        payments_to_upsert.append(p_copy)
        
        for h in histories:
            histories_to_insert.append({
                "payment_id": p_copy["payment_id"],
                "date_time": h["date_time"],
                "amount_added": float(h["amount_added"]),
                "received_by": h["received_by"],
                "remarks": h.get("remarks")
            })
            
    # Upsert payments
    if payments_to_upsert:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/payments", json=payments_to_upsert, headers=headers_upsert)
        check_response(r, "upsert")
        
    # Clear history for modified/new payments to write fresh ones
    for pid in new_ids:
        r = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/payment_history?payment_id=eq.{pid}", headers=headers)
        check_response(r, "delete")
        
    # Bulk insert history
    if histories_to_insert:
        r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/payment_history", json=histories_to_insert, headers=headers)
        check_response(r, "insert")

def db_delete_payment_history(payment_id):
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/payment_history?payment_id=eq.{payment_id}"
    r = safe_request("DELETE", url, headers=headers)
    check_response(r, "delete")

def db_load_edit_requests():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customer_edit_requests"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    reqs = r.json()
    for req in reqs:
        if isinstance(req.get("original_data"), str):
            try:
                req["original_data"] = json.loads(req["original_data"])
            except Exception:
                req["original_data"] = {}
        if isinstance(req.get("proposed_data"), str):
            try:
                req["proposed_data"] = json.loads(req["proposed_data"])
            except Exception:
                req["proposed_data"] = {}
    return reqs

def db_save_edit_requests(requests_list):
    headers = get_headers()
    current_reqs = db_load_edit_requests()
    current_ids = {r['request_id'] for r in current_reqs}
    new_ids = {r['request_id'] for r in requests_list}
    
    # Delete removed requests
    for rid in (current_ids - new_ids):
        r = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/customer_edit_requests?request_id=eq.{rid}", headers=headers)
        check_response(r, "delete")
        
    serialized_list = []
    for r in requests_list:
        r_copy = r.copy()
        if not isinstance(r_copy.get("original_data"), str):
            r_copy["original_data"] = json.dumps(r_copy.get("original_data", {}))
        if not isinstance(r_copy.get("proposed_data"), str):
            r_copy["proposed_data"] = json.dumps(r_copy.get("proposed_data", {}))
        serialized_list.append(r_copy)
        
    # Upsert new/updated requests
    if serialized_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/customer_edit_requests", json=serialized_list, headers=headers_upsert)
        check_response(r, "upsert")

def db_load_audit_log():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/audit_log"
    r = safe_request("GET", url, headers=headers)
    check_response(r, "query")
    return r.json()

def db_add_audit_log(entry):
    headers = get_headers()
    entry_copy = entry.copy()
    entry_copy.pop("id", None) # Let database autoincrement the ID
    r = safe_request("POST", f"{SUPABASE_URL}/rest/v1/audit_log", json=entry_copy, headers=headers)
    check_response(r, "insert")

def db_count_audit_logs():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/audit_log?select=id"
    r = safe_request("GET", url, headers=headers)
    if r.status_code == 200:
        return len(r.json())
    return 0

def db_delete_customer_storage(customer_id):
    """
    Look for any files in Supabase Storage buckets matching the customer_id
    and permanently delete them to reclaim space.
    """
    headers = get_headers()
    # 1. Get list of all buckets
    buckets_url = f"{SUPABASE_URL}/storage/v1/bucket"
    try:
        r = safe_request("GET", buckets_url, headers=headers)
        if r.status_code != 200:
            print(f"Warning: Failed to list Supabase storage buckets: {r.text}")
            return
        buckets = r.json()
    except Exception as e:
        print(f"Warning: Exception while listing Supabase storage buckets: {e}")
        return

    # 2. For each bucket, list and delete files matching customer_id
    for bucket in buckets:
        bucket_id = bucket.get("id")
        if not bucket_id:
            continue
        
        list_url = f"{SUPABASE_URL}/storage/v1/object/list/{bucket_id}"
        
        # Files to delete
        files_to_delete = []
        
        # Check files under folder named {customer_id}
        try:
            payload = {
                "prefix": customer_id,
                "limit": 100,
                "offset": 0,
                "sortBy": {"column": "name", "order": "asc"}
            }
            r_list = safe_request("POST", list_url, json=payload, headers=headers)
            if r_list.status_code == 200:
                for f in r_list.json():
                    name = f.get("name")
                    if name:
                        files_to_delete.append(f"{customer_id}/{name}")
        except Exception as e:
            print(f"Warning: Exception listing folder {customer_id} in bucket {bucket_id}: {e}")
            
        # Check files in root starting with {customer_id}
        try:
            payload_root = {
                "prefix": "",
                "limit": 100,
                "offset": 0,
                "sortBy": {"column": "name", "order": "asc"}
            }
            r_list_root = safe_request("POST", list_url, json=payload_root, headers=headers)
            if r_list_root.status_code == 200:
                for f in r_list_root.json():
                    name = f.get("name")
                    if name and name.startswith(customer_id):
                        files_to_delete.append(name)
        except Exception as e:
            print(f"Warning: Exception listing root in bucket {bucket_id}: {e}")
            
        # Delete identified files
        if files_to_delete:
            delete_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_id}"
            try:
                # Remove duplicates
                unique_files = list(set(files_to_delete))
                del_payload = {"prefixes": unique_files}
                r_del = safe_request("DELETE", delete_url, json=del_payload, headers=headers)
                if r_del.status_code not in [200, 204]:
                    print(f"Warning: Failed to delete storage objects in {bucket_id}: {r_del.text}")
                else:
                    print(f"Deleted customer {customer_id} files {unique_files} from bucket {bucket_id}")
            except Exception as e:
                print(f"Warning: Exception deleting objects in {bucket_id}: {e}")

def db_delete_customer_record(customer_id):
    """
    Permanently delete the customer record and all related data (edit requests and storage files).
    """
    # 1. Clean up storage files
    db_delete_customer_storage(customer_id)
    
    headers = get_headers()
    
    # 2. Delete linked edit requests
    r_edit = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/customer_edit_requests?customer_id=eq.{customer_id}", headers=headers)
    check_response(r_edit, "delete")
    
    # 3. Delete the customer record itself
    r_cust = safe_request("DELETE", f"{SUPABASE_URL}/rest/v1/customers?customer_id=eq.{customer_id}", headers=headers)
    check_response(r_cust, "delete")
