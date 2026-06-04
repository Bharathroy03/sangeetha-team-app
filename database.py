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

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

# Helper Functions to interact with Supabase via HTTP REST API

def db_load_users():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/users"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json()
        print(f"Error loading users from Supabase: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query Supabase users: {e}")
    return []

def db_save_users(users_list):
    headers = get_headers()
    current_users = db_load_users()
    current_ids = {u['user_id'] for u in current_users}
    new_ids = {u['user_id'] for u in users_list}
    
    # Delete removed users
    for uid in (current_ids - new_ids):
        requests.delete(f"{SUPABASE_URL}/rest/v1/users?user_id=eq.{uid}", headers=headers)
        
    # Upsert new/updated users
    if users_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/users", json=users_list, headers=headers_upsert)

def db_load_customers():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customers"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            customers = r.json()
            for c in customers:
                c["down_payment_value"] = float(c.get("down_payment_value", 0.0) or 0.0)
                c["cash_amount"] = float(c.get("cash_amount", 0.0) or 0.0)
                c["card_amount"] = float(c.get("card_amount", 0.0) or 0.0)
                c["ewallet_amount"] = float(c.get("ewallet_amount", 0.0) or 0.0)
                c["total_amount_received"] = float(c.get("total_amount_received", 0.0) or 0.0)
                c["exchange_value"] = float(c.get("exchange_value", 0.0) or 0.0)
            return customers
        print(f"Error loading customers from Supabase: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query Supabase customers: {e}")
    return []

def db_save_customers(customers_list):
    headers = get_headers()
    current_customers = db_load_customers()
    current_ids = {c['customer_id'] for c in current_customers}
    new_ids = {c['customer_id'] for c in customers_list}
    
    # Delete removed customers
    for cid in (current_ids - new_ids):
        requests.delete(f"{SUPABASE_URL}/rest/v1/customers?customer_id=eq.{cid}", headers=headers)
        
    # Upsert new/updated customers
    if customers_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/customers", json=customers_list, headers=headers_upsert)

def db_get_customers_created_today(today_str):
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customers?created_at=like.{today_str}%25"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            customers = r.json()
            for c in customers:
                c["down_payment_value"] = float(c.get("down_payment_value", 0.0) or 0.0)
                c["cash_amount"] = float(c.get("cash_amount", 0.0) or 0.0)
                c["card_amount"] = float(c.get("card_amount", 0.0) or 0.0)
                c["ewallet_amount"] = float(c.get("ewallet_amount", 0.0) or 0.0)
                c["total_amount_received"] = float(c.get("total_amount_received", 0.0) or 0.0)
                c["exchange_value"] = float(c.get("exchange_value", 0.0) or 0.0)
            return customers
        print(f"Error loading today's customers: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query today's customers: {e}")
    return []

def db_get_finance_customers():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customers?transaction_mode=eq.Finance"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            customers = r.json()
            for c in customers:
                c["down_payment_value"] = float(c.get("down_payment_value", 0.0) or 0.0)
                c["cash_amount"] = float(c.get("cash_amount", 0.0) or 0.0)
                c["card_amount"] = float(c.get("card_amount", 0.0) or 0.0)
                c["ewallet_amount"] = float(c.get("ewallet_amount", 0.0) or 0.0)
                c["total_amount_received"] = float(c.get("total_amount_received", 0.0) or 0.0)
                c["exchange_value"] = float(c.get("exchange_value", 0.0) or 0.0)
            return customers
        print(f"Error loading finance customers: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query finance customers: {e}")
    return []

def db_load_crm_walkin():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/crm_walkin_customers"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json()
        print(f"Error loading CRM walk-ins: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query CRM walk-ins: {e}")
    return []

def db_save_crm_walkin(crm_list):
    headers = get_headers()
    current_crm = db_load_crm_walkin()
    current_ids = {c['crm_customer_id'] for c in current_crm}
    new_ids = {c['crm_customer_id'] for c in crm_list}
    
    # Delete removed walkins
    for cid in (current_ids - new_ids):
        requests.delete(f"{SUPABASE_URL}/rest/v1/crm_walkin_customers?crm_customer_id=eq.{cid}", headers=headers)
        
    # Upsert new/updated walkins
    if crm_list:
        headers_upsert = headers.copy()
        headers_upsert["Prefer"] = "resolution=merge-duplicates"
        requests.post(f"{SUPABASE_URL}/rest/v1/crm_walkin_customers", json=crm_list, headers=headers_upsert)

def db_load_payments():
    headers = get_headers()
    try:
        # Load payments
        r = requests.get(f"{SUPABASE_URL}/rest/v1/payments", headers=headers)
        payments = r.json() if r.status_code == 200 else []
        
        # Load payment histories
        r = requests.get(f"{SUPABASE_URL}/rest/v1/payment_history", headers=headers)
        histories = r.json() if r.status_code == 200 else []
        
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
    except Exception as e:
        print(f"Failed to query payments: {e}")
    return []

def db_save_payments(payments_list):
    headers = get_headers()
    current_payments = db_load_payments()
    current_ids = {p['payment_id'] for p in current_payments}
    new_ids = {p['payment_id'] for p in payments_list}
    
    # Delete removed payments
    for pid in (current_ids - new_ids):
        requests.delete(f"{SUPABASE_URL}/rest/v1/payments?payment_id=eq.{pid}", headers=headers)
        
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
        requests.post(f"{SUPABASE_URL}/rest/v1/payments", json=payments_to_upsert, headers=headers_upsert)
        
    # Clear history for modified/new payments to write fresh ones
    for pid in new_ids:
        requests.delete(f"{SUPABASE_URL}/rest/v1/payment_history?payment_id=eq.{pid}", headers=headers)
        
    # Bulk insert history
    if histories_to_insert:
        requests.post(f"{SUPABASE_URL}/rest/v1/payment_history", json=histories_to_insert, headers=headers)

def db_delete_payment_history(payment_id):
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/payment_history?payment_id=eq.{payment_id}"
    requests.delete(url, headers=headers)

def db_load_edit_requests():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/customer_edit_requests"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
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
        print(f"Error loading edit requests from Supabase: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query edit requests: {e}")
    return []

def db_save_edit_requests(requests_list):
    headers = get_headers()
    current_reqs = db_load_edit_requests()
    current_ids = {r['request_id'] for r in current_reqs}
    new_ids = {r['request_id'] for r in requests_list}
    
    # Delete removed requests
    for rid in (current_ids - new_ids):
        requests.delete(f"{SUPABASE_URL}/rest/v1/customer_edit_requests?request_id=eq.{rid}", headers=headers)
        
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
        requests.post(f"{SUPABASE_URL}/rest/v1/customer_edit_requests", json=serialized_list, headers=headers_upsert)

def db_load_audit_log():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/audit_log"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return r.json()
        print(f"Error loading audit log from Supabase: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"Failed to query audit log: {e}")
    return []

def db_add_audit_log(entry):
    headers = get_headers()
    entry_copy = entry.copy()
    entry_copy.pop("id", None) # Let database autoincrement the ID
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/audit_log", json=entry_copy, headers=headers)
    except Exception as e:
        print(f"Failed to write audit log: {e}")

def db_count_audit_logs():
    headers = get_headers()
    url = f"{SUPABASE_URL}/rest/v1/audit_log?select=id"
    try:
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            return len(r.json())
    except Exception:
        pass
    return 0
